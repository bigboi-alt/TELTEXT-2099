/* ==========================================================================
   TELETEXT 2099 — MAIN APPLICATION COORDINATOR
   ========================================================================== */

import { synthEngine } from './audio/synthEngine.js';
import { crtScreenEngine } from './3d/crtScreen.js';
import { worldMapExplorer } from './map/worldMap.js';
import { windowDeckEngine } from './deck/windowEngine.js';
import { countryDatabase, getCountry } from './data/countryData.js';

let currentSelectedCountryCode = 'USA';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Audio Synth Engine
  document.body.addEventListener('click', () => synthEngine.init(), { once: true });

  // 2. Initialize 3D Three.js CRT Engine & Globe Selection Callback
  crtScreenEngine.init('crt-canvas');
  crtScreenEngine.setSelectCountryCallback((countryInfo) => {
    selectCountry(countryInfo.code);
  });

  // 3. Initialize Multi-Window Deck Engine
  windowDeckEngine.init('news-deck-layer');

  // 4. Initialize Interactive Moveable World Map Explorer
  worldMapExplorer.init('map-container', (countryInfo) => {
    selectCountry(countryInfo.code);
  });

  // 5. Bind Country Search Bar & Autocomplete
  bindCountrySearch();

  // 6. Bind Map Zoom Tools & GNews API Key Saver
  bindMapToolsAndApiKey();
  bindUtilityPopovers();

  // 7. Bind Dock Action Buttons & Remote Controls
  bindDockAndRemoteButtons();
  bindSavedWikiPanel();

  // 8. Bind CRT & Audio Tuner Controls
  bindCRTAudioTuner();

  // 9. Bind Header Controls (Audio + Theme Switcher)
  bindHeaderControls();

  // 10. Start Real-time Clock
  startClock();
});

function selectCountry(countryCode) {
  currentSelectedCountryCode = countryCode;
  const country = getCountry(countryCode);

  // Update selected country indicator
  const nameEl = document.getElementById('current-country-name');
  if (nameEl) nameEl.textContent = `${country.flag} ${country.name}`;
  worldMapExplorer.updateSignalPanels(country.code);

  // Automatically spawn News Deck Popup for selected country!
  windowDeckEngine.spawnNewsWindow(country.code);
}

function bindCountrySearch() {
  const searchInput = document.getElementById('country-search-input');
  const dropdown = document.getElementById('search-results-dropdown');
  if (!searchInput || !dropdown) return;

  const countriesList = Object.values(countryDatabase);

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (query.length === 0) {
      dropdown.classList.add('hidden');
      dropdown.innerHTML = '';
      return;
    }

    const matches = countriesList.filter(c => 
      c.name.toLowerCase().includes(query) || 
      c.code.toLowerCase().includes(query) ||
      c.capital.toLowerCase().includes(query)
    );

    if (matches.length === 0) {
      dropdown.classList.add('hidden');
      return;
    }

    let itemsHtml = '';
    matches.forEach(c => {
      itemsHtml += `
        <div class="search-item" data-code="${c.code}">
          ${c.flag} ${c.name} (${c.code}) — ${c.capital}
        </div>
      `;
    });

    dropdown.innerHTML = itemsHtml;
    dropdown.classList.remove('hidden');

    dropdown.querySelectorAll('.search-item').forEach(item => {
      item.addEventListener('click', () => {
        const code = item.getAttribute('data-code');
        selectCountry(code);
        windowDeckEngine.spawnWikiWindow(getCountry(code).name, code);
        dropdown.classList.add('hidden');
        searchInput.value = '';
      });
    });
  });

  // Hide dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });
}

