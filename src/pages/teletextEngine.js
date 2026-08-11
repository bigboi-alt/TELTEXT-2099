/* ==========================================================================
   TELETEXT 2099 — COUNTRY-AWARE TELETEXT PAGE ENGINE & FACTS CORNER
   ========================================================================== */

import { getCountry } from '../data/countryData.js';
import { synthEngine } from '../audio/synthEngine.js';

class TeletextEngine {
  constructor() {
    this.currentPage = '100';
    this.currentCountryCode = 'USA';
    this.bodyEl = null;
    this.headerPageEl = null;
    this.headerTitleEl = null;
    this.remoteDisplayNum = null;
    this.remoteDisplayName = null;
  }

  init() {
    this.bodyEl = document.getElementById('tt-body');
    this.headerPageEl = document.getElementById('tt-header-page');
    this.headerTitleEl = document.getElementById('tt-header-title');
    this.remoteDisplayNum = document.getElementById('remote-page-num');
    this.remoteDisplayName = document.getElementById('remote-page-name');

    this.renderPage('100');
  }

  setSelectedCountry(countryCode) {
    this.currentCountryCode = countryCode;
    this.renderPage(this.currentPage);
  }

  setPage(pageNum) {
    this.currentPage = String(pageNum);
    synthEngine.playRemoteClick();
    this.renderPage(this.currentPage);
  }

  renderPage(pageNum) {
    if (!this.bodyEl) return;

    if (this.headerPageEl) this.headerPageEl.textContent = `P${pageNum}`;
    if (this.remoteDisplayNum) this.remoteDisplayNum.textContent = pageNum;

    const country = getCountry(this.currentCountryCode);

    switch (pageNum) {
      case '100':
        this.renderPage100(country);
        break;
      case '200':
        this.renderPage200(country);
        break;
      case '300':
        this.renderPage300(country);
        break;
      case '400':
        this.renderPage400(country);
        break;
      case '500':
        this.renderPage500(country);
        break;
      case '600':
        this.renderPage600(country);
        break;
      case '700':
        this.renderPage700(country);
        break;
      case '800':
        this.renderPage800(country);
        break;
      default:
        this.renderCustomPage(pageNum, country);
        break;
    }
  }

  // --- Page 100: Main Index ---
  renderPage100(country) {
    if (this.headerTitleEl) this.headerTitleEl.textContent = `CEEFAX 100 ${country.code} Sat 08 Aug`;
    if (this.remoteDisplayName) this.remoteDisplayName.textContent = 'MAIN INDEX';

    this.bodyEl.innerHTML = `
      <div class="tt-double-size tt-c-yellow">CEEFAX 2099 — ${country.flag} ${country.name.toUpperCase()}</div>
      <div class="tt-c-cyan">SELECTED NATION: ${country.name} (${country.code}) | CAPITAL: ${country.capital.toUpperCase()}</div>
      <div style="margin: 6px 0;">
        <div class="tt-c-white"><span class="tt-bg-red">200</span> ${country.code} NEWS MATRIX ..... Click for News Popup</div>
        <div class="tt-c-white"><span class="tt-bg-blue">300</span> ${country.code} WEATHER RADAR .... Live Capital Forecast</div>
        <div class="tt-c-white"><span class="tt-bg-yellow">400</span> ${country.code} TRIVIA QUIZ ..... 4 Unique Questions</div>
        <div class="tt-c-white"><span class="tt-bg-red">500</span> ${country.code} MARKET TICKER .... ${country.currency} & ${country.stockIndex}</div>
        <div class="tt-c-white"><span class="tt-bg-green">700</span> ${country.code} FACTS CORNER ..... 5 Country Trivia Facts</div>
        <div class="tt-c-white"><span class="tt-bg-blue">800</span> WEBAUDIO SYNTH BOARD .. Procedural Audio FX</div>
      </div>
      <div class="tt-c-green">--------------------------------------------------</div>
      <div class="tt-c-yellow">HINT: Click any nation on the map to switch full terminal & popup context!</div>
    `;
  }

