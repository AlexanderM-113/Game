import * as THREE from 'three';
import { Stadium } from '../entities/Stadium.js';
import { OpponentAI } from '../ai/OpponentAI.js';
import { clamp, lerp, formatTimeMs, randomRange } from '../utils/MathUtils.js';

const POOL_LENGTH = 50;
const LANE_COUNT = 8;
const LANE_WIDTH = 2.5;
const RACE_DISTANCE = 100; // 2 laps (50m pool)

export class Swimming {
  constructor(game, mode) {
    this.game = game;
    this.mode = mode;
    this.sportName = 'swimming';
    this.score = { player: '-', opponent: '-' };
    this.timer = 0;
    this.timerLabel = 'TIME';
    this.infoText = '';
    this.teamNames = ['YOU', 'BEST'];

    this._stadium = null;
    this._swimmers = [];
    this._playerLane = 3;
    this._playerProgress = 0;
    this._playerSpeed = 0;
    this._aiOpponents = [];
    this._raceStarted = false;
    this._raceFinished = false;
    this._countdownTimer = 4;
    this._gamePhase = 'countdown';
    this._strokeSide = 'left';
    this._strokeTimer = 0;
    this._strokePerfect = false;
    this._strokeWindow = false;
    this._strokeWindowTimer = 0;
    this._finishTimes = [];
    this._playerFinishTime = 0;
    this._lapCount = 0;
    this._heading = 1; // 1 = going right, -1 = going left
    this._splashParticles = [];
    this._dayTime = 0.5;
    this._stats = { perfectStrokes: 0, totalStrokes: 0, topSpeed: 0 };
  }

  init() {
    const scene = this.game.scene;
    scene.clearScene();

    this._stadium = new Stadium(scene.scene, 'swimming');
    this._stadium.buildSwimmingPool();

    this._dayTime = 0.35 + Math.random() * 0.3;
    scene.setDayNight(this._dayTime);
    scene.setWeather('clear');

    // Camera
    scene.camera.position.set(-25, 12, 18);
    scene.camera.lookAt(0, -1, 0);

    // Create swimmers (simple elongated shapes in pool)
    this._swimmers = [];
    const playerColor = new THREE.Color(this.game.playerCustomization.primaryColor);

    for (let i = 0; i < LANE_COUNT; i++) {
      const isPlayer = i === this._playerLane;
      const color = isPlayer ? playerColor.getHex() : new THREE.Color().setHSL(Math.random(), 0.6, 0.5).getHex();

      const swimmerGroup = new THREE.Group();

      // Body (elongated)
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.3, 0.5),
        new THREE.MeshStandardMaterial({ color, roughness: 0.4 })
      );
      body.castShadow = true;
      swimmerGroup.add(body);

