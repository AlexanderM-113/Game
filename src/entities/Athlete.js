import * as THREE from 'three';

export class Athlete {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.speed = options.speed || 8;
    this.color = options.color || 0x0077be;
    this.secondaryColor = options.secondaryColor || 0xffffff;
    this.name = options.name || 'PLAYER';
    this.isAI = options.isAI || false;

    this._buildModel();
    this.scene.add(this.group);

    this._animTime = 0;
    this._legAngle = 0;
    this._armAngle = 0;
  }

  _buildModel() {
    const mat = new THREE.MeshStandardMaterial({
      color: this.color,
      roughness: 0.5,
      metalness: 0.2
    });
    const mat2 = new THREE.MeshStandardMaterial({
      color: this.secondaryColor,
      roughness: 0.5,
      metalness: 0.1
    });
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xf0c8a0,
      roughness: 0.6,
      metalness: 0.05
    });

    // Body (torso)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.5), mat);
    torso.position.y = 1.5;
    torso.castShadow = true;
    this.group.add(torso);
    this._torso = torso;

    // Shoulders
    const shoulders = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.2, 0.5), mat2);
    shoulders.position.y = 2.05;
    shoulders.castShadow = true;
    this.group.add(shoulders);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), skinMat);
    head.position.y = 2.5;
    head.castShadow = true;
    this.group.add(head);
    this._head = head;

    // Left Arm
    this._leftArm = new THREE.Group();
    this._leftArm.position.set(-0.55, 1.9, 0);
    const leftArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.7, 0.18), skinMat);
    leftArmMesh.position.y = -0.35;
    leftArmMesh.castShadow = true;
    this._leftArm.add(leftArmMesh);
    this.group.add(this._leftArm);

    // Right Arm
    this._rightArm = new THREE.Group();
    this._rightArm.position.set(0.55, 1.9, 0);
    const rightArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.7, 0.18), skinMat);
    rightArmMesh.position.y = -0.35;
    rightArmMesh.castShadow = true;
    this._rightArm.add(rightArmMesh);
    this.group.add(this._rightArm);

    // Left Leg
    this._leftLeg = new THREE.Group();
    this._leftLeg.position.set(-0.2, 1.0, 0);
    const leftLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.8, 0.22), mat2);
    leftLegMesh.position.y = -0.4;
    leftLegMesh.castShadow = true;
    this._leftLeg.add(leftLegMesh);
    const leftFoot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.35), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    leftFoot.position.set(0, -0.82, 0.06);
    leftFoot.castShadow = true;
    this._leftLeg.add(leftFoot);
    this.group.add(this._leftLeg);

    // Right Leg
    this._rightLeg = new THREE.Group();
    this._rightLeg.position.set(0.2, 1.0, 0);
    const rightLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.8, 0.22), mat2);
    rightLegMesh.position.y = -0.4;
    rightLegMesh.castShadow = true;
    this._rightLeg.add(rightLegMesh);
    const rightFoot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.35), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    rightFoot.position.set(0, -0.82, 0.06);
    rightFoot.castShadow = true;
    this._rightLeg.add(rightFoot);
    this.group.add(this._rightLeg);
  }

  animate(dt, isMoving, sprintMult = 1) {
    this._animTime += dt;
    if (isMoving) {
      const freq = 8 * sprintMult;
      const amp = 0.6;
      this._legAngle = Math.sin(this._animTime * freq) * amp;
      this._armAngle = Math.sin(this._animTime * freq + Math.PI) * amp * 0.8;

      this._leftLeg.rotation.x = this._legAngle;
      this._rightLeg.rotation.x = -this._legAngle;
      this._leftArm.rotation.x = this._armAngle;
      this._rightArm.rotation.x = -this._armAngle;

      this._torso.position.y = 1.5 + Math.abs(Math.sin(this._animTime * freq)) * 0.05;
    } else {
      this._leftLeg.rotation.x *= 0.9;
      this._rightLeg.rotation.x *= 0.9;
      this._leftArm.rotation.x *= 0.9;
      this._rightArm.rotation.x *= 0.9;
    }
  }

  setPosition(x, y, z) {
    this.group.position.set(x, y, z);
  }

  lookAt(x, z) {
    const angle = Math.atan2(x - this.group.position.x, z - this.group.position.z);
    this.group.rotation.y = angle;
  }

  setColor(primary, secondary) {
    this.color = primary;
    this.secondaryColor = secondary;
    this.group.traverse(child => {
      if (child.isMesh && child.material) {
        // Update colors for torso mesh
      }
    });
  }

  destroy() {
    this.group.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
    this.scene.remove(this.group);
  }
}
