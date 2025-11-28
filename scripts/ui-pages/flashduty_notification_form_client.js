/**
 * UI Page Client Script: flashduty_notification_form
 * 
 * Purpose: Client-side logic for the Flashduty notification dialog
 * 
 * ServiceNow Configuration:
 * - UI Page Name: flashduty_notification_form
 * - Category: General
 * - This script goes in the "Client script" field
 * 
 * Dependencies:
 * - FlashdutySyncHelperAjax (Script Include)
 * - System Property: flashduty.channel_id
 */

// Configuration loaded from System Properties
var flashdutyConfig = {
  channel_id: ""
};

addLoadEvent(function() {
  console.log("=== Flashduty Notification Form Loaded ===");
  
  var sysId = document.getElementById('incident_sys_id').value;
  console.log("Incident sys_id: " + sysId);
  
  // Load config from System Properties, then initialize
  loadFlashdutyConfig(function() {
    bindNotifyTypeEvents();
    bindSubmitEvent();
    bindPolicySearchEvents();
    bindSelectAllEvent();
    
    setTimeout(function() {
      var groupInput = gel('group');
      if (groupInput) {
        groupInput.onchange = function() {
          console.log("Assignment group changed: " + this.value);
          var groupId = this.value;
          
          if (groupId) {
            loadGroupMembers(null, groupId);
            setTimeout(function() {
              loadEscalationPolicies(groupId);
            }, 300);
          } else {
            showEmptyMessage("Please select an assignment group first");
            clearPolicies();
          }
        };
        console.log("Group change handler registered");
      }
    }, 500);
    
    setTimeout(initializeForm, 800);
  });
});

/**
 * Load configuration from System Properties via AJAX
 */
function loadFlashdutyConfig(callback) {
  console.log("Loading Flashduty configuration...");
  
  var ga = new GlideAjax("FlashdutySyncHelperAjax");
  ga.addParam("sysparm_name", "getSystemConfig");
  
  ga.getXMLAnswer(function(response) {
    console.log("Config response: " + response);
    
    if (response) {
      try {
        var config = JSON.parse(response);
        flashdutyConfig.channel_id = config.channel_id || "";
        console.log("Channel ID loaded: " + flashdutyConfig.channel_id);
        
        if (!flashdutyConfig.channel_id) {
          console.warn("channel_id not configured in System Properties");
        }
      } catch(e) {
        console.error("Config parse error: " + e);
      }
    }
    
    if (callback) callback();
  });
}

/**
 * Initialize form with current incident data
 */
function initializeForm() {
  var initialGroup = document.getElementById('initial_group').value;
  var initialAssignedTo = document.getElementById('initial_assigned_to').value;
  
  console.log("Initializing form - Group: " + initialGroup + ", User: " + initialAssignedTo);
  
  if (initialGroup) {
    setGroupReferenceValue(initialGroup);
    
    setTimeout(function() {
      loadGroupMembers(initialAssignedTo, initialGroup);
    }, 300);
    
    setTimeout(function() {
      loadEscalationPolicies(initialGroup);
    }, 400);
  } else if (initialAssignedTo) {
    loadSingleUser(initialAssignedTo);
  } else {
    showEmptyMessage("Please select an assignment group first");
  }
}

/**
 * Set group reference field value
 */
function setGroupReferenceValue(groupId) {
  try {
    var groupInput = gel('group');
    if (groupInput) {
      groupInput.value = groupId;
      
      var displaySpan = gel('sys_display.group');
      if (displaySpan) {
        var ga = new GlideAjax("FlashdutySyncHelperAjax");
        ga.addParam("sysparm_name", "getGroupInfo");
        ga.addParam("sysparm_group_id", groupId);
        
        ga.getXMLAnswer(function(response) {
          if (response) {
            try {
              var info = JSON.parse(response);
              displaySpan.value = info.name;
            } catch(e) {}
          }
        });
      }
    }
  } catch(e) {
    console.error("Error setting group: " + e);
  }
}

