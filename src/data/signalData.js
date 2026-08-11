/* ==========================================================================
   TELETEXT 2099 - FREE SIGNAL OVERLAY DATA
   Deterministic local model. No paid APIs, no AI service calls.
   ========================================================================== */

export const TIER1_SIGNAL_COUNTRIES = {
  USA: { cii: 42, tier: "ELEVATED", finance: 68, military: 34, economic: 61, disaster: 22, escalation: 38 },
  GBR: { cii: 39, tier: "WATCH", finance: 58, military: 31, economic: 54, disaster: 18, escalation: 32 },
  FRA: { cii: 41, tier: "ELEVATED", finance: 55, military: 35, economic: 51, disaster: 21, escalation: 36 },
  DEU: { cii: 37, tier: "WATCH", finance: 62, military: 25, economic: 49, disaster: 17, escalation: 28 },
  ITA: { cii: 45, tier: "ELEVATED", finance: 46, military: 28, economic: 58, disaster: 32, escalation: 33 },
  ESP: { cii: 33, tier: "WATCH", finance: 48, military: 20, economic: 43, disaster: 24, escalation: 22 },
  NLD: { cii: 31, tier: "WATCH", finance: 64, military: 18, economic: 38, disaster: 19, escalation: 20 },
  CHE: { cii: 24, tier: "STABLE", finance: 72, military: 12, economic: 29, disaster: 14, escalation: 16 },
  SWE: { cii: 34, tier: "WATCH", finance: 57, military: 29, economic: 36, disaster: 15, escalation: 30 },
  NOR: { cii: 29, tier: "STABLE", finance: 63, military: 22, economic: 31, disaster: 20, escalation: 24 },
  POL: { cii: 52, tier: "HIGH", finance: 44, military: 54, economic: 46, disaster: 18, escalation: 57 },
  UKR: { cii: 88, tier: "CRITICAL", finance: 31, military: 91, economic: 79, disaster: 62, escalation: 94 },
  RUS: { cii: 76, tier: "HIGH", finance: 39, military: 82, economic: 70, disaster: 35, escalation: 81 },
  TUR: { cii: 59, tier: "HIGH", finance: 37, military: 58, economic: 67, disaster: 46, escalation: 61 },
  ISR: { cii: 83, tier: "CRITICAL", finance: 41, military: 88, economic: 59, disaster: 44, escalation: 91 },
  IRN: { cii: 81, tier: "CRITICAL", finance: 28, military: 85, economic: 78, disaster: 39, escalation: 89 },
  SAU: { cii: 46, tier: "ELEVATED", finance: 66, military: 42, economic: 44, disaster: 26, escalation: 48 },
  ARE: { cii: 32, tier: "WATCH", finance: 74, military: 26, economic: 32, disaster: 18, escalation: 34 },
  EGY: { cii: 57, tier: "HIGH", finance: 36, military: 49, economic: 71, disaster: 43, escalation: 52 },
  IND: { cii: 48, tier: "ELEVATED", finance: 69, military: 45, economic: 39, disaster: 37, escalation: 43 },
  PAK: { cii: 67, tier: "HIGH", finance: 26, military: 63, economic: 76, disaster: 51, escalation: 68 },
  CHN: { cii: 54, tier: "HIGH", finance: 59, military: 62, economic: 52, disaster: 29, escalation: 60 },
  JPN: { cii: 35, tier: "WATCH", finance: 65, military: 27, economic: 36, disaster: 42, escalation: 33 },
  KOR: { cii: 43, tier: "ELEVATED", finance: 61, military: 44, economic: 34, disaster: 22, escalation: 49 },
  PRK: { cii: 79, tier: "CRITICAL", finance: 12, military: 86, economic: 82, disaster: 41, escalation: 84 },
  TWN: { cii: 62, tier: "HIGH", finance: 67, military: 56, economic: 43, disaster: 28, escalation: 66 },
  IDN: { cii: 44, tier: "ELEVATED", finance: 51, military: 27, economic: 45, disaster: 61, escalation: 31 },
  AUS: { cii: 28, tier: "STABLE", finance: 60, military: 22, economic: 30, disaster: 34, escalation: 24 },
  BRA: { cii: 47, tier: "ELEVATED", finance: 53, military: 25, economic: 57, disaster: 48, escalation: 30 },
  MEX: { cii: 55, tier: "HIGH", finance: 49, military: 35, economic: 52, disaster: 45, escalation: 39 },
  ZAF: { cii: 61, tier: "HIGH", finance: 35, military: 30, economic: 78, disaster: 49, escalation: 34 }
};

