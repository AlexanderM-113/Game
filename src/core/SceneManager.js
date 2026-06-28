import * as THREE from 'three';

export class SceneManager {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.game = game;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();
    this._menuObjects = [];
    this._ambientLight = null;
    this._dirLight = null;
    this._dayNightTime = 0;
    this._weatherParticles = null;
    this._weatherType = 'clear';
  }

  init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);
    this.scene.fog = new THREE.Fog(0x0a0a1a, 80, 200);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );
    this.camera.position.set(0, 15, 30);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this._ambientLight = new THREE.AmbientLight(0x4466aa, 0.4);
    this.scene.add(this._ambientLight);

    this._dirLight = new THREE.DirectionalLight(0xffeedd, 1.2);
    this._dirLight.position.set(30, 50, 20);
    this._dirLight.castShadow = true;
    this._dirLight.shadow.mapSize.set(2048, 2048);
    this._dirLight.shadow.camera.near = 0.5;
    this._dirLight.shadow.camera.far = 150;
    this._dirLight.shadow.camera.left = -60;
    this._dirLight.shadow.camera.right = 60;
    this._dirLight.shadow.camera.top = 60;
    this._dirLight.shadow.camera.bottom = -60;
    this._dirLight.shadow.bias = -0.001;
    this.scene.add(this._dirLight);

    const hemiLight = new THREE.HemisphereLight(0x88aadd, 0x445522, 0.3);
    this.scene.add(hemiLight);

    window.addEventListener('resize', () => this._onResize());
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  showMenuScene() {
    this.clearScene();

    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1a2a1a,
      roughness: 0.9,
      metalness: 0.05
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this._menuObjects.push(ground);

    const colors = [0x8b4513, 0x0077be, 0x32cd32, 0x228b22];
    const positions = [
      [-9, 2, -5], [-3, 2, -5], [3, 2, -5], [9, 2, -5]
    ];

    for (let i = 0; i < 4; i++) {
      const geo = new THREE.SphereGeometry(1.5, 32, 32);
      const mat = new THREE.MeshStandardMaterial({
        color: colors[i],
        roughness: 0.3,
        metalness: 0.4,
        emissive: colors[i],
        emissiveIntensity: 0.15
      });
      const sphere = new THREE.Mesh(geo, mat);
      sphere.position.set(...positions[i]);
      sphere.castShadow = true;
      this.scene.add(sphere);
      this._menuObjects.push(sphere);
    }

    for (let i = 0; i < 50; i++) {
      const size = 0.3 + Math.random() * 0.7;
      const geo = new THREE.BoxGeometry(size, size * 2, size);
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.3 + Math.random() * 0.15, 0.3, 0.15 + Math.random() * 0.15),
        roughness: 0.8
      });
      const box = new THREE.Mesh(geo, mat);
      const angle = Math.random() * Math.PI * 2;
      const dist = 15 + Math.random() * 60;
      box.position.set(Math.cos(angle) * dist, size, Math.sin(angle) * dist);
      box.rotation.y = Math.random() * Math.PI;
      box.castShadow = true;
      this.scene.add(box);
      this._menuObjects.push(box);
    }

    this.scene.background = new THREE.Color(0x0a0a2a);
    this.scene.fog = new THREE.Fog(0x0a0a2a, 40, 120);

    this.camera.position.set(0, 12, 25);
    this.camera.lookAt(0, 0, -5);
  }

  clearScene() {
    for (const obj of this._menuObjects) {
      this.scene.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    }
    this._menuObjects = [];

    const toRemove = [];
    this.scene.traverse(child => {
      if (child !== this.scene && child !== this._ambientLight &&
          child !== this._dirLight && child.type !== 'HemisphereLight') {
        toRemove.push(child);
      }
    });
    for (const obj of toRemove) {
      this.scene.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    }

    if (this._weatherParticles) {
      this.scene.remove(this._weatherParticles);
      this._weatherParticles.geometry.dispose();
      this._weatherParticles.material.dispose();
      this._weatherParticles = null;
    }
  }

  setDayNight(timeOfDay) {
    if (!this.game.settings.dayNight) return;
    this._dayNightTime = timeOfDay;

    const sunAngle = timeOfDay * Math.PI;
    this._dirLight.position.set(
      Math.cos(sunAngle) * 50,
      Math.sin(sunAngle) * 50 + 5,
      20
    );

    if (timeOfDay < 0.25 || timeOfDay > 0.75) {
      this._dirLight.intensity = 0.3;
      this._ambientLight.intensity = 0.6;
      this._ambientLight.color.setHex(0x334466);
      this.scene.background = new THREE.Color(0x0a0a2a);
      if (this.scene.fog) this.scene.fog.color.setHex(0x0a0a2a);
    } else {
      const t = (timeOfDay - 0.25) / 0.5;
      const intensity = 0.3 + Math.sin(t * Math.PI) * 0.9;
      this._dirLight.intensity = intensity;
      this._ambientLight.intensity = 0.3 + t * 0.3;

      if (t < 0.3) {
        this._dirLight.color.setHex(0xffaa66);
        this.scene.background = new THREE.Color(0x1a1020);
      } else if (t > 0.7) {
        this._dirLight.color.setHex(0xffaa66);
        this.scene.background = new THREE.Color(0x1a1020);
      } else {
        this._dirLight.color.setHex(0xffeedd);
        this.scene.background = new THREE.Color(0x87ceeb);
      }
      if (this.scene.fog) this.scene.fog.color.copy(this.scene.background);
    }
  }

  setWeather(type) {
    if (!this.game.settings.weather) type = 'clear';
    this._weatherType = type;

    if (this._weatherParticles) {
      this.scene.remove(this._weatherParticles);
      this._weatherParticles.geometry.dispose();
      this._weatherParticles.material.dispose();
      this._weatherParticles = null;
    }

    if (type === 'rain') {
      const count = 3000;
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 100;
        positions[i * 3 + 1] = Math.random() * 40;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({
        color: 0x8899bb,
        size: 0.15,
        transparent: true,
        opacity: 0.6
      });
      this._weatherParticles = new THREE.Points(geo, mat);
      this.scene.add(this._weatherParticles);
      this._dirLight.intensity *= 0.6;
    } else if (type === 'snow') {
      const count = 2000;
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 100;
        positions[i * 3 + 1] = Math.random() * 40;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.25,
        transparent: true,
        opacity: 0.8
      });
      this._weatherParticles = new THREE.Points(geo, mat);
      this.scene.add(this._weatherParticles);
    }
  }

  update(dt) {
    if (this.game.state === 'menu') {
      const t = this.clock.getElapsedTime();
      this.camera.position.x = Math.sin(t * 0.1) * 3;
      this.camera.position.y = 12 + Math.sin(t * 0.15) * 1;
      this.camera.lookAt(0, 0, -5);

      for (let i = 0; i < this._menuObjects.length && i < 4; i++) {
        const obj = this._menuObjects[i + 1];
        if (obj) {
          obj.position.y = 2 + Math.sin(t * 1.5 + i * 1.2) * 0.5;
          obj.rotation.y += dt * 0.5;
        }
      }
    }

    if (this._weatherParticles) {
      const positions = this._weatherParticles.geometry.attributes.position.array;
      const speed = this._weatherType === 'rain' ? 25 : 3;
      const drift = this._weatherType === 'snow' ? 0.5 : 0;

      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] -= speed * dt;
        if (drift) positions[i] += Math.sin(positions[i + 1] * 0.1) * drift * dt;
        if (positions[i + 1] < 0) {
          positions[i + 1] = 35 + Math.random() * 5;
          positions[i] = (Math.random() - 0.5) * 100;
          positions[i + 2] = (Math.random() - 0.5) * 100;
        }
      }
      this._weatherParticles.geometry.attributes.position.needsUpdate = true;
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  setShadows(enabled) {
    this.renderer.shadowMap.enabled = enabled;
    this._dirLight.castShadow = enabled;
  }
}