/**
 * Load group members list
 */
function loadGroupMembers(preSelectUserId, groupId) {
  var group = groupId || gel('group').value;
  
  console.log("Loading members for group: " + group);
  
  var membersList = document.getElementById('members_list');
  if (!membersList) return;
  
  if (!group) {
    showEmptyMessage("Please select an assignment group first");
    hideSelectAll();
    return;
  }
  
  membersList.innerHTML = '<div class="fd-loading">Loading members...</div>';
  hideSelectAll();
  
  var ga = new GlideAjax("FlashdutySyncHelperAjax");
  ga.addParam("sysparm_name", "getGroupMembers");
  ga.addParam("sysparm_group", group);
  
  ga.getXMLAnswer(function(response) {
    if (response) {
      try {
        var members = JSON.parse(response);
        console.log("Found " + members.length + " members");
        
        if (members.length > 0) {
          var html = '';
          var selectAll = !preSelectUserId;
          
          for (var i = 0; i < members.length; i++) {
            var m = members[i];
            var checked = selectAll || (preSelectUserId && m.sys_id === preSelectUserId) ? 'checked' : '';
            
            html += '<div class="fd-member-item" data-user-id="' + m.sys_id + '">';
            html += '<input type="checkbox" name="member" value="' + m.sys_id + '" ' + checked + ' />';
            html += '<label>' + m.name;
            if (m.email) html += ' <span style="color:#666;font-size:0.9em">(' + m.email + ')</span>';
            html += '</label></div>';
          }
          
          membersList.innerHTML = html;
          bindMemberClickEvents();
          showSelectAll();
          updateSelectAllCheckbox();
        } else {
          showEmptyMessage("No active members in this group");
          hideSelectAll();
        }
      } catch(e) {
        showEmptyMessage("Failed to load members");
        hideSelectAll();
      }
    }
  });
}

/**
 * Bind click events for member items
 */
function bindMemberClickEvents() {
  var items = document.querySelectorAll('.fd-member-item');
  for (var i = 0; i < items.length; i++) {
    items[i].onclick = function() {
      var cb = this.querySelector('input[type="checkbox"]');
      if (cb) {
        cb.checked = !cb.checked;
        updateSelectAllCheckbox();
      }
    };
  }
}

/**
 * Bind select all checkbox event
 */
function bindSelectAllEvent() {
  var cb = document.getElementById('select_all_checkbox');
  if (cb) {
    cb.onchange = function() {
      var checkboxes = document.querySelectorAll('input[name="member"]');
      for (var i = 0; i < checkboxes.length; i++) {
        checkboxes[i].checked = this.checked;
      }
    };
  }
}

/**
 * Update select all checkbox state
 */
function updateSelectAllCheckbox() {
  var selectAll = document.getElementById('select_all_checkbox');
  var checkboxes = document.querySelectorAll('input[name="member"]');
  var checked = document.querySelectorAll('input[name="member"]:checked');
  
  if (selectAll && checkboxes.length > 0) {
    selectAll.checked = (checked.length === checkboxes.length);
  }
}

function showSelectAll() {
  var container = document.getElementById('select_all_container');
  if (container) container.style.display = 'block';
}

function hideSelectAll() {
  var container = document.getElementById('select_all_container');
  var cb = document.getElementById('select_all_checkbox');
  if (container) container.style.display = 'none';
  if (cb) cb.checked = false;
}

/**
 * Load single user (when no group selected but user assigned)
 */