function bindMapToolsAndApiKey() {
  // Map Zoom & Pan Buttons
  document.getElementById('btn-map-zoom-in')?.addEventListener('click', () => {
    worldMapExplorer.zoomIn();
  });

  document.getElementById('btn-map-zoom-out')?.addEventListener('click', () => {
    worldMapExplorer.zoomOut();
  });

  document.getElementById('btn-map-reset')?.addEventListener('click', () => {
    worldMapExplorer.resetZoom();
  });

  // GNews API Key Input Manager & LocalStorage Persistence
  const keyInput = document.getElementById('gnews-api-key-input');
  const statusBadge = document.getElementById('api-status-badge');
  const toggleKeyBtn = document.getElementById('btn-toggle-gnews-key');

  const savedKey = localStorage.getItem('gnews_api_key') || '';
  if (keyInput && savedKey) {
    keyInput.value = savedKey;
    if (statusBadge) {
      statusBadge.textContent = '🔑 GNEWS API KEY ACTIVE';
      statusBadge.style.color = 'var(--tt-yellow)';
    }
  }

  keyInput?.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    localStorage.setItem('gnews_api_key', val);

    if (statusBadge) {
      if (val.length > 5) {
        statusBadge.textContent = '🔑 GNEWS API KEY ACTIVE';
        statusBadge.style.color = 'var(--tt-yellow)';
      } else {
        statusBadge.textContent = '📡 WIKINEWS & REST STREAM ACTIVE';
        statusBadge.style.color = 'var(--tt-green)';
      }
    }
  });

  toggleKeyBtn?.addEventListener('click', () => {
    synthEngine.playRemoteClick();
    if (!keyInput) return;
    const shouldShow = keyInput.type === 'password';
    keyInput.type = shouldShow ? 'text' : 'password';
    toggleKeyBtn.textContent = shouldShow ? '🙈' : '👁';
    toggleKeyBtn.setAttribute('aria-pressed', String(shouldShow));
  });
}

function bindUtilityPopovers() {
  const savedBtn = document.getElementById('btn-saved-wiki-panel');
  const settingsBtn = document.getElementById('btn-settings-panel');
  const savedPanel = document.getElementById('saved-wiki-popover');
  const settingsPanel = document.getElementById('settings-popover');
  const panels = [savedPanel, settingsPanel].filter(Boolean);

  const closePanels = () => panels.forEach(panel => panel.classList.add('hidden'));
  const togglePanel = (panel) => {
    const shouldOpen = panel?.classList.contains('hidden');
    closePanels();
    if (panel && shouldOpen) panel.classList.remove('hidden');
  };

  savedBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    synthEngine.playRemoteClick();
    togglePanel(savedPanel);
  });

  settingsBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    synthEngine.playRemoteClick();
    togglePanel(settingsPanel);
  });

  panels.forEach(panel => {
    panel.addEventListener('click', (e) => e.stopPropagation());
  });

  document.addEventListener('click', (e) => {
    if (e.target.closest('.deck-window')) return;
    closePanels();
  });
}

function bindDockAndRemoteButtons() {
  // --- Bottom Dock Bar Buttons ---
  document.getElementById('btn-dock-wiki')?.addEventListener('click', () => {
    const country = getCountry(currentSelectedCountryCode);
    windowDeckEngine.spawnWikiWindow(country.name, currentSelectedCountryCode);
  });

  document.getElementById('btn-dock-news')?.addEventListener('click', () => {
    windowDeckEngine.spawnNewsWindow(currentSelectedCountryCode);
  });

  document.getElementById('btn-dock-weather')?.addEventListener('click', () => {
    windowDeckEngine.spawnWeatherWindow(currentSelectedCountryCode);
  });

  document.getElementById('btn-dock-market')?.addEventListener('click', () => {
    windowDeckEngine.spawnFinanceWindow(currentSelectedCountryCode);
  });

  document.getElementById('btn-dock-quiz')?.addEventListener('click', () => {
    windowDeckEngine.spawnQuizWindow(currentSelectedCountryCode);
  });

  document.getElementById('btn-dock-facts')?.addEventListener('click', () => {
    windowDeckEngine.spawnFactsWindow(currentSelectedCountryCode);
  });

  // Live Video Broadcast (TV-style reporter news feed)
  document.getElementById('btn-dock-live-tv')?.addEventListener('click', () => {
    windowDeckEngine.spawnLiveNewsVideoWindow('ALJAZEERA');
  });

  document.getElementById('btn-dock-grid')?.addEventListener('click', () => {
    windowDeckEngine.tileGrid2x2();
  });

  document.getElementById('btn-dock-clear')?.addEventListener('click', () => {
    windowDeckEngine.clearDeck();
  });
}

function bindSavedWikiPanel() {
  renderSavedWikiPanel();
  window.addEventListener('saved-wiki-pages-changed', renderSavedWikiPanel);
}

