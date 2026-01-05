// Tab Closer - Options Script

document.addEventListener('DOMContentLoaded', init);

async function init() {
  await loadSettings();
  setupEventListeners();
}

async function loadSettings() {
  const settings = await chrome.storage.local.get([
    'staleThresholdHours',
    'protectedDomains',
    'autoProtectPinned',
    'paused'
  ]);

  const threshold = settings.staleThresholdHours || 24;
  const protectedDomains = settings.protectedDomains || [];
  const autoProtectPinned = settings.autoProtectPinned !== false;
  const paused = settings.paused || false;

  // Set enabled toggle (checked = enabled = not paused)
  document.getElementById('enabledToggle').checked = !paused;

  // Set threshold radio/custom input
  const radioOptions = document.querySelectorAll('input[name="threshold"]');
  const customInput = document.getElementById('customThreshold');

  if (threshold === 24 || threshold === 48) {
    radioOptions.forEach(radio => {
      radio.checked = parseInt(radio.value, 10) === threshold;
    });
    customInput.value = '';
  } else {
    radioOptions.forEach(radio => {
      radio.checked = radio.value === 'custom';
    });
    customInput.value = threshold;
  }

  // Set auto-protect pinned checkbox
  document.getElementById('autoProtectPinned').checked = autoProtectPinned;

  // Render protected domains
  renderDomainList(protectedDomains);
}

function setupEventListeners() {
  // Enabled toggle
  document.getElementById('enabledToggle').addEventListener('change', async (e) => {
    const paused = !e.target.checked;
    await chrome.storage.local.set({ paused });
    showSaveStatus();
  });

  // Threshold radio buttons
  document.querySelectorAll('input[name="threshold"]').forEach(radio => {
    radio.addEventListener('change', saveSettings);
  });

  // Custom threshold input
  document.getElementById('customThreshold').addEventListener('input', () => {
    // Select the custom radio when typing in the input
    document.querySelector('input[value="custom"]').checked = true;
    saveSettings();
  });

  // Auto-protect pinned checkbox
  document.getElementById('autoProtectPinned').addEventListener('change', saveSettings);

  // Add domain button
  document.getElementById('addDomainBtn').addEventListener('click', addDomain);

  // Add domain on Enter key
  document.getElementById('newDomain').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addDomain();
    }
  });
}

async function saveSettings() {
  const selectedRadio = document.querySelector('input[name="threshold"]:checked');
  const customInput = document.getElementById('customThreshold');
  const autoProtectPinned = document.getElementById('autoProtectPinned').checked;

  let staleThresholdHours;
  if (selectedRadio.value === 'custom') {
    staleThresholdHours = parseInt(customInput.value, 10) || 24;
    // Ensure minimum of 1 hour
    if (staleThresholdHours < 1) {
      staleThresholdHours = 1;
      customInput.value = 1;
    }
  } else {
    staleThresholdHours = parseInt(selectedRadio.value, 10);
  }

  await chrome.storage.local.set({
    staleThresholdHours,
    autoProtectPinned
  });

  showSaveStatus();
}

async function addDomain() {
  const input = document.getElementById('newDomain');
  let domain = input.value.trim().toLowerCase();

  // Clean up the domain (remove protocol, path, etc.)
  domain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

  if (!domain) return;

  const { protectedDomains = [] } = await chrome.storage.local.get('protectedDomains');

  // Don't add duplicates
  if (protectedDomains.includes(domain)) {
    input.value = '';
    return;
  }

  protectedDomains.push(domain);
  await chrome.storage.local.set({ protectedDomains });

  input.value = '';
  renderDomainList(protectedDomains);
  showSaveStatus();
}

async function removeDomain(domain) {
  const { protectedDomains = [] } = await chrome.storage.local.get('protectedDomains');

  const updated = protectedDomains.filter(d => d !== domain);
  await chrome.storage.local.set({ protectedDomains: updated });

  renderDomainList(updated);
  showSaveStatus();
}

function renderDomainList(domains) {
  const list = document.getElementById('domainList');
  list.innerHTML = '';

  const anchorSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 6v16"/>
    <path d="m19 13 2-1a9 9 0 0 1-18 0l2 1"/>
    <path d="M9 11h6"/>
    <circle cx="12" cy="4" r="2"/>
  </svg>`;

  for (const domain of domains) {
    const item = document.createElement('li');
    item.className = 'domain-item';

    const domainInfo = document.createElement('div');
    domainInfo.className = 'domain-info';

    const anchor = document.createElement('span');
    anchor.className = 'domain-anchor';
    anchor.innerHTML = anchorSvg;
    domainInfo.appendChild(anchor);

    const name = document.createElement('span');
    name.className = 'domain-name';
    name.textContent = domain;
    domainInfo.appendChild(name);

    item.appendChild(domainInfo);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn btn-danger';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => removeDomain(domain));
    item.appendChild(removeBtn);

    list.appendChild(item);
  }
}

function showSaveStatus() {
  const status = document.getElementById('saveStatus');
  status.textContent = 'Settings saved';
  status.classList.add('visible');

  setTimeout(() => {
    status.classList.remove('visible');
  }, 2000);
}