function loadSingleUser(userId) {
  var membersList = document.getElementById('members_list');
  if (!membersList) return;
  
  membersList.innerHTML = '<div class="fd-loading">Loading user...</div>';
  hideSelectAll();
  
  var ga = new GlideAjax("FlashdutySyncHelperAjax");
  ga.addParam("sysparm_name", "getUserDetails");
  ga.addParam("sysparm_user_id", userId);
  
  ga.getXMLAnswer(function(response) {
    if (response) {
      try {
        var user = JSON.parse(response);
        
        var html = '<div class="fd-member-item" data-user-id="' + user.sys_id + '">';
        html += '<input type="checkbox" name="member" value="' + user.sys_id + '" checked />';
        html += '<label>' + user.name;
        if (user.email) html += ' <span style="color:#666;font-size:0.9em">(' + user.email + ')</span>';
        html += '</label></div>';
        
        membersList.innerHTML = html;
        bindMemberClickEvents();
      } catch(e) {
        showEmptyMessage("Failed to load user");
      }
    }
  });
}

function showEmptyMessage(message) {
  var membersList = document.getElementById('members_list');
  if (membersList) {
    membersList.innerHTML = '<div class="fd-empty-message">' + message + '</div>';
  }
  hideSelectAll();
}

/**
 * Load escalation policies from Flashduty
 */
function loadEscalationPolicies(groupId) {
  console.log("Loading escalation policies for group: " + groupId);
  
  var dropdown = document.getElementById('policy_dropdown');
  var searchInput = document.getElementById('policy_search');
  var hiddenInput = document.getElementById('selected_policy');
  var detailsDiv = document.getElementById('policy_details');
  
  if (!dropdown || !searchInput || !hiddenInput) return;
  
  hiddenInput.value = '';
  searchInput.value = '';
  searchInput.disabled = true;
  searchInput.placeholder = 'Loading policies...';
  if (detailsDiv) detailsDiv.style.display = 'none';
  
  if (!groupId) {
    dropdown.innerHTML = '<div class="fd-policy-no-results">Please select an assignment group</div>';
    searchInput.placeholder = 'Select a group first';
    return;
  }
  
  if (!flashdutyConfig.channel_id) {
    dropdown.innerHTML = '<div class="fd-policy-no-results">Channel ID not configured</div>';
    searchInput.placeholder = 'Configuration error';
    return;
  }
  
  dropdown.innerHTML = '<div class="fd-policy-no-results">Loading...</div>';
  
  // Get group name first
  var gaGroup = new GlideAjax("FlashdutySyncHelperAjax");
  gaGroup.addParam("sysparm_name", "getGroupInfo");
  gaGroup.addParam("sysparm_group_id", groupId);
  
  gaGroup.getXMLAnswer(function(groupResponse) {
    var groupName = '';
    if (groupResponse) {
      try {
        var info = JSON.parse(groupResponse);
        groupName = info.name || '';
      } catch(e) {}
    }
    
    // Get policies
    var ga = new GlideAjax("FlashdutySyncHelperAjax");
    ga.addParam("sysparm_name", "getExternalOptions");
    ga.addParam("sysparm_channel_id", flashdutyConfig.channel_id);
    
    ga.getXMLAnswer(function(response) {
      if (response) {
        try {
          var policies = JSON.parse(response);
          console.log("Found " + policies.length + " policies");
          
          if (policies.length > 0) {
            var sorted = sortPoliciesByRelevance(policies, groupName);
            renderPolicyDropdown(sorted, groupName);
            searchInput.disabled = false;
            searchInput.placeholder = 'Search or select policy...';
          } else {
            dropdown.innerHTML = '<div class="fd-policy-no-results">No policies available</div>';
            searchInput.placeholder = 'No policies';
          }
        } catch(e) {
          dropdown.innerHTML = '<div class="fd-policy-no-results">Failed to load policies</div>';
          searchInput.placeholder = 'Load failed';
        }
      }
    });
  });
}

/**
 * Sort policies by relevance to group name
 */
