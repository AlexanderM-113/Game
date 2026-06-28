import * as THREE from 'three';
import { Stadium } from '../entities/Stadium.js';
import { Athlete } from '../entities/Athlete.js';
import { Ball } from '../entities/Ball.js';
import { OpponentAI } from '../ai/OpponentAI.js';
import { clamp, distance2D, randomRange, formatTime } from '../utils/MathUtils.js';

const PITCH_HALF_W = 34;
const PITCH_HALF_H = 22.5;
const GOAL_HALF_W = 2.5;
const HALF_TIME = 180; // 3 min halves

export class Soccer {
  constructor(game, mode) {
    this.game = game;
    this.mode = mode;
    this.sportName = 'soccer';
    this.score = { player: 0, opponent: 0 };
    this.timer = HALF_TIME;
    this.timerLabel = '1ST HALF';
    this.infoText = '';
    this.teamNames = ['HOME', 'AWAY'];

    this._stadium = null;
    this._player = null;
    this._ball = null;
    this._ai = null;
    this._teamPlayers = [];
    this._aiPlayers = [];
    this._goalkeeper = null;
    this._aiGoalkeeper = null;
    this._half = 1;
    this._kickoff = true;
    this._resetTimer = 0;
    this._countdownTimer = 3;
    this._gamePhase = 'countdown';
    this._playerHasBall = false;
    this._lastTouched = null;
    this._dayTime = 0.45;
    this._stats = { goals: 0, shots: 0, passes: 0, tackles: 0 };
    this._shotCooldown = 0;
  }

  init() {
    const scene = this.game.scene;
    scene.clearScene();

    this._stadium = new Stadium(scene.scene, 'soccer');
    this._stadium.buildSoccerPitch();

    const weathers = ['clear', 'clear', 'rain', 'clear'];
    scene.setWeather(weathers[Math.floor(Math.random() * weathers.length)]);

    this._dayTime = 0.3 + Math.random() * 0.4;
    scene.setDayNight(this._dayTime);

    // Camera
    scene.camera.position.set(0, 30, 40);
    scene.camera.lookAt(0, 0, 0);

    const pc = this.game.playerCustomization;

    // Player
    this._player = new Athlete(scene.scene, {
      color: new THREE.Color(pc.primaryColor).getHex(),
      secondaryColor: new THREE.Color(pc.secondaryColor).getHex(),
      name: pc.name,
      speed: 10
    });
    this._player.setPosition(-5, 0, 0);

    // Team
    this._teamPlayers = [];
    const teamPositions = [
      [-25, 0], [-15, -8], [-15, 8], [-8, -12], [-8, 12],
      [0, -6], [0, 6], [8, -4], [8, 4], [15, 0]
    ];
    for (let i = 0; i < teamPositions.length; i++) {
      const tm = new Athlete(scene.scene, {
        color: new THREE.Color(pc.primaryColor).getHex(),
        secondaryColor: new THREE.Color(pc.secondaryColor).getHex(),
        isAI: true,
        speed: 7
      });
      tm.setPosition(teamPositions[i][0], 0, teamPositions[i][1]);
      tm._baseX = teamPositions[i][0];
      tm._baseZ = teamPositions[i][1];
      this._teamPlayers.push(tm);
    }

    // Goalkeeper (player team)
    this._goalkeeper = new Athlete(scene.scene, {
      color: 0xffcc00,
      secondaryColor: 0x000000,
      isAI: true,
      speed: 8
    });
    this._goalkeeper.setPosition(-33, 0, 0);

    // AI Team
    this._ai = new OpponentAI(this.game.difficulty);
    this._aiPlayers = [];
    const aiPositions = [
      [25, 0], [15, -8], [15, 8], [8, -12], [8, 12],
      [0, -6], [0, 6], [-8, -4], [-8, 4], [-15, 0]
    ];
    for (let i = 0; i < aiPositions.length; i++) {
      const ai = new Athlete(scene.scene, {
        color: 0xcc2222,
        secondaryColor: 0xffffff,
        isAI: true,
        speed: 6 + this._ai.params.speed * 4
      });
      ai.setPosition(aiPositions[i][0], 0, aiPositions[i][1]);
      ai._baseX = aiPositions[i][0];
      ai._baseZ = aiPositions[i][1];
      this._aiPlayers.push(ai);
    }

    // AI Goalkeeper
    this._aiGoalkeeper = new Athlete(scene.scene, {
      color: 0x00cc44,
      secondaryColor: 0x000000,
      isAI: true,
      speed: 9
    });
    this._aiGoalkeeper.setPosition(33, 0, 0);

    // Ball
    this._ball = new Ball(scene.scene, {
      type: 'soccer',
      radius: 0.3,
      gravity: -15,
      bounciness: 0.5,
      friction: 0.985,
      groundY: 0.3
    });
    this._ball.setPosition(0, 0.3, 0);

    // Reset state
    this.score = { player: 0, opponent: 0 };
    this._half = 1;
    this.timer = HALF_TIME;
    this.timerLabel = '1ST HALF';
    this._kickoff = true;
    this._countdownTimer = 3;
    this._gamePhase = 'countdown';
    this._playerHasBall = false;
    this._lastTouched = null;
    this._resetTimer = 0;
    this._shotCooldown = 0;
    this._stats = { goals: 0, shots: 0, passes: 0, tackles: 0 };

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
      this.infoText = `Kick Off in ${Math.ceil(this._countdownTimer)}`;
      if (this._countdownTimer <= 0) {
        this._gamePhase = 'play';
        this.infoText = '';
        this.game.audio.play('whistle');
      }
      input.clearFrame();
      return;
    }

