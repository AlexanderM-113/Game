import { lerp, clamp, randomRange } from '../utils/MathUtils.js';

const DIFFICULTY_PARAMS = {
  rookie:  { reaction: 0.6, accuracy: 0.5, speed: 0.65, aggression: 0.3, errorRate: 0.25 },
  pro:     { reaction: 0.35, accuracy: 0.7, speed: 0.8, aggression: 0.5, errorRate: 0.12 },
  legend:  { reaction: 0.18, accuracy: 0.85, speed: 0.92, aggression: 0.7, errorRate: 0.05 },
  goat:    { reaction: 0.08, accuracy: 0.95, speed: 1.0, aggression: 0.85, errorRate: 0.02 }
};

export class OpponentAI {
  constructor(difficulty) {
    this.params = DIFFICULTY_PARAMS[difficulty] || DIFFICULTY_PARAMS.pro;
    this._reactionTimer = 0;
    this._targetX = 0;
    this._targetZ = 0;
    this._decision = null;
    this._decisionTimer = 0;
  }

  updateDifficulty(difficulty) {
    this.params = DIFFICULTY_PARAMS[difficulty] || DIFFICULTY_PARAMS.pro;
  }

  getFootballMove(dt, aiPos, playerPos, ballPos, hasBall, fieldBounds) {
    this._reactionTimer -= dt;

    if (this._reactionTimer <= 0) {
      this._reactionTimer = this.params.reaction;

      if (hasBall) {
        // AI has ball - try to advance toward player's end zone
        this._targetX = fieldBounds.maxX;
        this._targetZ = playerPos.z + randomRange(-5, 5) * (1 - this.params.accuracy);

        if (Math.random() < this.params.aggression * 0.3) {
          this._decision = 'throw';
        } else {
          this._decision = 'run';
        }
      } else {
        // Chase ball or player
        const chaseTarget = ballPos || playerPos;
        this._targetX = chaseTarget.x + randomRange(-2, 2) * (1 - this.params.accuracy);
        this._targetZ = chaseTarget.z + randomRange(-2, 2) * (1 - this.params.accuracy);
        this._decision = 'chase';
      }
    }

    const dx = this._targetX - aiPos.x;
    const dz = this._targetZ - aiPos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    const speed = this.params.speed;
    let moveX = 0;
    let moveZ = 0;

    if (dist > 1) {
      moveX = (dx / dist) * speed;
      moveZ = (dz / dist) * speed;
    }

    const shouldThrow = this._decision === 'throw' && Math.random() < this.params.accuracy;
    const shouldSprint = dist > 10 && Math.random() < this.params.aggression;

    return {
      moveX, moveZ,
      action: shouldThrow ? 'throw' : null,
      sprint: shouldSprint
    };
  }

  getTennisMove(dt, aiPos, ballPos, courtBounds) {
    this._reactionTimer -= dt;

    if (this._reactionTimer <= 0) {
      this._reactionTimer = this.params.reaction * 0.5;

      if (ballPos) {
        // Predict where ball will be
        this._targetX = ballPos.x;
        this._targetZ = ballPos.z;

        // Add some error
        if (Math.random() < this.params.errorRate) {
          this._targetZ += randomRange(-3, 3);
        }
      } else {
        // Return to center
        this._targetX = courtBounds.aiBaseX;
        this._targetZ = 0;
      }
    }

    const dz = this._targetZ - aiPos.z;
    const dx = this._targetX - aiPos.x;
    const speed = this.params.speed;

    let moveX = 0;
    let moveZ = 0;

    if (Math.abs(dz) > 0.3) moveZ = Math.sign(dz) * speed;
    if (Math.abs(dx) > 0.5) moveX = Math.sign(dx) * speed * 0.5;

    // Decide shot type
    let shotPower = 0.6 + this.params.aggression * 0.4;
    let shotAngle = randomRange(-0.3, 0.3) * (1 - this.params.accuracy + 0.2);

    return {
      moveX, moveZ,
      swing: true,
      shotPower,
      shotAngle,
      lob: Math.random() < 0.15 && this.params.aggression > 0.5
    };
  }

  getSoccerMove(dt, aiPos, ballPos, goalPos, teammates, isDefending) {
    this._reactionTimer -= dt;

    if (this._reactionTimer <= 0) {
      this._reactionTimer = this.params.reaction;

      if (isDefending) {
        // Move toward ball
        this._targetX = ballPos.x * 0.7;
        this._targetZ = ballPos.z + randomRange(-3, 3) * (1 - this.params.accuracy);
        this._decision = 'defend';
      } else {
        // Attack - move toward opponent goal
        this._targetX = goalPos.x * 0.8;
        this._targetZ = randomRange(-10, 10);
        this._decision = Math.random() < this.params.aggression ? 'shoot' : 'dribble';
      }
    }

    const dx = this._targetX - aiPos.x;
    const dz = this._targetZ - aiPos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    const speed = this.params.speed;
    let moveX = 0;
    let moveZ = 0;

    if (dist > 0.5) {
      moveX = (dx / dist) * speed;
      moveZ = (dz / dist) * speed;
    }

    const distToBall = Math.sqrt(
      (ballPos.x - aiPos.x) ** 2 + (ballPos.z - aiPos.z) ** 2
    );

    return {
      moveX, moveZ,
      shoot: this._decision === 'shoot' && distToBall < 3,
      pass: Math.random() < 0.2 && this.params.accuracy > 0.6,
      sprint: dist > 8 && Math.random() < this.params.aggression,
      tackle: isDefending && distToBall < 2
    };
  }

  getSwimmingStroke(dt, progress, totalDistance) {
    // Simulate stroke timing
    const baseInterval = 0.3 / this.params.speed;
    const errorChance = this.params.errorRate;

    // Speed varies over race
    const raceProgress = progress / totalDistance;
    let speedMod = 1.0;

    // Start burst
    if (raceProgress < 0.1) speedMod = 1.1;
    // Mid-race fatigue
    else if (raceProgress > 0.6 && raceProgress < 0.85) speedMod = 0.9 + this.params.speed * 0.1;
    // Final push
    else if (raceProgress > 0.85) speedMod = 0.95 + this.params.aggression * 0.15;

    const strokeSpeed = (8 + this.params.speed * 6) * speedMod;

    // Add some randomness
    if (Math.random() < errorChance) {
      return { speed: strokeSpeed * 0.7, perfect: false };
    }

    return { speed: strokeSpeed, perfect: Math.random() < this.params.accuracy };
  }
}
