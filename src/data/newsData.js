/* ==========================================================================
   TELETEXT 2099 — COMPATIBILITY DATA BRIDGE
   ========================================================================== */

import { countryDatabase, getCountry } from './countryData.js';

export { countryDatabase, getCountry };

export const globalNewsDatabase = countryDatabase;

export const getCountryNews = (code) => {
  const c = getCountry(code);
  return {
    code: c.code,
    name: c.name,
    flag: c.flag,
    capital: c.capital,
    region: c.region,
    headline: c.news[0]?.title || "TELETEXT SATELLITE ACTIVE",
    article: c.news[0]?.body || "Live news deck online.",
    category: "WORLD",
    weather: "22°C Clear",
    page: "200"
  };
};
