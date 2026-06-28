import * as THREE from 'three';

export class Ball {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.radius = options.radius || 0.3;
    this.color = options.color || 0xffffff;
    this.type = options.type || 'sphere'; // sphere, football, tennis

    this.velocity = new THREE.Vector3();
    this.gravity = options.gravity !== undefined ? options.gravity : -15;
    this.bounciness = options.bounciness || 0.6;
    this.friction = options.friction || 0.98;
    this.groundY = options.groundY || this.radius;
    this.active = true;

    this.mesh = this._buildMesh();
    this.mesh.castShadow = true;
    this.scene.add(this.mesh);

    this._spinSpeed = 0;
    this._trail = null;
  }

  _buildMesh() {
    let geometry;
    let material;

    if (this.type === 'football') {
      geometry = new THREE.SphereGeometry(this.radius, 8, 16);
      geometry.scale(1, 0.65, 1.3);
      material = new THREE.MeshStandardMaterial({
        color: 0x8b4513,
        roughness: 0.7,
        metalness: 0.1
      });
      const laces = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.02, this.radius * 1.5),
        new THREE.MeshStandardMaterial({ color: 0xffffff })
      );
      laces.position.y = this.radius * 0.55;
      const group = new THREE.Group();
      group.add(new THREE.Mesh(geometry, material));
      group.add(laces);
      return group;
    }

    if (this.type === 'tennis') {
      geometry = new THREE.SphereGeometry(this.radius, 16, 16);
      material = new THREE.MeshStandardMaterial({
        color: 0xccff00,
        roughness: 0.8,
        metalness: 0.05
      });
      const seam = new THREE.Mesh(
        new THREE.TorusGeometry(this.radius * 0.9, 0.01, 8, 32),
        new THREE.MeshStandardMaterial({ color: 0xffffff })
      );
      const group = new THREE.Group();
      group.add(new THREE.Mesh(geometry, material));
      group.add(seam);
      return group;
    }

    if (this.type === 'soccer') {
      geometry = new THREE.IcosahedronGeometry(this.radius, 1);
      material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.5,
        metalness: 0.1,
        flatShading: true
      });
      return new THREE.Mesh(geometry, material);
    }

    geometry = new THREE.SphereGeometry(this.radius, 16, 16);
    material = new THREE.MeshStandardMaterial({
      color: this.color,
      roughness: 0.5,
      metalness: 0.2
    });
    return new THREE.Mesh(geometry, material);
  }

  update(dt) {
    if (!this.active) return;

    this.velocity.y += this.gravity * dt;

    const pos = this.mesh.position;
    pos.x += this.velocity.x * dt;
    pos.y += this.velocity.y * dt;
    pos.z += this.velocity.z * dt;

    if (pos.y <= this.groundY) {
      pos.y = this.groundY;
      if (Math.abs(this.velocity.y) > 0.5) {
        this.velocity.y = -this.velocity.y * this.bounciness;
      } else {
        this.velocity.y = 0;
      }
      this.velocity.x *= this.friction;
      this.velocity.z *= this.friction;
    }

    if (this._spinSpeed) {
      this.mesh.rotation.x += this._spinSpeed * dt;
      this.mesh.rotation.z += this._spinSpeed * 0.5 * dt;
    }
  }

  launch(vx, vy, vz, spin) {
    this.velocity.set(vx, vy, vz);
    this._spinSpeed = spin || 5;
    this.active = true;
  }

  setPosition(x, y, z) {
    this.mesh.position.set(x, y, z);
    this.velocity.set(0, 0, 0);
    this._spinSpeed = 0;
  }

  getPosition() {
    return this.mesh.position.clone();
  }

  isOnGround() {
    return this.mesh.position.y <= this.groundY + 0.1;
  }

  destroy() {
    this.mesh.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
    this.scene.remove(this.mesh);
  }
}
