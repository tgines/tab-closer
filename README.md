# Tab Closer

A Chrome/Chromium extension that automatically closes stale tabs based on inactivity time.

## Features

- **Auto-close stale tabs** - Automatically closes tabs that haven't been active for a configurable period (24h, 48h, or custom)
- **Activity-based tracking** - Tracks when you last viewed each tab, not when it was opened
- **Tab protection** - Protect important tabs from being auto-closed via:
  - Right-click on page content → "Protect/Unprotect This Tab"
  - Toggle in the extension popup
- **Auto-protection** - Pinned tabs and configured domains are automatically protected
- **Silent operation** - Runs quietly in the background with 5-minute check intervals

## Installation

### From Source (Developer Mode)

1. Clone or download this repository
2. Open your browser and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right corner)
4. Click **Load unpacked**
5. Select the `tab-closer` folder
6. The extension icon should appear in your toolbar

## Usage

### Extension Popup

Click the extension icon to:
- View all tabs in the current window with their "age" (time since last active)
- See which tabs are protected (green background)
- See which tabs are stale and will be closed soon (orange background)
- Toggle protection for any tab
- Access settings via the gear icon

### Settings

Open the options page to configure:
- **Stale threshold** - Choose 24 hours, 48 hours, or a custom value
- **Auto-protect pinned tabs** - Enable/disable automatic protection for pinned tabs
- **Protected domains** - Add domains that should never have tabs auto-closed (e.g., `github.com`, `gmail.com`)

### Protection Status Indicators

In the popup, tabs show badges indicating their protection status:
- **Active** - Currently focused tab (never closed)
- **Pinned** - Pinned tab (auto-protected if enabled)
- **Domain** - URL matches a protected domain
- **Protected** button - Manually protected

## How It Works

1. The extension tracks the last time each tab was activated (switched to)
2. Every 5 minutes, it checks all tabs against the stale threshold
3. Tabs exceeding the threshold are closed unless they are:
   - The currently active tab
   - Manually protected
   - Pinned (if auto-protect pinned is enabled)
   - On a protected domain

## Browser Compatibility

This extension uses Manifest V3 and should work with:
- Google Chrome
- Microsoft Edge
- Brave
- Dia Browser
- Other Chromium-based browsers

## License

MIT
