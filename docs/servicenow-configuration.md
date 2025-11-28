# Flashduty ServiceNow Integration Guide

This guide provides complete step-by-step instructions for integrating ServiceNow Incidents with Flashduty for centralized alert management and on-call notifications.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Part 1: Flashduty Configuration](#part-1-flashduty-configuration)
3. [Part 2: ServiceNow Configuration](#part-2-servicenow-configuration)
4. [Part 3: Testing](#part-3-testing)
5. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have:

- [ ] Admin access to your ServiceNow instance
- [ ] Admin access to Flashduty console
- [ ] A Flashduty Channel (Collaboration Space) created

---

## Part 1: Flashduty Configuration

### 1.1 Create App Key

1. Log in to the Flashduty Console
2. Navigate to **Platform** → **App Key** (bottom-left corner)
3. Click **Add App Key** (or the "+" button)
4. Enter name: `ServiceNow Integration`
5. Click **Save**
6. **Copy and save the generated App Key** - you'll need this later

### 1.2 Get Channel ID

1. Navigate to **Collaboration Spaces**
2. Select or create a channel for ServiceNow incidents
3. Copy the **Channel ID** from the browser URL bar (numeric ID)

### 1.3 Create ServiceNow Integration

1. Go to **Integrations** → **Webhooks** → **ServiceNow**
2. Create a new integration
3. Configure sync direction and options
4. **Copy the Push URL** - you'll need this later

### 1.4 (Optional) Configure Teams Integration

If using Microsoft Teams notifications:

1. Go to **Integrations** → **Instant Message** → **Teams**
2. Create an integration
3. **Copy the Teams Integration ID** from the URL

### Summary: Values to Copy

| Item | Example | ServiceNow Property |
|------|---------|---------------------|
| App Key | `abc123...` | `flashduty.app_key` |
| API Domain | `api.flashcat.cloud` | `flashduty.api_domain` |
| Push URL | `https://api.flashcat.cloud/event/push/...` | `flashduty.push_url` |
| Channel ID | `12345678` | `flashduty.channel_id` |
| Teams ID | `87654321` | `flashduty.teams_id` |

---

## Part 2: ServiceNow Configuration

### 2.1 Create System Properties

Navigate to **System Definition** → **System Properties** → **New**

Or use URL: `https://YOUR_INSTANCE.service-now.com/sys_properties.do`

Create each of the following properties:

#### Property 1: flashduty.app_key (Required)

| Field | Value |
|-------|-------|
| Name | `flashduty.app_key` |
| Type | `password` |
| Value | *Your Flashduty App Key* |
| Description | Flashduty OpenAPI App Key for authentication |
| Private | `true` (recommended) |

#### Property 2: flashduty.api_domain (Required)

| Field | Value |
|-------|-------|
| Name | `flashduty.api_domain` |
| Type | `string` |
| Value | `api.flashcat.cloud` (or your private deployment domain) |
| Description | Flashduty API domain for API calls |

#### Property 3: flashduty.push_url (Required)

| Field | Value |
|-------|-------|
| Name | `flashduty.push_url` |
| Type | `string` |
| Value | *Your Push URL from Flashduty integration* |
| Description | Flashduty webhook URL for incident synchronization |

#### Property 4: flashduty.channel_id (Required)

| Field | Value |
|-------|-------|
| Name | `flashduty.channel_id` |
| Type | `string` |
| Value | *Your Channel ID* |
| Description | Flashduty Channel ID for incident routing |

#### Property 5: flashduty.teams_id (Optional)

| Field | Value |
|-------|-------|
| Name | `flashduty.teams_id` |
| Type | `string` |
| Value | *Your Teams Integration ID* |
| Description | Microsoft Teams Integration ID for notifications |

> **Security Note**: For `flashduty.app_key`, use Type `password` and check the `Private` checkbox to protect sensitive credentials.

---

### 2.2 Create Script Include: FlashdutySyncHelper

Navigate to **System Definition** → **Script Includes** → **New**

| Field | Value |
|-------|-------|
| Name | `FlashdutySyncHelper` |
| API Name | `global.FlashdutySyncHelper` |
| Accessible from | All application scopes |
| Active | ✓ Checked |

**Script**: Copy the entire contents from [`scripts/script-includes/FlashdutySyncHelper.js`](../scripts/script-includes/FlashdutySyncHelper.js)

---

### 2.3 Create Script Include: FlashdutySyncHelperAjax

Navigate to **System Definition** → **Script Includes** → **New**

| Field | Value |
|-------|-------|
| Name | `FlashdutySyncHelperAjax` |
| API Name | `global.FlashdutySyncHelperAjax` |
| Client callable | ✓ Checked |
| Accessible from | All application scopes |
| Active | ✓ Checked |

**Script**: Copy the entire contents from [`scripts/script-includes/FlashdutySyncHelperAjax.js`](../scripts/script-includes/FlashdutySyncHelperAjax.js)

---

### 2.4 Create UI Page: flashduty_notification_form

Navigate to **System UI** → **UI Pages** → **New**

| Field | Value |
|-------|-------|
| Name | `flashduty_notification_form` |
| Category | General |

**HTML field**: Copy the entire contents from [`scripts/ui-pages/flashduty_notification_form.html`](../scripts/ui-pages/flashduty_notification_form.html)

**Client script field**: Copy the entire contents from [`scripts/ui-pages/flashduty_notification_form_client.js`](../scripts/ui-pages/flashduty_notification_form_client.js)

---

### 2.5 Create UI Action: Send to Flashduty

Navigate to **System Definition** → **UI Actions** → **New**

| Field | Value |
|-------|-------|
| Name | `Send to Flashduty` |
| Table | `Incident [incident]` |
| Action name | `flashduty_send` |
| Form button | ✓ Checked |
| Show insert | ✓ Checked |
| Show update | ✓ Checked |
| Client | ✓ Checked |
| List v2/3 Compatible | ✓ Checked |
| Onclick | `flashdutySendNotification();` |

**Script field**: Copy the entire contents from [`scripts/ui-actions/FlashdutySendButton.js`](../scripts/ui-actions/FlashdutySendButton.js)

---

## Part 3: Testing

### 3.1 Verify System Properties

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

### 3.2 Test the Integration

1. Open an existing Incident
2. Click **Send to Flashduty** button
3. Select an Assignment Group
4. Choose notification members
5. Select notification types (SMS, Voice, Teams, Email)
6. Optionally select an Escalation Policy
7. Click **Send to Flashduty**

### 3.3 Verify in Flashduty

1. Check your Flashduty Channel for the new incident
2. Verify notifications were sent to selected members

---

## Troubleshooting

### HTTP Status 0

**Symptom**: API calls fail with HTTP status 0

**Causes**:
- SSL certificate not trusted
- Network connectivity issues
- Firewall blocking outbound requests

**Solutions**:
1. Verify the API domain certificate is valid
2. Test connectivity from ServiceNow instance
3. Check with your network team about firewall rules

### Escalation Policies Not Loading

**Symptom**: "No escalation policies available" in dropdown

**Causes**:
- `flashduty.app_key` not configured
- `flashduty.channel_id` incorrect
- API request failing

**Solutions**:
1. Verify System Properties are correctly set
2. Check system logs for API errors
3. Test API connectivity using Background Script

### "Send to Flashduty" Button Not Visible

**Symptom**: Button doesn't appear on Incident form

**Causes**:
- UI Action not active
- Table scope incorrect
- Form view doesn't include UI Actions

**Solutions**:
1. Verify UI Action is Active
2. Check Table is set to `Incident [incident]`
3. Ensure Form button checkbox is checked

### Configuration Values Not Loading

**Symptom**: Channel ID or other values are empty

**Causes**:
- System Properties not created
- Property names misspelled (case-sensitive)
- Values not saved

**Solutions**:
1. Navigate to System Properties and verify each property exists
2. Check property names match exactly
3. Ensure properties have non-empty values

### Permission Issues

**Symptom**: Cannot create or modify System Properties

**Solutions**:
1. Ensure you have the `admin` role
2. Check if any ACL rules restrict access to `sys_properties`

---

## Component Summary

| ServiceNow Component | Name | Source File |
|---------------------|------|-------------|
| System Property | `flashduty.app_key` | - |
| System Property | `flashduty.api_domain` | - |
| System Property | `flashduty.push_url` | - |
| System Property | `flashduty.channel_id` | - |
| System Property | `flashduty.teams_id` | - |
| Script Include | `FlashdutySyncHelper` | `FlashdutySyncHelper.js` |
| Script Include | `FlashdutySyncHelperAjax` | `FlashdutySyncHelperAjax.js` |
| UI Page | `flashduty_notification_form` | `flashduty_notification_form.html` |
| UI Page Client Script | - | `flashduty_notification_form_client.js` |
| UI Action | `Send to Flashduty` | `FlashdutySendButton.js` |

---

## Support

For issues with this integration:

1. Check ServiceNow System Logs for error messages
2. Verify all System Properties are correctly configured
3. Ensure network connectivity to Flashduty API
4. Contact Flashduty support for API-related issues
