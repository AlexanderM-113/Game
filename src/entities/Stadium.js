import * as THREE from 'three';

export class Stadium {
  constructor(scene, type) {
    this.scene = scene;
    this.type = type;
    this.objects = [];
  }

  buildFootballField() {
    // Field
    const field = new THREE.Mesh(
      new THREE.PlaneGeometry(70, 36),
      new THREE.MeshStandardMaterial({ color: 0x2d8b2d, roughness: 0.9 })
    );
    field.rotation.x = -Math.PI / 2;
    field.receiveShadow = true;
    this.scene.add(field);
    this.objects.push(field);

    // Field lines
    this._addFieldLine(0, 0.01, 0, 0.1, 36); // Center
    for (let i = -30; i <= 30; i += 5) {
      this._addFieldLine(i, 0.01, 0, 0.05, 36, 0xffffff, i % 10 === 0 ? 0.08 : 0.04);
    }

    // End zones
    const ezMat1 = new THREE.MeshStandardMaterial({ color: 0x1a5c1a, roughness: 0.9 });
    const ezMat2 = new THREE.MeshStandardMaterial({ color: 0x1a1a5c, roughness: 0.9 });
    const ez1 = new THREE.Mesh(new THREE.PlaneGeometry(5, 36), ezMat1);
    ez1.rotation.x = -Math.PI / 2;
    ez1.position.set(-32.5, 0.01, 0);
    ez1.receiveShadow = true;
    this.scene.add(ez1);
    this.objects.push(ez1);

    const ez2 = new THREE.Mesh(new THREE.PlaneGeometry(5, 36), ezMat2);
    ez2.rotation.x = -Math.PI / 2;
    ez2.position.set(32.5, 0.01, 0);
    ez2.receiveShadow = true;
    this.scene.add(ez2);
    this.objects.push(ez2);

    // Goal posts
    this._addGoalPost(-35, 0);
    this._addGoalPost(35, 0);

    // Stands
    this._addStands(0, -22, 70, 10, 8, 0x555566);
    this._addStands(0, 22, 70, 10, 8, 0x665555);

    // Lights
    this._addFloodlight(-30, 25);
    this._addFloodlight(30, 25);
    this._addFloodlight(-30, -25);
    this._addFloodlight(30, -25);

    return { fieldWidth: 70, fieldHeight: 36, endZoneWidth: 5 };
  }

