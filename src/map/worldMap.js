/* ==========================================================================
   TELETEXT 2099 — INTERACTIVE MOVEABLE WORLD MAP WITH D3 ZOOM & PAN
   ========================================================================== */

import { countryDatabase, getCountry } from '../data/countryData.js';
import {
  getSignalProfile,
  getSignalTierClass,
  PIPELINE_ROUTES,
  SIGNAL_LAYER_LABELS,
  SIGNAL_MARKERS
} from '../data/signalData.js';
import { synthEngine } from '../audio/synthEngine.js';

// Full ISO 3166-1 numeric → 3-letter mapping (177 countries)
const ISO_NUM_TO_3 = {
  "004":"AFG","008":"ALB","012":"DZA","016":"ASM","020":"AND","024":"AGO","028":"ATG",
  "031":"AZE","032":"ARG","036":"AUS","040":"AUT","044":"BHS","048":"BHR","050":"BGD",
  "051":"ARM","056":"BEL","060":"BMU","064":"BTN","068":"BOL","070":"BIH","072":"BWA",
  "076":"BRA","084":"BLZ","090":"SLB","092":"VGB","096":"BRN","100":"BGR","104":"MMR",
  "108":"BDI","112":"BLR","116":"KHM","120":"CMR","124":"CAN","140":"CAF","144":"LKA",
  "148":"TCD","152":"CHL","156":"CHN","170":"COL","174":"COM","178":"COG","180":"COD",
  "184":"COK","188":"CRI","191":"HRV","192":"CUB","196":"CYP","203":"CZE","204":"BEN",
  "208":"DNK","212":"DMA","214":"DOM","218":"ECU","222":"SLV","226":"GNQ","231":"ETH",
  "232":"ERI","233":"EST","234":"FRO","242":"FJI","246":"FIN","250":"FRA","258":"PYF",
  "262":"DJI","266":"GAB","268":"GEO","270":"GMB","275":"PSE","276":"DEU","288":"GHA",
  "296":"KIR","300":"GRC","304":"GRL","308":"GRD","316":"GUM","320":"GTM","324":"GIN",
  "328":"GUY","332":"HTI","340":"HND","344":"HKG","348":"HUN","352":"ISL","356":"IND",
  "360":"IDN","364":"IRN","368":"IRQ","372":"IRL","376":"ISR","380":"ITA","384":"CIV",
  "388":"JAM","392":"JPN","398":"KAZ","400":"JOR","404":"KEN","408":"PRK","410":"KOR",
  "414":"KWT","417":"KGZ","418":"LAO","422":"LBN","426":"LSO","428":"LVA","430":"LBR",
  "434":"LBY","438":"LIE","440":"LTU","442":"LUX","450":"MDG","454":"MWI","458":"MYS",
  "462":"MDV","466":"MLI","470":"MLT","478":"MRT","480":"MUS","484":"MEX","492":"MCO",
  "496":"MNG","498":"MDA","499":"MNE","504":"MAR","508":"MOZ","512":"OMN","516":"NAM",
  "520":"NRU","524":"NPL","528":"NLD","540":"NCL","554":"NZL","558":"NIC","562":"NER",
  "566":"NGA","570":"NIU","578":"NOR","586":"PAK","591":"PAN","598":"PNG","600":"PRY",
  "604":"PER","608":"PHL","616":"POL","620":"PRT","630":"PRI","634":"QAT","642":"ROU",
  "643":"RUS","646":"RWA","659":"KNA","662":"LCA","670":"VCT","674":"SMR","678":"STP",
  "682":"SAU","686":"SEN","688":"SRB","690":"SYC","694":"SLE","702":"SGP","703":"SVK",
  "704":"VNM","705":"SVN","706":"SOM","710":"ZAF","716":"ZWE","724":"ESP","728":"SSD",
  "729":"SDN","740":"SUR","748":"SWZ","752":"SWE","756":"CHE","760":"SYR","762":"TJK",
  "764":"THA","768":"TGO","776":"TON","780":"TTO","784":"ARE","788":"TUN","792":"TUR",
  "795":"TKM","798":"TUV","800":"UGA","804":"UKR","807":"MKD","818":"EGY","826":"GBR",
  "831":"GGY","832":"JEY","833":"IMN","834":"TZA","840":"USA","854":"BFA","858":"URY",
  "860":"UZB","862":"VEN","887":"YEM","894":"ZMB"
};