    if (this._gamePhase === 'gameover') {
      input.clearFrame();
      return;
    }

    // Timer
    this.timer -= dt;
    if (this.timer <= 0) {
      if (this._half === 1) {
        this._half = 2;
        this.timer = HALF_TIME;
        this.timerLabel = '2ND HALF';
        this.game.audio.play('whistle');
        this._resetPositions();
        this._resetTimer = 2;
        this.infoText = 'HALF TIME';
      } else {
        this._endMatch();
        input.clearFrame();
        return;
      }
    }

    this._shotCooldown -= dt;

    // Day/night
    this._dayTime += dt * 0.004;
    if (this._dayTime > 1) this._dayTime = 0;
    this.game.scene.setDayNight(this._dayTime);

    if (this._resetTimer > 0) {
      this._resetTimer -= dt;
      if (this._resetTimer <= 0) {
        this.infoText = '';
        this._kickoff = true;
      }
      input.clearFrame();
      return;
    }

    // Player movement
    const sprint = input.isAction2();
    const speed = this._player.speed * (sprint ? 1.4 : 1.0);
    let moveX = 0;
    let moveZ = 0;

    if (input.isLeft()) moveX = -1;
    if (input.isRight()) moveX = 1;
    if (input.isUp()) moveZ = -1;
    if (input.isDown2()) moveZ = 1;

    if (moveX || moveZ) {
      const mag = Math.sqrt(moveX * moveX + moveZ * moveZ);
      moveX = (moveX / mag) * speed * dt;
      moveZ = (moveZ / mag) * speed * dt;

      this._player.group.position.x = clamp(
        this._player.group.position.x + moveX,
        -PITCH_HALF_W - 2, PITCH_HALF_W + 2
      );
      this._player.group.position.z = clamp(
        this._player.group.position.z + moveZ,
        -PITCH_HALF_H - 2, PITCH_HALF_H + 2
      );

      this._player.lookAt(
        this._player.group.position.x + moveX * 10,
        this._player.group.position.z + moveZ * 10
      );
    }

    this._player.animate(dt, moveX !== 0 || moveZ !== 0, sprint ? 1.5 : 1.0);

    // Ball physics
    this._ball.update(dt);

    // Player-ball interaction
    const distPlayerBall = distance2D(
      this._player.group.position.x, this._player.group.position.z,
      this._ball.mesh.position.x, this._ball.mesh.position.z
    );