      // Head
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xf0c8a0, roughness: 0.6 })
      );
      head.position.set(0.9, 0.1, 0);
      swimmerGroup.add(head);

      // Cap
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 8, 8),
        new THREE.MeshStandardMaterial({ color: isPlayer ? 0xffd700 : 0xffffff })
      );
      cap.position.set(0.9, 0.15, 0);
      cap.scale.y = 0.7;
      swimmerGroup.add(cap);

      // Arms
      const leftArm = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.12, 0.12),
        new THREE.MeshStandardMaterial({ color: 0xf0c8a0 })
      );
      leftArm.position.set(0.3, 0.2, -0.35);
      swimmerGroup.add(leftArm);

      const rightArm = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.12, 0.12),
        new THREE.MeshStandardMaterial({ color: 0xf0c8a0 })
      );
      rightArm.position.set(0.3, 0.2, 0.35);
      swimmerGroup.add(rightArm);

      const laneZ = (i - (LANE_COUNT - 1) / 2) * LANE_WIDTH;
      swimmerGroup.position.set(-24, -0.15, laneZ);

      scene.scene.add(swimmerGroup);

      this._swimmers.push({
        group: swimmerGroup,
        leftArm,
        rightArm,
        body,
        lane: i,
        isPlayer,
        progress: 0,
        speed: 0,
        finished: false,
        finishTime: 0,
        heading: 1,
        lapsDone: 0,
        strokeAnim: 0
      });
    }

    // AI opponents
    this._aiOpponents = [];
    for (let i = 0; i < LANE_COUNT; i++) {
      if (i === this._playerLane) continue;
      this._aiOpponents.push({
        ai: new OpponentAI(this.game.difficulty),
        laneIndex: i,
        strokeTimer: 0.3 + Math.random() * 0.2,
        _t: 0
      });
    }

    this._playerProgress = 0;
    this._playerSpeed = 0;
    this._raceStarted = false;
    this._raceFinished = false;
    this._countdownTimer = 4;
    this._gamePhase = 'countdown';
    this._strokeSide = 'left';
    this._strokeTimer = 0;
    this._finishTimes = [];
    this._playerFinishTime = 0;
    this._lapCount = 0;
    this._heading = 1;
    this.timer = 0;
    this.score = { player: '-', opponent: '-' };
    this._stats = { perfectStrokes: 0, totalStrokes: 0, topSpeed: 0 };

    this.game.achievements.check('play', this);
  }

  update(dt) {
    const input = this.game.input;

    if (input.justPressed('escape')) {
      this.game.pauseGame();
      input.clearFrame();
      return;
    }

    if (this._gamePhase === 'countdown') {
      this._countdownTimer -= dt;
      if (this._countdownTimer > 1) {
        this.infoText = `On your marks... ${Math.ceil(this._countdownTimer - 1)}`;
        this.game.audio.play('countdown');
      } else if (this._countdownTimer > 0) {
        this.infoText = 'SET...';
      } else {
        this._gamePhase = 'race';
        this._raceStarted = true;
        this.infoText = 'GO!';
        this.game.audio.play('go');
        setTimeout(() => { if (this.infoText === 'GO!') this.infoText = ''; }, 1000);
      }
      input.clearFrame();
      return;
    }

    if (this._raceFinished) {
      input.clearFrame();
      return;
    }

    // Race timer
    this.timer += dt;

    // Player stroke input
    const playerSwimmer = this._swimmers[this._playerLane];

    this._strokeTimer -= dt;

    if (this._strokeTimer <= 0 && !this._strokeWindow) {
      this._strokeWindow = true;
      this._strokeWindowTimer = 0.5;
    }

    if (this._strokeWindow) {
      this._strokeWindowTimer -= dt;
      this.infoText = this._strokeSide === 'left' ? '← LEFT stroke!' : 'RIGHT stroke! →';

      const correctKey = this._strokeSide === 'left' ? input.justPressed('arrowleft') || input.justPressed('a') : input.justPressed('arrowright') || input.justPressed('d');
      const wrongKey = this._strokeSide === 'left' ? input.justPressed('arrowright') || input.justPressed('d') : input.justPressed('arrowleft') || input.justPressed('a');

      if (correctKey) {
        // Perfect stroke
        this._playerSpeed += 3.5;
        this._strokePerfect = true;
        this._stats.perfectStrokes++;
        this._stats.totalStrokes++;
        this._strokeWindow = false;
        this._strokeTimer = 0.35;
        this._strokeSide = this._strokeSide === 'left' ? 'right' : 'left';
        this.game.audio.play('swim_stroke');
        this._addSplash(playerSwimmer.group.position);
      } else if (wrongKey) {
        // Wrong side - penalty
        this._playerSpeed += 1.5;
        this._strokePerfect = false;
        this._stats.totalStrokes++;
        this._strokeWindow = false;
        this._strokeTimer = 0.5;
        this._strokeSide = this._strokeSide === 'left' ? 'right' : 'left';
      }

      if (this._strokeWindowTimer <= 0) {
        // Missed stroke window
        this._playerSpeed += 0.5;
        this._strokeWindow = false;
        this._strokeTimer = 0.4;
        this._strokeSide = this._strokeSide === 'left' ? 'right' : 'left';
        this._stats.totalStrokes++;
      }
    } else {
      if (!this._raceFinished) {
        this.infoText = `Lap ${playerSwimmer.lapsDone + 1}/2`;
      }
    }

    // Turn at wall
    if (input.justPressed(' ') && this._playerProgress > 0) {
      this.game.audio.play('splash');
    }

    // Player movement
    this._playerSpeed *= 0.97; // drag
    this._playerProgress += this._playerSpeed * dt;
    this._stats.topSpeed = Math.max(this._stats.topSpeed, this._playerSpeed);

    // Update player swimmer visual
    this._updateSwimmerVisual(playerSwimmer, this._playerProgress, dt);

    // Check finish
    if (this._playerProgress >= RACE_DISTANCE && !playerSwimmer.finished) {
      playerSwimmer.finished = true;
      this._playerFinishTime = this.timer;
      playerSwimmer.finishTime = this.timer;
      this._finishTimes.push({ lane: this._playerLane, time: this.timer, isPlayer: true });
      this.game.audio.play('whistle');
    }

    // AI swimmers
    for (const opp of this._aiOpponents) {
      opp._t += dt;
      const swimmer = this._swimmers[opp.laneIndex];
      if (swimmer.finished) continue;

      opp.strokeTimer -= dt;
      if (opp.strokeTimer <= 0) {
        const result = opp.ai.getSwimmingStroke(dt, swimmer.progress, RACE_DISTANCE);
        swimmer.speed = result.speed;
        opp.strokeTimer = 0.3 + Math.random() * 0.15;

        if (Math.random() < 0.3) {
          this._addSplash(swimmer.group.position);
        }
      }

      swimmer.speed *= 0.97;
      swimmer.progress += swimmer.speed * dt;

      this._updateSwimmerVisual(swimmer, swimmer.progress, dt);

      if (swimmer.progress >= RACE_DISTANCE && !swimmer.finished) {
        swimmer.finished = true;
        swimmer.finishTime = this.timer;
        this._finishTimes.push({ lane: opp.laneIndex, time: this.timer, isPlayer: false });
      }
    }

    // Update scores - show position
    this._finishTimes.sort((a, b) => a.time - b.time);
    const playerRank = this._getPlayerRank();
    this.score.player = `#${playerRank}`;

    const bestAITime = this._finishTimes.find(f => !f.isPlayer);
    this.score.opponent = bestAITime ? formatTimeMs(bestAITime.time) : '-';

    // Check if race is over
    const allFinished = this._swimmers.every(s => s.finished);
    if (allFinished || (playerSwimmer.finished && this._finishTimes.length >= LANE_COUNT)) {
      this._endRace();
    }

    // Camera follow
    const cam = this.game.scene.camera;
    const targetX = playerSwimmer.group.position.x;
    cam.position.x += (targetX - 5 - cam.position.x) * 2 * dt;
    cam.lookAt(targetX, -1, 0);

    // Update splash particles
    this._updateSplashes(dt);

    input.clearFrame();
  }

  _updateSwimmerVisual(swimmer, progress, dt) {
    const poolHalf = POOL_LENGTH / 2;
    const lapProgress = progress % POOL_LENGTH;
    const lapNum = Math.floor(progress / POOL_LENGTH);

    swimmer.lapsDone = lapNum;

    let xPos;
    if (lapNum % 2 === 0) {
      // Going right
      xPos = -poolHalf + lapProgress;
      swimmer.heading = 1;
    } else {
      // Going left (return)
      xPos = poolHalf - lapProgress;
      swimmer.heading = -1;
    }

    swimmer.group.position.x = xPos * 0.96;
    swimmer.group.rotation.y = swimmer.heading > 0 ? 0 : Math.PI;

    // Arm animation
    swimmer.strokeAnim += dt * (swimmer.speed || this._playerSpeed) * 0.5;
    swimmer.leftArm.rotation.z = Math.sin(swimmer.strokeAnim) * 1.5;
    swimmer.rightArm.rotation.z = Math.sin(swimmer.strokeAnim + Math.PI) * 1.5;
    swimmer.leftArm.position.y = 0.2 + Math.max(0, Math.sin(swimmer.strokeAnim)) * 0.4;
    swimmer.rightArm.position.y = 0.2 + Math.max(0, Math.sin(swimmer.strokeAnim + Math.PI)) * 0.4;

    // Body bob
    swimmer.body.position.y = Math.sin(swimmer.strokeAnim * 2) * 0.03;
  }

  _getPlayerRank() {
    // Count swimmers ahead
    const playerSwimmer = this._swimmers[this._playerLane];
    let rank = 1;
    for (const s of this._swimmers) {
      if (s === playerSwimmer) continue;
      if (s.progress > playerSwimmer.progress) rank++;
    }
    return rank;
  }

  _addSplash(position) {
    if (!this.game.settings.particles) return;
    const scene = this.game.scene.scene;

    for (let i = 0; i < 5; i++) {
      const geo = new THREE.SphereGeometry(0.08, 4, 4);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x88ccff,
        transparent: true,
        opacity: 0.7
      });
      const splash = new THREE.Mesh(geo, mat);
      splash.position.copy(position);
      splash.position.y = 0;
      scene.add(splash);

      this._splashParticles.push({
        mesh: splash,
        vx: randomRange(-2, 2),
        vy: randomRange(2, 5),
        vz: randomRange(-1, 1),
        life: 0.6
      });
    }
  }

  _updateSplashes(dt) {
    for (let i = this._splashParticles.length - 1; i >= 0; i--) {
      const p = this._splashParticles[i];
      p.life -= dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.vy -= 10 * dt;
      p.mesh.material.opacity = p.life;

      if (p.life <= 0) {
        this.game.scene.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this._splashParticles.splice(i, 1);
      }
    }
  }

  _endRace() {
    if (this._raceFinished) return;
    this._raceFinished = true;
    this._gamePhase = 'finished';

    const rank = this._getPlayerRank();
    const won = rank === 1;

    if (won) {
      this.game.achievements.check('swimming_gold');
      if (this._playerFinishTime < 25) {
        this.game.achievements.check('swimming_record');
      }
    }

    this.game.endGame({
      won,
      draw: false,
      scoreText: `Finished #${rank} - ${formatTimeMs(this._playerFinishTime)}`,
      stats: {
        'Final Time': formatTimeMs(this._playerFinishTime),
        'Perfect Strokes': `${this._stats.perfectStrokes}/${this._stats.totalStrokes}`,
        'Position': `#${rank} of ${LANE_COUNT}`
      }
    });
  }

  cleanup() {
    if (this._stadium) this._stadium.destroy();
    for (const s of this._swimmers) {
      s.group.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      this.game.scene.scene.remove(s.group);
    }
    this._swimmers = [];
    for (const p of this._splashParticles) {
      this.game.scene.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
    }
    this._splashParticles = [];
  }
}
