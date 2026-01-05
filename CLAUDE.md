# Tab Closer Extension

Chrome/Dia extension that automatically closes stale tabs based on time since last activity.

## Project Structure

```
tab-closer/
├── manifest.json       # Extension manifest (v3)
├── background.js       # Service worker for tab tracking & auto-close
├── popup/              # Extension popup UI
├── options/            # Settings page
└── icons/              # Extension icons
```

## Key Decisions

- **Manifest V3**: Using the latest Chrome extension format for future compatibility
- **Stale tracking**: Based on "time since last active" (resets when tab is focused)
- **Storage**: Using `chrome.storage.local` for persistence across browser restarts
- **Stale check interval**: Every 5 minutes via `chrome.alarms`

## Features

- Configurable stale threshold (24h, 48h, or custom)
- Tab protection via context menu and popup UI
- Auto-protection for pinned tabs and configured domains
- Silent automatic closing

## Testing in Dia Browser

1. Navigate to `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** and select this folder
4. After changes, click refresh icon on the extension card

## Changelog

### v0.1.1
- Removed unsupported `tab` context (Dia only supports: action, all, audio, browser_action, editable, frame, image, launcher, link, page, page_action, selection, video)
- Context menu now only on page content (right-click on webpage)
- Added README.md for GitHub

### v0.1.0 (Initial)
- Basic extension structure
- Tab activity tracking
- Popup UI with tab list and protection toggles
- Options page for threshold and domain configuration
- Context menu for quick protection toggle
