// Tab Closer - Background Service Worker

const ALARM_NAME = 'staleTabCheck';
const CHECK_INTERVAL_MINUTES = 5;
const DEFAULT_STALE_HOURS = 24;

// Update badge based on paused state
async function updateBadge(paused) {
  if (paused) {
    await chrome.action.setBadgeText({ text: 'OFF' });
    await chrome.action.setBadgeBackgroundColor({ color: '#888888' });
  } else {
    await chrome.action.setBadgeText({ text: '' });
  }
}

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  // Set up periodic alarm for stale tab checking
  await chrome.alarms.create(ALARM_NAME, {
    delayInMinutes: CHECK_INTERVAL_MINUTES,
    periodInMinutes: CHECK_INTERVAL_MINUTES
  });

  // Initialize default settings if not set
  const settings = await chrome.storage.local.get(['staleThresholdHours', 'protectedDomains', 'autoProtectPinned', 'paused']);
  if (settings.staleThresholdHours === undefined) {
    await chrome.storage.local.set({
      staleThresholdHours: DEFAULT_STALE_HOURS,
      protectedDomains: [],
      autoProtectPinned: true,
      paused: false
    });
  }

  // Initialize badge
  await updateBadge(settings.paused || false);

  // Create context menu (right-click on page content)
  chrome.contextMenus.create({
    id: 'toggleProtection',
    title: 'Protect/Unprotect This Tab',
    contexts: ['page']
  });

  // Initialize tracking for existing tabs
  const tabs = await chrome.tabs.query({});
  const now = Date.now();
  const tabActivity = {};

  for (const tab of tabs) {
    tabActivity[tab.id] = {
      lastActive: now,
      url: tab.url || '',
      protected: false
    };
  }

  await chrome.storage.local.set({ tabActivity });
});

// Handle alarm for stale tab checking
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    await closeStaleTabs();
  }
});

// Listen for storage changes to update badge
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.paused !== undefined) {
    updateBadge(changes.paused.newValue);
  }
});

// Initialize badge on service worker startup
chrome.storage.local.get('paused').then(({ paused }) => {
  updateBadge(paused || false);
});

// Track tab activation (user switches to a tab)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const { tabActivity = {} } = await chrome.storage.local.get('tabActivity');
  const tab = await chrome.tabs.get(activeInfo.tabId);

  tabActivity[activeInfo.tabId] = {
    ...tabActivity[activeInfo.tabId],
    lastActive: Date.now(),
    url: tab.url || ''
  };

  await chrome.storage.local.set({ tabActivity });
});

// Track new tab creation
chrome.tabs.onCreated.addListener(async (tab) => {
  const { tabActivity = {} } = await chrome.storage.local.get('tabActivity');

  tabActivity[tab.id] = {
    lastActive: Date.now(),
    url: tab.url || '',
    protected: false
  };

  await chrome.storage.local.set({ tabActivity });
});

// Track tab URL changes
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    const { tabActivity = {} } = await chrome.storage.local.get('tabActivity');

    if (tabActivity[tabId]) {
      tabActivity[tabId].url = changeInfo.url;
      await chrome.storage.local.set({ tabActivity });
    }
  }
});

// Clean up when tab is closed
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const { tabActivity = {} } = await chrome.storage.local.get('tabActivity');

  delete tabActivity[tabId];
  await chrome.storage.local.set({ tabActivity });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'toggleProtection' && tab?.id) {
    await toggleTabProtection(tab.id);
  }
});

// Toggle protection status for a tab
async function toggleTabProtection(tabId) {
  const { tabActivity = {} } = await chrome.storage.local.get('tabActivity');

  if (tabActivity[tabId]) {
    tabActivity[tabId].protected = !tabActivity[tabId].protected;
    await chrome.storage.local.set({ tabActivity });
  }
}

// Check if a URL matches any protected domain
function isProtectedDomain(url, protectedDomains) {
  if (!url || !protectedDomains.length) return false;

  try {
    const hostname = new URL(url).hostname;
    return protectedDomains.some(domain =>
      hostname === domain || hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

// Close stale tabs
async function closeStaleTabs() {
  const storage = await chrome.storage.local.get([
    'tabActivity',
    'staleThresholdHours',
    'protectedDomains',
    'autoProtectPinned',
    'paused'
  ]);

  // Skip if paused
  if (storage.paused) {
    return;
  }

  const {
    tabActivity = {},
    staleThresholdHours = DEFAULT_STALE_HOURS,
    protectedDomains = [],
    autoProtectPinned = true
  } = storage;

  const now = Date.now();
  const staleThresholdMs = staleThresholdHours * 60 * 60 * 1000;

  // Get all tabs to check pinned status and find active tab
  const allTabs = await chrome.tabs.query({});
  const activeTab = allTabs.find(tab => tab.active);
  const pinnedTabIds = new Set(allTabs.filter(tab => tab.pinned).map(tab => tab.id));

  const tabsToClose = [];

  for (const [tabIdStr, data] of Object.entries(tabActivity)) {
    const tabId = parseInt(tabIdStr, 10);
    const timeSinceActive = now - data.lastActive;

    // Skip if not stale
    if (timeSinceActive < staleThresholdMs) continue;

    // Skip if manually protected
    if (data.protected) continue;

    // Skip if it's the currently active tab
    if (activeTab && tabId === activeTab.id) continue;

    // Skip if pinned and auto-protect is enabled
    if (autoProtectPinned && pinnedTabIds.has(tabId)) continue;

    // Skip if URL matches a protected domain
    if (isProtectedDomain(data.url, protectedDomains)) continue;

    tabsToClose.push(tabId);
  }

  // Close stale tabs
  if (tabsToClose.length > 0) {
    await chrome.tabs.remove(tabsToClose);
  }
}

// Export for popup to use
self.toggleTabProtection = toggleTabProtection;
