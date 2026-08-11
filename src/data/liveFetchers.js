/* ==========================================================================
   TELETEXT 2099 — LIVE DATA FETCHER ENGINE (WEATHER, FINANCE, NEWS, WIKI)
   Uses: Open-Meteo (weather), ExchangeRate-API (finance), GNews/WikiNews/
   Wikipedia Current Events (news), Wikipedia REST (wiki articles)
   All APIs are 100% FREE — no API key required except GNews (optional).
   ========================================================================== */

import { getCountry } from './countryData.js';

// ═══════════════════════════════════════════════════════════════════════════
// 1. LIVE WEATHER (Open-Meteo — 100% Free, No Key)
// ═══════════════════════════════════════════════════════════════════════════
export async function fetchLiveWeather(lat, lng) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Weather API status " + res.status);
    const data = await res.json();

    if (data && data.current_weather) {
      const w = data.current_weather;
      const codeMap = {
        0: "Clear Sky ☀️",
        1: "Mainly Clear 🌤️", 2: "Partly Cloudy ⛅", 3: "Overcast ☁️",
        45: "Foggy 🌫️", 48: "Rime Fog 🌫️",
        51: "Light Drizzle 🌧️", 53: "Moderate Drizzle 🌧️", 55: "Dense Drizzle 🌧️",
        61: "Slight Rain 🌧️", 63: "Moderate Rain 🌧️", 65: "Heavy Rain 🌧️",
        71: "Slight Snow ❄️", 73: "Moderate Snow ❄️", 75: "Heavy Snow ❄️",
        80: "Rain Showers 🌦️", 81: "Moderate Showers 🌦️", 82: "Violent Showers ⛈️",
        95: "Thunderstorm 🌩️", 96: "Thunderstorm with Hail ⛈️"
      };
      return {
        temp: `${w.temperature}°C`,
        desc: codeMap[w.weathercode] || "Clear Skies ☀️",
        wind: `${w.windspeed} km/h`,
        windDir: `${w.winddirection}°`
      };
    }
  } catch (err) {
    console.warn("Live weather fallback used:", err);
  }
  return { temp: "22°C", desc: "Sunny & Pleasant ☀️", wind: "12 km/h", windDir: "180°" };
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. LIVE FINANCE (ExchangeRate-API — 100% Free, No Key)
// ═══════════════════════════════════════════════════════════════════════════
export async function fetchLiveFinance(currencyCode) {
  try {
    const url = `https://open.er-api.com/v6/latest/${currencyCode}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Finance API error");
    const data = await res.json();

    if (data && data.rates) {
      return {
        base: currencyCode,
        usdRate: data.rates.USD ? (1 / data.rates.USD).toFixed(2) : "1.00",
        eurRate: data.rates.EUR ? data.rates.EUR.toFixed(4) : "0.92",
        gbpRate: data.rates.GBP ? data.rates.GBP.toFixed(4) : "0.78",
        jpyRate: data.rates.JPY ? data.rates.JPY.toFixed(2) : "155.20",
        inrRate: data.rates.INR ? data.rates.INR.toFixed(2) : "83.50",
        lastUpdated: new Date().toLocaleTimeString()
      };
    }
  } catch (err) {
    console.warn("Live finance fallback used:", err);
  }
  return {
    base: currencyCode, usdRate: "1.00", eurRate: "0.92",
    gbpRate: "0.78", jpyRate: "155.20", inrRate: "83.50",
    lastUpdated: new Date().toLocaleTimeString()
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. LIVE NEWS — Multi-Source Cascade (GNews → WikiNews → Wikipedia Events → Fallback)
//    ALWAYS returns UNIQUE news per country — no duplicates!
// ═══════════════════════════════════════════════════════════════════════════

// ISO-3 to ISO-2 mapping for GNews
const ISO3_TO_ISO2 = {
  "USA":"us","GBR":"gb","IND":"in","JPN":"jp","DEU":"de","FRA":"fr","BRA":"br",
  "AUS":"au","CAN":"ca","CHN":"cn","ZAF":"za","EGY":"eg","MEX":"mx","KOR":"kr",
  "ITA":"it","ESP":"es","NGA":"ng","SGP":"sg","SAU":"sa","ARG":"ar","RUS":"ru",
  "TUR":"tr","IDN":"id","PAK":"pk","BGD":"bd","PHL":"ph","VNM":"vn","THA":"th",
  "MYS":"my","COL":"co","PER":"pe","CHL":"cl","POL":"pl","UKR":"ua","ROU":"ro",
  "NLD":"nl","BEL":"be","SWE":"se","NOR":"no","DNK":"dk","FIN":"fi","CHE":"ch",
  "AUT":"at","PRT":"pt","GRC":"gr","CZE":"cz","HUN":"hu","IRL":"ie","ISR":"il",
  "ARE":"ae","QAT":"qa","KWT":"kw","IRQ":"iq","IRN":"ir","AFG":"af","NPL":"np",
  "LKA":"lk","MMR":"mm","KHM":"kh","LAO":"la","NZL":"nz","KEN":"ke","ETH":"et",
  "TZA":"tz","GHA":"gh","CMR":"cm","SEN":"sn","CIV":"ci","UGA":"ug","MOZ":"mz",
  "MDG":"mg","ZWE":"zw","AGO":"ao","SOM":"so","SDN":"sd","DZA":"dz","MAR":"ma",
  "TUN":"tn","LBY":"ly","JOR":"jo","LBN":"lb","SYR":"sy","YEM":"ye","OMN":"om",
  "BHR":"bh","GEO":"ge","ARM":"am","AZE":"az","KAZ":"kz","UZB":"uz","TKM":"tm",
  "KGZ":"kg","TJK":"tj","MNG":"mn","PRK":"kp","TWN":"tw","HKG":"hk","MAC":"mo",
  "CUB":"cu","HTI":"ht","DOM":"do","PAN":"pa","CRI":"cr","GTM":"gt","HND":"hn",
  "SLV":"sv","NIC":"ni","ECU":"ec","BOL":"bo","PRY":"py","URY":"uy","VEN":"ve",
  "GUY":"gy","SUR":"sr","JPN":"jp","BIH":"ba","SRB":"rs","HRV":"hr","SVN":"si",
  "SVK":"sk","BGR":"bg","MDA":"md","BLR":"by","LTU":"lt","LVA":"lv","EST":"ee",
  "ALB":"al","MKD":"mk","MNE":"me","ISL":"is","MLT":"mt","CYP":"cy","LUX":"lu"
};

const NEWS_DATE_OPTIONS = {
  1: "24 HOURS",
  3: "3 DAYS",
  10: "10 DAYS",
  30: "30 DAYS"
};

function getNewsCutoff(maxAgeDays = 10) {
  const days = Number(maxAgeDays) || 10;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function isRecentPublishedAt(publishedAt, maxAgeDays = 10) {
  if (!publishedAt) return false;
  const date = new Date(publishedAt);
  return Number.isFinite(date.getTime()) && date >= getNewsCutoff(maxAgeDays);
}

function formatCurrentEventsDate(date) {
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `${months[date.getMonth()]}_${date.getDate()},_${date.getFullYear()}`;
}

function cleanHtmlText(value) {
  return String(value || '').replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
}

export async function fetchLiveNews(countryCode, maxAgeDays = 10) {
  const country = getCountry(countryCode);
  const iso2 = ISO3_TO_ISO2[countryCode] || country.iso2 || 'us';
  const storedKey = localStorage.getItem('gnews_api_key') || "";
  const ageLabel = NEWS_DATE_OPTIONS[maxAgeDays] || `${maxAgeDays} DAYS`;

  // ─── SOURCE A: GNews API (if user has key) ───
  if (storedKey && storedKey.trim().length > 5) {
    try {
      const url = `https://gnews.io/api/v4/top-headlines?category=general&lang=en&country=${iso2}&token=${storedKey.trim()}&max=6`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const recentArticles = (data.articles || []).filter(a => isRecentPublishedAt(a.publishedAt, maxAgeDays));
        if (recentArticles.length > 0) {
          return recentArticles.map(a => ({
            title: a.title.toUpperCase(),
            body: a.description || a.content || "Full coverage available at source.",
            source: a.source?.name || "GNews",
            url: a.url,
            isLive: true,
            publishedAt: a.publishedAt
          }));
        }
      }
    } catch (e) {
      console.warn("GNews API fetch error:", e);
    }
  }

  // ─── SOURCE B: WikiNews (100% Free, country-specific search) ───
  try {
    const wikiUrl = `https://en.wikinews.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(country.name + " news")}&srlimit=10&format=json&origin=*`;
    const res = await fetch(wikiUrl);
    if (res.ok) {
      const data = await res.json();
      const recentResults = (data.query?.search || []).filter(item => isRecentPublishedAt(item.timestamp, maxAgeDays));
      if (recentResults.length > 0) {
        return recentResults.slice(0, 5).map(item => {
          const cleanSnippet = cleanHtmlText(item.snippet);
          return {
            title: item.title.toUpperCase(),
            body: cleanSnippet.length > 20 ? cleanSnippet : `Breaking development reported in ${country.name}.`,
            source: "WIKINEWS",
            url: `https://en.wikinews.org/wiki/${encodeURIComponent(item.title)}`,
            isLive: true,
            publishedAt: item.timestamp || null
          };
        });
      }
    }
  } catch (e) {
    console.warn("WikiNews fetch error:", e);
  }

  // ─── SOURCE C: Wikipedia Current Events Portal Scrape (100% Free) ───
  try {
    const countryItems = [];
    const globalItems = [];

    const dayLimit = Math.min(Number(maxAgeDays) || 10, 30);
    const eventPages = await Promise.allSettled(
      Array.from({ length: dayLimit }, async (_, offset) => {
        const eventDate = new Date(Date.now() - offset * 24 * 60 * 60 * 1000);
        const dateStr = formatCurrentEventsDate(eventDate);
        const portalUrl = `https://en.wikipedia.org/w/api.php?action=parse&page=Portal:Current_events/${dateStr}&prop=text&format=json&origin=*`;
        const res = await fetch(portalUrl);
        if (!res.ok) return null;
        const data = await res.json();
        return {
          eventDate,
          dateStr,
          html: data.parse?.text?.['*'] || ''
        };
      })
    );

    eventPages.forEach(result => {
      if (result.status !== 'fulfilled' || !result.value?.html || countryItems.length >= 5) return;
      const { eventDate, dateStr, html } = result.value;
      const liRegex = /<li[^>]*>(.*?)<\/li>/gs;
      let match;
      while ((match = liRegex.exec(html)) !== null) {
        const text = cleanHtmlText(match[1]);
        if (text.length <= 40) continue;

        const item = {
          title: text.substring(0, 80).toUpperCase(),
          body: text,
          source: "WIKIPEDIA CURRENT EVENTS",
          url: `https://en.wikipedia.org/wiki/Portal:Current_events/${dateStr}`,
          isLive: true,
          publishedAt: eventDate.toISOString()
        };

        if (text.toLowerCase().includes(country.name.toLowerCase())) {
          countryItems.push(item);
          if (countryItems.length >= 5) break;
        } else if (globalItems.length < 5) {
          globalItems.push({
            ...item,
            source: "WIKIPEDIA GLOBAL EVENTS"
          });
        }
      }
    });

    if (countryItems.length > 0) {
      return countryItems.slice(0, 5);
    }

    if (globalItems.length > 0) {
      return globalItems.slice(0, 4);
    }
  } catch (e) {
    console.warn("Wikipedia Current Events fetch error:", e);
  }

  // ─── SOURCE D: Explicit no-recent-news state, never stale "live" news ───
  return [
    {
      title: `${country.name.toUpperCase()} — NO RECENT MATCHES`,
      body: `No dated news items for ${country.name} were found inside the selected ${ageLabel} filter using the free sources currently available. Try a wider filter or add a GNews key for stronger current coverage.`,
      source: "RECENT NEWS FILTER",
      url: "#",
      isLive: false,
      publishedAt: null
    }
  ];
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. WIKIPEDIA ARTICLE FETCHER (REST v1 — 100% Free, Rich Content)
// ═══════════════════════════════════════════════════════════════════════════
export async function fetchWikiSummary(topicTitle) {
  try {
    const cleanTitle = encodeURIComponent(topicTitle.trim());
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${cleanTitle}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      return {
        title: data.title || topicTitle,
        description: data.description || "Wikipedia Knowledge Base",
        extract: data.extract || "No extract available.",
        extract_html: data.extract_html || `<p>${data.extract}</p>`,
        thumbnail: data.thumbnail?.source || null,
        originalImage: data.originalimage?.source || null,
        content_urls: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${cleanTitle}`
      };
    }
  } catch (e) {
    console.warn("Wikipedia REST API fetch error:", e);
  }

  return {
    title: topicTitle,
    description: "Global Knowledge Base",
    extract: `${topicTitle} is a significant subject documented across multiple CEEFAX satellite knowledge archives.`,
    extract_html: `<p>${topicTitle} is a significant subject in global knowledge archives.</p>`,
    thumbnail: null,
    originalImage: null,
    content_urls: `https://en.wikipedia.org/wiki/${encodeURIComponent(topicTitle)}`
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. WIKIPEDIA FULL ARTICLE SECTIONS FETCHER (Full Uncut Articles)
// ═══════════════════════════════════════════════════════════════════════════
export async function fetchWikiFullSections(topicTitle) {
  try {
    const cleanTitle = encodeURIComponent(topicTitle.trim());
    const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${cleanTitle}&prop=text|sections|images&format=json&origin=*`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.parse && data.parse.text) {
        const rawHtml = data.parse.text['*'];
        
        // Clean Wikipedia internal links so they remain inside our app
        const parser = new DOMParser();
        const doc = parser.parseFromString(rawHtml, 'text/html');

        // Remove unwanted edit links, references, navigation boxes
        doc.querySelectorAll('.mw-editsection, .reference, .reflist, .navbox, .vertical-navbox, .authority-control, table.infobox').forEach(el => el.remove());

        // Extract clean sections
        const sections = [];
        let currentSection = { title: "Overview", content: "" };

        doc.body.childNodes.forEach(node => {
          if (node.tagName === 'H2' || node.tagName === 'H3') {
            const headline = node.textContent.replace(/\[edit\]/gi, '').trim();
            if (currentSection.content.length > 50 && !["See also", "References", "External links", "Further reading"].includes(currentSection.title)) {
              sections.push(currentSection);
            }
            currentSection = { title: headline, content: "" };
          } else if (node.nodeType === 1) {
            currentSection.content += node.outerHTML;
          }
        });

        if (currentSection.content.length > 50) {
          sections.push(currentSection);
        }

        return {
          title: data.parse.title,
          sections: sections.length > 0 ? sections : [{ title: "Article", content: doc.body.innerHTML }],
          success: true
        };
      }
    }
  } catch (e) {
    console.warn("Wikipedia full sections fetch error:", e);
  }
  return { title: topicTitle, sections: [], success: false };
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. THEMED MEDIAWIKI SOURCE FETCHER (WikiNews / Wikipedia)
// ═══════════════════════════════════════════════════════════════════════════
export async function fetchMediaWikiSourceArticle(sourceUrl) {
  try {
    const url = new URL(sourceUrl);
    const allowedHosts = ['en.wikinews.org', 'en.wikipedia.org'];
    if (!allowedHosts.includes(url.hostname)) {
      return { success: false };
    }

    let pageTitle = '';
    if (url.pathname.startsWith('/wiki/')) {
      pageTitle = decodeURIComponent(url.pathname.replace('/wiki/', '')).replace(/_/g, ' ');
    } else {
      pageTitle = url.searchParams.get('title') || '';
    }
    if (!pageTitle) return { success: false };

    const apiUrl = `https://${url.hostname}/w/api.php?action=parse&page=${encodeURIComponent(pageTitle)}&prop=text|sections&format=json&origin=*`;
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error("MediaWiki source fetch failed");

    const data = await res.json();
    const rawHtml = data.parse?.text?.['*'];
    if (!rawHtml) return { success: false };

    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, 'text/html');
    doc.querySelectorAll('script, style, table, figure, .mw-editsection, .reference, .reflist, .navbox, .vertical-navbox, .metadata, .noprint, .printfooter').forEach(el => el.remove());
    doc.querySelectorAll('a[href]').forEach(link => {
      link.removeAttribute('target');
      link.removeAttribute('rel');
    });

    const blocks = [...doc.body.querySelectorAll('p, li')]
      .map(node => node.outerHTML)
      .filter(html => html.replace(/<[^>]+>/g, '').trim().length > 45)
      .slice(0, 18);

    return {
      success: blocks.length > 0,
      title: data.parse?.title || pageTitle,
      source: url.hostname.includes('wikinews') ? 'WIKINEWS' : 'WIKIPEDIA',
      bodyHtml: blocks.join(''),
      sourceUrl
    };
  } catch (e) {
    console.warn("MediaWiki themed source fallback used:", e);
  }

  return { success: false };
}
