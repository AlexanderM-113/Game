import * as THREE from 'three';
import { Stadium } from '../entities/Stadium.js';
import { Athlete } from '../entities/Athlete.js';
import { Ball } from '../entities/Ball.js';
import { OpponentAI } from '../ai/OpponentAI.js';
import { clamp, distance2D, randomRange, formatTime } from '../utils/MathUtils.js';

const QUARTER_TIME = 120;
const FIELD_HALF_W = 35;
const FIELD_HALF_H = 18;

export class Football {
  constructor(game, mode) {
    this.game = game;
    this.mode = mode;
    this.sportName = 'football';
    this.score = { player: 0, opponent: 0 };
    this.timer = QUARTER_TIME;
    this.timerLabel = 'Q1';
    this.infoText = '';
    this.teamNames = ['HOME', 'AWAY'];

    this._stadium = null;
    this._player = null;
    this._ball = null;
    this._ai = null;
    this._aiPlayers = [];
    this._teamPlayers = [];
    this._quarter = 1;
    this._possession = 'player';
    this._ballCarrier = null;
    this._throwPower = 0;
    this._isThrowing = false;
    this._scrimmageX = 0;
    this._down = 1;
    this._yardsToGo = 10;
    this._playActive = false;
    this._resetTimer = 0;
    this._countdownTimer = 3;
    this._gamePhase = 'countdown';
    this._dayTime = 0.45;
    this._weatherType = 'clear';
    this._stats = { touchdowns: 0, yards: 0, tackles: 0, passes: 0 };
  }

  init() {
    const scene = this.game.scene;
    scene.clearScene();

    this._stadium = new Stadium(scene.scene, 'football');
    this._stadium.buildFootballField();

    // Weather
    const weathers = ['clear', 'clear', 'clear', 'rain', 'snow'];
    this._weatherType = weathers[Math.floor(Math.random() * weathers.length)];
    scene.setWeather(this._weatherType);

    this._dayTime = 0.3 + Math.random() * 0.4;
    scene.setDayNight(this._dayTime);

    // Camera
    scene.camera.position.set(0, 25, 35);
    scene.camera.lookAt(0, 0, 0);

    // Player
    const pc = this.game.playerCustomization;
    this._player = new Athlete(scene.scene, {
      color: new THREE.Color(pc.primaryColor).getHex(),
      secondaryColor: new THREE.Color(pc.secondaryColor).getHex(),
      name: pc.name,
      speed: 10
    });
    this._player.setPosition(-10, 0, 0);

    // Team players
    this._teamPlayers = [];
    for (let i = 0; i < 4; i++) {
      const teammate = new Athlete(scene.scene, {
        color: new THREE.Color(pc.primaryColor).getHex(),
        secondaryColor: new THREE.Color(pc.secondaryColor).getHex(),
        isAI: true,
        speed: 8
      });
      teammate.setPosition(-15 + i * 2, 0, -6 + i * 4);
      this._teamPlayers.push(teammate);
    }

    // AI players
    this._aiPlayers = [];
    this._ai = new OpponentAI(this.game.difficulty);
    for (let i = 0; i < 5; i++) {
      const aiPlayer = new Athlete(scene.scene, {
        color: 0xcc2222,
        secondaryColor: 0xffffff,
        isAI: true,
        speed: 7 + this._ai.params.speed * 3
      });
      aiPlayer.setPosition(10 + i * 2, 0, -8 + i * 4);
      this._aiPlayers.push(aiPlayer);
    }

    // Ball
    this._ball = new Ball(scene.scene, {
      type: 'football',
      radius: 0.25,
      gravity: -12,
      bounciness: 0.4,
      groundY: 0.25
    });
    this._ball.setPosition(-10, 1.5, 0);

    this._possession = 'player';
    this._ballCarrier = this._player;
    this._scrimmageX = 0;
    this._down = 1;
    this._yardsToGo = 10;
    this._gamePhase = 'countdown';
    this._countdownTimer = 3;
    this._playActive = false;
    this.score = { player: 0, opponent: 0 };
    this._quarter = 1;
    this.timer = QUARTER_TIME;
    this.timerLabel = 'Q1';
    this._stats = { touchdowns: 0, yards: 0, tackles: 0, passes: 0 };

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
      this.infoText = `Ready... ${Math.ceil(this._countdownTimer)}`;
      if (this._countdownTimer <= 0) {
        this._gamePhase = 'play';
        this._playActive = true;
        this.infoText = '';
        this.game.audio.play('whistle');
      }
      input.clearFrame();
      return;
    }

    if (this._gamePhase === 'gameover') return;

    // Timer
    this.timer -= dt;
    if (this.timer <= 0) {
      this._quarter++;
      if (this._quarter > 4) {
        this._endGame();
        return;
      }
      this.timer = QUARTER_TIME;
      this.timerLabel = `Q${this._quarter}`;
      this.game.audio.play('whistle');
    }