function sortPoliciesByRelevance(policies, groupName) {
  if (!groupName) return policies;
  
  var gn = groupName.toLowerCase();
  
  var withScore = policies.map(function(p) {
    var pn = p.label.toLowerCase();
    var score = 999;
    
    if (pn === gn) score = 1;
    else if (pn.indexOf(gn) !== -1) score = 2;
    else if (gn.indexOf(pn) !== -1) score = 3;
    else {
      // Check common words
      var words1 = pn.split(/[\s_-]+/);
      var words2 = gn.split(/[\s_-]+/);
      for (var i = 0; i < words1.length; i++) {
        for (var j = 0; j < words2.length; j++) {
          if (words1[i] && words2[j] && words1[i] === words2[j] && words1[i].length > 2) {
            score = 4;
            break;
          }
        }
        if (score === 4) break;
      }
    }
    
    return { policy: p, score: score };
  });
  
  withScore.sort(function(a, b) { return a.score - b.score; });
  
  return withScore.map(function(item) { return item.policy; });
}

/**
 * Render policy dropdown
 */
function renderPolicyDropdown(policies, groupName) {
  var dropdown = document.getElementById('policy_dropdown');
  if (!dropdown) return;
  
  var gn = groupName ? groupName.toLowerCase() : '';
  var html = '';
  
  for (var i = 0; i < policies.length; i++) {
    var p = policies[i];
    var pn = p.label.toLowerCase();
    var badge = '';
    
    // Check if relevant
    if (gn && (pn === gn || pn.indexOf(gn) !== -1 || gn.indexOf(pn) !== -1)) {
      badge = '<span class="fd-recommended-badge">Recommended</span>';
    }
    
    html += '<div class="fd-policy-option" data-value="' + p.value + '" ';
    html += 'data-label="' + p.label + '" ';
    html += "data-layers='" + JSON.stringify(p.layers || []) + "'>";
    html += p.label + badge + '</div>';
  }
  
  dropdown.innerHTML = html;
  
  // Bind click events
  var options = dropdown.querySelectorAll('.fd-policy-option');
  for (var j = 0; j < options.length; j++) {
    options[j].onclick = function() { selectPolicy(this); };
  }
}

/**
 * Select a policy
 */
function selectPolicy(element) {
  var value = element.getAttribute('data-value');
  var label = element.getAttribute('data-label');
  var layersJson = element.getAttribute('data-layers');
  
  var searchInput = document.getElementById('policy_search');
  var hiddenInput = document.getElementById('selected_policy');
  var dropdown = document.getElementById('policy_dropdown');
  
  if (searchInput && hiddenInput && dropdown) {
    searchInput.value = label;
    hiddenInput.value = value;
    dropdown.classList.remove('show');
    
    // Mark selected
    var options = dropdown.querySelectorAll('.fd-policy-option');
    for (var i = 0; i < options.length; i++) {
      options[i].classList.remove('selected');
    }
    element.classList.add('selected');
    
    // Show details
    try {
      var layers = JSON.parse(layersJson);
      displayPolicyDetails(layers);
    } catch(e) {}
  }
}

/**
 * Global state for async name fetching
 */
var _policyDetailState = {
  pendingRequests: 0,
  layers: [],
  personMap: {},
  teamMap: {},
  scheduleMap: {}
};

/**
 * Display escalation policy details with persons, teams, and schedules
 */
