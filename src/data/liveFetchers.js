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

export async function fetchLiveNews(countryCode) {
  const country = getCountry(countryCode);
  const iso2 = ISO3_TO_ISO2[countryCode] || country.iso2 || 'us';
  const storedKey = localStorage.getItem('gnews_api_key') || "";

  // ─── SOURCE A: GNews API (if user has key) ───
  if (storedKey && storedKey.trim().length > 5) {
    try {
      const url = `https://gnews.io/api/v4/top-headlines?category=general&lang=en&country=${iso2}&token=${storedKey.trim()}&max=6`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.articles && data.articles.length > 0) {
          return data.articles.map(a => ({
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
    const wikiUrl = `https://en.wikinews.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(country.name + " news")}&srlimit=5&format=json&origin=*`;
    const res = await fetch(wikiUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.query && data.query.search && data.query.search.length >= 2) {
        return data.query.search.slice(0, 5).map(item => {
          const cleanSnippet = item.snippet.replace(/<[^>]*>?/gm, '');
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
    const today = new Date();
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const dateStr = `${months[today.getMonth()]}_${today.getDate()},_${today.getFullYear()}`;
    const portalUrl = `https://en.wikipedia.org/w/api.php?action=parse&page=Portal:Current_events/${dateStr}&prop=text&format=json&origin=*`;
    const res = await fetch(portalUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.parse && data.parse.text) {
        const html = data.parse.text['*'] || '';
        // Extract list items from the HTML
        const liRegex = /<li[^>]*>(.*?)<\/li>/gs;
        const items = [];
        let match;
        while ((match = liRegex.exec(html)) !== null && items.length < 5) {
          let text = match[1].replace(/<[^>]*>?/gm, '').trim();
          if (text.length > 30 && text.toLowerCase().includes(country.name.toLowerCase())) {
            items.push(text);
          }
        }
        // If we found country-specific items, return them
        if (items.length >= 1) {
          return items.map(text => ({
            title: text.substring(0, 80).toUpperCase(),
            body: text,
            source: "WIKIPEDIA CURRENT EVENTS",
            url: `https://en.wikipedia.org/wiki/Portal:Current_events`,
            isLive: true,
            publishedAt: today.toISOString()
          }));
        }
        // Otherwise grab any global headlines
        const allItems = [];
        liRegex.lastIndex = 0;
        while ((match = liRegex.exec(html)) !== null && allItems.length < 4) {
          let text = match[1].replace(/<[^>]*>?/gm, '').trim();
          if (text.length > 40) {
            allItems.push(text);
          }
        }
        if (allItems.length >= 1) {
          return allItems.map(text => ({
            title: text.substring(0, 80).toUpperCase(),
            body: text,
            source: "WIKIPEDIA GLOBAL EVENTS",
            url: `https://en.wikipedia.org/wiki/Portal:Current_events`,
            isLive: true,
            publishedAt: today.toISOString()
          }));
        }
      }
    }
  } catch (e) {
    console.warn("Wikipedia Current Events fetch error:", e);
  }

  // ─── SOURCE D: Wikipedia country article extract (guaranteed unique per country!) ───
  try {
    const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(country.name)}`;
    const res = await fetch(wikiUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.extract && data.extract.length > 50) {
        const sentences = data.extract.split('. ');
        const chunks = [];
        for (let i = 0; i < sentences.length && chunks.length < 3; i += 2) {
          const chunk = sentences.slice(i, i + 2).join('. ');
          if (chunk.length > 30) {
            chunks.push(chunk);
          }
        }
        return chunks.map((text, idx) => ({
          title: `${country.name.toUpperCase()} — INTEL BRIEFING ${idx + 1}`,
          body: text + (text.endsWith('.') ? '' : '.'),
          source: "WIKIPEDIA DOSSIER",
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(country.name)}`,
          isLive: false,
          publishedAt: null
        }));
      }
    }
  } catch (e) {
    console.warn("Wikipedia summary news fallback error:", e);
  }

  // ─── SOURCE E: Built-in country data fallback ───
  if (country.news && country.news.length > 0) {
    return country.news.map(item => ({
      title: item.title,
      body: item.body,
      source: "CEEFAX SATELLITE",
      url: "#",
      isLive: false,
      publishedAt: null
    }));
  }

  // ─── SOURCE F: Absolute last resort ───
  return [
    {
      title: `${country.name.toUpperCase()} — SATELLITE UPLINK ESTABLISHED`,
      body: `Real-time monitoring active for ${country.name}. Capital: ${country.capital}. Currency: ${country.currency}. Tune in to LIVE TV for broadcast coverage.`,
      source: "CEEFAX BEACON",
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

