/* ==========================================================================
   TELETEXT 2099 — MULTI-WINDOW DECK ENGINE WITH SMART WINDOW POSITIONING,
   LIVE VIDEO BROADCASTS, WIKI BROWSER, RESIZABLE PANELS & DECK TABS
   ========================================================================== */

import { getCountry, LIVE_NEWS_STREAMS } from '../data/countryData.js';
import { fetchLiveWeather, fetchLiveFinance, fetchLiveNews, fetchWikiSummary, fetchWikiFullSections, fetchMediaWikiSourceArticle } from '../data/liveFetchers.js';
import { synthEngine } from '../audio/synthEngine.js';

const SAVED_WIKI_STORAGE_KEY = 'teletext_saved_wiki_pages';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function extractWikiTopicFromHref(href) {
  if (!href) return null;

  let url;
  try {
    url = new URL(href, 'https://en.wikipedia.org');
  } catch (e) {
    return null;
  }

  if (!url.hostname.endsWith('wikipedia.org')) return null;

  let rawTopic = '';
  if (url.pathname.startsWith('/wiki/')) {
    rawTopic = url.pathname.replace('/wiki/', '');
  } else if (url.pathname.includes('/w/index.php')) {
    rawTopic = url.searchParams.get('title') || '';
  }

  if (!rawTopic) return null;
  const topic = decodeURIComponent(rawTopic).replace(/_/g, ' ').trim();
  if (!topic || topic.includes(':')) return null;
  return topic;
}