  // --- Page 200: World News ---
  renderPage200(country) {
    if (this.headerTitleEl) this.headerTitleEl.textContent = `NEWS 200 ${country.code} Sat 08 Aug`;
    if (this.remoteDisplayName) this.remoteDisplayName.textContent = `${country.code} NEWS`;

    let newsListHtml = '';
    country.news.forEach((item, i) => {
      newsListHtml += `
        <div style="margin-bottom: 4px;">
          <span class="tt-c-yellow">[${i+1}] ${item.title}:</span> 
          <span class="tt-c-white">${item.body}</span>
        </div>
      `;
    });

    this.bodyEl.innerHTML = `
      <div class="tt-double-size tt-c-cyan">${country.flag} ${country.name.toUpperCase()} BREAKING NEWS</div>
      <div class="tt-c-yellow">CAPITAL: ${country.capital.toUpperCase()} | REGION: ${country.region.toUpperCase()}</div>
      <div style="margin: 6px 0;">
        ${newsListHtml}
      </div>
      <div class="tt-c-green">==================================================</div>
      <div class="tt-c-yellow">POPUP READY: Click 'NEWS' button on remote to open floating popup window!</div>
    `;
  }

  // --- Page 300: Weather ---
  renderPage300(country) {
    if (this.headerTitleEl) this.headerTitleEl.textContent = `WEATHER 300 ${country.code} Sat 08 Aug`;
    if (this.remoteDisplayName) this.remoteDisplayName.textContent = `${country.code} WEATHER`;

    this.bodyEl.innerHTML = `
      <div class="tt-double-size tt-c-cyan">${country.flag} ${country.name.toUpperCase()} WEATHER RADAR</div>
      <div class="tt-c-yellow">LOCATION: ${country.capital.toUpperCase()} (${country.capitalLat.toFixed(2)}°, ${country.capitalLng.toFixed(2)}°)</div>
      <div style="margin: 6px 0;" class="tt-c-white">
        <div>LIVE TELEMETRY: OPEN-METEO FREE SATELLITE ENGINE</div>
        <div>CAPITAL FORECAST: 22°C Clear & Pleasant ☀️</div>
        <div>WIND SPEED: 14 km/h | HUMIDITY: 54%</div>
      </div>
      <div class="tt-c-green">--------------------------------------------------</div>
      <div class="tt-c-yellow">POPUP READY: Click 'WEATHER' button on remote to open live weather card!</div>
    `;
  }

  // --- Page 400: Quiz ---
  renderPage400(country) {
    if (this.headerTitleEl) this.headerTitleEl.textContent = `QUIZ 400 ${country.code} Sat 08 Aug`;
    if (this.remoteDisplayName) this.remoteDisplayName.textContent = `${country.code} QUIZ`;

    const q = country.quiz[0];

    this.bodyEl.innerHTML = `
      <div class="tt-double-size tt-c-yellow">${country.flag} ${country.name.toUpperCase()} TRIVIA QUIZ</div>
      <div class="tt-c-cyan">SAMPLE QUESTION: ${q.q}</div>
      <div style="margin: 6px 0;" class="tt-c-white">
        <div>A) ${q.options[0]}</div>
        <div>B) ${q.options[1]}</div>
      </div>
      <div class="tt-c-green">==================================================</div>
      <div class="tt-c-yellow">POPUP READY: Click 'QUIZ' button on remote to play full interactive quiz!</div>
    `;
  }

  // --- Page 500: Finance ---
  renderPage500(country) {
    if (this.headerTitleEl) this.headerTitleEl.textContent = `FINANCE 500 ${country.code} Sat 08 Aug`;
    if (this.remoteDisplayName) this.remoteDisplayName.textContent = `${country.code} FINANCE`;

    this.bodyEl.innerHTML = `
      <div class="tt-double-size tt-c-green">${country.flag} ${country.name.toUpperCase()} FINANCIAL TICKER</div>
      <div class="tt-c-yellow">STOCK INDEX: ${country.stockIndex} | CURRENCY: ${country.currency}</div>
      <div style="margin: 6px 0;" class="tt-c-white">
        <div>INDEX VALUE: <span class="tt-c-green">${country.stockValue} (${country.stockChange})</span></div>
        <div>EXCHANGE BASE: 1 ${country.currency}</div>
      </div>
      <div class="tt-c-cyan">--------------------------------------------------</div>
      <div class="tt-c-yellow">POPUP READY: Click 'MARKET' button on remote to open live stock ticker!</div>
    `;
  }

