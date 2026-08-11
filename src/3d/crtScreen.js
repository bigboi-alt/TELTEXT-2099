/* ==========================================================================
   TELETEXT 2099 — THREE.JS 3D CRT MONITOR & INTERACTIVE 3D GLOBE ENGINE
   ========================================================================== */

import { synthEngine } from '../audio/synthEngine.js';
import { getCountry } from '../data/countryData.js';

class CRTScreenShaderEngine {
  constructor() {
    this.canvas = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.material = null;
    this.globeActive = false;
    this.globeRenderer = null;
    this.globeScene = null;
    this.globeCamera = null;
    this.globeMesh = null;
    this.globeCanvas = null;
    this.globeMarkers = [];
    this.raycaster = null;
    this.mouse = null;
    this.onSelectCountryFromGlobeCallback = null;
    this.uniforms = {
      uTime: { value: 0 },
      uCurvature: { value: 0.2 },
      uScanlines: { value: 0.4 },
      uVhsNoise: { value: 0.1 },
      uBloom: { value: 0.3 },
      uResolution: { value: { x: 800, y: 600 } }
    };
  }

  setSelectCountryCallback(cb) {
    this.onSelectCountryFromGlobeCallback = cb;
  }

  init(canvasId) {
    const THREE = window.THREE;
    if (!THREE) return;

    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    const width = this.canvas.clientWidth || 800;
    const height = this.canvas.clientHeight || 500;

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.uniforms.uResolution.value = new THREE.Vector2(width, height);

    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform float uTime;
      uniform float uCurvature;
      uniform float uScanlines;
      uniform float uVhsNoise;
      uniform float uBloom;
      uniform vec2 uResolution;
      varying vec2 vUv;

      vec2 curve(vec2 uv) {
        uv = (uv - 0.5) * 2.0;
        uv.x *= 1.0 + pow((abs(uv.y) / 5.0), 2.0) * uCurvature;
        uv.y *= 1.0 + pow((abs(uv.x) / 4.0), 2.0) * uCurvature;
        uv = (uv / 2.0) + 0.5;
        return uv;
      }

      float rand(vec2 co) {
        return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
      }

      void main() {
        vec2 uv = curve(vUv);
        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
          gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
          return;
        }

        float scanline = sin(uv.y * uResolution.y * 1.5) * 0.12 * uScanlines;
        vec3 color = vec3(0.0);
        color -= scanline;

        float noise = rand(uv * uTime) * uVhsNoise * 0.1;
        color += noise;

        gl_FragColor = vec4(color, 0.25);
      }
    `;

    const geometry = new THREE.PlaneGeometry(2, 2);
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: this.uniforms,
      transparent: true
    });

    const quad = new THREE.Mesh(geometry, this.material);
    this.scene.add(quad);

    this.animate();
    window.addEventListener('resize', () => this.onResize());
  }

  onResize() {
    const THREE = window.THREE;
    if (!this.canvas || !this.renderer || !THREE) return;
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    this.renderer.setSize(width, height);
    if (this.uniforms.uResolution.value.set) {
      this.uniforms.uResolution.value.set(width, height);
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.uniforms.uTime.value += 0.03;
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  setCurvature(val) { this.uniforms.uCurvature.value = val / 100; }
  setScanlines(val) { this.uniforms.uScanlines.value = val / 100; }
  setVhsNoise(val) { this.uniforms.uVhsNoise.value = val / 100; }
  setBloom(val) { this.uniforms.uBloom.value = val / 100; }

  triggerStaticBurst() {
    synthEngine.playStaticBurst(0.4);
    const oldNoise = this.uniforms.uVhsNoise.value;
    this.uniforms.uVhsNoise.value = 0.8;
    setTimeout(() => {
      this.uniforms.uVhsNoise.value = oldNoise;
    }, 400);
  }

  // ===== 3D INTERACTIVE GLOBE WITH CLICKABLE COUNTRY MARKERS =====
  toggleGlobe() {
    const THREE = window.THREE;
    if (!THREE) return;

    const mapContainer = document.getElementById('map-container');
    if (!mapContainer) return;
    
    const svgMap = mapContainer.querySelector('svg');

    if (this.globeActive) {
      this.globeActive = false;
      if (this.globeCanvas) this.globeCanvas.style.display = 'none';
      if (svgMap) svgMap.style.display = 'block';
      return;
    }

    this.globeActive = true;
    if (svgMap) svgMap.style.display = 'none';

    if (this.globeCanvas) {
      this.globeCanvas.style.display = 'block';
      return;
    }

    // Create 3D Canvas
    this.globeCanvas = document.createElement('canvas');
    this.globeCanvas.id = 'globe-canvas-3d';
    this.globeCanvas.style.width = '100%';
    this.globeCanvas.style.height = '100%';
    this.globeCanvas.style.position = 'absolute';
    this.globeCanvas.style.top = '0';
    this.globeCanvas.style.left = '0';
    this.globeCanvas.style.zIndex = '10';
    
    if (window.getComputedStyle(mapContainer).position === 'static') {
      mapContainer.style.position = 'relative';
    }
    mapContainer.appendChild(this.globeCanvas);

    const width = mapContainer.clientWidth || 800;
    const height = mapContainer.clientHeight || 600;

    this.globeScene = new THREE.Scene();
    this.globeCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.globeCamera.position.z = 140;

    this.globeRenderer = new THREE.WebGLRenderer({
      canvas: this.globeCanvas,
      alpha: true,
      antialias: true
    });
    this.globeRenderer.setSize(width, height);
    this.globeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.globeScene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(100, 100, 100);
    this.globeScene.add(directionalLight);

    // Globe Sphere Mesh
    const radius = 50;
    const geometry = new THREE.SphereGeometry(radius, 64, 64);
    const material = new THREE.MeshPhongMaterial({ color: 0x071b36, shininess: 15 });
    
    this.globeMesh = new THREE.Mesh(geometry, material);
    this.globeScene.add(this.globeMesh);

    // Wireframe overlay
    const wireframeMat = new THREE.MeshBasicMaterial({ 
      color: 0x00f0ff, 
      wireframe: true, 
      transparent: true, 
      opacity: 0.25 
    });
    const wireframeMesh = new THREE.Mesh(geometry, wireframeMat);
    this.globeMesh.add(wireframeMesh);

    // Earth Texture Loader
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
      (texture) => {
        material.map = texture;
        material.color.setHex(0xffffff);
        material.needsUpdate = true;
      },
      undefined,
      (err) => console.warn('Earth texture fallback active.', err)
    );

    // Add 3D Glowing Pins for major world countries on Globe surface!
    const keyCountries = [
      { code: "USA", lat: 38.89, lng: -77.03 },
      { code: "GBR", lat: 51.50, lng: -0.12 },
      { code: "IND", lat: 28.61, lng: 77.20 },
      { code: "JPN", lat: 35.67, lng: 139.65 },
      { code: "DEU", lat: 52.52, lng: 13.40 },
      { code: "FRA", lat: 48.85, lng: 2.35 },
      { code: "BRA", lat: -15.79, lng: -47.88 },
      { code: "AUS", lat: -35.28, lng: 149.13 },
      { code: "CAN", lat: 45.42, lng: -75.69 },
      { code: "CHN", lat: 39.90, lng: 116.40 },
      { code: "ZAF", lat: -25.74, lng: 28.18 },
      { code: "EGY", lat: 30.04, lng: 31.23 },
      { code: "MEX", lat: 19.43, lng: -99.13 },
      { code: "KOR", lat: 37.56, lng: 126.97 },
      { code: "ITA", lat: 41.90, lng: 12.49 },
      { code: "ESP", lat: 40.41, lng: -3.70 },
      { code: "NGA", lat: 9.07, lng: 7.39 },
      { code: "SGP", lat: 1.35, lng: 103.81 },
      { code: "SAU", lat: 24.71, lng: 46.67 },
      { code: "ARG", lat: -34.60, lng: -58.38 }
    ];

    this.globeMarkers = [];
    const pinGeo = new THREE.SphereGeometry(1.6, 16, 16);

    keyCountries.forEach(item => {
      const phi = (90 - item.lat) * (Math.PI / 180);
      const theta = (item.lng + 180) * (Math.PI / 180);

      const x = -(radius * Math.sin(phi) * Math.cos(theta));
      const z = (radius * Math.sin(phi) * Math.sin(theta));
      const y = (radius * Math.cos(phi));

      const pinMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
      const pinMesh = new THREE.Mesh(pinGeo, pinMat);
      pinMesh.position.set(x, y, z);
      pinMesh.userData = { code: item.code };

      this.globeMesh.add(pinMesh);
      this.globeMarkers.push(pinMesh);
    });

    // Raycaster Setup for 3D Globe Pin Clicks
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    let isClick = true;
    let clickStartX = 0, clickStartY = 0;

    this.globeCanvas.addEventListener('mousedown', (e) => {
      this.isDraggingGlobe = true;
      isClick = true;
      clickStartX = e.clientX;
      clickStartY = e.clientY;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    this.globeCanvas.addEventListener('mousemove', (e) => {
      if (this.isDraggingGlobe && this.globeMesh) {
        const dx = e.clientX - clickStartX;
        const dy = e.clientY - clickStartY;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) isClick = false;

        const deltaMove = {
          x: e.clientX - this.previousMousePosition.x,
          y: e.clientY - this.previousMousePosition.y
        };

        const rotationSpeed = 0.005;
        this.globeMesh.rotation.y += deltaMove.x * rotationSpeed;
        this.globeMesh.rotation.x += deltaMove.y * rotationSpeed;

        this.previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    });

    this.globeCanvas.addEventListener('click', (e) => {
      if (!isClick) return;

      const rect = this.globeCanvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.globeCamera);
      const intersects = this.raycaster.intersectObjects(this.globeMarkers);

      if (intersects.length > 0) {
        const clickedCode = intersects[0].object.userData.code;
        if (clickedCode) {
          synthEngine.playRemoteClick();
          const countryInfo = getCountry(clickedCode);
          
          // Update selected country banner
          const nameEl = document.getElementById('current-country-name');
          if (nameEl) nameEl.textContent = `${countryInfo.flag} ${countryInfo.name}`;

          if (this.onSelectCountryFromGlobeCallback) {
            this.onSelectCountryFromGlobeCallback(countryInfo);
          }
        }
      }
    });

    window.addEventListener('mouseup', () => {
      this.isDraggingGlobe = false;
    });

    window.addEventListener('resize', () => {
      if (this.globeActive && this.globeCanvas && this.globeCamera && this.globeRenderer) {
        const w = mapContainer.clientWidth;
        const h = mapContainer.clientHeight;
        this.globeRenderer.setSize(w, h);
        this.globeCamera.aspect = w / h;
        this.globeCamera.updateProjectionMatrix();
      }
    });

    const animateGlobe = () => {
      requestAnimationFrame(animateGlobe);
      
      if (this.globeActive) {
        if (!this.isDraggingGlobe && this.globeMesh) {
          this.globeMesh.rotation.y += 0.002;
        }
        
        // Pulse markers
        const time = Date.now() * 0.003;
        this.globeMarkers.forEach(m => {
          const scale = 1 + Math.sin(time + m.position.x) * 0.2;
          m.scale.set(scale, scale, scale);
        });

        if (this.globeRenderer && this.globeScene && this.globeCamera) {
          this.globeRenderer.render(this.globeScene, this.globeCamera);
        }
      }
    };
    
    animateGlobe();
  }
}

export const crtScreenEngine = new CRTScreenShaderEngine();