function displayPolicyDetails(layers) {
  var detailsDiv = document.getElementById('policy_details');
  var detailsContent = document.getElementById('policy_details_content');
  
  if (!detailsDiv || !detailsContent || !layers || layers.length === 0) {
    if (detailsDiv) detailsDiv.style.display = 'none';
    return;
  }
  
  detailsContent.innerHTML = '<div class="fd-loading">Loading escalation path...</div>';
  detailsDiv.style.display = 'block';
  
  // Reset state
  _policyDetailState.pendingRequests = 0;
  _policyDetailState.layers = layers;
  _policyDetailState.personMap = {};
  _policyDetailState.teamMap = {};
  _policyDetailState.scheduleMap = {};
  
  // Collect all IDs from all layers
  var personIds = [];
  var teamIds = [];
  var scheduleIds = [];
  
  for (var i = 0; i < layers.length; i++) {
    var layer = layers[i];
    if (layer.target) {
      if (layer.target.person_ids) {
        for (var j = 0; j < layer.target.person_ids.length; j++) {
          if (personIds.indexOf(layer.target.person_ids[j]) === -1) {
            personIds.push(layer.target.person_ids[j]);
          }
        }
      }
      if (layer.target.team_ids) {
        for (var k = 0; k < layer.target.team_ids.length; k++) {
          if (teamIds.indexOf(layer.target.team_ids[k]) === -1) {
            teamIds.push(layer.target.team_ids[k]);
          }
        }
      }
      if (layer.target.schedule_to_role_ids) {
        for (var scheduleId in layer.target.schedule_to_role_ids) {
          if (layer.target.schedule_to_role_ids.hasOwnProperty(scheduleId)) {
            if (scheduleIds.indexOf(scheduleId) === -1) {
              scheduleIds.push(scheduleId);
            }
          }
        }
      }
    }
  }
  
  var hasTargets = personIds.length > 0 || teamIds.length > 0 || scheduleIds.length > 0;
  if (!hasTargets) {
    detailsContent.textContent = 'No escalation targets defined';
    return;
  }
  
  // Fetch person names
  if (personIds.length > 0) {
    _policyDetailState.pendingRequests++;
    var gaPersons = new GlideAjax("FlashdutySyncHelperAjax");
    gaPersons.addParam("sysparm_name", "getPersonNames");
    gaPersons.addParam("sysparm_person_ids", personIds.join(','));
    gaPersons.getXMLAnswer(onPersonNamesLoaded);
  }
  
  // Fetch team names
  if (teamIds.length > 0) {
    _policyDetailState.pendingRequests++;
    var gaTeams = new GlideAjax("FlashdutySyncHelperAjax");
    gaTeams.addParam("sysparm_name", "getTeamNames");
    gaTeams.addParam("sysparm_team_ids", teamIds.join(','));
    gaTeams.getXMLAnswer(onTeamNamesLoaded);
  }
  
  // Fetch schedule names
  if (scheduleIds.length > 0) {
    _policyDetailState.pendingRequests++;
    var gaSchedules = new GlideAjax("FlashdutySyncHelperAjax");
    gaSchedules.addParam("sysparm_name", "getScheduleNames");
    gaSchedules.addParam("sysparm_schedule_ids", scheduleIds.join(','));
    gaSchedules.getXMLAnswer(onScheduleNamesLoaded);
  }
  
  // If no async requests needed, render immediately
  if (_policyDetailState.pendingRequests === 0) {
    renderPolicyDetailsContent();
  }
}

function onPersonNamesLoaded(response) {
  if (response) {
    try {
      var persons = JSON.parse(response);
      for (var i = 0; i < persons.length; i++) {
        _policyDetailState.personMap[String(persons[i].id)] = persons[i].name;
      }
    } catch(e) { 
      console.error("Error parsing persons: " + e); 
    }
  }
  _policyDetailState.pendingRequests--;
  checkPolicyDetailsComplete();
}

function onTeamNamesLoaded(response) {
  if (response) {
    try {
      var teams = JSON.parse(response);
      for (var i = 0; i < teams.length; i++) {
        _policyDetailState.teamMap[String(teams[i].id)] = teams[i].name;
      }
    } catch(e) { 
      console.error("Error parsing teams: " + e); 
    }
  }
  _policyDetailState.pendingRequests--;
  checkPolicyDetailsComplete();
}

function onScheduleNamesLoaded(response) {
  if (response) {
    try {
      var schedules = JSON.parse(response);
      for (var i = 0; i < schedules.length; i++) {
        _policyDetailState.scheduleMap[String(schedules[i].id)] = schedules[i].name;
      }
    } catch(e) { 
      console.error("Error parsing schedules: " + e); 
    }
  }
  _policyDetailState.pendingRequests--;
  checkPolicyDetailsComplete();
}