class WorldMapExplorer {
  constructor() {
    this.container = null;
    this.svg = null;
    this.g = null;
    this.signalOverlayGroup = null;
    this.signalMarkerGroup = null;
    this.signalRouteGroup = null;
    this.onSelectCountryCallback = null;
    this.selectedCountryCode = null;
  }

  async init(containerId, onSelectCallback) {
    this.container = document.getElementById(containerId);
    this.onSelectCountryCallback = onSelectCallback;
    if (!this.container) return;

    this.container.innerHTML = '';

    const width = this.container.clientWidth || 900;
    const height = this.container.clientHeight || 500;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    this.container.appendChild(svg);
    this.svg = svg;
    this.renderSignalUi();
    this.updateSignalPanels('USA');

    try {
      const res = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
      const world = await res.json();
      this.renderMap(world, width, height);
    } catch (e) {
      console.warn('Using SVG grid map fallback:', e);
      this.renderFallbackMap(width, height);
    }
  }

  renderMap(world, width, height) {
    const d3 = window.d3;
    const topojson = window.topojson;

    if (!d3 || !d3.geoMercator || !topojson || !topojson.feature) {
      this.renderFallbackMap(width, height);
      return;
    }

    const projection = d3.geoMercator()
      .scale((width / 6.2))
      .translate([width / 2, height / 1.5]);
    this.projection = projection;

    const pathGenerator = d3.geoPath().projection(projection);
    const countries = topojson.feature(world, world.objects.countries).features;

    // Create Group container for Zoom & Pan transforms
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.g = g;
    this.svg.appendChild(g);

    // Setup D3 Zoom & Drag Pan (d3 v7 full bundle)
    try {
      const zoom = d3.zoom()
        .scaleExtent([1, 12])
        .on('zoom', (event) => {
          g.setAttribute('transform', event.transform.toString());
          this.updateSignalOverlayScale(event.transform.k);
        });
      
      this.zoomBehavior = zoom;
      d3.select(this.svg).call(zoom);
    } catch (e) {
      console.warn("D3 zoom init error:", e);
    }

    countries.forEach(country => {
      const pathData = pathGenerator(country);
      if (!pathData) return;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathData);
      path.setAttribute('class', 'country-path');

      const numericId = String(country.id);
      const paddedId = numericId.padStart(3, '0');
      const iso3 = ISO_NUM_TO_3[paddedId] || ISO_NUM_TO_3[numericId] || null;
      
      path.setAttribute('data-iso', iso3 || 'UNK');
      path.setAttribute('data-numid', numericId);

      // getCountry() has a universal generator — works for ANY iso3 code!
      const countryInfo = iso3 ? getCountry(iso3) : null;
      const signalProfile = iso3 ? getSignalProfile(iso3) : null;
      if (signalProfile) {
        path.classList.add(`cii-${getSignalTierClass(signalProfile.cii)}`);
      }

      path.addEventListener('mouseenter', () => {
        const flagEl = document.getElementById('hover-flag');
        const titleEl = document.getElementById('hover-title');
        const subEl = document.getElementById('hover-sub');

        if (countryInfo) {
          if (flagEl) flagEl.textContent = countryInfo.flag;
          if (titleEl) titleEl.textContent = `${countryInfo.name} (${iso3})`;
          if (subEl) subEl.textContent = `CII ${signalProfile.cii} ${signalProfile.tier} | Finance ${signalProfile.finance} | ${countryInfo.stockIndex}`;
        } else {
          if (flagEl) flagEl.textContent = '🌍';
          if (titleEl) titleEl.textContent = `Territory ${numericId}`;
          if (subEl) subEl.textContent = 'Unmapped region';
        }
      });

      path.addEventListener('click', (e) => {
        e.stopPropagation();
        synthEngine.playRemoteClick();

        document.querySelectorAll('.country-path.active').forEach(el => el.classList.remove('active'));
        path.classList.add('active');

        // Always fire callback — getCountry universal generator guarantees data
        if (iso3 && this.onSelectCountryCallback) {
          this.selectedCountryCode = iso3;
          this.updateSignalPanels(iso3);
          this.onSelectCountryCallback(getCountry(iso3));
        }
      });

      g.appendChild(path);
    });