export const SIGNAL_MARKERS = [
  { id: "us-east-market", layer: "finance", label: "NYSE / NASDAQ", lon: -74.0, lat: 40.7, level: "elevated" },
  { id: "us-gulf-energy", layer: "pipelines", label: "Gulf energy corridor", lon: -95.3, lat: 29.7, level: "watch" },
  { id: "north-sea", layer: "pipelines", label: "North Sea gas network", lon: 2.5, lat: 56.4, level: "watch" },
  { id: "ukraine-front", layer: "conflict", label: "Black Sea conflict pressure", lon: 31.2, lat: 48.4, level: "critical" },
  { id: "suez", layer: "pipelines", label: "Suez / Red Sea transit", lon: 32.5, lat: 29.9, level: "high" },
  { id: "gulf", layer: "pipelines", label: "Gulf export terminals", lon: 51.2, lat: 25.3, level: "high" },
  { id: "taiwan-strait", layer: "conflict", label: "Taiwan Strait escalation watch", lon: 121.0, lat: 24.3, level: "high" },
  { id: "tokyo-market", layer: "finance", label: "Tokyo exchange composite", lon: 139.7, lat: 35.7, level: "watch" },
  { id: "indo-pacific-weather", layer: "disaster", label: "Cyclone / flood corridor", lon: 106.8, lat: -6.2, level: "elevated" },
  { id: "south-africa-grid", layer: "economic", label: "Power grid stress", lon: 28.0, lat: -26.2, level: "high" }
];

export const PIPELINE_ROUTES = [
  {
    id: "trans-atlantic-energy",
    label: "Trans-Atlantic LNG lanes",
    layer: "pipelines",
    points: [[-95, 29], [-70, 38], [-40, 48], [-8, 52], [4, 53]]
  },
  {
    id: "north-sea-europe",
    label: "North Sea gas web",
    layer: "pipelines",
    points: [[-3, 57], [2, 56], [5, 53], [7, 51], [10, 50]]
  },
  {
    id: "eurasia-gas",
    label: "Eurasia pipeline spine",
    layer: "pipelines",
    points: [[31, 48], [39, 47], [49, 42], [58, 40], [69, 41], [78, 43]]
  },
  {
    id: "gulf-india-energy",
    label: "Gulf to India energy lane",
    layer: "pipelines",
    points: [[51, 25], [58, 23], [67, 22], [73, 19]]
  },
  {
    id: "east-asia-subsea",
    label: "East Asia subsea data / energy route",
    layer: "cables",
    points: [[103, 1], [114, 22], [121, 24], [130, 31], [139, 35]]
  }
];

export const SIGNAL_LAYER_LABELS = [
  { id: "conflict", label: "Conflict zones" },
  { id: "pipelines", label: "Pipelines" },
  { id: "finance", label: "Finance radar" },
  { id: "disaster", label: "Disaster signals" },
  { id: "economic", label: "Economic stress" },
  { id: "cables", label: "Subsea cables" }
];

export function getSignalProfile(countryCode = "USA") {
  const direct = TIER1_SIGNAL_COUNTRIES[countryCode];
  if (direct) return direct;

  const seed = String(countryCode || "UNK").split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const cii = 25 + (seed % 44);
  return {
    cii,
    tier: cii >= 58 ? "HIGH" : cii >= 42 ? "ELEVATED" : "WATCH",
    finance: 35 + (seed % 38),
    military: 18 + (seed % 45),
    economic: 30 + (seed % 42),
    disaster: 16 + (seed % 48),
    escalation: 20 + (seed % 46)
  };
}

export function getSignalTierClass(score = 0) {
  if (score >= 78) return "critical";
  if (score >= 52) return "high";
  if (score >= 40) return "elevated";
  return "watch";
}
