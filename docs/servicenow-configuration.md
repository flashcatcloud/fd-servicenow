# Flashduty ServiceNow Integration Guide

This guide provides complete step-by-step instructions for integrating ServiceNow Incidents with Flashduty for centralized alert management and on-call notifications.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Part 1: ServiceNow User Setup](#part-1-servicenow-user-setup)
3. [Part 2: Flashduty Configuration](#part-2-flashduty-configuration)
4. [Part 3: ServiceNow Integration Configuration](#part-3-servicenow-configuration)
5. [Part 4: Testing & Validation](#part-4-testing--validation)
6. [Part 5: Troubleshooting](#part-5-troubleshooting)
7. [Component Reference](#component-reference)

---

## Prerequisites

Before beginning installation, verify you have:

- [ ] **ServiceNow Instance**: Paris release or newer (tested on Tokyo, Utah, Vancouver)
- [ ] **ServiceNow Admin Access**: `admin` role or equivalent permissions
- [ ] **Flashduty Account**: Active account with administrative privileges
- [ ] **Flashduty Channel**: Collaboration space created for ServiceNow incidents
- [ ] **Network Connectivity**: Outbound HTTPS (port 443) access from ServiceNow to Flashduty API
- [ ] **Time Estimate**: 25-30 minutes for complete setup

---

## Part 1: ServiceNow User Setup

Create a dedicated service account for the integration. This ensures proper audit trails and security isolation.

> 💡 **Skip this section** if you already have a service account with appropriate permissions.

### 1.1 Create Integration User

1. Navigate to **Organization** → **Users**
   - Shortcut: Type `users` in the Application Navigator
2. Click **New** to create a new user
3. Configure the user:
   
   | Field | Value |
   |-------|-------|
   | **User ID** | `flashduty` |
   | **First name** | `Flashduty` |
   | **Last name** | `Integration` |
   | **Password needs reset** | ⬜ Unchecked |
   | **Web service access only** | ⬜ Unchecked |
   | **Internal Integration User** | ✅ Checked |

4. Click **Submit**

### 1.2 Configure User Permissions

1. Locate the newly created `flashduty` user in the list
2. Click to open the user record
3. **Set Password**:
   - Click the **Set Password** button
   - Enter a strong password and save securely
4. **Assign Roles**:
   - Click the **Roles** tab
   - Add the following roles:
     - `itil` - Required for incident management access
     - `personalize_dictionary` - Optional, only if custom field mappings needed
5. Click **Update** to save changes

> 🔒 **Security Note**: Store the password in a secure password manager. Consider enabling MFA if available.

---

## Part 2: Flashduty Configuration

Configure Flashduty to accept incidents from ServiceNow and route them appropriately.

### 2.1 Create App Key

The App Key authenticates ServiceNow's API requests to Flashduty.

1. Log in to [Flashduty Console](https://console.flashcat.cloud)
2. Navigate to **Platform** → **App Key** (bottom-left sidebar)
3. Click **Add App Key** (or the "➕" button)
4. Configure:
   - **Name**: `ServiceNow Integration`
   - **Description**: `API authentication for ServiceNow incident synchronization`
5. Click **Save**
6. **⚠️ IMPORTANT**: Copy and securely save the generated App Key
   - You cannot retrieve this key later
   - Store it in a password manager


### 2.2 Obtain Channel ID

The Channel ID determines where ServiceNow incidents are routed in Flashduty.

1. Navigate to **Collaboration Spaces** in Flashduty
2. Select or create a channel for ServiceNow incidents
   - Recommended name: `ServiceNow Incidents`
3. Click on the channel to open it
4. Copy the **Channel ID** from the browser URL bar
   - URL format: `https://console.flashcat.cloud/channel/{CHANNEL_ID}/...`
   - The Channel ID is a numeric value (e.g., `12345678`)

### 2.3 Create ServiceNow Webhook Integration

This integration provides the webhook endpoint for incident synchronization.

1. Navigate to **Integrations** → **Webhook**
2. Search for **ServiceNow** in the integration catalog
3. Click **Create** and configure:
   
   | Setting | Value |
   |---------|-------|
   | **Integration Name** | `ServiceNow Production` |
   | **Channel** | Select your channel from step 2.2 |
   | **Sync Option** | Bidirectional (recommended) |

4. Click **Save**
5. **Copy the Push URL** from the integration details page
   - Format: `https://api.flashcat.cloud/event/push/servicenow/{TOKEN}`

### 2.4 (Optional) Configure Microsoft Teams Integration

Enable Microsoft Teams notifications for alerts.

> ⏭️ **Skip this section** if you don't need Teams notifications.

1. Navigate to **Integrations** → **Instant Message**
2. Find and select **Microsoft Teams**
3. Follow the Microsoft Teams integration wizard:
   - Install the Flashduty app in your Teams workspace
   - Authorize the necessary permissions
   - Select target channels
4. Once complete, **copy the Integration ID** from the URL:
   - URL format: `https://console.flashcat.cloud/settings/integration/teams/{INTEGRATION_ID}`

### 2.5 Determine API Domain

Identify the correct API domain for your Flashduty deployment:

| Deployment Type | API Domain |
|----------------|------------|
| **SaaS (Global)** | `api.flashcat.cloud` |
| **On-Premise** | *Your custom domain* |

### Summary: Configuration Values

Before proceeding to ServiceNow configuration, collect these values:

| Item | Example | Used In |
|------|---------|---------|
| ✅ **App Key** | `fd_app_abc123...` | `flashduty.app_key` |
| ✅ **API Domain** | `api.flashcat.cloud` | `flashduty.api_domain` |
| ✅ **Push URL** | `https://api.flashcat.cloud/event/push/servicenow/...` | `flashduty.push_url` |
| ✅ **Channel ID** | `12345678` | `flashduty.channel_id` |
| ⚪ **Teams ID** | `87654321` | `flashduty.teams_id` (optional) |

---

## Part 3: ServiceNow Configuration

Configure ServiceNow components to enable communication with Flashduty.

**Estimated Time**: 15-20 minutes

### 3.1 Create System Properties

System Properties store configuration values securely within ServiceNow.

**Navigation**: **System Definition** → **System Properties** → **New**

Direct URL: `https://YOUR_INSTANCE.service-now.com/sys_properties_list.do`

Create **five** System Properties using the values collected in [Part 2.5](#summary-configuration-values):

---

#### Property 1: flashduty.app_key ⭐ Required

Authenticates API requests from ServiceNow to Flashduty.

| Field | Value |
|-------|-------|
| **Name** | `flashduty.app_key` |
| **Type** | `password` *(strongly recommended)* |
| **Value** | *Your App Key from Part 2.1* |
| **Description** | `Flashduty OpenAPI App Key for API authentication` |
| **Private** | ✅ Checked *(recommended for security)* |
| **Application** | Global |

> 🔒 **Security**: Using type `password` and checking `Private` prevents the key from being visible in client-side code or logs.

---

#### Property 2: flashduty.api_domain ⭐ Required

Specifies the Flashduty API endpoint domain.

| Field | Value |
|-------|-------|
| **Name** | `flashduty.api_domain` |
| **Type** | `string` |
| **Value** | *Your API domain from Part 2.5* (e.g., `api.flashcat.cloud`) |
| **Description** | `Flashduty API domain for REST API calls` |
| **Application** | Global |

---

#### Property 3: flashduty.push_url ⭐ Required

Webhook URL for pushing incident data to Flashduty.

| Field | Value |
|-------|-------|
| **Name** | `flashduty.push_url` |
| **Type** | `string` |
| **Value** | *Your Push URL from Part 2.3* |
| **Description** | `Flashduty webhook URL for incident synchronization` |
| **Application** | Global |

> 📝 **Note**: The Push URL contains authentication tokens. Do not share publicly.

---

#### Property 4: flashduty.channel_id ⭐ Required

Routes incidents to the correct Flashduty channel.

| Field | Value |
|-------|-------|
| **Name** | `flashduty.channel_id` |
| **Type** | `string` |
| **Value** | *Your Channel ID from Part 2.2* (numeric string, e.g., `12345678`) |
| **Description** | `Flashduty Channel ID for incident routing` |
| **Application** | Global |

---

#### Property 5: flashduty.teams_id ⚪ Optional

Microsoft Teams integration identifier for Teams notifications.

| Field | Value |
|-------|-------|
| **Name** | `flashduty.teams_id` |
| **Type** | `string` |
| **Value** | *Your Teams Integration ID from Part 2.4* (or leave empty) |
| **Description** | `Microsoft Teams Integration ID for notification delivery` |
| **Application** | Global |

> ⏭️ **Skip** if not using Teams notifications.

---

### 3.2 Create Script Include: FlashdutySyncHelper

Handles server-side webhook communication with Flashduty.

**Navigation**: **System Definition** → **Script Includes** → **New**

| Field | Value |
|-------|-------|
| **Name** | `FlashdutySyncHelper` |
| **API Name** | `global.FlashdutySyncHelper` |
| **Accessible from** | `All application scopes` |
| **Active** | ✅ Checked |
| **Client callable** | ⬜ Unchecked |
| **Protection policy** | `itil` |
| **Description** | `Server-side helper for Flashduty incident webhook integration` |

**Script**: Copy the entire contents from:
```
scripts/script-includes/FlashdutySyncHelper.js
```

💡 **Implementation Note**: This component includes enhanced error reporting that returns detailed error messages to the client.

---

### 3.3 Create Script Include: FlashdutySyncHelperAjax

Provides client-callable AJAX endpoints for the notification dialog.

**Navigation**: **System Definition** → **Script Includes** → **New**

| Field | Value |
|-------|-------|
| **Name** | `FlashdutySyncHelperAjax` |
| **API Name** | `global.FlashdutySyncHelperAjax` |
| **Accessible from** | `All application scopes` |
| **Active** | ✅ Checked |
| **Client callable** | ✅ **Checked** *(Critical - enables AJAX calls from UI)* |
| **Protection policy** | `itil` |
| **Description** | `Client-callable AJAX processor for Flashduty notification dialog` |

**Script**: Copy the entire contents from:
```
scripts/script-includes/FlashdutySyncHelperAjax.js
```

> ⚠️ **Important**: Ensure "Client callable" is checked. The UI Page cannot function without this.

---

### 3.4 Create UI Page: flashduty_notification_form

Provides the notification dialog interface with escalation policy selection.

**Navigation**: **System UI** → **UI Pages** → **New**

| Field | Value |
|-------|-------|
| **Name** | `flashduty_notification_form` |
| **Category** | `General` |
| **Protection policy** | `itil` |
| **Description** | `Notification dialog for sending incidents to Flashduty` |

**Configuration Steps**:

1. **HTML Field**: 
   - Copy the entire contents from `scripts/ui-pages/flashduty_notification_form.html`
   - This includes styles and form structure

2. **Client Script Field**: 
   - Copy the entire contents from `scripts/ui-pages/flashduty_notification_form_client.js`
   - This includes dialog logic, escalation policy loading, and form handling

3. Click **Submit** to save

**Features Included**:
- ✅ Group-based member selection with auto-loading
- ✅ Dynamic escalation policy dropdown with smart recommendations
- ✅ Visual escalation path preview
- ✅ Multi-channel notification selection (SMS, Voice, Teams, Email)
- ✅ Clear button for policy deselection
- ✅ Auto-closing dialog on success
- ✅ Inline error reporting with detailed messages

---

### 3.5 Create UI Action: Send to Flashduty

Adds the "Send to Flashduty" button to the Incident form.

**Navigation**: **System Definition** → **UI Actions** → **New**

| Field | Value |
|-------|-------|
| **Name** | `Send to Flashduty` |
| **Table** | `Incident [incident]` |
| **Action name** | `flashduty_send` |
| **Active** | ✅ Checked |
| **Show insert** | ✅ Checked *(enable on new records)* |
| **Show update** | ✅ Checked *(enable on existing records)* |
| **Client** | ✅ Checked *(client-side script)* |
| **Form button** | ✅ Checked *(display as button)* |
| **Form context menu** | ⬜ Unchecked |
| **List v2/3 Compatible** | ✅ Checked |
| **List button** | ⬜ Unchecked |
| **Onclick** | `flashdutySendNotification();` |
| **Protection policy** | `itil` |
| **Order** | `100` *(adjust to position button as desired)* |

**Script Field**: Copy the entire contents from:
```
scripts/ui-actions/FlashdutySendButton.js
```

**Validations Included**:
- ✅ Prevents submission of unsaved records
- ✅ Validates sys_id before opening dialog
- ✅ Passes assignment group and assigned user to dialog

---

### 3.6 Create Business Rule: Auto-Sync on Resolution

Automatically synchronizes incidents to Flashduty when resolved or closed.

**Navigation**: **System Definition** → **Business Rules** → **New**

| Field | Value |
|-------|-------|
| **Name** | `Flashduty Auto-Sync on Resolution` |
| **Table** | `Incident [incident]` |
| **Active** | ✅ Checked |
| **Advanced** | ✅ Checked |
| **When** | `async` *(run asynchronously to avoid blocking)* |
| **Insert** | ⬜ Unchecked |
| **Update** | ✅ Checked |
| **Delete** | ⬜ Unchecked |
| **Filter Conditions** | `State` **is** `Resolved` **OR** `State` **is** `Closed` |

**Script Field**: Copy the entire contents from:
```
scripts/business-rules/FlashdutySendRule.js
```

**Behavior**:
- Triggers when incident state changes to Resolved or Closed
- Automatically sends incident update to Flashduty
- Runs asynchronously to prevent UI blocking

> 💡 **Optional**: Disable this Business Rule if you only want manual incident dispatch.

---

### 3.7 Configuration Verification

Before testing, verify all components are configured:

**Checklist**:
- ✅ 5 System Properties created (4 required + 1 optional)
- ✅ 2 Script Includes created (`FlashdutySyncHelper` and `FlashdutySyncHelperAjax`)
- ✅ 1 UI Page created (`flashduty_notification_form`)
- ✅ 1 UI Action created (button on Incident form)
- ✅ 1 Business Rule created (auto-sync on resolution)

---

## Part 4: Testing

### 4.1 Verify System Properties

1. Navigate to **System Definition** → **Scripts - Background**
2. Run this test script:

```javascript
gs.info("=== Flashduty Configuration Test ===");
gs.info("API Domain: " + gs.getProperty('flashduty.api_domain'));
gs.info("App Key: " + (gs.getProperty('flashduty.app_key') ? 'Configured' : 'NOT SET'));
gs.info("Push URL: " + (gs.getProperty('flashduty.push_url') ? 'Configured' : 'NOT SET'));
gs.info("Channel ID: " + gs.getProperty('flashduty.channel_id'));
gs.info("Teams ID: " + gs.getProperty('flashduty.teams_id'));
```

### 4.2 Test the Integration

1. Open an existing Incident
2. Click **Send to Flashduty** button
3. Select an Assignment Group (members should auto-load)
4. Choose notification members
5. Select notification types (SMS, Voice, Teams, Email)
6. *(Optional)* Select an Escalation Policy to preview escalation path
7. Click **Send to Flashduty**
8. Verify success message and dialog auto-closes

### 4.3 Verify in Flashduty

1. Log in to Flashduty Console
2. Navigate to your configured Channel
3. Verify the incident appears with correct details
4. Check that notifications were sent to selected members

---

## Part 5: Troubleshooting

Common issues and their solutions.

### HTTP Status 0 / Connection Issues

**Symptoms**:
- API calls fail with HTTP status 0
- Error: "Connection refused" or "Network error"

**Solutions**:
1. Verify SSL certificate is trusted by ServiceNow (**System Security** → **Certificate Management**)
2. Test network connectivity to Flashduty API domain
3. Check firewall rules allow outbound HTTPS (port 443)
4. Ensure API domain is correct (e.g., `api.flashcat.cloud` without `https://`)

---

### Escalation Policies Not Loading

**Symptoms**:
- Empty policy dropdown
- "No policies available" message

**Solutions**:
1. Verify `flashduty.app_key` is correctly configured
2. Check `flashduty.channel_id` matches your Flashduty channel
3. Review **System Logs** → **Application Logs** for API errors
4. Verify App Key has necessary permissions in Flashduty

---

### "Send to Flashduty" Button Not Visible

**Symptoms**:
- Button doesn't appear on Incident form

**Solutions**:
1. Verify UI Action is **Active**
2. Check **Table** is set to `Incident [incident]`
3. Ensure **Form button** checkbox is checked
4. Verify user has `itil` role
5. Clear browser cache and refresh

---

### Members List Not Loading

**Symptoms**:
- Members list shows loading spinner indefinitely
- Shows "Please select an assignment group" even after selection

**Solutions**:
1. Verify `FlashdutySyncHelperAjax` has **Client callable** checked
2. Check browser console for JavaScript errors (F12)
3. Test AJAX endpoint in Scripts - Background
4. Clear browser cache

---

### Error: "Failed to send..."

**Symptoms**:
- Alert shows error message with HTTP details

**Solutions**:
1. Check **System Logs** → **Application Logs** (filter by "FlashdutySyncHelper")
2. Verify `flashduty.push_url` is correctly configured
3. Check webhook URL is valid in Flashduty integration
4. Review detailed error message in alert dialog for specific cause

**Common Error Codes**:
- **HTTP 400**: Invalid payload format
- **HTTP 401**: Authentication failed (check Push URL)
- **HTTP 500**: Flashduty API error (contact support)

---

### Escalation Path Shows IDs Instead of Names

**Symptoms**:
- Displays "Person 123456" instead of names

**Solutions**:
1. Check browser console for API error messages
2. Verify App Key has permissions to read Persons/Teams/Schedules
3. Check network connectivity to Flashduty API
4. Review System Logs for API call failures

---

### Dialog Doesn't Close After Success

**Symptoms**:
- Success alert appears but dialog remains open

**Solutions**:
1. Check browser console for JavaScript errors
2. Try a different browser (Chrome, Firefox, Edge recommended)
3. Clear browser cache and test again
4. Check console logs for "Attempting to close dialog" messages

---

### Configuration Not Found

**Symptoms**:
- Channel ID or other values are empty

**Solutions**:
1. Navigate to **System Properties** and verify each property exists
2. Check property names match exactly (case-sensitive):
   - `flashduty.app_key`
   - `flashduty.api_domain`
   - `flashduty.push_url`
   - `flashduty.channel_id`
   - `flashduty.teams_id`
3. Ensure properties have non-empty values
4. Run configuration test script (Part 4.1)

---

### Permission Issues

**Symptoms**:
- Cannot create or modify System Properties

**Solutions**:
1. Ensure you have the `admin` role
2. Check ACL rules for `sys_properties` table
3. Contact ServiceNow administrator for assistance

---

## Component Reference

Complete listing of all integration components and their purposes.

### System Properties

| Property Name | Type | Required | Description | Example Value |
|--------------|------|----------|-------------|---------------|
| `flashduty.app_key` | password | ✅ Yes | Flashduty OpenAPI authentication key | `fd_app_xxx...` |
| `flashduty.api_domain` | string | ✅ Yes | Flashduty API endpoint domain | `api.flashcat.cloud` |
| `flashduty.push_url` | string | ✅ Yes | Webhook URL for incident push | `https://api.flashcat.cloud/event/push/servicenow/...` |
| `flashduty.channel_id` | string | ✅ Yes | Target channel ID in Flashduty | `12345678` |
| `flashduty.teams_id` | string | ⚪ No | Microsoft Teams integration ID | `87654321` |

### Script Includes

| Name | Client Callable | Purpose | Key Methods |
|------|-----------------|---------|-------------|
| `FlashdutySyncHelper` | ❌ No | Server-side webhook and API integration | `sendIncidentWebhook()` |
| `FlashdutySyncHelperAjax` | ✅ Yes | Client-callable AJAX endpoints | `sendWebhook()`, `getGroupMembers()`, `getExternalOptions()`, `getPersonNames()`, `getTeamNames()`, `getScheduleNames()` |

### UI Components

| Component Type | Name | Purpose | Features |
|---------------|------|---------|----------|
| UI Page | `flashduty_notification_form` | Notification dialog interface | Member selection, escalation policy picker, multi-channel notifications |
| UI Page Client Script | (embedded) | Dialog client-side logic | AJAX communication, form validation, auto-closing |
| UI Action | `Send to Flashduty` | Incident form button | Opens notification dialog, pre-fills data |

### Business Rules

| Name | Table | When | Trigger | Purpose |
|------|-------|------|---------|---------|
| `Flashduty Auto-Sync on Resolution` | Incident | async | Update: State = Resolved or Closed | Automatically sync resolved incidents to Flashduty |

### File Structure Reference

```
📁 Project Root
├── 📄 README.md
├── 📁 docs/
│   └── 📄 servicenow-configuration.md (this file)
└── 📁 scripts/
    ├── 📁 business-rules/
    │   └── 📄 FlashdutySendRule.js
    ├── 📁 script-includes/
    │   ├── 📄 FlashdutySyncHelper.js
    │   └── 📄 FlashdutySyncHelperAjax.js
    ├── 📁 ui-actions/
    │   └── 📄 FlashdutySendButton.js
    └── 📁 ui-pages/
        ├── 📄 flashduty_notification_form.html
        └── 📄 flashduty_notification_form_client.js
```

### API Endpoints Used

| Flashduty API | Purpose | Method | Script Include |
|---------------|---------|--------|----------------|
| `/event/push/servicenow/{token}` | Push incident to Flashduty | POST | FlashdutySyncHelper |
| `/channel/escalate/rule/list` | Get escalation policies | POST | FlashdutySyncHelperAjax |
| `/person/infos` | Get person names | POST | FlashdutySyncHelperAjax |
| `/team/infos` | Get team names | POST | FlashdutySyncHelperAjax |
| `/schedule/infos` | Get schedule names | POST | FlashdutySyncHelperAjax |

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          ServiceNow Incident                         │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    Manual Dispatch                              │ │
│  │  User clicks "Send to Flashduty" button                        │ │
│  │         ↓                                                       │ │
│  │  FlashdutySendButton.js (UI Action)                           │ │
│  │         ↓                                                       │ │
│  │  Opens flashduty_notification_form (UI Page)                  │ │
│  │         ↓                                                       │ │
│  │  flashduty_notification_form_client.js                        │ │
│  │    - Loads group members (via AJAX)                           │ │
│  │    - Loads escalation policies (via AJAX)                     │ │
│  │    - Loads person/team/schedule names (via AJAX)              │ │
│  │         ↓                                                       │ │
│  │  FlashdutySyncHelperAjax.getGroupMembers()                    │ │
│  │  FlashdutySyncHelperAjax.getExternalOptions()                 │ │
│  │  FlashdutySyncHelperAjax.getPersonNames()                     │ │
│  │         ↓                                                       │ │
│  │  User submits form                                             │ │
│  │         ↓                                                       │ │
│  │  FlashdutySyncHelperAjax.sendWebhook()                        │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                             ↓                                        │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                 Automatic Dispatch                              │ │
│  │  Incident state changes to Resolved/Closed                     │ │
│  │         ↓                                                       │ │
│  │  FlashdutySendRule.js (Business Rule)                         │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                             ↓                                        │
└───────────────────────────────┼──────────────────────────────────────┘
                                ↓
                  ┌──────────────────────────────┐
                  │  FlashdutySyncHelper.js      │
                  │  sendIncidentWebhook()       │
                  └──────────────────────────────┘
                                ↓
                  ┌──────────────────────────────┐
                  │  HTTPS POST Request          │
                  │  to flashduty.push_url       │
                  └──────────────────────────────┘
                                ↓
        ════════════════════════════════════════════
                   HTTPS / TLS 1.2+
        ════════════════════════════════════════════
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      Flashduty Platform                              │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Webhook Receiver                                               │ │
│  │         ↓                                                       │ │
│  │  Alert Orchestration Engine                                    │ │
│  │         ↓                                                       │ │
│  │  Escalation Policy Engine                                      │ │
│  │         ↓                                                       │ │
│  │  Multi-Channel Notification Delivery                           │ │
│  │    - SMS                                                        │ │
│  │    - Voice Call                                                 │ │
│  │    - Microsoft Teams                                            │ │
│  │    - Email                                                      │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Security Considerations

| Aspect | Implementation | Best Practice |
|--------|----------------|---------------|
| **App Key Storage** | System Property (`password` type) | Mark as `Private`, restrict access |
| **Network Security** | HTTPS/TLS 1.2+ | Ensure certificate trust chain is valid |
| **Access Control** | ServiceNow ACL rules | Limit to `itil` role or equivalent |
| **Audit Trail** | ServiceNow System Logs | Monitor for unusual activity |
| **Webhook URL** | Contains authentication token | Never log or expose publicly |

### Performance Characteristics

| Operation | Typical Time | Notes |
|-----------|-------------|-------|
| Dialog Open | < 1 second | Cached after first load |
| Load Members | 1-2 seconds | Depends on group size |
| Load Escalation Policies | 1-3 seconds | API call to Flashduty |
| Send Incident | 2-4 seconds | Includes webhook POST and response |
| Auto-Sync (Business Rule) | Background | Asynchronous, doesn't block UI |

---

## Support & Resources

### Getting Help

| Issue Type | Contact Method | Response Time |
|-----------|----------------|---------------|
| **Integration Configuration** | Flashduty Support | 1 business days |
| **ServiceNow Technical Issues** | ServiceNow Admin/Community | Varies |
| **Network/Certificate Issues** | Your IT/Network Team | Varies |
| **Bug Reports** | Flashduty Support + System Logs | 1-2 business days |

### Required Information for Support Requests

When contacting support, please provide:

1. **Environment Information**:
   - ServiceNow instance version
   - Browser and version
   - Integration version (see Feature Changelog)

2. **Configuration Details**:
   - Output from configuration test script (Part 4.1)
   - Redacted screenshots of System Properties

3. **Error Details**:
   - Exact error message from alert dialog
   - ServiceNow System Logs (last 50 lines, filter by "Flashduty")
   - Browser console logs (if applicable)
   - Request ID from API errors (if shown)

4. **Steps to Reproduce**:
   - What action triggered the issue
   - Expected behavior vs. actual behavior
   - Whether issue is consistent or intermittent

### Additional Resources

- **Flashduty Documentation**: [https://docs.flashcat.cloud](https://docs.flashcat.cloud)
- **ServiceNow Community**: [https://community.servicenow.com](https://community.servicenow.com)
- **Integration Repository**: Check README.md for latest updates