    // Dribble
    if (distPlayerBall < 1.5 && this._ball.isOnGround()) {
      this._playerHasBall = true;
      this._lastTouched = 'player';

      // Push ball with player
      const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this._player.group.quaternion);
      this._ball.mesh.position.x = this._player.group.position.x + dir.x * 1.2;
      this._ball.mesh.position.z = this._player.group.position.z + dir.z * 1.2;
      this._ball.velocity.x = dir.x * speed * 0.5;
      this._ball.velocity.z = dir.z * speed * 0.5;
    } else {
      this._playerHasBall = false;
    }

    // Shoot
    if (input.justPressed(' ') && distPlayerBall < 2.5 && this._shotCooldown <= 0) {
      this._shoot('player');
    }

    // Pass
    if (input.justPressed('e') && distPlayerBall < 2.5) {
      this._pass();
    }

    // Tackle
    if (input.justPressed(' ') && !this._playerHasBall && distPlayerBall > 2.5) {
      // Lunge toward ball
      const dx = this._ball.mesh.position.x - this._player.group.position.x;
      const dz = this._ball.mesh.position.z - this._player.group.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 5) {
        this._player.group.position.x += (dx / dist) * 3;
        this._player.group.position.z += (dz / dist) * 3;
        this._stats.tackles++;
      }
    }

    // Check goals
    this._checkGoals();

    // AI update
    this._updateAI(dt);

    // Goalkeeper AI
    this._updateGoalkeepers(dt);

    // Out of bounds
    if (Math.abs(this._ball.mesh.position.x) > PITCH_HALF_W + 3 ||
        Math.abs(this._ball.mesh.position.z) > PITCH_HALF_H + 3) {
      this._ball.setPosition(
        clamp(this._ball.mesh.position.x, -PITCH_HALF_W, PITCH_HALF_W),
        0.3,
        clamp(this._ball.mesh.position.z, -PITCH_HALF_H, PITCH_HALF_H)
      );
      this.infoText = 'THROW IN';
      setTimeout(() => { if (this.infoText === 'THROW IN') this.infoText = ''; }, 1500);
    }

    // Camera follow
    const cam = this.game.scene.camera;
    const targetX = this._ball.mesh.position.x * 0.5;
    const targetZ = this._ball.mesh.position.z * 0.3 + 35;
    cam.position.x += (targetX - cam.position.x) * 2 * dt;
    cam.position.z += (targetZ - cam.position.z) * 2 * dt;
    cam.lookAt(this._ball.mesh.position.x, 0, this._ball.mesh.position.z);

    input.clearFrame();
  }

  _shoot(who) {
    const shooter = who === 'player' ? this._player : null;
    if (!shooter) return;

    const goalX = PITCH_HALF_W;
    const dx = goalX - shooter.group.position.x;
    const dz = randomRange(-GOAL_HALF_W, GOAL_HALF_W) - shooter.group.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    const power = 20 + Math.random() * 10;
    this._ball.launch(
      (dx / dist) * power,
      2 + Math.random() * 3,
      (dz / dist) * power,
      8
    );
    this._shotCooldown = 0.5;
    this._stats.shots++;
    this._lastTouched = 'player';
    this.game.audio.play('kick');
  }

  _pass() {
    // Find nearest teammate
    let nearest = null;
    let nearestDist = Infinity;

    for (const tm of this._teamPlayers) {
      const d = distance2D(
        this._player.group.position.x, this._player.group.position.z,
        tm.group.position.x, tm.group.position.z
      );
      if (d < nearestDist && d > 3) {
        nearestDist = d;
        nearest = tm;
      }
    }

    if (nearest) {
      const dx = nearest.group.position.x - this._player.group.position.x;
      const dz = nearest.group.position.z - this._player.group.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const power = 12;

      this._ball.launch(
        (dx / dist) * power,
        1,
        (dz / dist) * power,
        5
      );
      this._stats.passes++;
      this._lastTouched = 'player';
      this.game.audio.play('kick');
    }
  }

  _checkGoals() {
    const bx = this._ball.mesh.position.x;
    const bz = this._ball.mesh.position.z;
    const by = this._ball.mesh.position.y;

    // Player scores (right goal)
    if (bx > PITCH_HALF_W && Math.abs(bz) < GOAL_HALF_W && by < 2.5) {
      this.score.player++;
      this._stats.goals++;
      this.game.audio.play('score');
      this.game.audio.play('crowd');
      this.infoText = 'GOAL!';

      if (this._stats.goals >= 3) {
        this.game.achievements.check('soccer_hat_trick');
      }

      this._resetTimer = 3;
      this._resetPositions();
    }

    // Opponent scores (left goal)
    if (bx < -PITCH_HALF_W && Math.abs(bz) < GOAL_HALF_W && by < 2.5) {
      this.score.opponent++;
      this.game.audio.play('score');
      this.infoText = 'OPPONENT SCORES';
      this._resetTimer = 3;
      this._resetPositions();
    }
  }

  _updateAI(dt) {
    const ballPos = this._ball.mesh.position;
    const playerPos = this._player.group.position;

    // AI team players
    for (let i = 0; i < this._aiPlayers.length; i++) {
      const ai = this._aiPlayers[i];
      const isDefending = ballPos.x < 0;

      const distToBall = distance2D(
        ai.group.position.x, ai.group.position.z,
        ballPos.x, ballPos.z
      );

      // Closest AI goes for ball
      let targetX, targetZ;
      if (i < 3 || distToBall < 10) {
        // Attack / chase ball
        const move = this._ai.getSoccerMove(
          dt, ai.group.position, ballPos,
          { x: -PITCH_HALF_W, z: 0 },
          [], isDefending
        );
        targetX = ai.group.position.x + move.moveX * ai.speed * dt;
        targetZ = ai.group.position.z + move.moveZ * ai.speed * dt;

        // AI kick
        if (distToBall < 1.5 && this._ball.isOnGround()) {
          this._lastTouched = 'opponent';

          if (move.shoot && ai.group.position.x < -15) {
            // Shoot at player goal
            const goalX = -PITCH_HALF_W;
            const dx = goalX - ai.group.position.x;
            const dz = randomRange(-GOAL_HALF_W, GOAL_HALF_W) - ai.group.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            const power = 15 + this._ai.params.speed * 10;
            this._ball.launch((dx / dist) * power, 2, (dz / dist) * power, 6);
            this.game.audio.play('kick');
          } else {
            // Dribble toward goal
            const dx = -PITCH_HALF_W - ai.group.position.x;
            const dz = randomRange(-5, 5) - ai.group.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            this._ball.velocity.x = (dx / dist) * 6;
            this._ball.velocity.z = (dz / dist) * 3;
          }
        }
      } else {
        // Hold position with slight movement
        targetX = ai._baseX + Math.sin(Date.now() * 0.001 + i) * 3;
        targetZ = ai._baseZ + Math.cos(Date.now() * 0.0012 + i) * 3;

        // Shift based on ball position
        targetX += (ballPos.x - ai._baseX) * 0.2;
        targetZ += (ballPos.z - ai._baseZ) * 0.15;
      }

      ai.group.position.x += (clamp(targetX, -PITCH_HALF_W, PITCH_HALF_W) - ai.group.position.x) * 3 * dt;
      ai.group.position.z += (clamp(targetZ, -PITCH_HALF_H, PITCH_HALF_H) - ai.group.position.z) * 3 * dt;

      const isMoving = Math.abs(targetX - ai.group.position.x) > 0.5 || Math.abs(targetZ - ai.group.position.z) > 0.5;
      ai.animate(dt, isMoving);

      if (isMoving) {
        ai.lookAt(targetX, targetZ);
      }
    }

    // Teammate AI
    for (let i = 0; i < this._teamPlayers.length; i++) {
      const tm = this._teamPlayers[i];
      let targetX = tm._baseX + Math.sin(Date.now() * 0.001 + i * 2) * 4;
      let targetZ = tm._baseZ + Math.cos(Date.now() * 0.0013 + i * 2) * 4;

      // Follow play
      targetX += (ballPos.x - tm._baseX) * 0.25;
      targetZ += (ballPos.z - tm._baseZ) * 0.15;

      tm.group.position.x += (clamp(targetX, -PITCH_HALF_W, PITCH_HALF_W) - tm.group.position.x) * 2 * dt;
      tm.group.position.z += (clamp(targetZ, -PITCH_HALF_H, PITCH_HALF_H) - tm.group.position.z) * 2 * dt;

      const isMoving = Math.abs(targetX - tm.group.position.x) > 0.5;
      tm.animate(dt, isMoving);
      if (isMoving) tm.lookAt(targetX, targetZ);
    }
  }

  _updateGoalkeepers(dt) {
    const ballPos = this._ball.mesh.position;

    // Player goalkeeper
    const gk = this._goalkeeper;
    const gkTargetZ = clamp(ballPos.z * 0.7, -GOAL_HALF_W, GOAL_HALF_W);
    gk.group.position.z += (gkTargetZ - gk.group.position.z) * 5 * dt;
    gk.group.position.x = -33;
    gk.animate(dt, Math.abs(gkTargetZ - gk.group.position.z) > 0.3);

    // Save attempt
    const distToGK = distance2D(ballPos.x, ballPos.z, gk.group.position.x, gk.group.position.z);
    if (distToGK < 2 && ballPos.y < 3 && this._lastTouched === 'opponent') {
      this._ball.velocity.x = Math.abs(this._ball.velocity.x) * 0.5 + 5;
      this._ball.velocity.z = randomRange(-5, 5);
      this._ball.velocity.y = 2;
      this._lastTouched = 'player';
      this.game.audio.play('hit');
    }

    // AI goalkeeper
    const aiGk = this._aiGoalkeeper;
    const aiGkTargetZ = clamp(ballPos.z * 0.7, -GOAL_HALF_W, GOAL_HALF_W);
    aiGk.group.position.z += (aiGkTargetZ - aiGk.group.position.z) * (3 + this._ai.params.speed * 3) * dt;
    aiGk.group.position.x = 33;
    aiGk.animate(dt, Math.abs(aiGkTargetZ - aiGk.group.position.z) > 0.3);

    const distToAIGK = distance2D(ballPos.x, ballPos.z, aiGk.group.position.x, aiGk.group.position.z);
    if (distToAIGK < 2.5 && ballPos.y < 3 && this._lastTouched === 'player') {
      if (Math.random() < this._ai.params.accuracy * 0.8) {
        this._ball.velocity.x = -Math.abs(this._ball.velocity.x) * 0.5 - 5;
        this._ball.velocity.z = randomRange(-5, 5);
        this._ball.velocity.y = 2;
        this._lastTouched = 'opponent';
        this.game.audio.play('hit');
      }
    }
  }

  _resetPositions() {
    this._ball.setPosition(0, 0.3, 0);
    this._player.setPosition(-5, 0, 0);
    this._goalkeeper.setPosition(-33, 0, 0);
    this._aiGoalkeeper.setPosition(33, 0, 0);

    for (let i = 0; i < this._aiPlayers.length; i++) {
      this._aiPlayers[i].setPosition(this._aiPlayers[i]._baseX, 0, this._aiPlayers[i]._baseZ);
    }
    for (let i = 0; i < this._teamPlayers.length; i++) {
      this._teamPlayers[i].setPosition(this._teamPlayers[i]._baseX, 0, this._teamPlayers[i]._baseZ);
    }
  }

  _endMatch() {
    this._gamePhase = 'gameover';
    const won = this.score.player > this.score.opponent;
    const draw = this.score.player === this.score.opponent;

    if (won && this.score.opponent === 0) {
      this.game.achievements.check('soccer_clean');
    }

    this.game.endGame({
      won,
      draw,
      scoreText: `${this.score.player} - ${this.score.opponent}`,
      stats: {
        'Goals': this._stats.goals,
        'Shots': this._stats.shots,
        'Passes': this._stats.passes
      }
    });
  }

  cleanup() {
    if (this._stadium) this._stadium.destroy();
    if (this._player) this._player.destroy();
    if (this._ball) this._ball.destroy();
    if (this._goalkeeper) this._goalkeeper.destroy();
    if (this._aiGoalkeeper) this._aiGoalkeeper.destroy();
    this._aiPlayers.forEach(p => p.destroy());
    this._teamPlayers.forEach(p => p.destroy());
    this._aiPlayers = [];
    this._teamPlayers = [];
  }
}