    // Day/night progression
    this._dayTime += dt * 0.005;
    if (this._dayTime > 1) this._dayTime = 0;
    this.game.scene.setDayNight(this._dayTime);

    this._updateInfo();

    if (this._resetTimer > 0) {
      this._resetTimer -= dt;
      if (this._resetTimer <= 0) {
        this._setupNewPlay();
      }
      input.clearFrame();
      return;
    }

    // Player movement
    const speed = this._player.speed * (input.isAction2() ? 1.4 : 1.0);
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

      const newX = clamp(this._player.group.position.x + moveX, -FIELD_HALF_W, FIELD_HALF_W);
      const newZ = clamp(this._player.group.position.z + moveZ, -FIELD_HALF_H, FIELD_HALF_H);
      this._player.group.position.x = newX;
      this._player.group.position.z = newZ;

      if (moveX !== 0 || moveZ !== 0) {
        this._player.lookAt(
          this._player.group.position.x + moveX * 10,
          this._player.group.position.z + moveZ * 10
        );
      }
    }

    this._player.animate(dt, moveX !== 0 || moveZ !== 0, input.isAction2() ? 1.5 : 1.0);

    // Ball carrier logic
    if (this._ballCarrier === this._player) {
      this._ball.mesh.position.copy(this._player.group.position);
      this._ball.mesh.position.y = 2;
      this._ball.mesh.position.x += 0.3;
      this._ball.velocity.set(0, 0, 0);

      // Throw
      if (input.justPressed(' ') && this._playActive) {
        this._isThrowing = true;
        this._throwPower = 0;
      }
      if (this._isThrowing && input.isDown(' ')) {
        this._throwPower = Math.min(this._throwPower + dt * 2, 1);
      }
      if (this._isThrowing && !input.isDown(' ')) {
        this._throwBall();
        this._isThrowing = false;
      }

      // Check touchdown
      if (this._player.group.position.x > FIELD_HALF_W - 5) {
        this._scoreTouchdown('player');
      }

      // Track yards
      this._stats.yards = Math.max(this._stats.yards,
        Math.floor(this._player.group.position.x - this._scrimmageX));
    }

    // Ball physics
    if (!this._ballCarrier) {
      this._ball.update(dt);

      // Check if player catches
      const distToPlayer = distance2D(
        this._ball.mesh.position.x, this._ball.mesh.position.z,
        this._player.group.position.x, this._player.group.position.z
      );
      if (distToPlayer < 2 && this._ball.mesh.position.y < 3) {
        this._ballCarrier = this._player;
        this._possession = 'player';
        this.game.audio.play('hit');
      }

      // Ball out of bounds or on ground too long
      if (this._ball.isOnGround() && this._ball.velocity.length() < 0.5) {
        this._resetTimer = 1.5;
        this.infoText = 'INCOMPLETE';
      }
    }

    // AI Players
    this._updateAI(dt);

    // Camera follow
    const cam = this.game.scene.camera;
    const targetCamX = this._player.group.position.x * 0.3;
    cam.position.x += (targetCamX - cam.position.x) * 2 * dt;
    cam.lookAt(this._player.group.position.x, 0, 0);

    input.clearFrame();
  }

  _throwBall() {
    const power = 15 + this._throwPower * 25;
    const dir = new THREE.Vector3(0, 0, -1);
    dir.applyQuaternion(this._player.group.quaternion);

    this._ball.launch(
      dir.x * power,
      5 + this._throwPower * 8,
      dir.z * power,
      8
    );
    this._ballCarrier = null;
    this._stats.passes++;
    this.game.audio.play('kick');
  }

  _updateAI(dt) {
    const ballPos = this._ball.mesh.position;
    const playerPos = this._player.group.position;

    for (let i = 0; i < this._aiPlayers.length; i++) {
      const ai = this._aiPlayers[i];
      const hasBall = this._ballCarrier === ai;

      const move = this._ai.getFootballMove(
        dt, ai.group.position, playerPos, ballPos, hasBall,
        { minX: -FIELD_HALF_W, maxX: FIELD_HALF_W }
      );

      const spd = ai.speed * (move.sprint ? 1.3 : 1.0) * dt;
      ai.group.position.x = clamp(ai.group.position.x + move.moveX * spd, -FIELD_HALF_W, FIELD_HALF_W);
      ai.group.position.z = clamp(ai.group.position.z + move.moveZ * spd, -FIELD_HALF_H, FIELD_HALF_H);

      if (move.moveX !== 0 || move.moveZ !== 0) {
        ai.lookAt(
          ai.group.position.x + move.moveX,
          ai.group.position.z + move.moveZ
        );
      }
      ai.animate(dt, Math.abs(move.moveX) > 0.1 || Math.abs(move.moveZ) > 0.1, move.sprint ? 1.5 : 1.0);

      // AI tackle player
      if (this._ballCarrier === this._player && this._playActive) {
        const distToPlayer = distance2D(
          ai.group.position.x, ai.group.position.z,
          playerPos.x, playerPos.z
        );
        if (distToPlayer < 1.5) {
          this.game.audio.play('hit');
          this._stats.tackles++;
          this._playActive = false;
          this._ballCarrier = null;
          this._ball.setPosition(playerPos.x, 1, playerPos.z);
          this._down++;
          if (this._down > 4) {
            this._turnover();
          } else {
            this._resetTimer = 2;
            this.infoText = 'TACKLED!';
          }
          break;
        }
      }

      // AI pick up loose ball
      if (!this._ballCarrier && this._ball.isOnGround()) {
        const distToBall = distance2D(
          ai.group.position.x, ai.group.position.z,
          ballPos.x, ballPos.z
        );
        if (distToBall < 1.5) {
          this._ballCarrier = ai;
          this._possession = 'opponent';
          this.game.audio.play('hit');
        }
      }

      // AI score
      if (hasBall && ai.group.position.x < -FIELD_HALF_W + 5) {
        this._scoreTouchdown('opponent');
      }

      // AI carrier ball follow
      if (hasBall) {
        this._ball.mesh.position.copy(ai.group.position);
        this._ball.mesh.position.y = 2;
        this._ball.velocity.set(0, 0, 0);
      }
    }

    // Update teammate AI
    for (let i = 0; i < this._teamPlayers.length; i++) {
      const tm = this._teamPlayers[i];
      const targetX = this._player.group.position.x + 5 + i * 3;
      const targetZ = -6 + i * 4 + Math.sin(Date.now() * 0.001 + i) * 3;

      tm.group.position.x += (clamp(targetX, -FIELD_HALF_W, FIELD_HALF_W) - tm.group.position.x) * 2 * dt;
      tm.group.position.z += (clamp(targetZ, -FIELD_HALF_H, FIELD_HALF_H) - tm.group.position.z) * 2 * dt;
      tm.animate(dt, true, 1.0);
    }
  }

  _scoreTouchdown(team) {
    if (team === 'player') {
      this.score.player += 7;
      this._stats.touchdowns++;
      this.game.achievements.check('football_td');
    } else {
      this.score.opponent += 7;
    }
    this.game.audio.play('score');
    this.game.audio.play('crowd');
    this.infoText = team === 'player' ? 'TOUCHDOWN!' : 'OPPONENT SCORES!';
    this._resetTimer = 3;
    this._playActive = false;
  }

  _turnover() {
    this._possession = this._possession === 'player' ? 'opponent' : 'player';
    this.infoText = 'TURNOVER ON DOWNS';
    this._down = 1;
    this._yardsToGo = 10;
    this._resetTimer = 2;
  }

  _setupNewPlay() {
    this._scrimmageX = this._player.group.position.x;
    this._player.setPosition(this._scrimmageX - 5, 0, 0);
    this._ball.setPosition(this._scrimmageX - 5, 1.5, 0);
    this._ballCarrier = this._player;
    this._possession = 'player';
    this._playActive = true;
    this.infoText = '';

    for (let i = 0; i < this._aiPlayers.length; i++) {
      this._aiPlayers[i].setPosition(
        this._scrimmageX + 5 + i * 2, 0, -8 + i * 4
      );
    }
    for (let i = 0; i < this._teamPlayers.length; i++) {
      this._teamPlayers[i].setPosition(
        this._scrimmageX - 3 + i * 2, 0, -6 + i * 4
      );
    }
  }

  _updateInfo() {
    if (!this.infoText || this._resetTimer <= 0) {
      this.infoText = `${this._down}${this._getOrdinal(this._down)} & ${this._yardsToGo}`;
    }
  }

  _getOrdinal(n) {
    if (n === 1) return 'st';
    if (n === 2) return 'nd';
    if (n === 3) return 'rd';
    return 'th';
  }

  _endGame() {
    this._gamePhase = 'gameover';
    const won = this.score.player > this.score.opponent;
    const draw = this.score.player === this.score.opponent;

    if (won && this.score.opponent === 0) {
      this.game.achievements.check('football_shutout');
    }
    if (won && this.score.opponent === 0) {
      this.game.achievements.check('perfect_game');
    }

    this.game.endGame({
      won,
      draw,
      scoreText: `${this.score.player} - ${this.score.opponent}`,
      stats: {
        'Touchdowns': this._stats.touchdowns,
        'Yards': this._stats.yards,
        'Passes': this._stats.passes
      }
    });
  }

  cleanup() {
    if (this._stadium) this._stadium.destroy();
    if (this._player) this._player.destroy();
    if (this._ball) this._ball.destroy();
    this._aiPlayers.forEach(p => p.destroy());
    this._teamPlayers.forEach(p => p.destroy());
    this._aiPlayers = [];
    this._teamPlayers = [];
  }
}