function formatPublishedAge(publishedAt) {
  if (!publishedAt) return 'UNDATED';
  const date = new Date(publishedAt);
  if (!Number.isFinite(date.getTime())) return 'UNDATED';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

class WindowDeckEngine {
  constructor() {
    this.deckContainer = null;
    this.tabsContainer = null;
    this.activeWindows = [];
    this.highestZIndex = 500;
    this.handleWikiLinkClick = this.handleWikiLinkClick.bind(this);
  }

  init(containerId) {
    this.deckContainer = document.getElementById(containerId);
    this.tabsContainer = document.getElementById('tabs-list');
    document.removeEventListener('click', this.handleWikiLinkClick, true);
    document.addEventListener('click', this.handleWikiLinkClick, true);
  }

  getSavedWikiPages() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVED_WIKI_STORAGE_KEY) || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch (e) {
      return [];
    }
  }

  saveWikiPage(title, countryCode = 'USA') {
    const cleanTitle = String(title || '').trim();
    if (!cleanTitle) return [];

    const nextEntry = {
      title: cleanTitle,
      countryCode,
      savedAt: new Date().toISOString()
    };

    const pages = this.getSavedWikiPages()
      .filter(page => page.title.toLowerCase() !== cleanTitle.toLowerCase());

    pages.unshift(nextEntry);
    const limitedPages = pages.slice(0, 25);
    localStorage.setItem(SAVED_WIKI_STORAGE_KEY, JSON.stringify(limitedPages));
    window.dispatchEvent(new CustomEvent('saved-wiki-pages-changed'));
    return limitedPages;
  }

  removeSavedWikiPage(title) {
    const cleanTitle = String(title || '').trim().toLowerCase();
    const pages = this.getSavedWikiPages()
      .filter(page => page.title.toLowerCase() !== cleanTitle);
    localStorage.setItem(SAVED_WIKI_STORAGE_KEY, JSON.stringify(pages));
    window.dispatchEvent(new CustomEvent('saved-wiki-pages-changed'));
    return pages;
  }

  isWikiPageSaved(title) {
    const cleanTitle = String(title || '').trim().toLowerCase();
    return this.getSavedWikiPages().some(page => page.title.toLowerCase() === cleanTitle);
  }

  // ===== 1. SPAWN LIVE VIDEO NEWS BROADCAST WINDOW =====
  spawnLiveNewsVideoWindow(channelKey = "ALJAZEERA") {
    if (!this.deckContainer) return;
    const stream = LIVE_NEWS_STREAMS[channelKey] || LIVE_NEWS_STREAMS["ALJAZEERA"];
    const winId = `win-video-live-news`;

    const existing = document.getElementById(winId);
    if (existing) {
      this.focusWindow(existing);
      existing.querySelector('.window-title').textContent = `📺 LIVE BROADCAST: ${stream.name}`;
      this.renderLiveNewsVideoBody(existing, channelKey);
      return;
    }

    const win = this.createWindowShell(winId, `📺 LIVE BROADCAST: ${stream.name}`, 540);
    this.attachWindowEvents(win);
    this.renderLiveNewsVideoBody(win, channelKey);
  }

  renderLiveNewsVideoBody(win, channelKey) {
    const stream = LIVE_NEWS_STREAMS[channelKey] || LIVE_NEWS_STREAMS["ALJAZEERA"];
    let channelButtons = '';
    Object.keys(LIVE_NEWS_STREAMS).forEach(key => {
      channelButtons += `
        <button class="channel-btn ${key === channelKey ? 'active' : ''}" data-channel="${key}">
          ${key}
        </button>
      `;
    });

    const playerHtml = stream.type === 'source'
      ? `
        <div class="internal-live-card">
          <div class="internal-live-title">${escapeHtml(stream.name)}</div>
          <button class="internal-live-open" data-source-url="${escapeHtml(stream.sourceUrl || stream.url)}" data-source-title="${escapeHtml(stream.name)}">
            OPEN LIVE SOURCE INSIDE DECK
          </button>
        </div>
      `
      : `
        <div class="video-player-container">
          <iframe src="${escapeHtml(stream.url)}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe>
        </div>
      `;

    win.querySelector('.window-body').innerHTML = `
      <div class="channel-selector-bar">
        ${channelButtons}
      </div>
      ${playerHtml}
      <div class="news-card-meta" style="margin-top:6px;">
        <span>🔴 LIVE SATELLITE VIDEO STREAM</span>
        <button class="inline-source-btn live-source-link" data-source-url="${escapeHtml(stream.sourceUrl || stream.url)}" data-source-title="${escapeHtml(stream.name)}">OPEN LIVE PAGE</button>
      </div>
    `;

    win.querySelectorAll('.channel-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        synthEngine.playRemoteClick();
        const newKey = btn.getAttribute('data-channel');
        const newStream = LIVE_NEWS_STREAMS[newKey];
        win.querySelector('.window-title').textContent = `📺 LIVE BROADCAST: ${newStream.name}`;
        this.renderLiveNewsVideoBody(win, newKey);
      });
    });

    win.querySelectorAll('.inline-source-btn, .internal-live-open').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        synthEngine.playRemoteClick();
        this.spawnSourceWindow(btn.getAttribute('data-source-title'), btn.getAttribute('data-source-url'));
      });
    });
  }

  // ===== 2. SPAWN COUNTRY BREAKING NEWS POPUP (REWORKED & SLEEK) =====
  async spawnNewsWindow(countryCode) {
    if (!this.deckContainer) return;
    const country = getCountry(countryCode);
    const winId = `win-news-${country.code}`;

    const existing = document.getElementById(winId);
    if (existing) { this.focusWindow(existing); return; }

    this.closeWindowsOfType('win-news-');

    const win = this.createWindowShell(winId, `📰 ${country.flag} ${country.name.toUpperCase()} — NEWS DOSSIER`, 500);
    win.querySelector('.window-body').innerHTML = `
      <div style="color:var(--tt-yellow); font-family:var(--font-mono); padding:14px; text-align:center;">
        📡 CONNECTING TO SATELLITE NEWS BROADCAST NETWORK FOR ${country.name.toUpperCase()}...
      </div>
    `;
    this.attachWindowEvents(win);

    await this.renderNewsWindowBody(win, country.code, 10);
  }

  async renderNewsWindowBody(win, countryCode, maxAgeDays = 10) {
    const country = getCountry(countryCode);
    const winId = win.id;
    const ageOptions = [1, 3, 10, 30];
    const newsItems = await fetchLiveNews(country.code, maxAgeDays);

    let feedHtml = '';
    newsItems.forEach((item, i) => {
      const isLiveBadge = item.isLive ? 'LIVE' : 'NEWS';
      const badgeClass = item.isLive ? 'badge-live' : 'badge-intel';

      // Format title cleanly (capitalize nicely, not ugly raw text)
      let cleanTitle = item.title;
      if (cleanTitle === cleanTitle.toUpperCase() && cleanTitle.length > 30) {
        cleanTitle = cleanTitle.charAt(0) + cleanTitle.slice(1).toLowerCase();
      }

      feedHtml += `
        <div class="modern-news-card">
          <div class="news-card-header">
            <span class="news-badge ${badgeClass}">${isLiveBadge}</span>
            <span class="news-source-tag">${item.source} • ${formatPublishedAge(item.publishedAt)}</span>
          </div>
          <h4 class="news-card-title">${cleanTitle}</h4>
          <p class="news-card-body">${item.body}</p>
          ${item.url && item.url !== '#' ? `
            <div class="news-card-footer">
              <button class="news-read-more-btn"
                data-source-url="${escapeHtml(item.url)}"
                data-source-title="${escapeHtml(cleanTitle)}"
                data-source-name="${escapeHtml(item.source)}"
                data-source-body="${escapeHtml(item.body)}"
                data-source-published="${escapeHtml(item.publishedAt || '')}"
                data-country-code="${escapeHtml(country.code)}">
                READ FULL SOURCE
              </button>
            </div>
          ` : ''}
        </div>
      `;
    });

    win.querySelector('.window-body').innerHTML = `
      <div class="news-popup-header-banner">
        <div class="news-banner-title">${country.flag} ${country.name} (${country.code})</div>
        <div class="news-banner-status"><span class="pulse-dot-green"></span> RECENT FEED</div>
      </div>

      <div class="news-age-filter">
        <span>AGE FILTER</span>
        ${ageOptions.map(days => `
          <button class="news-age-btn ${days === maxAgeDays ? 'active' : ''}" data-days="${days}">
            ${days === 1 ? '24H' : `${days}D`}
          </button>
        `).join('')}
      </div>

      <div style="margin: 10px 0;">
        <button class="open-video-stream-btn" id="btn-open-tv-video-${winId}">
          ▶ WATCH LIVE VIDEO BROADCAST STREAM
        </button>
      </div>

      <div class="news-feed-container">${feedHtml}</div>

      <div class="news-card-meta" style="margin-top:10px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.1);">
        <span>CAPITAL: ${country.capital.toUpperCase()}</span>
        <span>CURRENCY: ${country.currency}</span>
      </div>
    `;

    win.querySelector(`#btn-open-tv-video-${winId}`)?.addEventListener('click', () => {
      this.spawnLiveNewsVideoWindow(country.liveNewsKey || "ALJAZEERA");
    });

    win.querySelectorAll('.news-age-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        synthEngine.playRemoteClick();
        const days = Number(btn.getAttribute('data-days')) || 10;
        win.querySelector('.news-feed-container').innerHTML = `
          <div style="color:var(--tt-yellow); font-family:var(--font-mono); padding:14px; text-align:center;">
            REFRESHING RECENT NEWS WINDOW...
          </div>
        `;
        await this.renderNewsWindowBody(win, country.code, days);
      });
    });

    win.querySelectorAll('.news-read-more-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        synthEngine.playRemoteClick();
        this.spawnNewsSourceWindow({
          title: btn.getAttribute('data-source-title'),
          url: btn.getAttribute('data-source-url'),
          source: btn.getAttribute('data-source-name'),
          body: btn.getAttribute('data-source-body'),
          publishedAt: btn.getAttribute('data-source-published'),
          countryCode: btn.getAttribute('data-country-code')
        });
      });
    });
  }

  async spawnNewsSourceWindow(sourceItem) {
    if (!this.deckContainer || !sourceItem?.url) return;

    const cleanTitle = sourceItem.title || 'NEWS SOURCE';
    const winId = `win-news-source-${String(cleanTitle).replace(/[^a-zA-Z0-9]/g, '-').substring(0, 34)}-${Date.now().toString(36)}`;
    const win = this.createWindowShell(winId, `📰 SOURCE: ${String(cleanTitle).toUpperCase().substring(0, 40)}`, 680);
    win.querySelector('.window-body').innerHTML = `
      <div class="source-dossier-loading">RENDERING SOURCE DOSSIER...</div>
    `;
    this.attachWindowEvents(win);

    const mediaWikiArticle = await fetchMediaWikiSourceArticle(sourceItem.url);
    const sourceName = mediaWikiArticle.success ? mediaWikiArticle.source : (sourceItem.source || 'NEWS SOURCE');
    const articleTitle = mediaWikiArticle.success ? mediaWikiArticle.title : cleanTitle;
    const bodyHtml = mediaWikiArticle.success
      ? mediaWikiArticle.bodyHtml
      : `<p>${escapeHtml(sourceItem.body || 'No article body was returned by the live feed. The source URL is preserved below for verification.')}</p>`;

    win.querySelector('.window-body').innerHTML = `
      <div class="source-dossier-header">
        <div>
          <div class="source-dossier-kicker">${escapeHtml(sourceName)}</div>
          <div class="source-dossier-title">${escapeHtml(articleTitle)}</div>
        </div>
        <span class="source-dossier-badge">INTERNAL VIEW</span>
      </div>
      <div class="source-dossier-meta">
        <span>${escapeHtml(sourceItem.publishedAt || 'LIVE FEED SNAPSHOT')}</span>
        <span>${escapeHtml(sourceItem.url)}</span>
      </div>
      <div class="source-dossier-content">
        ${bodyHtml}
      </div>
    `;

    this.bindNewsSourceLinks(win, sourceItem);
  }

  bindNewsSourceLinks(win, sourceItem) {
    win.querySelectorAll('.source-dossier-content a[href]').forEach(link => {
      const topic = extractWikiTopicFromHref(link.getAttribute('href'));
      link.classList.add('wiki-link');
      link.removeAttribute('target');
      link.removeAttribute('rel');
      link.setAttribute('href', '#');

      if (topic) {
        link.setAttribute('data-topic', topic);
        link.setAttribute('data-country-code', sourceItem.countryCode || 'USA');
      } else {
        link.setAttribute('data-disabled-link', 'true');
      }
    });
  }

  spawnSourceWindow(title, url) {
    if (!this.deckContainer || !url) return;

    const cleanTitle = title || 'LIVE SOURCE';
    const winId = `win-source-${String(cleanTitle).replace(/[^a-zA-Z0-9]/g, '-').substring(0, 36)}-${Date.now().toString(36)}`;
    const win = this.createWindowShell(winId, `🔎 SOURCE: ${String(cleanTitle).toUpperCase().substring(0, 42)}`, 720);
    this.attachWindowEvents(win);

    win.querySelector('.window-body').innerHTML = `
      <div class="source-viewer-bar">
        <span>${escapeHtml(url)}</span>
      </div>
      <div class="source-viewer-frame">
        <iframe src="${escapeHtml(url)}" frameborder="0" scrolling="no" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation" allow="autoplay; fullscreen; picture-in-picture" loading="lazy"></iframe>
      </div>
    `;
  }

  // ===== 3. SPAWN WIKIPEDIA ARTICLE DOSSIER WINDOW (FULL UNCUT ARTICLES) =====
  async spawnWikiWindow(topicTitle, countryCode = 'USA') {
    if (!this.deckContainer) return;
    const country = getCountry(countryCode);
    const cleanTitle = topicTitle || country.name;
    const winId = `win-wiki-${cleanTitle.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 30)}`;

    const existing = document.getElementById(winId);
    if (existing) { this.focusWindow(existing); return; }

    // Big panel size: 680px width
    const win = this.createWindowShell(winId, `🌐 WIKI: ${cleanTitle.toUpperCase()}`, 680);
    win.querySelector('.window-body').innerHTML = `
      <div style="color:var(--tt-yellow); font-family:var(--font-mono); padding:14px; text-align:center;">
        🔍 RETRIEVING FULL WIKIPEDIA DOSSIER ARCHIVE FOR "${cleanTitle.toUpperCase()}"...
      </div>
    `;
    this.attachWindowEvents(win);

    const [wikiSummary, wikiSections] = await Promise.all([
      fetchWikiSummary(cleanTitle),
      fetchWikiFullSections(cleanTitle)
    ]);

    let sectionNavHtml = '';
    let sectionsBodyHtml = '';

    if (wikiSections.success && wikiSections.sections && wikiSections.sections.length > 0) {
      wikiSections.sections.slice(0, 10).forEach((sec, idx) => {
        sectionNavHtml += `<button class="wiki-sec-tab ${idx === 0 ? 'active' : ''}" data-sec="${winId}-sec-${idx}">${sec.title}</button>`;
        sectionsBodyHtml += `
          <div class="wiki-sec-content ${idx === 0 ? 'show' : 'hidden'}" id="${winId}-sec-${idx}" style="font-size:15px; color:#e2e8f0; line-height:1.65; font-family:var(--font-sans);">
            <h3 style="color:var(--tt-cyan); font-family:var(--font-pixel); font-size:22px; border-bottom:1px solid #1a2f4c; margin-bottom:10px; padding-bottom:4px;">${sec.title.toUpperCase()}</h3>
            <div>${sec.content}</div>
          </div>
        `;
      });
    } else {
      sectionsBodyHtml = `<div style="font-size:16px; color:#e2e8f0; line-height:1.65;">${wikiSummary.extract}</div>`;
    }

    // Country-specific related topics (e.g. Culture of India, History of India)
    const relatedTopics = [
      { label: country.capital, topic: country.capital },
      { label: country.region, topic: country.region },
      { label: `Geography of ${country.name}`, topic: `Geography of ${country.name}` },
      { label: `Economy of ${country.name}`, topic: `Economy of ${country.name}` },
      { label: `History of ${country.name}`, topic: `History of ${country.name}` },
      { label: `Demographics of ${country.name}`, topic: `Demographics of ${country.name}` },
      { label: `Culture of ${country.name}`, topic: `Culture of ${country.name}` }
    ];

    let topicTagsHtml = '';
    relatedTopics.forEach(item => {
      if (item.topic && item.topic !== cleanTitle) {
        topicTagsHtml += `<button class="wiki-tag-btn" data-topic="${item.topic}" style="background:#0a1628; border:1px solid var(--tt-cyan); color:var(--tt-cyan); font-family:var(--font-mono); font-size:11px; padding:4px 8px; margin:3px; cursor:pointer; border-radius:3px; transition:all 0.15s;">${item.label}</button>`;
      }
    });

    win.querySelector('.window-body').innerHTML = `
      <div style="border-bottom:2px solid var(--tt-cyan); padding-bottom:8px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          <div style="font-size:26px; color:var(--tt-yellow); font-family:var(--font-pixel); font-weight:bold;">${country.flag} ${wikiSummary.title.toUpperCase()}</div>
          <div style="font-size:13px; color:var(--tt-cyan); font-family:var(--font-mono); margin-top:2px;">${wikiSummary.description || 'FULL WIKIPEDIA DOSSIER'}</div>
        </div>
        <div class="wiki-window-actions">
          <span class="wiki-dossier-badge">UNCUT DOSSIER</span>
          <button class="wiki-save-btn" id="btn-save-wiki-${winId}" type="button">
            ${this.isWikiPageSaved(wikiSummary.title) ? 'SAVED' : 'SAVE'}
          </button>
        </div>
      </div>

      ${wikiSummary.thumbnail ? `
        <div style="float:right; margin:0 0 12px 12px; max-width:220px;">
          <img src="${wikiSummary.thumbnail}" alt="${wikiSummary.title}" style="width:100%; border-radius:6px; border:1px solid var(--tt-cyan); object-fit:cover; box-shadow:0 0 14px rgba(0,255,255,0.25);">
        </div>
      ` : ''}

      ${sectionNavHtml ? `<div class="wiki-sec-bar" style="display:flex; gap:4px; flex-wrap:wrap; margin-bottom:12px;">${sectionNavHtml}</div>` : ''}

      <div class="wiki-article-viewport" style="max-height:460px; overflow-y:auto; padding-right:8px; clear:left;">
        ${sectionsBodyHtml}
      </div>

      <div style="margin-top:12px; background:#060d1a; padding:8px 10px; border-radius:6px; border:1px solid #1a2f4c; clear:both;">
        <div style="font-size:11px; color:var(--tt-yellow); font-family:var(--font-mono); margin-bottom:6px; font-weight:bold;">INTERACTION LINK DECK (COUNTRY SPECIFIC):</div>
        <div>${topicTagsHtml}</div>
      </div>

      <div class="news-card-meta" style="padding-top:8px; border-top:1px solid #1a2f4c; margin-top:10px;">
        <span>SOURCE: WIKIPEDIA REST API</span>
        <a href="${wikiSummary.content_urls}" target="_blank" rel="noopener" style="color:var(--tt-yellow); text-decoration:underline;">ORIGINAL WIKIPEDIA ↗</a>
      </div>
    `;

    win.querySelector(`#btn-save-wiki-${winId}`)?.addEventListener('click', (e) => {
      e.stopPropagation();
      synthEngine.playRemoteClick();
      this.saveWikiPage(wikiSummary.title, countryCode);
      e.currentTarget.textContent = 'SAVED';
    });

    win.querySelectorAll('.wiki-sec-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        synthEngine.playRemoteClick();
        const targetId = tab.getAttribute('data-sec');
        win.querySelectorAll('.wiki-sec-tab').forEach(t => t.classList.remove('active'));
        win.querySelectorAll('.wiki-sec-content').forEach(c => {
          c.classList.add('hidden');
          c.classList.remove('show');
        });
        tab.classList.add('active');
        const targetEl = win.querySelector(`#${targetId}`);
        if (targetEl) {
          targetEl.classList.remove('hidden');
          targetEl.classList.add('show');
        }
      });
    });

    win.querySelectorAll('.wiki-tag-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        synthEngine.playRemoteClick();
        const top = btn.getAttribute('data-topic');
        this.spawnWikiWindow(top, countryCode);
      });
    });

    this.bindWikiArticleLinks(win, countryCode);
  }

  bindWikiArticleLinks(win, countryCode) {
    const article = win.querySelector('.wiki-article-viewport');
    if (!article) return;

    article.querySelectorAll('a[href]').forEach(link => {
      const topic = extractWikiTopicFromHref(link.getAttribute('href'));
      link.classList.add('wiki-link');
      link.removeAttribute('target');
      link.removeAttribute('rel');
      link.setAttribute('href', '#');

      if (topic) {
        link.setAttribute('data-topic', topic);
        link.setAttribute('data-country-code', countryCode);
      } else {
        link.setAttribute('data-disabled-link', 'true');
      }
    });
  }

  handleWikiLinkClick(e) {
    const target = e.target instanceof Element ? e.target : e.target?.parentElement;
    const link = target?.closest('a.wiki-link');
    if (!link) return;

    e.preventDefault();
    e.stopPropagation();

    const topic = link.getAttribute('data-topic');
    if (!topic) return;

    synthEngine.playRemoteClick();
    this.spawnWikiWindow(topic, link.getAttribute('data-country-code') || 'USA');
  }

  // ===== 4. SPAWN WEATHER WINDOW =====
  async spawnWeatherWindow(countryCode) {
    if (!this.deckContainer) return;
    const country = getCountry(countryCode);
    const winId = `win-weather-${country.code}`;
    const existing = document.getElementById(winId);
    if (existing) { this.focusWindow(existing); return; }

    const win = this.createWindowShell(winId, `🌤️ ${country.flag} ${country.name.toUpperCase()} — WEATHER`, 440);
    win.querySelector('.window-body').innerHTML = `<div style="color:var(--tt-yellow); padding:10px;">CONNECTING TO METEOROLOGICAL SATELLITE...</div>`;
    this.attachWindowEvents(win);

    const weather = await fetchLiveWeather(country.capitalLat, country.capitalLng);

    win.querySelector('.window-body').innerHTML = `
      <div class="news-card-country">${country.flag} ${country.name} — ${country.capital.toUpperCase()}</div>
      <div style="background:#000; border:1px solid var(--tt-cyan); padding:12px; border-radius:4px; margin:8px 0; text-align:center;">
        <div style="font-size:42px; color:var(--tt-yellow); font-weight:bold; font-family:var(--font-pixel);">${weather.temp}</div>
        <div style="font-size:22px; color:var(--tt-cyan); font-family:var(--font-pixel);">${weather.desc}</div>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:15px; font-family:var(--font-mono);">
        <div style="background:#0a1628; padding:6px; border:1px solid #1a2f4c;"><span style="color:var(--tt-green);">WIND:</span> ${weather.wind}</div>
        <div style="background:#0a1628; padding:6px; border:1px solid #1a2f4c;"><span style="color:var(--tt-green);">DIR:</span> ${weather.windDir}</div>
      </div>
      <div class="news-card-meta" style="margin-top:8px;"><span>OPEN-METEO API</span><span>${country.capitalLat.toFixed(1)}°, ${country.capitalLng.toFixed(1)}°</span></div>
    `;
  }

  // ===== 5. SPAWN FINANCE WINDOW =====
  async spawnFinanceWindow(countryCode) {
    if (!this.deckContainer) return;
    const country = getCountry(countryCode);
    const winId = `win-finance-${country.code}`;
    const existing = document.getElementById(winId);
    if (existing) { this.focusWindow(existing); return; }

    const win = this.createWindowShell(winId, `📈 ${country.flag} ${country.name.toUpperCase()} — MARKET`, 440);
    win.querySelector('.window-body').innerHTML = `<div style="color:var(--tt-yellow); padding:10px;">CONNECTING TO FINANCIAL EXCHANGE...</div>`;
    this.attachWindowEvents(win);

    const fin = await fetchLiveFinance(country.currency);

    win.querySelector('.window-body').innerHTML = `
      <div class="news-card-country">${country.flag} ${country.name} — MARKET TICKER</div>
      <div style="background:#000; border:1px solid var(--tt-green); padding:10px; border-radius:4px; margin:8px 0;">
        <div style="font-size:16px; color:var(--tt-yellow); font-family:var(--font-mono);">${country.stockIndex}</div>
        <div style="font-size:28px; color:var(--tt-green); font-weight:bold; font-family:var(--font-pixel);">${country.stockValue} (${country.stockChange})</div>
      </div>
      <div style="font-size:14px; color:var(--tt-cyan); margin-bottom:4px; font-family:var(--font-mono);">EXCHANGE RATES (BASE: ${country.currency}):</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px; font-size:14px; font-family:var(--font-mono);">
        <div style="background:#0a1628; padding:5px; border:1px solid #1a2f4c; color:#fff;">= ${fin.usdRate} USD</div>
        <div style="background:#0a1628; padding:5px; border:1px solid #1a2f4c; color:#fff;">= ${fin.eurRate} EUR</div>
        <div style="background:#0a1628; padding:5px; border:1px solid #1a2f4c; color:#fff;">= ${fin.gbpRate} GBP</div>
        <div style="background:#0a1628; padding:5px; border:1px solid #1a2f4c; color:#fff;">= ${fin.jpyRate} JPY</div>
      </div>
      <div class="news-card-meta" style="margin-top:8px;"><span>${country.currency} RAIL</span><span>${fin.lastUpdated}</span></div>
    `;
  }

  // ===== 6. SPAWN QUIZ WINDOW =====
  spawnQuizWindow(countryCode) {
    if (!this.deckContainer) return;
    const country = getCountry(countryCode);
    const winId = `win-quiz-${country.code}`;
    const existing = document.getElementById(winId);
    if (existing) { this.focusWindow(existing); return; }

    const win = this.createWindowShell(winId, `🎮 ${country.flag} ${country.name.toUpperCase()} — QUIZ`, 440);
    let currentQIdx = 0, score = 0, answered = false;

    const renderQuestion = () => {
      const q = country.quiz[currentQIdx];
      const colors = ['#ff2a4b', '#00ff66', '#ffee00', '#00f0ff'];
      let optsHtml = '';
      q.options.forEach((opt, idx) => {
        optsHtml += `<button class="win-quiz-opt" data-idx="${idx}" style="display:block;width:100%;text-align:left;background:#0a1628;border:1px solid ${colors[idx]};color:${colors[idx]};font-family:var(--font-pixel);font-size:19px;padding:6px 10px;margin:4px 0;cursor:pointer;border-radius:3px;transition:all 0.15s;">${opt}</button>`;
      });

      win.querySelector('.window-body').innerHTML = `
        <div class="news-card-country">${country.flag} TRIVIA [Q${currentQIdx+1}/${country.quiz.length}]</div>
        <div style="font-size:18px;color:#fff;margin:8px 0;font-weight:bold;">${q.q}</div>
        ${optsHtml}
        <div class="win-quiz-feedback" style="font-size:15px;color:var(--tt-yellow);height:28px;margin-top:6px;font-family:var(--font-mono);">Select A, B, C, or D</div>
        <div class="news-card-meta" style="margin-top:6px;"><span>SCORE: ${score} PTS</span><span>${country.code}</span></div>
      `;
      win.querySelectorAll('.win-quiz-opt').forEach(btn => {
        btn.addEventListener('click', () => {
          if (answered) return;
          answered = true;
          const sel = parseInt(btn.getAttribute('data-idx'));
          const fb = win.querySelector('.win-quiz-feedback');
          if (sel === q.correct) {
            synthEngine.playQuizWin(); score += 100;
            if (fb) fb.innerHTML = `<span style="color:var(--tt-green);">✓ CORRECT! ${q.explanation}</span>`;
          } else {
            synthEngine.playQuizLose();
            if (fb) fb.innerHTML = `<span style="color:var(--tt-red);">✗ WRONG! ${q.explanation}</span>`;
          }
          setTimeout(() => { currentQIdx = (currentQIdx+1)%country.quiz.length; answered = false; renderQuestion(); }, 2200);
        });
      });
    };
    renderQuestion();
    this.attachWindowEvents(win);
  }

  // ===== 7. SPAWN FACTS WINDOW =====
  spawnFactsWindow(countryCode) {
    if (!this.deckContainer) return;
    const country = getCountry(countryCode);
    const winId = `win-facts-${country.code}`;
    const existing = document.getElementById(winId);
    if (existing) { this.focusWindow(existing); return; }

    const win = this.createWindowShell(winId, `💡 ${country.flag} ${country.name.toUpperCase()} — FACTS`, 440);
    let factsHtml = '';
    country.facts.forEach((fact, i) => {
      factsHtml += `<div style="margin-bottom:8px;border-bottom:1px dashed #1a2f4c;padding-bottom:6px;"><span style="color:var(--tt-yellow);font-family:var(--font-mono); font-weight:bold;">[#${i+1}]</span> <span style="color:#cbd5e1;font-size:16px;">${fact}</span></div>`;
    });
    win.querySelector('.window-body').innerHTML = `
      <div class="news-card-country">${country.flag} ${country.name} — FACTS CORNER</div>
      <div style="margin-top:6px;">${factsHtml}</div>
      <div class="news-card-meta" style="margin-top:6px;"><span>${country.currency}</span><span>${country.region}</span></div>
    `;
    this.attachWindowEvents(win);
  }

  // ===== HELPER: Close windows of a specific prefix =====
  closeWindowsOfType(prefix) {
    const toClose = this.activeWindows.filter(w => w.id.startsWith(prefix));
    toClose.forEach(w => this.closeWindow(w));
  }

  // ===== SMART WINDOW POSITIONING & SHELL CREATION =====
  createWindowShell(winId, title, widthPx = 460) {
    const win = document.createElement('div');
    win.className = 'deck-window focused';
    win.id = winId;
    win.setAttribute('data-title', title);
    win.style.zIndex = ++this.highestZIndex;
    win.style.width = widthPx + 'px';

    const count = this.activeWindows.length;
    const step = 32;
    const leftPos = Math.min(30 + (count % 4) * step, window.innerWidth - widthPx - 40);
    const topPos = Math.min(30 + (count % 5) * step, window.innerHeight - 350);

    win.style.top = `${topPos}px`;
    win.style.left = `${Math.max(20, leftPos)}px`;

    win.innerHTML = `
      <div class="window-header">
        <div class="window-title">${title}</div>
        <div class="window-actions">
          <button class="win-action-btn btn-close" title="Close Window">✕</button>
        </div>
      </div>
      <div class="window-body"></div>
      <div class="resize-handle" title="Drag to Resize Window"></div>
    `;

    return win;
  }

  attachWindowEvents(win) {
    win.addEventListener('mousedown', () => this.focusWindow(win));
    win.querySelector('.btn-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      synthEngine.playRemoteClick();
      this.closeWindow(win);
    });

    this.makeDraggable(win);
    this.makeResizable(win);
    this.deckContainer.appendChild(win);
    this.activeWindows.push(win);
    synthEngine.playRemoteClick();
    this.renderTabsList();
  }

  focusWindow(win) {
    this.activeWindows.forEach(w => w.classList.remove('focused'));
    win.classList.add('focused');
    win.style.zIndex = ++this.highestZIndex;
    this.renderTabsList();
  }

  closeWindow(win) {
    win.remove();
    this.activeWindows = this.activeWindows.filter(w => w !== win);
    this.renderTabsList();
  }

  clearDeck() {
    synthEngine.playRemoteClick();
    this.activeWindows.forEach(w => w.remove());
    this.activeWindows = [];
    this.renderTabsList();
  }

  tileGrid2x2() {
    synthEngine.playRemoteClick();
    if (this.activeWindows.length === 0) return;
    const cw = this.deckContainer.clientWidth || 900;
    const ch = this.deckContainer.clientHeight || 500;
    const cols = 2, rows = 2;
    const ww = Math.min(460, (cw / cols) - 16);
    const wh = Math.min(300, (ch / rows) - 16);

    this.activeWindows.forEach((win, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols) % rows;
      win.style.width = `${ww}px`;
      win.style.top = `${15 + (row * (wh + 15))}px`;
      win.style.left = `${15 + (col * (ww + 15))}px`;
    });
  }

  renderTabsList() {
    if (!this.tabsContainer) return;
    if (this.activeWindows.length === 0) {
      this.tabsContainer.innerHTML = `<span class="no-tabs-hint">No active windows open. Click map or dock buttons!</span>`;
      return;
    }
    let html = '';
    this.activeWindows.forEach(win => {
      const title = win.getAttribute('data-title') || win.id;
      const shortTitle = title.length > 26 ? title.substring(0, 26) + '…' : title;
      const focused = win.classList.contains('focused');
      html += `<div class="deck-tab ${focused ? 'active' : ''}" data-target="${win.id}"><span class="tab-title">${shortTitle}</span><span class="tab-close" data-close="${win.id}">✕</span></div>`;
    });
    this.tabsContainer.innerHTML = html;

    this.tabsContainer.querySelectorAll('.deck-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        if (e.target.classList.contains('tab-close')) {
          const w = document.getElementById(e.target.getAttribute('data-close'));
          if (w) this.closeWindow(w);
          return;
        }
        const w = document.getElementById(tab.getAttribute('data-target'));
        if (w) { synthEngine.playRemoteClick(); this.focusWindow(w); }
      });
    });
  }

  makeDraggable(win) {
    const header = win.querySelector('.window-header');
    let dragging = false, sx, sy, il, it;
    header.addEventListener('mousedown', (e) => {
      dragging = true; sx = e.clientX; sy = e.clientY;
      il = win.offsetLeft; it = win.offsetTop;
      this.focusWindow(win);
    });
    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      win.style.left = `${il + e.clientX - sx}px`;
      win.style.top = `${it + e.clientY - sy}px`;
    });
    document.addEventListener('mouseup', () => { dragging = false; });
  }

  makeResizable(win) {
    const handle = win.querySelector('.resize-handle');
    if (!handle) return;
    let resizing = false, sx, sy, sw, sh;
    handle.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      resizing = true; sx = e.clientX; sy = e.clientY;
      sw = win.offsetWidth; sh = win.offsetHeight;
    });
    document.addEventListener('mousemove', (e) => {
      if (!resizing) return;
      const nw = Math.max(300, sw + e.clientX - sx);
      const nh = Math.max(180, sh + e.clientY - sy);
      win.style.width = `${nw}px`;
      const body = win.querySelector('.window-body');
      if (body) body.style.maxHeight = `${nh - 50}px`;
    });
    document.addEventListener('mouseup', () => { resizing = false; });
  }
}

export const windowDeckEngine = new WindowDeckEngine();
