/**
 * Script Include: FlashdutySyncHelperAjax
 * 
 * Purpose: AJAX processor for client-side communication with Flashduty API
 * 
 * ServiceNow Configuration:
 * - Name: FlashdutySyncHelperAjax
 * - Accessible from: All application scopes
 * - Checkboxes: Client callable (checked), Active (checked)
 * - Protection policy: itil
 * 
 * System Properties Required:
 * - flashduty.app_key: The App Key (API secret) from Flashduty
 * - flashduty.api_domain: The Flashduty API domain (e.g., api.flashcat.cloud)
 * - flashduty.channel_id: The Channel ID from Flashduty
 */

var FlashdutySyncHelperAjax = Class.create();
FlashdutySyncHelperAjax.prototype = Object.extendsObject(
  global.AbstractAjaxProcessor,
  {
    /**
     * Load configuration from System Properties
     */
    _getConfig: function() {
      return {
        app_key: gs.getProperty('flashduty.app_key', ''),
        api_domain: gs.getProperty('flashduty.api_domain', 'api.flashcat.cloud'),
        channel_id: gs.getProperty('flashduty.channel_id', '')
      };
    },
    
    /**
     * Build API endpoint URL with app_key parameter
     */
    _buildApiUrl: function(path) {
      var config = this._getConfig();
      var domain = config.api_domain;
      
      // Remove trailing slash if present
      if (domain.charAt(domain.length - 1) === '/') {
        domain = domain.substring(0, domain.length - 1);
      }
      
      // Ensure domain has protocol
      if (domain.indexOf('http://') !== 0 && domain.indexOf('https://') !== 0) {
        domain = 'https://' + domain;
      }
      
      return domain + path + '?app_key=' + config.app_key;
    },
    
    /**
     * Get system configuration for client-side scripts
     * Returns only non-sensitive configuration (channel_id)
     */
    getSystemConfig: function() {
      var config = this._getConfig();
      
      gs.info("=== FlashdutySyncHelperAjax: Loading Config ===");
      gs.info("Channel ID: " + (config.channel_id ? 'configured' : 'not set'));
      gs.info("API Domain: " + config.api_domain);
      
      return JSON.stringify({
        channel_id: config.channel_id
      });
    },
    
    /**
     * Send incident to Flashduty via webhook
     */
    sendWebhook: function() {
      var sysId = this.getParameter("sysparm_sys_id");
      var groupId = this.getParameter("sysparm_group");
      var notifyType = this.getParameter("sysparm_notify_type");
      var membersStr = this.getParameter("sysparm_members");
      var externalOption = this.getParameter("sysparm_external_option");
      
      gs.info("=== FlashdutySyncHelperAjax: Send Webhook ===");
      gs.info("Incident sys_id: " + sysId);
      gs.info("Group ID: " + groupId);
      gs.info("Notify Types: " + notifyType);
      gs.info("Rule ID: " + externalOption);

      if (!sysId) {
        gs.error("FlashdutySyncHelperAjax: Missing incident sys_id");
        return "Failed: Missing incident sys_id";
      }

      var gr = new GlideRecord("incident");
      if (gr.get(sysId)) {
        gs.info("Found incident: " + gr.number);
        
        var members = this._getMembersDetails(membersStr);
        var helper = new FlashdutySyncHelper();
        var result = helper.sendIncidentWebhook(gr, groupId, notifyType, members, externalOption);
        
        if (result) {
          return "Success: Incident " + gr.number + " sent to Flashduty";
        } else {
          return "Failed: Unable to send " + gr.number + ". Check system logs.";
        }
      } else {
        gs.error("FlashdutySyncHelperAjax: Incident not found - " + sysId);
        return "Failed: Incident not found";
      }
    },
    
    /**
     * Get escalation policies from Flashduty API
     */
    getExternalOptions: function() {
      var channelId = this.getParameter("sysparm_channel_id");
      var groupName = this.getParameter("sysparm_group_name");
      var config = this._getConfig();
      
      gs.info("=== FlashdutySyncHelperAjax: Get Escalation Policies ===");
      gs.info("Channel ID: " + channelId);
      gs.info("API Domain: " + config.api_domain);
      gs.info("App Key: " + (config.app_key ? 'configured (' + config.app_key.length + ' chars)' : 'not set'));
      
      if (!config.app_key) {
        gs.error("FlashdutySyncHelperAjax: flashduty.app_key not configured");
        return JSON.stringify([]);
      }
      
      try {
        var request = new sn_ws.RESTMessageV2();
        request.setHttpMethod("POST");
        
        var endpoint = this._buildApiUrl('/channel/escalate/rule/list');
        gs.info("Endpoint: " + endpoint.split('?')[0]);
        
        request.setEndpoint(endpoint);
        request.setRequestHeader("Content-Type", "application/json");
        request.setHttpTimeout(30000);
        
        var requestBody = { channel_id: parseInt(channelId) };
        request.setRequestBody(JSON.stringify(requestBody));
        
        var response = request.execute();
        var httpStatus = response.getStatusCode();
        var responseBody = response.getBody();
        var errorMsg = response.getErrorMessage();
        
        gs.info("Response status: " + httpStatus);
        if (errorMsg) {
          gs.error("Error: " + errorMsg);
        }
        
        if (httpStatus >= 200 && httpStatus < 300) {
          var data = JSON.parse(responseBody);
          var options = [];
          
          if (data.data && data.data.items) {
            var items = data.data.items;
            for (var i = 0; i < items.length; i++) {
              var item = items[i];
              if (item.status === 'enabled') {
                var option = {
                  value: item.rule_id,
                  label: item.rule_name,
                  layers: item.layers || [],
                  priority: this._calculatePriority(item.rule_name, groupName)
                };
                options.push(option);
              }
            }
            
            options.sort(function(a, b) {
              return a.priority - b.priority;
            });
            
            gs.info("Found " + options.length + " enabled policies");
          }
          
          return JSON.stringify(options);
        } else {
          gs.error("API failed with HTTP " + httpStatus);
          return JSON.stringify([]);
        }
      } catch(e) {
        gs.error("Exception: " + e.message);
        return JSON.stringify([]);
      }
    },
    
    /**
     * Calculate priority for sorting escalation policies
     */
    _calculatePriority: function(ruleName, groupName) {
      if (!groupName || !ruleName) return 999;
      
      var rn = ruleName.toLowerCase();
      var gn = groupName.toLowerCase();
      
      if (rn === gn) return 1;
      if (rn.indexOf(gn) === 0) return 2;
      if (rn.indexOf(gn) > 0) return 3;
      return 999;
    },
    
    /**
     * Get group information by sys_id
     */
    getGroupInfo: function() {
      var groupId = this.getParameter("sysparm_group_id");
      
      if (!groupId) return '{}';
      
      var gr = new GlideRecord("sys_user_group");
      if (gr.get(groupId)) {
        return JSON.stringify({
          sys_id: gr.sys_id.toString(),
          name: gr.name.toString()
        });
      }
      
      return '{}';
    },
    
    /**
     * Get members of a group
     */
    getGroupMembers: function() {
      var groupId = this.getParameter("sysparm_group");
      var members = [];
      
      if (!groupId) {
        gs.warn("getGroupMembers: No group ID provided");
        return JSON.stringify(members);
      }
      
      try {
        var gr = new GlideRecord("sys_user_grmember");
        gr.addQuery("group", groupId);
        gr.query();
        
        while (gr.next()) {
          var user = gr.user.getRefRecord();
          if (user && user.active == true) {
            members.push({
              sys_id: user.sys_id.toString(),
              name: user.name.toString(),
              email: user.email.toString() || ''
            });
          }
        }
        
        gs.info("Found " + members.length + " active members in group " + groupId);
      } catch(e) {
        gs.error("Error getting group members: " + e.message);
      }
      
      return JSON.stringify(members);
    },
    
    /**
     * Get user details by sys_id
     */
    getUserDetails: function() {
      var userId = this.getParameter("sysparm_user_id");
      
      if (!userId) {
        gs.warn("getUserDetails: No user ID provided");
        return '{}';
      }
      
      var gr = new GlideRecord("sys_user");
      if (gr.get(userId)) {
        return JSON.stringify({
          sys_id: gr.sys_id.toString(),
          name: gr.name.toString(),
          email: gr.email.toString() || ''
        });
      }
      
      gs.warn("User not found: " + userId);
      return '{}';
    },
    
    /**
     * Get member details from comma-separated sys_ids
     */
    _getMembersDetails: function(membersStr) {
      var membersList = [];
      if (!membersStr) return membersList;
      
      var ids = membersStr.split(',');
      for (var i = 0; i < ids.length; i++) {
        var id = ids[i].trim();
        if (id) {
          var gr = new GlideRecord("sys_user");
          if (gr.get(id)) {
            membersList.push({
              sys_id: gr.sys_id.toString(),
              name: gr.name.toString(),
              email: gr.email.toString() || ''
            });
          }
        }
      }
      
      return membersList;
    },
    
    /**
     * Get person names from Flashduty API
     */
    getPersonNames: function() {
      var personIdsStr = this.getParameter("sysparm_person_ids");
      var config = this._getConfig();
      
      gs.info("=== FlashdutySyncHelperAjax: Get Person Names ===");
      
      if (!personIdsStr) {
        gs.warn("No person IDs provided");
        return JSON.stringify([]);
      }
      
      if (!config.app_key) {
        gs.error("flashduty.app_key not configured");
        return JSON.stringify([]);
      }
      
      try {
        var ids = personIdsStr.split(',');
        var personIds = [];
        for (var i = 0; i < ids.length; i++) {
          var id = ids[i].trim();
          if (id) personIds.push(parseInt(id));
        }
        
        if (personIds.length === 0) {
          return JSON.stringify([]);
        }
        
        var request = new sn_ws.RESTMessageV2();
        request.setHttpMethod("POST");
        request.setEndpoint(this._buildApiUrl('/person/infos'));
        request.setRequestHeader("Content-Type", "application/json");
        request.setHttpTimeout(30000);
        request.setRequestBody(JSON.stringify({ person_ids: personIds }));
        
        var response = request.execute();
        var httpStatus = response.getStatusCode();
        var responseBody = response.getBody();
        
        gs.info("Person API response: " + httpStatus);
        
        if (httpStatus >= 200 && httpStatus < 300) {
          var data = JSON.parse(responseBody);
          var persons = [];
          
          if (data.data && data.data.items) {
            var items = data.data.items;
            for (var j = 0; j < items.length; j++) {
              persons.push({
                id: items[j].person_id,
                name: items[j].person_name || ('User ' + items[j].person_id)
              });
            }
          }
          
          return JSON.stringify(persons);
        } else {
          gs.error("Person API failed: " + httpStatus);
          return JSON.stringify([]);
        }
      } catch(e) {
        gs.error("Exception: " + e.message);
        return JSON.stringify([]);
      }
    },
    
    /**
     * Get team names from Flashduty API
     */
    getTeamNames: function() {
      var teamIdsStr = this.getParameter("sysparm_team_ids");
      var config = this._getConfig();
      
      gs.info("=== FlashdutySyncHelperAjax: Get Team Names ===");
      
      if (!teamIdsStr) {
        gs.warn("No team IDs provided");
        return JSON.stringify([]);
      }
      
      if (!config.app_key) {
        gs.error("flashduty.app_key not configured");
        return JSON.stringify([]);
      }
      
      try {
        var ids = teamIdsStr.split(',');
        var teamIds = [];
        for (var i = 0; i < ids.length; i++) {
          var id = ids[i].trim();
          if (id) teamIds.push(parseInt(id));
        }
        
        if (teamIds.length === 0) {
          return JSON.stringify([]);
        }
        
        var request = new sn_ws.RESTMessageV2();
        request.setHttpMethod("POST");
        request.setEndpoint(this._buildApiUrl('/team/infos'));
        request.setRequestHeader("Content-Type", "application/json");
        request.setHttpTimeout(30000);
        request.setRequestBody(JSON.stringify({ team_ids: teamIds }));
        
        var response = request.execute();
        var httpStatus = response.getStatusCode();
        var responseBody = response.getBody();
        
        gs.info("Team API response: " + httpStatus);
        
        if (httpStatus >= 200 && httpStatus < 300) {
          var data = JSON.parse(responseBody);
          var teams = [];
          
          if (data.data && data.data.items) {
            var items = data.data.items;
            for (var j = 0; j < items.length; j++) {
              teams.push({
                id: items[j].team_id,
                name: items[j].team_name || ('Team ' + items[j].team_id)
              });
            }
          }
          
          return JSON.stringify(teams);
        } else {
          gs.error("Team API failed: " + httpStatus);
          return JSON.stringify([]);
        }
      } catch(e) {
        gs.error("Exception: " + e.message);
        return JSON.stringify([]);
      }
    },
    
    /**
     * Get schedule names from Flashduty API
     */
    getScheduleNames: function() {
      var scheduleIdsStr = this.getParameter("sysparm_schedule_ids");
      var config = this._getConfig();
      
      gs.info("=== FlashdutySyncHelperAjax: Get Schedule Names ===");
      
      if (!scheduleIdsStr) {
        gs.warn("No schedule IDs provided");
        return JSON.stringify([]);
      }
      
      if (!config.app_key) {
        gs.error("flashduty.app_key not configured");
        return JSON.stringify([]);
      }
      
      try {
        var ids = scheduleIdsStr.split(',');
        var scheduleIds = [];
        for (var i = 0; i < ids.length; i++) {
          var id = ids[i].trim();
          if (id) scheduleIds.push(id);
        }
        
        if (scheduleIds.length === 0) {
          return JSON.stringify([]);
        }
        
        var request = new sn_ws.RESTMessageV2();
        request.setHttpMethod("POST");
        request.setEndpoint(this._buildApiUrl('/schedule/infos'));
        request.setRequestHeader("Content-Type", "application/json");
        request.setHttpTimeout(30000);
        request.setRequestBody(JSON.stringify({ schedule_ids: scheduleIds }));
        
        var response = request.execute();
        var httpStatus = response.getStatusCode();
        var responseBody = response.getBody();
        
        gs.info("Schedule API response: " + httpStatus);
        
        if (httpStatus >= 200 && httpStatus < 300) {
          var data = JSON.parse(responseBody);
          var schedules = [];
          
          if (data.data && data.data.items) {
            var items = data.data.items;
            for (var j = 0; j < items.length; j++) {
              var item = items[j];
              schedules.push({
                id: item.schedule_id || item.id,
                name: item.schedule_name || item.name || ('Schedule ' + (item.schedule_id || item.id))
              });
            }
          }
          
          return JSON.stringify(schedules);
        } else {
          gs.error("Schedule API failed: " + httpStatus);
          return JSON.stringify([]);
        }
      } catch(e) {
        gs.error("Exception: " + e.message);
        return JSON.stringify([]);
      }
    },

    type: "FlashdutySyncHelperAjax"
  }
);