    this.renderSignalSvgOverlays();
  }

  renderSignalSvgOverlays() {
    if (!this.g || !this.projection) return;

    const routeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    routeGroup.setAttribute('class', 'signal-route-layer');
    this.signalRouteGroup = routeGroup;
    this.g.appendChild(routeGroup);

    PIPELINE_ROUTES.forEach(route => {
      const projected = route.points
        .map(([lon, lat]) => this.projection([lon, lat]))
        .filter(Boolean);
      if (projected.length < 2) return;

      const pathData = this.createSmoothRoutePath(projected);

      const routeUnderlay = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      routeUnderlay.setAttribute('d', pathData);
      routeUnderlay.setAttribute('class', `signal-route-underlay signal-layer-${route.layer}`);
      routeUnderlay.setAttribute('data-layer', route.layer);
      routeGroup.appendChild(routeUnderlay);

      const routePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      routePath.setAttribute('d', pathData);
      routePath.setAttribute('class', `signal-route signal-layer-${route.layer}`);
      routePath.setAttribute('data-layer', route.layer);
      routePath.setAttribute('data-label', route.label);
      routeGroup.appendChild(routePath);

      [projected[0], projected[projected.length - 1]].forEach(([x, y]) => {
        const node = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        node.setAttribute('cx', x);
        node.setAttribute('cy', y);
        node.setAttribute('r', '1.8');
        node.setAttribute('data-base-r', '1.8');
        node.setAttribute('class', `signal-route-node signal-layer-${route.layer}`);
        node.setAttribute('data-layer', route.layer);
        routeGroup.appendChild(node);
      });
    });

    const markerGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    markerGroup.setAttribute('class', 'signal-marker-layer');
    this.signalMarkerGroup = markerGroup;
    this.g.appendChild(markerGroup);

    SIGNAL_MARKERS.forEach(marker => {
      const point = this.projection([marker.lon, marker.lat]);
      if (!point) return;

      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', point[0]);
      dot.setAttribute('cy', point[1]);
      dot.setAttribute('r', marker.level === 'critical' ? '3.8' : '3');
      dot.setAttribute('data-base-r', marker.level === 'critical' ? '3.8' : '3');
      dot.setAttribute('class', `signal-dot signal-${marker.level} signal-layer-${marker.layer}`);
      dot.setAttribute('data-layer', marker.layer);
      dot.setAttribute('data-label', marker.label);
      markerGroup.appendChild(dot);

      dot.addEventListener('mouseenter', () => {
        const flagEl = document.getElementById('hover-flag');
        const titleEl = document.getElementById('hover-title');
        const subEl = document.getElementById('hover-sub');
        if (flagEl) flagEl.textContent = '!';
        if (titleEl) titleEl.textContent = marker.label;
        if (subEl) subEl.textContent = `${marker.layer.toUpperCase()} | ${marker.level.toUpperCase()}`;
      });
    });
  }

  createSmoothRoutePath(points) {
    if (points.length < 2) return '';
    if (points.length === 2) {
      const [[x1, y1], [x2, y2]] = points;
      const cx = (x1 + x2) / 2;
      const cy = Math.min(y1, y2) - Math.abs(x2 - x1) * 0.08;
      return `M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
    }

    let path = `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
    for (let i = 1; i < points.length - 1; i += 1) {
      const [x, y] = points[i];
      const [nextX, nextY] = points[i + 1];
      const midX = (x + nextX) / 2;
      const midY = (y + nextY) / 2;
      path += ` Q ${x.toFixed(1)} ${y.toFixed(1)} ${midX.toFixed(1)} ${midY.toFixed(1)}`;
    }
    const last = points[points.length - 1];
    path += ` T ${last[0].toFixed(1)} ${last[1].toFixed(1)}`;
    return path;
  }

  updateSignalOverlayScale(scale = 1) {
    const safeScale = Math.max(1, scale);
    this.container?.querySelectorAll('.signal-dot').forEach(dot => {
      const baseRadius = Number(dot.getAttribute('data-base-r') || 3);
      dot.setAttribute('r', (baseRadius / Math.sqrt(safeScale)).toFixed(2));
      dot.setAttribute('stroke-width', (0.8 / safeScale).toFixed(2));
    });

    this.container?.querySelectorAll('.signal-route').forEach(route => {
      route.setAttribute('stroke-width', (1.2 / safeScale).toFixed(2));
    });

    this.container?.querySelectorAll('.signal-route-underlay').forEach(route => {
      route.setAttribute('stroke-width', (3.8 / safeScale).toFixed(2));
    });

    this.container?.querySelectorAll('.signal-route-node').forEach(node => {
      const baseRadius = Number(node.getAttribute('data-base-r') || 1.8);
      node.setAttribute('r', (baseRadius / Math.sqrt(safeScale)).toFixed(2));
    });
  }

  renderSignalUi() {
    const hoverCard = document.createElement('div');
    hoverCard.className = 'map-overlay-info';
    hoverCard.id = 'map-hover-card';
    hoverCard.innerHTML = `
      <div class="hover-flag" id="hover-flag">WORLD</div>
      <div class="hover-details">
        <div class="hover-title" id="hover-title">Hover over a country</div>
        <div class="hover-sub" id="hover-sub">Drag map to move | Scroll to zoom | Click country</div>
      </div>
    `;

    const layers = document.createElement('div');
    layers.className = 'signal-layer-panel';
    layers.innerHTML = `
      <div class="signal-panel-title">LAYERS</div>
      ${SIGNAL_LAYER_LABELS.map(layer => `
        <label class="signal-layer-toggle">
          <input type="checkbox" data-signal-layer="${layer.id}" checked>
          <span>${layer.label}</span>
        </label>
      `).join('')}
    `;

    const insight = document.createElement('div');
    insight.className = 'signal-insight-panel';
    insight.id = 'signal-insight-panel';

    const legend = document.createElement('div');
    legend.className = 'map-signal-legend';
    legend.innerHTML = `
      <span>LEGEND</span>
      <span><i class="legend-dot critical"></i> Critical</span>
      <span><i class="legend-dot high"></i> High</span>
      <span><i class="legend-dot elevated"></i> Elevated</span>
      <span><i class="legend-dot watch"></i> Watch</span>
      <span><i class="legend-line"></i> Pipeline / route</span>
    `;

    this.container.appendChild(hoverCard);
    this.container.appendChild(layers);
    this.container.appendChild(insight);
    this.container.appendChild(legend);

    layers.querySelectorAll('input[data-signal-layer]').forEach(input => {
      input.addEventListener('change', () => this.applySignalLayerVisibility());
    });
  }

  applySignalLayerVisibility() {
    const enabledLayers = new Set(
      [...this.container.querySelectorAll('input[data-signal-layer]:checked')]
        .map(input => input.getAttribute('data-signal-layer'))
    );

    this.container.querySelectorAll('[data-layer]').forEach(node => {
      const layer = node.getAttribute('data-layer');
      node.classList.toggle('signal-layer-hidden', !enabledLayers.has(layer));
    });
  }

  updateSignalPanels(countryCode = 'USA') {
    const panel = document.getElementById('signal-insight-panel');
    if (!panel) return;

    const country = getCountry(countryCode);
    const signal = getSignalProfile(country.code);
    const tierClass = getSignalTierClass(signal.cii);
    const composite = Math.round((signal.military + signal.economic + signal.disaster + signal.escalation) / 4);

    panel.innerHTML = `
      <div class="signal-panel-title">SIGNAL INSIGHTS</div>
      <div class="signal-country-line">${country.flag} ${country.name}</div>
      <div class="cii-card ${tierClass}">
        <div class="cii-label">COUNTRY INSTABILITY INDEX</div>
        <div class="cii-score">${signal.cii}</div>
        <div class="cii-tier">${signal.tier}</div>
      </div>
      <div class="signal-block">
        <div class="signal-block-title">Cross-stream correlation</div>
        <div class="signal-bars">
          ${this.renderSignalBar('Military', signal.military)}
          ${this.renderSignalBar('Economic', signal.economic)}
          ${this.renderSignalBar('Disaster', signal.disaster)}
          ${this.renderSignalBar('Escalation', signal.escalation)}
        </div>
        <div class="signal-composite">Composite convergence: ${composite}%</div>
      </div>
      <div class="signal-block">
        <div class="signal-block-title">Finance radar</div>
        <div class="finance-radar-score">${signal.finance}%</div>
        <div class="finance-radar-meta">${country.stockIndex} | ${country.currency}</div>
      </div>
    `;
  }

  renderSignalBar(label, value) {
    const tierClass = getSignalTierClass(value);
    return `
      <div class="signal-bar-row">
        <span>${label}</span>
        <div class="signal-bar-track"><i class="${tierClass}" style="width:${Math.min(100, Math.max(0, value))}%"></i></div>
        <b>${value}</b>
      </div>
    `;
  }

  zoomIn() {
    const d3 = window.d3;
    if (d3 && this.zoomBehavior && this.svg) {
      d3.select(this.svg).transition().duration(300).call(this.zoomBehavior.scaleBy, 1.5);
    }
  }

  zoomOut() {
    const d3 = window.d3;
    if (d3 && this.zoomBehavior && this.svg) {
      d3.select(this.svg).transition().duration(300).call(this.zoomBehavior.scaleBy, 0.67);
    }
  }

  resetZoom() {
    const d3 = window.d3;
    if (d3 && this.zoomBehavior && this.svg) {
      d3.select(this.svg).transition().duration(400).call(this.zoomBehavior.transform, d3.zoomIdentity);
    }
  }

  renderFallbackMap(width, height) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.g = g;
    this.svg.appendChild(g);

    const sampleCountries = Object.keys(countryDatabase);
    const cols = 4;
    const itemWidth = width / cols;
    const itemHeight = 55;

    sampleCountries.forEach((code, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const info = getCountry(code);

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', col * itemWidth + 10);
      rect.setAttribute('y', row * itemHeight + 20);
      rect.setAttribute('width', itemWidth - 20);
      rect.setAttribute('height', 42);
      rect.setAttribute('rx', '4');
      rect.setAttribute('fill', '#0e182a');
      rect.setAttribute('stroke', '#00f0ff');
      rect.setAttribute('stroke-width', '1.5');
      rect.setAttribute('class', 'country-path');
      rect.classList.add(`cii-${getSignalTierClass(getSignalProfile(code).cii)}`);
      rect.style.cursor = 'pointer';

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', col * itemWidth + itemWidth / 2);
      text.setAttribute('y', row * itemHeight + 46);
      text.setAttribute('fill', '#ffff00');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-family', 'VT323');
      text.setAttribute('font-size', '20');
      text.textContent = `${info.flag} ${info.name}`;
      text.style.pointerEvents = 'none';

      rect.addEventListener('click', () => {
        synthEngine.playRemoteClick();
        this.updateSignalPanels(code);
        if (this.onSelectCountryCallback) {
          this.onSelectCountryCallback(info);
        }
      });

      g.appendChild(rect);
      g.appendChild(text);
    });
  }
}

export const worldMapExplorer = new WorldMapExplorer();
