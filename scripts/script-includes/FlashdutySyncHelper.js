/**
 * Script Include: FlashdutySyncHelper
 * 
 * Purpose: Server-side helper for syncing ServiceNow incidents to Flashduty
 * 
 * ServiceNow Configuration:
 * - Name: FlashdutySyncHelper
 * - Accessible from: All application scopes
 * - Checkboxes: Active (checked)
 * - Protection policy: itil
 * 
 * System Properties Required:
 * - flashduty.push_url: The Integration URL from Flashduty
 * - flashduty.teams_id: The Teams Integration ID from Flashduty (optional)
 */

var FlashdutySyncHelper = Class.create();
FlashdutySyncHelper.prototype = {
  initialize: function() {
    this.push_url = gs.getProperty('flashduty.push_url', '');
    this.teams_id = gs.getProperty('flashduty.teams_id', '');
    
    if (!this.push_url) {
      gs.warn("FlashdutySyncHelper: flashduty.push_url is not configured in System Properties");
    }
  },

  /**
   * Send incident data to Flashduty via webhook
   * @param {GlideRecord} current - The incident record
   * @param {string} groupId - Assignment group sys_id
   * @param {string} notifyType - Notification types (comma-separated: sms,voice,teams,email)
   * @param {Array} members - Array of member objects with sys_id, name, email
   * @param {string} externalOption - Flashduty escalation rule ID
   * @returns {boolean} - True if successful, false otherwise
   */
  sendIncidentWebhook: function(current, groupId, notifyType, members, externalOption) {
    if (!current || !current.sys_id) {
      gs.error("FlashdutySyncHelper: Invalid incident record parameter");
      return false;
    }
    
    if (!this.push_url) {
      gs.error("FlashdutySyncHelper: flashduty.push_url is not configured");
      return false;
    }

    var sysId = current.getUniqueValue() + '';
    var number = current.getValue("number") + '';
    
    gs.info("=== FlashdutySyncHelper: Preparing Notification ===");
    gs.info("Incident: " + number + " (sys_id: " + sysId + ")");
    gs.info("Assignment Group ID: " + groupId);
    gs.info("Notification Types: " + notifyType);
    gs.info("Escalation Rule ID: " + externalOption);

    var groupName = this._resolveGroupName(groupId);
    var lastComment = this._getLastComment(sysId);

    var payload = {
      action_type: current.isNewRecord() ? 'insert' : 'update',
      number: number,
      sys_id: sysId,
      short_description: current.getValue("short_description") + '',
      description: current.getValue("description") + '',
      impact: current.getDisplayValue("impact") + '',
      urgency: current.getValue("urgency") + '',
      comments: lastComment,
      personal_channels: notifyType || '',
      assignment_group: groupName,
      assignment_group_id: groupId || '',
      notify_members: members || [],
      rule_id: externalOption || '',
      teams_id: this.teams_id
    };

    gs.info("FlashdutySyncHelper: Payload prepared");
    gs.debug("Payload: " + JSON.stringify(payload));

    return this._sendRequest(payload, number);
  },

  /**
   * Get the last comment from incident journal
   */
  _getLastComment: function(sysIdStr) {
    var journalGR = new GlideRecord('sys_journal_field');
    journalGR.addQuery('element_id', sysIdStr);
    journalGR.addQuery('element', 'comments');
    journalGR.orderByDesc('sys_created_on');
    journalGR.setLimit(1);
    journalGR.query();
    if (journalGR.next()) {
      return journalGR.getValue('value') + '';
    }
    return '';
  },

  /**
   * Resolve group sys_id to group name
   */
  _resolveGroupName: function(groupId) {
    if (!groupId) return '';
    
    var groupGR = new GlideRecord('sys_user_group');
    if (groupGR.get(groupId)) {
      var name = groupGR.name.toString();
      gs.info("FlashdutySyncHelper: Group resolved - " + name);
      return name;
    }
    return '';
  },

  /**
   * Send HTTP request to Flashduty
   */
  _sendRequest: function(payload, incidentNumber) {
    try {
      var request = new sn_ws.RESTMessageV2();
      request.setHttpMethod("POST");
      request.setEndpoint(this.push_url);
      request.setRequestHeader("Content-Type", "application/json");
      request.setRequestBody(JSON.stringify(payload));
      
      gs.info("FlashdutySyncHelper: Sending to " + this.push_url);
      
      var response = request.execute();
      var httpStatus = response.getStatusCode();
      var responseBody = response.getBody();
      
      gs.info("FlashdutySyncHelper: Response status " + httpStatus);
      gs.debug("Response body: " + responseBody);
      
      if (httpStatus >= 200 && httpStatus < 300) {
        gs.info("FlashdutySyncHelper: Successfully sent incident " + incidentNumber);
        return true;
      } else {
        gs.error("FlashdutySyncHelper: Failed for incident " + incidentNumber);
        gs.error("HTTP " + httpStatus + ": " + responseBody);
        return false;
      }
    } catch (ex) {
      gs.error("FlashdutySyncHelper: Exception for incident " + incidentNumber);
      gs.error("Error: " + ex.message);
      return false;
    }
  },
  
  type: 'FlashdutySyncHelper'
};

