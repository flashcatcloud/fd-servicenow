/**
 * UI Action: Send to Flashduty
 * 
 * Purpose: Button on Incident form to trigger Flashduty notification dialog
 * 
 * ServiceNow Configuration:
 * - Name: Send to Flashduty
 * - Table: Incident [incident]
 * - Action name: flashduty_send
 * - Onclick: flashdutySendNotification();
 * - Show insert: true
 * - Show update: true
 * - Form button: true
 * - Client: true
 * - List v2/3 Compatible: true
 * - Protection policy: itil
 * 
 * Note: This script goes in the "Script" field of the UI Action
 */

function flashdutySendNotification() {
  var sysId = g_form.getUniqueValue();
  
  console.log("=== Flashduty Send Button Clicked ===");
  console.log("Incident sys_id: " + sysId);
  
  // Validate record is saved
  if (g_form.isNewRecord()) {
    alert("Please save the incident before sending to Flashduty.");
    return false;
  }
  
  // Validate sys_id
  if (!sysId || sysId == '-1' || sysId.length != 32) {
    alert("Unable to get incident ID. Please refresh and try again.");
    return false;
  }
  
  // Get current assignment info
  var assignmentGroup = g_form.getValue('assignment_group');
  var assignedTo = g_form.getValue('assigned_to');
  
  console.log("Assignment Group: " + assignmentGroup);
  console.log("Assigned To: " + assignedTo);
  
  // Open notification dialog
  var timestamp = new Date().getTime();
  var dialog = new GlideDialogForm('Send to Flashduty', 'flashduty_notification_form');
  
  dialog.addParm('incident_sys_id', sysId);
  dialog.addParm('assignment_group', assignmentGroup || '');
  dialog.addParm('assigned_to', assignedTo || '');
  dialog.addParm('_ts', timestamp);
  
  dialog.setPreference('sysparm_width', '750');
  dialog.setPreference('sysparm_height', 'auto');
  
  dialog.render();
}