function checkPolicyDetailsComplete() {
  if (_policyDetailState.pendingRequests === 0) {
    renderPolicyDetailsContent();
  }
}

/**
 * Render policy details content after all names are fetched
 */
function renderPolicyDetailsContent() {
  var detailsContent = document.getElementById('policy_details_content');
  if (!detailsContent) return;
  
  var layers = _policyDetailState.layers;
  var personMap = _policyDetailState.personMap;
  var teamMap = _policyDetailState.teamMap;
  var scheduleMap = _policyDetailState.scheduleMap;
  
  var html = '<div class="fd-escalation-path"><strong>Escalation Path:</strong>';
  var cumTime = 0;
  
  for (var i = 0; i < layers.length; i++) {
    var layer = layers[i];
    var targetNames = [];
    
    // Collect person names
    if (layer.target && layer.target.person_ids) {
      for (var j = 0; j < layer.target.person_ids.length; j++) {
        var pid = String(layer.target.person_ids[j]);
        targetNames.push(personMap[pid] || pid);
      }
    }
    
    // Collect team names
    if (layer.target && layer.target.team_ids) {
      for (var k = 0; k < layer.target.team_ids.length; k++) {
        var tid = String(layer.target.team_ids[k]);
        var teamName = teamMap[tid] || ('Team ' + tid);
        targetNames.push('<span class="fd-team-badge">' + teamName + '</span>');
      }
    }
    
    // Collect schedule names
    if (layer.target && layer.target.schedule_to_role_ids) {
      for (var scheduleId in layer.target.schedule_to_role_ids) {
        if (layer.target.schedule_to_role_ids.hasOwnProperty(scheduleId)) {
          var scheduleName = scheduleMap[String(scheduleId)] || ('Schedule ' + scheduleId);
          targetNames.push('<span class="fd-schedule-badge">' + scheduleName + '</span>');
        }
      }
    }
    
    var targetDisplay = targetNames.length > 0 ? targetNames.join(', ') : 'Not specified';
    html += '<div class="fd-layer-item">' + cumTime + ' minutes after incident remains open, escalate to ' + targetDisplay + '</div>';
    cumTime += layer.escalate_window || 0;
  }
  
  html += '</div>';
  detailsContent.innerHTML = html;
}

function clearPolicies() {
  var dropdown = document.getElementById('policy_dropdown');
  var searchInput = document.getElementById('policy_search');
  var hiddenInput = document.getElementById('selected_policy');
  var detailsDiv = document.getElementById('policy_details');
  
  if (dropdown) dropdown.innerHTML = '<div class="fd-policy-no-results">Please select an assignment group</div>';
  if (searchInput) {
    searchInput.value = '';
    searchInput.disabled = true;
    searchInput.placeholder = 'Select a group first';
  }
  if (hiddenInput) hiddenInput.value = '';
  if (detailsDiv) detailsDiv.style.display = 'none';
}

/**
 * Bind policy search events
 */
function bindPolicySearchEvents() {
  var searchInput = document.getElementById('policy_search');
  var dropdown = document.getElementById('policy_dropdown');
  
  if (!searchInput || !dropdown) return;
  
  searchInput.onfocus = function() {
    if (!this.disabled) dropdown.classList.add('show');
  };
  
  searchInput.oninput = function() {
    var term = this.value.toLowerCase();
    var options = dropdown.querySelectorAll('.fd-policy-option');
    var hasVisible = false;
    
    for (var i = 0; i < options.length; i++) {
      var label = options[i].getAttribute('data-label').toLowerCase();
      if (!term || label.indexOf(term) !== -1) {
        options[i].classList.remove('hidden');
        hasVisible = true;
      } else {
        options[i].classList.add('hidden');
      }
    }
    
    var noResults = dropdown.querySelector('.fd-policy-no-results');
    if (noResults) {
      noResults.style.display = hasVisible ? 'none' : 'block';
      noResults.textContent = 'No matching policies';
    }
    
    dropdown.classList.add('show');
  };
  
  document.addEventListener('click', function(e) {
    if (e.target !== searchInput && !dropdown.contains(e.target)) {
      dropdown.classList.remove('show');
    }
  });
}

