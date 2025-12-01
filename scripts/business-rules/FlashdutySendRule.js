/**
 * Business Rule: FlashdutySendRule
 * 
 * Purpose: Send incident data to Flashduty via webhook when incident is resolved or closed
 * 
 * ServiceNow Configuration:
 * - Name: Send to Flashduty
 * - Table: Incident [incident]
 * - Checkboxes: Advanced (checked), Active (checked)
 * - When: async
 * - Checkboxes: Update (checked)
 * - Filter Conditions: incident state is resolved or closed
 */

(function executeRule(current) {
    var push_url = gs.getProperty('flashduty.push_url', '');   
    var body = {
      number: current.getValue("number"),
      sys_id: current.getUniqueValue(),
      state: current.getDisplayValue("state")
    };
  
    try {
      var request = new sn_ws.RESTMessageV2();
      request.setHttpMethod("POST");
      request.setEndpoint(push_url);
      request.setRequestHeader("Content-Type", "application/json");
      request.setRequestBody(JSON.stringify(body));
      request.executeAsync();
    } catch (ex) {
      gs.error("Error sending webhook: " + ex.message);
    }
  })(current);