  // --- Page 600: TV Guide ---
  renderPage600(country) {
    if (this.headerTitleEl) this.headerTitleEl.textContent = `GUIDE 600 ${country.code} Sat 08 Aug`;
    if (this.remoteDisplayName) this.remoteDisplayName.textContent = 'TV GUIDE';

    this.bodyEl.innerHTML = `
      <div class="tt-double-size tt-c-magenta">SATELLITE TV BROADCAST GUIDE</div>
      <div class="tt-c-yellow">COUNTRY BROADCAST: ${country.name.toUpperCase()} (${country.code})</div>
      <div style="margin: 6px 0;" class="tt-c-white">
        <div>20:00 - ${country.name} NATIONAL NEWS HOUR</div>
        <div>21:00 - CEEFAX RETRO SYNTHWAVE CONCERT</div>
        <div>22:00 - ${country.code} TRIVIA CHAMPIONSHIP</div>
      </div>
      <div class="tt-c-green">--------------------------------------------------</div>
    `;
  }

  // --- Page 700: FACTS CORNER ---
  renderPage700(country) {
    if (this.headerTitleEl) this.headerTitleEl.textContent = `FACTS 700 ${country.code} Sat 08 Aug`;
    if (this.remoteDisplayName) this.remoteDisplayName.textContent = `${country.code} FACTS`;

    let factsHtml = '';
    country.facts.forEach((fact, i) => {
      factsHtml += `
        <div style="margin-bottom: 4px;">
          <span class="tt-c-yellow">[FACT #${i+1}]</span> 
          <span class="tt-c-white">${fact}</span>
        </div>
      `;
    });

    this.bodyEl.innerHTML = `
      <div class="tt-double-size tt-c-yellow">💡 ${country.flag} ${country.name.toUpperCase()} FACTS CORNER</div>
      <div class="tt-c-cyan">CAPITAL: ${country.capital.toUpperCase()} | CURRENCY: ${country.currency}</div>
      <div style="margin: 6px 0;">
        ${factsHtml}
      </div>
      <div class="tt-c-green">==================================================</div>
      <div class="tt-c-yellow">SELECTED COUNTRY: ${country.name} (${country.code})</div>
    `;
  }

  // --- Page 800: Sound Matrix ---
  renderPage800(country) {
    if (this.headerTitleEl) this.headerTitleEl.textContent = `SYNTH 800 ${country.code} Sat 08 Aug`;
    if (this.remoteDisplayName) this.remoteDisplayName.textContent = 'WEBAUDIO SYNTH';

    this.bodyEl.innerHTML = `
      <div class="tt-double-size tt-c-cyan">WEBAUDIO SYNTHESIZER MATRIX 800</div>
      <div class="tt-c-yellow">Test procedural WebAudio sounds below:</div>
      <div style="margin: 10px 0; display: flex; gap: 8px;">
        <button id="btn-sound-ident" style="background:#ff0000; color:#fff; padding:4px 8px; font-family:VT323; font-size:18px; border:none; cursor:pointer;">STATION IDENT</button>
        <button id="btn-sound-static" style="background:#00ff00; color:#000; padding:4px 8px; font-family:VT323; font-size:18px; border:none; cursor:pointer;">STATIC BURST</button>
        <button id="btn-sound-win" style="background:#ffff00; color:#000; padding:4px 8px; font-family:VT323; font-size:18px; border:none; cursor:pointer;">QUIZ WIN</button>
      </div>
    `;

    setTimeout(() => {
      document.getElementById('btn-sound-ident')?.addEventListener('click', () => synthEngine.playStationIdent());
      document.getElementById('btn-sound-static')?.addEventListener('click', () => synthEngine.playStaticBurst());
      document.getElementById('btn-sound-win')?.addEventListener('click', () => synthEngine.playQuizWin());
    }, 50);
  }

  renderCustomPage(pageNum, country) {
    if (this.headerTitleEl) this.headerTitleEl.textContent = `DECK ${pageNum} Sat 08 Aug`;
    if (this.remoteDisplayName) this.remoteDisplayName.textContent = `PAGE ${pageNum}`;

    this.bodyEl.innerHTML = `
      <div class="tt-double-size tt-c-yellow">PAGE ${pageNum} — ${country.flag} ${country.name.toUpperCase()}</div>
      <div class="tt-c-cyan">TELETEXT SATELLITE BEACON RETRIEVED PAGE ${pageNum}.</div>
      <div class="tt-c-green">CLICK ANY NATION ON THE WORLD MAP TO SWITCH CONTEXT!</div>
    `;
  }
}

export const teletextEngine = new TeletextEngine();
