# Teletext 2099

Teletext 2099 is a retro-futuristic world news dashboard built with Vite, vanilla JavaScript, D3, TopoJSON, and Three.js. It combines a draggable situation map, floating information windows, live news/video sources, Wikipedia dossier panels, weather/finance lookups, deterministic signal overlays, and CRT-inspired visual styling.

## Features

- Interactive world map with country selection
- Floating window deck for news, weather, finance, quizzes, facts, live TV, and Wikipedia
- Situation-map layers for pipelines, conflict zones, economic stress, disaster signals, finance radar, and subsea cable routes
- Local Country Instability Index (CII) profiles for 31 Tier-1 countries
- Cross-stream correlation panel for military, economic, disaster, and escalation signals
- Country-aware data lookup with fallback generation for unmapped countries
- Live news feed fallback chain using optional GNews, WikiNews, Wikipedia current events, and built-in data
- Wikipedia dossier windows with internal Wikipedia links opening inside the app
- Saved Wiki pages panel using browser `localStorage`
- Optional hidden GNews API key input with eye-toggle reveal
- Stable YouTube channel-based live embeds for broadcaster streams
- CRT/audio tuning controls and retro teletext visual theme
- Modern monochrome theme toggle
- No AI integration and no paid backend dependency

## Tech Stack

- Vite
- Vanilla JavaScript ES modules
- Three.js
- D3 Geo
- TopoJSON
- World Atlas data
- Open-Meteo API for weather
- ExchangeRate API for currency data
- Wikipedia and WikiNews public APIs

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Project Structure

```text
.
├── index.html
├── package.json
├── package-lock.json
└── src
    ├── main.js
    ├── audio
    │   └── synthEngine.js
    ├── 3d
    │   └── crtScreen.js
    ├── data
    │   ├── countryData.js
    │   ├── liveFetchers.js
    │   ├── signalData.js
    │   └── newsData.js
    ├── deck
    │   └── windowEngine.js
    ├── map
    │   └── worldMap.js
    ├── pages
    │   └── teletextEngine.js
    └── style
        └── index.css
```

## Key Files

- `index.html` defines the main app shell, controls, dock, and floating window layer.
- `src/main.js` initializes the app, binds UI controls, handles country selection, saved Wiki pages, API key visibility, and dock actions.
- `src/data/countryData.js` stores country metadata, live broadcaster channel IDs, and live news streams.
- `src/data/liveFetchers.js` handles live weather, finance, news, and Wikipedia API fetching.
- `src/data/signalData.js` stores local signal-overlay data, CII scores, route geometry, and marker definitions.
- `src/deck/windowEngine.js` creates and manages the floating windows, including Wiki, news, live TV, weather, finance, quiz, and facts windows.
- `src/map/worldMap.js` renders the interactive map, signal overlays, layer toggles, legend, and country click behavior.
- `src/3d/crtScreen.js` manages the optional Three.js CRT/globe visual mode.
- `src/audio/synthEngine.js` provides procedural UI sound effects.
- `src/style/index.css` contains the full retro/modern UI styling.

## Live Data Notes

Some features depend on external APIs and embeds:

- Weather uses Open-Meteo and falls back to default weather if unavailable.
- Finance uses ExchangeRate API and falls back to default rates if unavailable.
- News can use a user-provided GNews API key. Without it, the app falls back to WikiNews, Wikipedia current events, Wikipedia summaries, and built-in sample news.
- Live TV uses stable source cards or embedded streams where the broadcaster allows it. Playback still depends on the broadcaster being live and allowing embeds.
- Signal-map overlays are local deterministic data. They do not call an AI service.

## Optional GNews API Key

The app works without a GNews API key, but adding one can improve live news results:

1. Open the app.
2. Paste the key into the GNews API field.
3. Use the eye button to reveal or hide the key.
4. The key is stored locally in the browser using `localStorage`.

## Saved Wiki Pages

Wiki dossier windows include a `SAVE` button. Saved pages appear in the sidebar and can be reopened later from the same browser. Saved Wiki data is stored locally in `localStorage`.

## Development Notes

- This is a frontend-only project.
- No backend server is required.
- Runtime API/network failures are handled with graceful fallback data.
- The UI is designed as a retro broadcast control room with movable floating windows.
