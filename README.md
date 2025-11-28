# Flashduty ServiceNow Integration

Synchronize ServiceNow Incidents to Flashduty for centralized alert management and on-call scheduling.

## Features

- **Manual Sync**: Send incidents to Flashduty with one click from the incident form
- **Flexible Notifications**: Choose SMS, Voice, Teams, or Email notification channels
- **Escalation Policies**: Select Flashduty escalation rules with smart group matching
- **Member Selection**: Pick specific team members to notify
- **Private Deployment**: Configurable API domain for Flashduty private deployments
- **Secure Configuration**: Credentials stored in ServiceNow System Properties

## Project Structure

```
fd-servicenow/
├── README.md
├── docs/
│   └── servicenow-configuration.md    # Complete setup guide
└── scripts/
    ├── script-includes/
    │   ├── FlashdutySyncHelper.js      # Webhook helper (server-side)
    │   └── FlashdutySyncHelperAjax.js  # AJAX processor (client-callable)
    ├── ui-actions/
    │   └── FlashdutySendButton.js      # UI Action button script
    └── ui-pages/
        ├── flashduty_notification_form.html        # Notification dialog HTML
        └── flashduty_notification_form_client.js   # Notification dialog client script
```

## Quick Start

### 1. Configure System Properties

Create these properties in ServiceNow (**System Definition** → **System Properties**):

| Property Name | Description | Required |
|--------------|-------------|----------|
| `flashduty.app_key` | Flashduty OpenAPI App Key | Yes |
| `flashduty.api_domain` | API domain (e.g., `api.flashcat.cloud`) | Yes |
| `flashduty.push_url` | Webhook integration URL | Yes |
| `flashduty.channel_id` | Flashduty Channel ID | Yes |
| `flashduty.teams_id` | Teams Integration ID | No |

### 2. Create Script Includes

Create two Script Includes in ServiceNow:

| Name | File | Client Callable |
|------|------|-----------------|
| `FlashdutySyncHelper` | `scripts/script-includes/FlashdutySyncHelper.js` | No |
| `FlashdutySyncHelperAjax` | `scripts/script-includes/FlashdutySyncHelperAjax.js` | Yes |

### 3. Create UI Page

Create a UI Page named `flashduty_notification_form`:
- **HTML**: `scripts/ui-pages/flashduty_notification_form.html`
- **Client Script**: `scripts/ui-pages/flashduty_notification_form_client.js`

### 4. Create UI Action

Create a UI Action on the Incident table:
- **Name**: Send to Flashduty
- **Script**: `scripts/ui-actions/FlashdutySendButton.js`

## Documentation

For detailed step-by-step instructions, see:

**[Complete Setup Guide](docs/servicenow-configuration.md)**

## Component Reference

| ServiceNow Component | File | Purpose |
|---------------------|------|---------|
| Script Include: `FlashdutySyncHelper` | `FlashdutySyncHelper.js` | Server-side webhook helper |
| Script Include: `FlashdutySyncHelperAjax` | `FlashdutySyncHelperAjax.js` | Client-callable AJAX processor |
| UI Action: `Send to Flashduty` | `FlashdutySendButton.js` | Button on incident form |
| UI Page: `flashduty_notification_form` | `flashduty_notification_form.html` | Dialog form HTML |
| UI Page Client Script | `flashduty_notification_form_client.js` | Dialog form logic |

## Troubleshooting

### API Connection Issues (HTTP Status 0)

If you see HTTP status 0 in logs:
1. Check if the API domain certificate is trusted by ServiceNow
2. Verify network connectivity from ServiceNow to Flashduty API
3. Check for firewall rules blocking outbound connections

### Escalation Policies Not Loading

1. Verify `flashduty.app_key` is correctly configured
2. Check `flashduty.channel_id` matches your Flashduty channel
3. Review system logs for API error messages

### Configuration Not Found

1. Ensure all System Properties are created with exact names
2. Check property values are not empty
3. Verify property type is `string` (or `password` for app_key)

## License

Copyright © Flashcat Cloud. All rights reserved.
