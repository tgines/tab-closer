// Tab Closer - Popup Script

document.addEventListener('DOMContentLoaded', init);

async function init() {
  // Load settings and display threshold
  const settings = await chrome.storage.local.get(['staleThresholdHours', 'protectedDomains', 'autoProtectPinned', 'paused']);
  const threshold = settings.staleThresholdHours || 24;
  const paused = settings.paused || false;

  document.getElementById('threshold').textContent = threshold;

  // Set up pause toggle
  const pauseToggle = document.getElementById('pauseToggle');
  pauseToggle.checked = !paused; // Checked = enabled (not paused)
  updateStatusDisplay(paused, threshold);

  pauseToggle.addEventListener('change', async () => {
    const newPaused = !pauseToggle.checked;
    await chrome.storage.local.set({ paused: newPaused });
    updateStatusDisplay(newPaused, threshold);
  });

  // Set up settings button
  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Load and display tabs
  await loadTabs(settings);
}

function updateStatusDisplay(paused, threshold) {
  const statusInfo = document.getElementById('statusInfo');
  if (paused) {
    statusInfo.className = 'threshold-info paused';
    statusInfo.innerHTML = '<strong>Paused</strong> - tabs will not be auto-closed';
  } else {
    statusInfo.className = 'threshold-info';
    statusInfo.innerHTML = `Closing tabs inactive for <span>${threshold}</span>h`;
  }
}

async function loadTabs(settings) {
  const tabList = document.getElementById('tabList');
  const { tabActivity = {} } = await chrome.storage.local.get('tabActivity');
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const { protectedDomains = [], autoProtectPinned = true, staleThresholdHours = 24 } = settings;

  if (tabs.length === 0) {
    tabList.innerHTML = '<div class="empty-state">No tabs open</div>';
    return;
  }

  const staleThresholdMs = staleThresholdHours * 60 * 60 * 1000;
  const now = Date.now();

  // Sort tabs: active first, then by last active time (most recent first)
  tabs.sort((a, b) => {
    if (a.active) return -1;
    if (b.active) return 1;

    const aActivity = tabActivity[a.id]?.lastActive || now;
    const bActivity = tabActivity[b.id]?.lastActive || now;
    return bActivity - aActivity;
  });

  tabList.innerHTML = '';

  for (const tab of tabs) {
    const activity = tabActivity[tab.id] || { lastActive: now, protected: false };
    const timeSinceActive = now - activity.lastActive;
    const isStale = timeSinceActive >= staleThresholdMs;
    const isManuallyProtected = activity.protected;
    const isDomainProtected = isProtectedDomain(tab.url, protectedDomains);
    const isPinned = tab.pinned && autoProtectPinned;
    const isActive = tab.active;

    const tabItem = document.createElement('div');
    tabItem.className = 'tab-item';
    if (isManuallyProtected || isDomainProtected || isPinned) {
      tabItem.classList.add('protected');
    } else if (isStale) {
      tabItem.classList.add('stale');
    }

    // Favicon
    const favicon = document.createElement('div');
    favicon.className = 'tab-favicon';
    if (tab.favIconUrl) {
      const img = document.createElement('img');
      img.src = tab.favIconUrl;
      img.onerror = () => { img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect fill="%23ddd" width="16" height="16" rx="2"/></svg>'; };
      favicon.appendChild(img);
    } else {
      favicon.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="#ddd"><rect width="16" height="16" rx="2"/></svg>';
    }
    tabItem.appendChild(favicon);

    // Tab info
    const info = document.createElement('div');
    info.className = 'tab-info';

    const title = document.createElement('div');
    title.className = 'tab-title';
    title.textContent = tab.title || 'Untitled';
    title.title = tab.title || 'Untitled';
    info.appendChild(title);

    const meta = document.createElement('div');
    meta.className = 'tab-meta';

    // Domain
    const domain = document.createElement('span');
    domain.className = 'tab-domain';
    domain.textContent = getDomain(tab.url);
    meta.appendChild(domain);

    // Age
    const age = document.createElement('span');
    age.className = 'tab-age';
    if (isStale) age.classList.add('stale');
    age.textContent = formatAge(timeSinceActive);
    meta.appendChild(age);

    // Badges
    if (isActive) {
      const badge = document.createElement('span');
      badge.className = 'badge active';
      badge.textContent = 'Active';
      meta.appendChild(badge);
    }
    if (isPinned) {
      const badge = document.createElement('span');
      badge.className = 'badge pinned';
      badge.textContent = 'Pinned';
      meta.appendChild(badge);
    }
    if (isDomainProtected) {
      const badge = document.createElement('span');
      badge.className = 'badge domain-protected';
      badge.textContent = 'Domain';
      meta.appendChild(badge);
    }

    info.appendChild(meta);
    tabItem.appendChild(info);

    // Protection button
    const protectBtn = document.createElement('button');
    protectBtn.className = `protect-btn ${isManuallyProtected ? 'protected' : 'unprotected'}`;
    protectBtn.textContent = isManuallyProtected ? 'Protected' : 'Protect';
    protectBtn.addEventListener('click', async () => {
      await toggleProtection(tab.id);
      await loadTabs(settings);
    });
    tabItem.appendChild(protectBtn);

    tabList.appendChild(tabItem);
  }
}

async function toggleProtection(tabId) {
  const { tabActivity = {} } = await chrome.storage.local.get('tabActivity');

  if (tabActivity[tabId]) {
    tabActivity[tabId].protected = !tabActivity[tabId].protected;
    await chrome.storage.local.set({ tabActivity });
  }
}

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

function getDomain(url) {
  if (!url) return '';
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function formatAge(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ago`;
  if (hours > 0) return `${hours}h ${minutes % 60}m ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}