function renderSavedWikiPanel() {
  const listEl = document.getElementById('saved-wiki-list');
  if (!listEl) return;

  const savedPages = windowDeckEngine.getSavedWikiPages();
  if (savedPages.length === 0) {
    listEl.innerHTML = `<div class="saved-wiki-empty">No saved Wiki pages yet.</div>`;
    return;
  }

  listEl.innerHTML = savedPages.map((page, idx) => `
    <div class="saved-wiki-item" data-idx="${idx}">
      <button class="saved-wiki-open" data-idx="${idx}" title="Open ${escapeAttr(page.title)}">${escapeHtml(page.title)}</button>
      <button class="saved-wiki-remove" data-idx="${idx}" title="Remove saved page">✕</button>
    </div>
  `).join('');

  listEl.querySelectorAll('.saved-wiki-open').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = savedPages[Number(btn.getAttribute('data-idx'))];
      if (!page) return;
      synthEngine.playRemoteClick();
      windowDeckEngine.spawnWikiWindow(page.title, page.countryCode || currentSelectedCountryCode);
    });
  });

  listEl.querySelectorAll('.saved-wiki-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const page = savedPages[Number(btn.getAttribute('data-idx'))];
      if (!page) return;
      synthEngine.playRemoteClick();
      windowDeckEngine.removeSavedWikiPage(page.title);
    });
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#096;');
}

function bindHeaderControls() {
  // Audio Toggle Button
  const audioBtn = document.getElementById('audio-toggle');
  const audioStatus = document.getElementById('audio-status');
  if (audioBtn) {
    audioBtn.addEventListener('click', () => {
      const isEnabled = synthEngine.toggleAudio();
      if (audioStatus) audioStatus.textContent = isEnabled ? 'ON' : 'MUTED';
    });
  }

  // Single Theme Toggle (Retro Teletext <-> Modern Monochromatic)
  const themeBtn = document.getElementById('theme-toggle-btn');
  const themeStatusText = document.getElementById('theme-status-text');
  let currentTheme = 'teletext';

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      synthEngine.playRemoteClick();
      if (currentTheme === 'teletext') {
        currentTheme = 'modern';
        document.body.classList.remove('theme-teletext');
        document.body.classList.add('theme-modern');
        if (themeStatusText) themeStatusText.textContent = 'MODERN MONO';
      } else {
        currentTheme = 'teletext';
        document.body.classList.remove('theme-modern');
        document.body.classList.add('theme-teletext');
        if (themeStatusText) themeStatusText.textContent = 'TELETEXT';
      }
    });
  }
}

function bindCRTAudioTuner() {
  // Master Volume Slider
  document.getElementById('slider-volume')?.addEventListener('input', (e) => {
    const vol = parseFloat(e.target.value);
    synthEngine.setVolume(vol);
  });

  // CRT Shader Sliders
  document.getElementById('slider-curvature')?.addEventListener('input', (e) => {
    crtScreenEngine.setCurvature(parseFloat(e.target.value));
  });

  document.getElementById('slider-scanlines')?.addEventListener('input', (e) => {
    crtScreenEngine.setScanlines(parseFloat(e.target.value));
  });

  document.getElementById('slider-vhs')?.addEventListener('input', (e) => {
    crtScreenEngine.setVhsNoise(parseFloat(e.target.value));
  });

  document.getElementById('btn-static-burst')?.addEventListener('click', () => {
    crtScreenEngine.triggerStaticBurst();
  });

  document.getElementById('btn-crt-toggle')?.addEventListener('click', () => {
    synthEngine.playPowerToggle();
    crtScreenEngine.triggerStaticBurst();
    crtScreenEngine.toggleGlobe();
  });
}

function startClock() {
  const clockEl = document.getElementById('system-time');

  setInterval(() => {
    const now = new Date();
    const hrs = String(now.getUTCHours()).padStart(2, '0');
    const mins = String(now.getUTCMinutes()).padStart(2, '0');
    const secs = String(now.getUTCSeconds()).padStart(2, '0');

    if (clockEl) clockEl.textContent = `${hrs}:${mins}:${secs} UTC`;
  }, 1000);
}
