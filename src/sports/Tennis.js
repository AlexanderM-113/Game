import * as THREE from 'three';
import { Stadium } from '../entities/Stadium.js';
import { Athlete } from '../entities/Athlete.js';
import { Ball } from '../entities/Ball.js';
import { OpponentAI } from '../ai/OpponentAI.js';
import { clamp, distance2D, randomRange } from '../utils/MathUtils.js';

const COURT_HALF_L = 12;
const COURT_HALF_W = 5.5;

export class Tennis {
  constructor(game, mode) {
    this.game = game;
    this.mode = mode;
    this.sportName = 'tennis';

    this.score = { player: '0', opponent: '0' };
    this.timer = 0;
    this.timerLabel = 'SET 1';
    this.infoText = '';
    this.teamNames = ['YOU', 'CPU'];

    this._stadium = null;
    this._player = null;
    this._opponent = null;
    this._ball = null;
    this._ai = null;

    this._playerPoints = 0;
    this._oppPoints = 0;
    this._playerGames = 0;
    this._oppGames = 0;
    this._playerSets = 0;
    this._oppSets = 0;
    this._serving = 'player';
    this._rallyActive = false;
    this._ballInPlay = false;
    this._lastHitBy = null;
    this._bounceCount = 0;
    this._servePhase = 'ready'; // ready, toss, hit
    this._servePower = 0;
    this._swingCooldown = 0;
    this._resetTimer = 0;
    this._countdownTimer = 3;
    this._gamePhase = 'countdown';
    this._dayTime = 0.5;
    this._aces = 0;
    this._stats = { aces: 0, winners: 0, rallies: 0, longestRally: 0 };
    this._currentRallyHits = 0;
    this._ballShadow = null;
  }