  buildSwimmingPool() {
    // Pool deck
    const deck = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 40),
      new THREE.MeshStandardMaterial({ color: 0xd4c5a0, roughness: 0.8 })
    );
    deck.rotation.x = -Math.PI / 2;
    deck.receiveShadow = true;
    this.scene.add(deck);
    this.objects.push(deck);

    // Pool water
    const poolWater = new THREE.Mesh(
      new THREE.PlaneGeometry(50, 22),
      new THREE.MeshStandardMaterial({
        color: 0x0066aa,
        roughness: 0.1,
        metalness: 0.3,
        transparent: true,
        opacity: 0.85
      })
    );
    poolWater.rotation.x = -Math.PI / 2;
    poolWater.position.y = -0.3;
    poolWater.receiveShadow = true;
    this.scene.add(poolWater);
    this.objects.push(poolWater);

    // Pool walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x3399cc, roughness: 0.5 });
    const poolBottom = new THREE.Mesh(new THREE.PlaneGeometry(50, 22), new THREE.MeshStandardMaterial({ color: 0x004488, roughness: 0.4 }));
    poolBottom.rotation.x = -Math.PI / 2;
    poolBottom.position.y = -2;
    this.scene.add(poolBottom);
    this.objects.push(poolBottom);

    // Lane dividers
    for (let i = -4; i <= 4; i++) {
      if (i === 0) continue;
      const laneZ = i * 2.5;
      const laneLine = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 50, 8),
        new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? 0xff4444 : 0x4444ff })
      );
      laneLine.rotation.z = Math.PI / 2;
      laneLine.position.set(0, -0.2, laneZ);
      this.scene.add(laneLine);
      this.objects.push(laneLine);
    }

    // Starting blocks
    for (let i = 0; i < 8; i++) {
      const laneZ = (i - 3.5) * 2.5;
      const block = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.5, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.4, metalness: 0.6 })
      );
      block.position.set(-25.5, 0, laneZ);
      block.castShadow = true;
      this.scene.add(block);
      this.objects.push(block);
    }

    // Stands
    this._addStands(0, -15, 50, 6, 5, 0x555566);
    this._addStands(0, 15, 50, 6, 5, 0x665555);

    return { poolLength: 50, lanes: 8, laneWidth: 2.5 };
  }

  buildTennisCourt() {
    // Court surface
    const court = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 11),
      new THREE.MeshStandardMaterial({ color: 0x2266aa, roughness: 0.7 })
    );
    court.rotation.x = -Math.PI / 2;
    court.position.y = 0.01;
    court.receiveShadow = true;
    this.scene.add(court);
    this.objects.push(court);

    // Surrounding ground
    const surround = new THREE.Mesh(
      new THREE.PlaneGeometry(34, 18),
      new THREE.MeshStandardMaterial({ color: 0x1a5533, roughness: 0.9 })
    );
    surround.rotation.x = -Math.PI / 2;
    surround.receiveShadow = true;
    this.scene.add(surround);
    this.objects.push(surround);

    // Court lines
    const lineMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });

    // Baseline
    this._addCourtLine(0, 0, -5.5, 24, 0.08, lineMat);
    this._addCourtLine(0, 0, 5.5, 24, 0.08, lineMat);

    // Sidelines
    this._addCourtLine(-12, 0, 0, 0.08, 11, lineMat);
    this._addCourtLine(12, 0, 0, 0.08, 11, lineMat);

    // Singles sidelines
    this._addCourtLine(-10.5, 0, 0, 0.06, 11, lineMat);
    this._addCourtLine(10.5, 0, 0, 0.06, 11, lineMat);

    // Service lines
    this._addCourtLine(0, 0, -2, 21, 0.06, lineMat);
    this._addCourtLine(0, 0, 2, 21, 0.06, lineMat);

    // Center service line
    this._addCourtLine(0, 0, 0, 0.06, 4, lineMat);

    // Net
    const netPosts = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8, roughness: 0.2 });
    const leftPost = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 8), netPosts);
    leftPost.position.set(0, 0.55, -5.8);
    this.scene.add(leftPost);
    this.objects.push(leftPost);

    const rightPost = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 8), netPosts);
    rightPost.position.set(0, 0.55, 5.8);
    this.scene.add(rightPost);
    this.objects.push(rightPost);

    const net = new THREE.Mesh(
      new THREE.PlaneGeometry(0.05, 1, 1, 10),
      new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, side: THREE.DoubleSide })
    );
    net.scale.set(1, 1, 115);
    net.position.set(0, 0.55, 0);
    this.scene.add(net);
    this.objects.push(net);

    // Umpire chair
    const chair = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 2.5, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x336633 })
    );
    chair.position.set(0, 1.25, -7);
    chair.castShadow = true;
    this.scene.add(chair);
    this.objects.push(chair);

    // Stands
    this._addStands(0, -12, 30, 5, 4, 0x555566);
    this._addStands(0, 12, 30, 5, 4, 0x665555);

    return { courtLength: 24, courtWidth: 11, netX: 0 };
  }

  buildSoccerPitch() {
    // Pitch
    const pitch = new THREE.Mesh(
      new THREE.PlaneGeometry(68, 45),
      new THREE.MeshStandardMaterial({ color: 0x2d8b2d, roughness: 0.9 })
    );
    pitch.rotation.x = -Math.PI / 2;
    pitch.receiveShadow = true;
    this.scene.add(pitch);
    this.objects.push(pitch);

    // Grass stripes
    for (let i = -30; i <= 30; i += 5) {
      const stripe = new THREE.Mesh(
        new THREE.PlaneGeometry(2.5, 45),
        new THREE.MeshStandardMaterial({ color: i % 10 === 0 ? 0x339933 : 0x2d8b2d, roughness: 0.9, transparent: true, opacity: 0.3 })
      );
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(i, 0.005, 0);
      this.scene.add(stripe);
      this.objects.push(stripe);
    }

    // Lines
    const lineMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });

    // Touch lines (long sides)
    this._addCourtLine(0, 0, -22.5, 68, 0.08, lineMat);
    this._addCourtLine(0, 0, 22.5, 68, 0.08, lineMat);

    // Goal lines (short sides)
    this._addCourtLine(-34, 0, 0, 0.08, 45, lineMat);
    this._addCourtLine(34, 0, 0, 0.08, 45, lineMat);

    // Center line
    this._addCourtLine(0, 0, 0, 0.08, 45, lineMat);

    // Center circle
    const circleGeo = new THREE.RingGeometry(6, 6.08, 32);
    const circleMesh = new THREE.Mesh(circleGeo, lineMat.clone());
    circleMesh.rotation.x = -Math.PI / 2;
    circleMesh.position.y = 0.02;
    this.scene.add(circleMesh);
    this.objects.push(circleMesh);

    // Penalty areas
    this._addPenaltyArea(-34, 0, lineMat);
    this._addPenaltyArea(34, 0, lineMat, true);

    // Goals
    this._addSoccerGoal(-34.5, 0);
    this._addSoccerGoal(34.5, 0, true);

    // Stands
    this._addStands(0, -27, 68, 8, 6, 0x555566);
    this._addStands(0, 27, 68, 8, 6, 0x665555);
    this._addStands(-38, 0, 8, 45, 6, 0x556655);
    this._addStands(38, 0, 8, 45, 6, 0x555566);

    // Floodlights
    this._addFloodlight(-30, -27);
    this._addFloodlight(30, -27);
    this._addFloodlight(-30, 27);
    this._addFloodlight(30, 27);

    return { pitchWidth: 68, pitchHeight: 45, goalWidth: 5 };
  }

  _addFieldLine(x, y, z, width, length, color = 0xffffff, thickness = 0.05) {
    const line = new THREE.Mesh(
      new THREE.PlaneGeometry(thickness, length),
      new THREE.MeshStandardMaterial({ color })
    );
    line.rotation.x = -Math.PI / 2;
    line.position.set(x, y, z);
    this.scene.add(line);
    this.objects.push(line);
  }

  _addCourtLine(x, y, z, width, height, material) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material.clone());
    line.rotation.x = -Math.PI / 2;
    line.position.set(x, y + 0.02, z);
    this.scene.add(line);
    this.objects.push(line);
  }

  _addGoalPost(x, z) {
    const postMat = new THREE.MeshStandardMaterial({ color: 0xffff00, metalness: 0.7, roughness: 0.2 });

    const leftUpright = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 6, 8), postMat);
    leftUpright.position.set(x, 3, z - 2.5);
    leftUpright.castShadow = true;
    this.scene.add(leftUpright);
    this.objects.push(leftUpright);

    const rightUpright = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 6, 8), postMat);
    rightUpright.position.set(x, 3, z + 2.5);
    rightUpright.castShadow = true;
    this.scene.add(rightUpright);
    this.objects.push(rightUpright);

    const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 5, 8), postMat);
    crossbar.rotation.x = Math.PI / 2;
    crossbar.position.set(x, 3, z);
    this.scene.add(crossbar);
    this.objects.push(crossbar);
  }

  _addSoccerGoal(x, z, flip = false) {
    const goalMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.6, roughness: 0.3 });
    const goalWidth = 5;
    const goalHeight = 2.5;
    const goalDepth = 1.5;
    const dir = flip ? -1 : 1;

    // Posts
    const leftPost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, goalHeight, 8), goalMat);
    leftPost.position.set(x, goalHeight / 2, z - goalWidth / 2);
    this.scene.add(leftPost);
    this.objects.push(leftPost);

    const rightPost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, goalHeight, 8), goalMat);
    rightPost.position.set(x, goalHeight / 2, z + goalWidth / 2);
    this.scene.add(rightPost);
    this.objects.push(rightPost);

    // Crossbar
    const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, goalWidth, 8), goalMat);
    crossbar.rotation.x = Math.PI / 2;
    crossbar.position.set(x, goalHeight, z);
    this.scene.add(crossbar);
    this.objects.push(crossbar);

    // Net
    const netMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      wireframe: true
    });
    const backNet = new THREE.Mesh(new THREE.PlaneGeometry(goalDepth, goalHeight), netMat);
    backNet.position.set(x + dir * goalDepth / 2, goalHeight / 2, z - goalWidth / 2);
    backNet.rotation.y = Math.PI / 2;
    this.scene.add(backNet);
    this.objects.push(backNet);

    const backNet2 = new THREE.Mesh(new THREE.PlaneGeometry(goalDepth, goalHeight), netMat);
    backNet2.position.set(x + dir * goalDepth / 2, goalHeight / 2, z + goalWidth / 2);
    backNet2.rotation.y = Math.PI / 2;
    this.scene.add(backNet2);
    this.objects.push(backNet2);

    const topNet = new THREE.Mesh(new THREE.PlaneGeometry(goalDepth, goalWidth), netMat);
    topNet.rotation.x = Math.PI / 2;
    topNet.position.set(x + dir * goalDepth / 2, goalHeight, z);
    this.scene.add(topNet);
    this.objects.push(topNet);

    const rearNet = new THREE.Mesh(new THREE.PlaneGeometry(goalWidth, goalHeight), netMat);
    rearNet.position.set(x + dir * goalDepth, goalHeight / 2, z);
    this.scene.add(rearNet);
    this.objects.push(rearNet);
  }

  _addPenaltyArea(x, z, lineMat, flip = false) {
    const dir = flip ? -1 : 1;
    // Penalty box
    this._addCourtLine(x + dir * 8, 0, 0, 0.06, 26, lineMat);
    this._addCourtLine(x + dir * 4, 0, -13, 8, 0.06, lineMat);
    this._addCourtLine(x + dir * 4, 0, 13, 8, 0.06, lineMat);

    // Goal box
    this._addCourtLine(x + dir * 3, 0, 0, 0.06, 12, lineMat);
    this._addCourtLine(x + dir * 1.5, 0, -6, 3, 0.06, lineMat);
    this._addCourtLine(x + dir * 1.5, 0, 6, 3, 0.06, lineMat);

    // Penalty spot
    const spot = new THREE.Mesh(
      new THREE.CircleGeometry(0.15, 8),
      lineMat.clone()
    );
    spot.rotation.x = -Math.PI / 2;
    spot.position.set(x + dir * 6.5, 0.02, z);
    this.scene.add(spot);
    this.objects.push(spot);
  }

  _addStands(x, z, width, depth, height, color) {
    const standGeo = new THREE.BoxGeometry(width, height, depth);
    const standMat = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
    const stand = new THREE.Mesh(standGeo, standMat);
    stand.position.set(x, height / 2, z);
    stand.receiveShadow = true;
    this.scene.add(stand);
    this.objects.push(stand);

    // Crowd dots
    const crowdCount = Math.floor(width * depth * 0.5);
    for (let i = 0; i < crowdCount; i++) {
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 4, 4),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(Math.random(), 0.5, 0.5)
        })
      );
      dot.position.set(
        x + (Math.random() - 0.5) * width * 0.9,
        height + 0.15,
        z + (Math.random() - 0.5) * depth * 0.6
      );
      this.scene.add(dot);
      this.objects.push(dot);
    }
  }

  _addFloodlight(x, z) {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.8, roughness: 0.3 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 15, 8), poleMat);
    pole.position.set(x, 7.5, z);
    pole.castShadow = true;
    this.scene.add(pole);
    this.objects.push(pole);

    const lightBox = new THREE.Mesh(
      new THREE.BoxGeometry(3, 0.5, 1.5),
      new THREE.MeshStandardMaterial({ color: 0xcccccc, emissive: 0xffffaa, emissiveIntensity: 0.5 })
    );
    lightBox.position.set(x, 15, z);
    this.scene.add(lightBox);
    this.objects.push(lightBox);

    const spotLight = new THREE.PointLight(0xffffcc, 0.5, 60);
    spotLight.position.set(x, 14, z);
    this.scene.add(spotLight);
    this.objects.push(spotLight);
  }

  destroy() {
    for (const obj of this.objects) {
      this.scene.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else if (obj.material.dispose) obj.material.dispose();
      }
    }
    this.objects = [];
  }
}