/**
 * Bind notification type checkbox events
 */
function bindNotifyTypeEvents() {
  var options = document.querySelectorAll('.fd-notify-option');
  for (var i = 0; i < options.length; i++) {
    options[i].onclick = function() {
      var cb = this.querySelector('input[type="checkbox"]');
      if (cb) {
        cb.checked = !cb.checked;
        this.classList.toggle('checked', cb.checked);
      }
    };
  }
}

/**
 * Bind submit button event
 */
function bindSubmitEvent() {
  var btn = document.getElementById('submit_btn');
  if (btn) {
    btn.onclick = submitForm;
  }
}

/**
 * Submit form to Flashduty
 */
function submitForm() {
  console.log("=== Submitting to Flashduty ===");
  
  var sysId = document.getElementById('incident_sys_id').value;
  var initialGroup = document.getElementById('initial_group').value;
  var groupInput = gel('group');
  var group = initialGroup || (groupInput ? groupInput.value : '');
  var policyId = document.getElementById('selected_policy').value;
  
  // Validate sys_id
  if (!sysId || sysId.length != 32) {
    alert("Invalid incident ID. Please refresh and try again.");
    return;
  }
  
  // Get selected notification types
  var typeCheckboxes = document.querySelectorAll('input[name="notify_type"]:checked');
  var types = [];
  for (var i = 0; i < typeCheckboxes.length; i++) {
    types.push(typeCheckboxes[i].value);
  }
  var notifyType = types.join(',');
  
  if (!notifyType) {
    alert("Please select at least one notification type.");
    return;
  }
  
  // Get selected members
  var memberCheckboxes = document.querySelectorAll('input[name="member"]:checked');
  var members = [];
  for (var j = 0; j < memberCheckboxes.length; j++) {
    members.push(memberCheckboxes[j].value);
  }
  var membersStr = members.join(',');
  
  if (!membersStr) {
    alert("Please select at least one member to notify.");
    return;
  }
  
  // Disable button
  var btn = document.getElementById('submit_btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Sending...';
  }
  
  // Send request
  var ga = new GlideAjax("FlashdutySyncHelperAjax");
  ga.addParam("sysparm_name", "sendWebhook");
  ga.addParam("sysparm_sys_id", sysId);
  ga.addParam("sysparm_group", group || "");
  ga.addParam("sysparm_notify_type", notifyType);
  ga.addParam("sysparm_members", membersStr);
  ga.addParam("sysparm_external_option", policyId);
  
  ga.getXMLAnswer(function(response) {
    console.log("Response: " + response);
    
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Send to Flashduty';
    }
    
    if (response && response.indexOf("Success") >= 0) {
      alert("Successfully sent to Flashduty!");
      closeDialog();
    } else {
      alert("Failed to send. Check system logs.\n\n" + response);
    }
  });
}

/**
 * Close the dialog
 */
function closeDialog() {
  try {
    if (window.parent && window.parent.document) {
      var modal = window.parent.document.querySelector('.modal');
      var backdrop = window.parent.document.querySelector('.modal-backdrop');
      
      if (modal) modal.parentNode.removeChild(modal);
      if (backdrop) backdrop.parentNode.removeChild(backdrop);
      
      var body = window.parent.document.body;
      if (body) {
        body.classList.remove('modal-open');
        body.style.overflow = '';
        body.style.paddingRight = '';
      }
    }
  } catch(e) {
    console.error("Error closing dialog: " + e);
  }
}

