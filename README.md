# Flashduty ServiceNow Integration

[![License](https://img.shields.io/badge/license-Proprietary-blue.svg)](LICENSE)
[![ServiceNow](https://img.shields.io/badge/ServiceNow-Compatible-green.svg)](https://www.servicenow.com)
[![Flashduty](https://img.shields.io/badge/Flashduty-Integrated-orange.svg)](https://flashcat.cloud)

Enterprise-grade integration that connects ServiceNow Incident Management with Flashduty's intelligent alert orchestration and on-call management platform.

## Overview

This integration enables seamless bidirectional synchronization between ServiceNow incidents and Flashduty alerts, providing teams with:

- **🎯 Intelligent Alert Routing**: Automatically route incidents to the right teams using Flashduty's escalation policies
- **📱 Multi-Channel Notifications**: Deliver alerts via SMS, Voice, Microsoft Teams, and Email
- **👥 Flexible Team Management**: Select specific team members or leverage assignment groups
- **🔄 Real-Time Synchronization**: Keep incident states synchronized between platforms
- **🔒 Enterprise Security**: Secure credential management using ServiceNow System Properties
- **🌐 Private Deployment Ready**: Full support for on-premise or private cloud deployments

## Key Features

### Manual Incident Dispatch
- One-click incident dispatch from ServiceNow Incident form
- Smart escalation policy selection with group-based recommendations
- Granular control over notification recipients and channels

### Escalation Management
- Visual escalation path preview with multi-layer support
- Dynamic policy selection based on assignment groups
- Configurable escalation timing and conditions

### Notification Flexibility
- Choose from multiple notification channels per incident
- Support for SMS, Voice Call, Microsoft Teams, and Email
- Real-time notification status tracking

### User Experience
- Modern, intuitive notification dialog interface
- Group member auto-loading with select-all functionality
- Inline error reporting with detailed troubleshooting information
- Auto-closing dialog on successful submission

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ServiceNow Instance                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌─────────────────┐  ┌──────────────────┐  │
│  │  UI Action   │→ │   UI Page       │→ │ Script Include   │  │
│  │  (Button)    │  │   (Dialog)      │  │ (AJAX Handler)   │  │
│  └──────────────┘  └─────────────────┘  └──────────────────┘  │
│                            ↓                        ↓            │
│                     ┌─────────────────────────────────┐         │
│                     │  FlashdutySyncHelper            │         │
│                     │  (Webhook & API Integration)    │         │
│                     └─────────────────────────────────┘         │
│                                      ↓                           │
└──────────────────────────────────────┼──────────────────────────┘
                                       ↓
                        ═══════════════════════════
                              HTTPS / TLS 1.2+
                        ═══════════════════════════
                                       ↓
┌─────────────────────────────────────────────────────────────────┐
│                         Flashduty Platform                       │
├─────────────────────────────────────────────────────────────────┤
│  • Alert Orchestration Engine                                    │
│  • Escalation Policy Engine                                      │
│  • Multi-Channel Notification Delivery                           │
│  • On-Call Schedule Management                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

> 📚 **New to this integration?** Follow our comprehensive [Setup Guide](docs/servicenow-configuration.md) for detailed, step-by-step instructions.

### Installation Overview

The integration requires configuration in both Flashduty and ServiceNow platforms:

#### Phase 1: Flashduty Preparation (~5 minutes)

1. **Create App Key** for API authentication
2. **Obtain Channel ID** for incident routing
3. **Create ServiceNow Integration** and copy the webhook URL
4. *(Optional)* Configure Microsoft Teams integration

📖 **Detailed Steps**: [Part 2: Flashduty Configuration](docs/servicenow-configuration.md#part-2-flashduty-configuration)

#### Phase 2: ServiceNow Configuration (~15-20 minutes)

1. **Configure System Properties** (5 properties)
2. **Create Script Includes** (2 components)
3. **Create UI Components** (1 UI Page + 1 UI Action)
4. **Create Business Rule** (1 component for auto-sync)

📖 **Detailed Steps**: [Part 3: ServiceNow Configuration](docs/servicenow-configuration.md#part-3-servicenow-configuration)

#### Phase 3: Testing & Validation (~5 minutes)

1. Verify system property configuration
2. Test manual incident dispatch
3. Confirm notification delivery

📖 **Testing Guide**: [Part 4: Testing](docs/servicenow-configuration.md#part-4-testing)

### Prerequisites

| Requirement | Details |
|------------|---------|
| **ServiceNow Version** | Paris or newer (tested on Tokyo, Utah, Vancouver) |
| **ServiceNow Access** | Admin role or equivalent permissions |
| **Flashduty Account** | Active account with admin access |
| **Network Access** | Outbound HTTPS (443) from ServiceNow to Flashduty API |

## Project Structure

```
fd-servicenow/
├── README.md                                          # This file
├── docs/
│   └── servicenow-configuration.md                   # Complete setup guide
└── scripts/
    ├── business-rules/
    │   └── FlashdutySendRule.js                      # Auto-sync resolved incidents
    ├── script-includes/
    │   ├── FlashdutySyncHelper.js                    # Server-side webhook handler
    │   └── FlashdutySyncHelperAjax.js                # Client-callable AJAX processor
    ├── ui-actions/
    │   └── FlashdutySendButton.js                    # "Send to Flashduty" button
    └── ui-pages/
        ├── flashduty_notification_form.html          # Notification dialog UI
        └── flashduty_notification_form_client.js     # Dialog client-side logic
```

## Component Reference

| Component Type | Name | Source File | Purpose |
|---------------|------|-------------|---------|
| **System Properties** | `flashduty.app_key` | - | Flashduty OpenAPI authentication key |
| | `flashduty.api_domain` | - | API endpoint domain |
| | `flashduty.push_url` | - | Webhook integration URL |
| | `flashduty.channel_id` | - | Target Flashduty channel |
| | `flashduty.teams_id` | - | Microsoft Teams integration ID (optional) |
| **Script Include** | `FlashdutySyncHelper` | `FlashdutySyncHelper.js` | Server-side webhook & sync logic |
| **Script Include** | `FlashdutySyncHelperAjax` | `FlashdutySyncHelperAjax.js` | Client-callable AJAX endpoints |
| **UI Action** | `Send to Flashduty` | `FlashdutySendButton.js` | Incident form button |
| **UI Page** | `flashduty_notification_form` | `flashduty_notification_form.html` | Notification dialog HTML & styles |
| **UI Page Script** | (embedded) | `flashduty_notification_form_client.js` | Dialog client-side logic |
| **Business Rule** | `Send to Flashduty` | `FlashdutySendRule.js` | Auto-sync on incident resolution |

## Configuration

### Required System Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `flashduty.app_key` | password | ✅ | Flashduty OpenAPI App Key (keep secure) |
| `flashduty.api_domain` | string | ✅ | API domain (e.g., `api.flashcat.cloud`) |
| `flashduty.push_url` | string | ✅ | Webhook integration URL from Flashduty |
| `flashduty.channel_id` | string | ✅ | Flashduty Channel ID (numeric) |
| `flashduty.teams_id` | string | ⚪ | Microsoft Teams Integration ID (optional) |

> 🔐 **Security Best Practice**: Set `flashduty.app_key` as type `password` and mark it as `Private` to protect credentials.

## Usage

### Manual Incident Dispatch

1. Open any Incident in ServiceNow
2. Click the **"Send to Flashduty"** button on the form
3. In the notification dialog:
   - Select or verify the **Assignment Group**
   - Choose **Team Members** to notify
   - Select **Notification Channels** (SMS, Voice, Teams, Email)
   - *(Optional)* Select an **Escalation Policy**
4. Click **"Send to Flashduty"**
5. Dialog automatically closes on success

### Automatic Incident Sync

Incidents are automatically synchronized to Flashduty when:
- State changes to **Resolved** or **Closed** (via Business Rule)

## Troubleshooting

### Common Issues

<details>
<summary><b>🔴 HTTP Status 0 / Connection Refused</b></summary>

**Symptoms**: API calls fail with status 0, no response body

**Root Causes**:
- SSL certificate not trusted by ServiceNow
- Network connectivity blocked
- Firewall rules preventing outbound HTTPS

**Solutions**:
1. Navigate to **System Security** → **Certificate Management**
2. Import Flashduty API SSL certificate chain
3. Verify outbound HTTPS (443) connectivity
4. Contact network team to whitelist Flashduty API domain

</details>

<details>
<summary><b>🟡 Escalation Policies Not Loading</b></summary>

**Symptoms**: Empty dropdown or "No policies available" message

**Solutions**:
1. Verify `flashduty.app_key` is correctly configured
2. Check `flashduty.channel_id` matches your Flashduty channel
3. Review **System Logs** → **Application Logs** for API errors
4. Test API connectivity using [Part 4.1](docs/servicenow-configuration.md#41-verify-system-properties)

</details>

<details>
<summary><b>🟡 "Send to Flashduty" Button Missing</b></summary>

**Solutions**:
1. Verify UI Action is **Active**
2. Confirm Table is set to **Incident [incident]**
3. Check **Form button** checkbox is enabled
4. Clear browser cache and refresh

</details>

<details>
<summary><b>🟢 Detailed Error Messages in Dialog</b></summary>

**NEW**: The integration now displays detailed error messages directly in the notification dialog, including:
- HTTP status codes and response bodies
- API error messages with request IDs
- Configuration validation errors

Check the alert dialog for specific troubleshooting guidance.

</details>

> 📖 **Full Troubleshooting Guide**: [docs/servicenow-configuration.md#troubleshooting](docs/servicenow-configuration.md#troubleshooting)

## Documentation

| Document | Description |
|----------|-------------|
| [**Complete Setup Guide**](docs/servicenow-configuration.md) | Step-by-step installation and configuration instructions |
| [**Troubleshooting**](docs/servicenow-configuration.md#troubleshooting) | Common issues and solutions |

## Support

### Getting Help

1. **Check Documentation**: Review the [Setup Guide](docs/servicenow-configuration.md)
2. **ServiceNow Logs**: Navigate to **System Logs** → **Application Logs** and filter by "Flashduty"
3. **Test Configuration**: Run the test script in [Part 4.1](docs/servicenow-configuration.md#41-verify-system-properties)
4. **Contact Support**: Reach out to Flashduty support with:
   - ServiceNow version
   - System log excerpts
   - Configuration screenshots (redact credentials)

### Reporting Issues

When reporting issues, include:
- ServiceNow instance version
- Integration component versions
- Error messages from System Logs
- Steps to reproduce the issue

## License

Copyright © Flashcat Cloud. All rights reserved.

This software is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.