  init() {
    const scene = this.game.scene;
    scene.clearScene();

    this._stadium = new Stadium(scene.scene, 'tennis');
    this._stadium.buildTennisCourt();

    this._dayTime = 0.35 + Math.random() * 0.3;
    scene.setDayNight(this._dayTime);

    const weathers = ['clear', 'clear', 'clear', 'clear'];
    scene.setWeather(weathers[Math.floor(Math.random() * weathers.length)]);

    // Camera
    scene.camera.position.set(-18, 12, 0);
    scene.camera.lookAt(0, 0, 0);

    // Player
    const pc = this.game.playerCustomization;
    this._player = new Athlete(scene.scene, {
      color: new THREE.Color(pc.primaryColor).getHex(),
      secondaryColor: new THREE.Color(pc.secondaryColor).getHex(),
      name: pc.name,
      speed: 9
    });
    this._player.setPosition(-9, 0, 0);

    // Opponent
    this._opponent = new Athlete(scene.scene, {
      color: 0xcc2222,
      secondaryColor: 0xffffff,
      isAI: true,
      speed: 8
    });
    this._opponent.setPosition(9, 0, 0);

    this._ai = new OpponentAI(this.game.difficulty);

    // Ball
    this._ball = new Ball(scene.scene, {
      type: 'tennis',
      radius: 0.12,
      gravity: -12,
      bounciness: 0.65,
      groundY: 0.12
    });
    this._ball.setPosition(-9, 1, 0);
    this._ball.active = false;

    // Ball shadow
    const shadowGeo = new THREE.CircleGeometry(0.15, 8);
    const shadowMat = new THREE.MeshStandardMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.3
    });
    this._ballShadow = new THREE.Mesh(shadowGeo, shadowMat);
    this._ballShadow.rotation.x = -Math.PI / 2;
    this._ballShadow.position.y = 0.02;
    scene.scene.add(this._ballShadow);

    // Reset state
    this._playerPoints = 0;
    this._oppPoints = 0;
    this._playerGames = 0;
    this._oppGames = 0;
    this._playerSets = 0;
    this._oppSets = 0;
    this._serving = 'player';
    this._rallyActive = false;
    this._ballInPlay = false;
    this._lastHitBy = null;
    this._bounceCount = 0;
    this._swingCooldown = 0;
    this._resetTimer = 0;
    this._countdownTimer = 3;
    this._gamePhase = 'countdown';
    this._currentRallyHits = 0;
    this._stats = { aces: 0, winners: 0, rallies: 0, longestRally: 0 };
    this.timer = 0;

    this._updateScoreDisplay();
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
      this.infoText = `Get Ready... ${Math.ceil(this._countdownTimer)}`;
      if (this._countdownTimer <= 0) {
        this._gamePhase = 'play';
        this.infoText = '';
        this._setupServe();
      }
      input.clearFrame();
      return;
    }

    if (this._gamePhase === 'gameover') {
      input.clearFrame();
      return;
    }

    this.timer += dt;
    this._swingCooldown -= dt;

    // Day/night
    this._dayTime += dt * 0.003;
    if (this._dayTime > 1) this._dayTime = 0;
    this.game.scene.setDayNight(this._dayTime);

    // Reset timer between points
    if (this._resetTimer > 0) {
      this._resetTimer -= dt;
      if (this._resetTimer <= 0) {
        this._setupServe();
      }
      input.clearFrame();
      return;
    }

    // Player movement
    const speed = this._player.speed;
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
        -COURT_HALF_L, -0.5
      );
      this._player.group.position.z = clamp(
        this._player.group.position.z + moveZ,
        -COURT_HALF_W - 1, COURT_HALF_W + 1
      );
    }

    this._player.animate(dt, moveX !== 0 || moveZ !== 0);

    // Serve
    if (this._servePhase === 'ready' && this._serving === 'player') {
      this.infoText = 'Press SPACE to serve';
      this._ball.mesh.position.set(
        this._player.group.position.x + 0.5,
        1.5,
        this._player.group.position.z
      );
      if (input.justPressed(' ')) {
        this._servePhase = 'toss';
        this._servePower = 0;
        this.game.audio.play('bounce');
      }
    } else if (this._servePhase === 'toss') {
      this._servePower += dt * 2;
      this._ball.mesh.position.y = 1.5 + this._servePower * 2;
      this.infoText = 'Press SPACE to hit!';

      if (input.justPressed(' ') || this._servePower > 1) {
        this._servePhase = 'play';
        const power = clamp(this._servePower, 0.3, 1.0);
        const angle = randomRange(-0.2, 0.2);
        this._ball.launch(
          15 + power * 15,
          3 + power * 4,
          angle * 8,
          10
        );
        this._ball.active = true;
        this._ballInPlay = true;
        this._lastHitBy = 'player';
        this._bounceCount = 0;
        this._rallyActive = true;
        this._currentRallyHits = 1;
        this.infoText = '';
        this.game.audio.play('serve');
      }
    }

    // AI serve
    if (this._servePhase === 'ready' && this._serving === 'opponent') {
      this._ball.mesh.position.set(
        this._opponent.group.position.x - 0.5,
        1.5,
        this._opponent.group.position.z
      );
      this.infoText = 'Opponent serving...';

      // Auto-serve after short delay
      this._servePower += dt;
      if (this._servePower > 1) {
        this._servePhase = 'play';
        const power = 0.6 + this._ai.params.accuracy * 0.4;
        const angle = randomRange(-0.3, 0.3) * (1 - this._ai.params.accuracy);
        this._ball.launch(
          -(12 + power * 12),
          3 + power * 3,
          angle * 6,
          8
        );
        this._ball.active = true;
        this._ballInPlay = true;
        this._lastHitBy = 'opponent';
        this._bounceCount = 0;
        this._rallyActive = true;
        this._currentRallyHits = 1;
        this.infoText = '';
        this.game.audio.play('serve');
      }
    }

    // Ball physics
    if (this._ball.active) {
      const prevY = this._ball.mesh.position.y;
      this._ball.update(dt);

      // Detect bounce
      if (prevY > this._ball.groundY + 0.2 && this._ball.mesh.position.y <= this._ball.groundY + 0.2) {
        this._bounceCount++;
        this.game.audio.play('bounce');

        // Check if out of bounds
        const bx = this._ball.mesh.position.x;
        const bz = this._ball.mesh.position.z;

        if (Math.abs(bz) > COURT_HALF_W || Math.abs(bx) > COURT_HALF_L) {
          this._pointScored(this._lastHitBy === 'player' ? 'opponent' : 'player', 'OUT!');
          return;
        }

        // Double bounce = point for last hitter
        if (this._bounceCount >= 2) {
          this._pointScored(this._lastHitBy, this._lastHitBy === 'player' ? 'WINNER!' : 'Double bounce');
          if (this._lastHitBy === 'player') this._stats.winners++;
          return;
        }
      }

      // Net check
      if (Math.abs(this._ball.mesh.position.x) < 0.3 &&
          this._ball.mesh.position.y < 1.0 &&
          this._ballInPlay) {
        this._pointScored(this._lastHitBy === 'player' ? 'opponent' : 'player', 'NET!');
        return;
      }

      // Ball shadow
      this._ballShadow.position.x = this._ball.mesh.position.x;
      this._ballShadow.position.z = this._ball.mesh.position.z;
      this._ballShadow.material.opacity = clamp(0.4 - this._ball.mesh.position.y * 0.03, 0, 0.4);

      // Player hit
      if (this._ballInPlay && this._lastHitBy !== 'player' && this._swingCooldown <= 0) {
        const distToPlayer = distance2D(
          this._ball.mesh.position.x, this._ball.mesh.position.z,
          this._player.group.position.x, this._player.group.position.z
        );

        if (distToPlayer < 2 && (input.justPressed(' ') || input.isDown(' '))) {
          this._playerHit(input.isAction2());
        }
      }

      // AI hit
      if (this._ballInPlay && this._lastHitBy !== 'opponent') {
        const distToOpp = distance2D(
          this._ball.mesh.position.x, this._ball.mesh.position.z,
          this._opponent.group.position.x, this._opponent.group.position.z
        );

        if (distToOpp < 2.2 && this._ball.mesh.position.x > 0) {
          this._aiHit();
        }
      }

      // Ball out of play
      if (this._ball.mesh.position.y < -5 ||
          Math.abs(this._ball.mesh.position.x) > 25 ||
          Math.abs(this._ball.mesh.position.z) > 15) {
        if (this._ballInPlay) {
          this._pointScored(this._lastHitBy === 'player' ? 'opponent' : 'player', 'Out of bounds');
        }
      }
    }

    // AI movement
    this._updateAI(dt);

    // Camera
    const cam = this.game.scene.camera;
    cam.position.set(-18, 12, 0);
    cam.lookAt(0, 1, 0);

    input.clearFrame();
  }

  _playerHit(isLob) {
    const power = isLob ? 8 : 18;
    const upward = isLob ? 8 : 3;
    const angle = randomRange(-0.3, 0.3);

    this._ball.launch(power, upward, angle * 8, 12);
    this._lastHitBy = 'player';
    this._bounceCount = 0;
    this._swingCooldown = 0.3;
    this._currentRallyHits++;
    this.game.audio.play('hit');
  }

  _aiHit() {
    const move = this._ai.getTennisMove(
      0.016,
      this._opponent.group.position,
      this._ball.mesh.position,
      { aiBaseX: 9 }
    );

    const power = 10 + move.shotPower * 10;
    const upward = move.lob ? 7 : 2.5;

    this._ball.launch(
      -power,
      upward,
      move.shotAngle * 10,
      10
    );
    this._lastHitBy = 'opponent';
    this._bounceCount = 0;
    this._currentRallyHits++;
    this.game.audio.play('hit');
  }

  _updateAI(dt) {
    const ballPos = this._ball.active ? this._ball.mesh.position : null;
    const move = this._ai.getTennisMove(
      dt,
      this._opponent.group.position,
      ballPos,
      { aiBaseX: 9 }
    );

    const speed = this._opponent.speed * dt;
    if (ballPos && this._ballInPlay && this._lastHitBy !== 'opponent') {
      // Move toward ball
      const targetZ = ballPos.z;
      const dz = targetZ - this._opponent.group.position.z;
      this._opponent.group.position.z += Math.sign(dz) * Math.min(Math.abs(dz), speed * 1.2);
      this._opponent.group.position.z = clamp(this._opponent.group.position.z, -COURT_HALF_W - 1, COURT_HALF_W + 1);

      const targetX = clamp(ballPos.x * 0.8, 2, COURT_HALF_L);
      const dx = targetX - this._opponent.group.position.x;
      this._opponent.group.position.x += Math.sign(dx) * Math.min(Math.abs(dx), speed * 0.8);
    } else {
      // Return to base
      const dz = 0 - this._opponent.group.position.z;
      this._opponent.group.position.z += Math.sign(dz) * Math.min(Math.abs(dz), speed * 0.5);
      const dx = 9 - this._opponent.group.position.x;
      this._opponent.group.position.x += Math.sign(dx) * Math.min(Math.abs(dx), speed * 0.5);
    }

    this._opponent.animate(dt, Math.abs(move.moveZ) > 0.1 || Math.abs(move.moveX) > 0.1);
  }

  _pointScored(winner, reason) {
    this._ballInPlay = false;
    this._ball.active = false;
    this._rallyActive = false;

    this._stats.longestRally = Math.max(this._stats.longestRally, this._currentRallyHits);
    this._stats.rallies++;

    if (winner === 'player') {
      this._playerPoints++;
      if (this._currentRallyHits <= 1 && this._serving === 'player') {
        this._stats.aces++;
        this.game.achievements.check('tennis_ace');
      }
    } else {
      this._oppPoints++;
    }

    this.infoText = reason || (winner === 'player' ? 'Your point!' : 'Opponent point!');
    this.game.audio.play(winner === 'player' ? 'score' : 'bounce');

    // Check game win
    this._checkGameWin();
    this._updateScoreDisplay();
    this._resetTimer = 2;
  }

  _checkGameWin() {
    const pp = this._playerPoints;
    const op = this._oppPoints;

    // Tennis scoring: need 4+ points and 2 ahead
    if ((pp >= 4 || op >= 4) && Math.abs(pp - op) >= 2) {
      if (pp > op) {
        this._playerGames++;
        if (op === 0) this.game.achievements.check('tennis_love');
      } else {
        this._oppGames++;
      }
      this._playerPoints = 0;
      this._oppPoints = 0;
      this._serving = this._serving === 'player' ? 'opponent' : 'player';

      // Check set win
      if (this._playerGames >= 6 && this._playerGames - this._oppGames >= 2) {
        this._playerSets++;
        this._playerGames = 0;
        this._oppGames = 0;
      } else if (this._oppGames >= 6 && this._oppGames - this._playerGames >= 2) {
        this._oppSets++;
        this._playerGames = 0;
        this._oppGames = 0;
      }

      // Check match win (best of 3 sets)
      if (this._playerSets >= 2 || this._oppSets >= 2) {
        this._endMatch();
      }
    }
  }

  _updateScoreDisplay() {
    const tennisPoints = ['0', '15', '30', '40', 'AD'];
    const pp = Math.min(this._playerPoints, 4);
    const op = Math.min(this._oppPoints, 4);

    this.score.player = `${tennisPoints[pp]} (${this._playerGames})`;
    this.score.opponent = `${tennisPoints[op]} (${this._oppGames})`;
    this.timerLabel = `SET ${this._playerSets + this._oppSets + 1}`;
    this.teamNames = [
      `${this.game.playerCustomization.name} [${this._playerSets}]`,
      `CPU [${this._oppSets}]`
    ];
  }

  _setupServe() {
    this._ball.active = false;
    this._ballInPlay = false;
    this._bounceCount = 0;
    this._servePhase = 'ready';
    this._servePower = 0;
    this._currentRallyHits = 0;

    if (this._serving === 'player') {
      this._player.setPosition(-9, 0, randomRange(-3, 3));
      this._ball.setPosition(-8.5, 1.5, this._player.group.position.z);
    } else {
      this._opponent.setPosition(9, 0, randomRange(-3, 3));
      this._ball.setPosition(8.5, 1.5, this._opponent.group.position.z);
    }
  }

  _endMatch() {
    this._gamePhase = 'gameover';
    const won = this._playerSets > this._oppSets;

    this.game.endGame({
      won,
      draw: false,
      scoreText: `Sets: ${this._playerSets} - ${this._oppSets}`,
      stats: {
        'Aces': this._stats.aces,
        'Winners': this._stats.winners,
        'Longest Rally': this._stats.longestRally
      }
    });
  }

  cleanup() {
    if (this._stadium) this._stadium.destroy();
    if (this._player) this._player.destroy();
    if (this._opponent) this._opponent.destroy();
    if (this._ball) this._ball.destroy();
    if (this._ballShadow) {
      this.game.scene.scene.remove(this._ballShadow);
      this._ballShadow.geometry.dispose();
      this._ballShadow.material.dispose();
    }
  }
}
