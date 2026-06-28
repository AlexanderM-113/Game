import { formatTime, formatTimeMs } from '../utils/MathUtils.js';

export class HUD {
  constructor(overlay, game) {
    this.overlay = overlay;
    this.game = game;
    this.el = null;
    this._scoreEls = {};
    this._timerEl = null;
    this._infoEl = null;
    this._controlsEl = null;
    this._pauseEl = null;
    this._resultsEl = null;
    this._sportName = '';
  }

  show(sportName) {
    this.hide();
    this._sportName = sportName;

    this.el = document.createElement('div');
    this.el.className = 'game-hud';

    const controlHints = {
      football: '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Move &nbsp; <kbd>Space</kbd> Throw/Tackle &nbsp; <kbd>Shift</kbd> Sprint &nbsp; <kbd>Esc</kbd> Pause',
      swimming: '<kbd>Left</kbd><kbd>Right</kbd> Alternate Strokes &nbsp; <kbd>Space</kbd> Dive/Turn &nbsp; <kbd>Esc</kbd> Pause',
      tennis: '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Move &nbsp; <kbd>Space</kbd> Swing &nbsp; <kbd>Shift</kbd> Lob &nbsp; <kbd>Esc</kbd> Pause',
      soccer: '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Move &nbsp; <kbd>Space</kbd> Shoot/Tackle &nbsp; <kbd>Shift</kbd> Sprint &nbsp; <kbd>E</kbd> Pass &nbsp; <kbd>Esc</kbd> Pause'
    };

    this.el.innerHTML = `
      <div class="hud-top">
        <div class="hud-score">
          <div class="score-team">
            <div class="score-team-name" id="hud-team1-name">PLAYER</div>
            <div class="score-value" id="hud-score1">0</div>
          </div>
          <div class="score-divider"></div>
          <div class="score-team">
            <div class="score-team-name" id="hud-team2-name">CPU</div>
            <div class="score-value" id="hud-score2">0</div>
          </div>
        </div>
        <div class="hud-timer">
          <div class="timer-label" id="hud-timer-label">TIME</div>
          <div class="timer-value" id="hud-timer-value">0:00</div>
        </div>
        <div class="hud-info" id="hud-info" style="display:none;"></div>
      </div>
      <div class="hud-bottom">
        <div class="hud-controls">${controlHints[sportName] || ''}</div>
      </div>
    `;

    this.overlay.appendChild(this.el);

    this._scoreEls = {
      score1: this.el.querySelector('#hud-score1'),
      score2: this.el.querySelector('#hud-score2'),
      name1: this.el.querySelector('#hud-team1-name'),
      name2: this.el.querySelector('#hud-team2-name')
    };
    this._timerEl = this.el.querySelector('#hud-timer-value');
    this._timerLabelEl = this.el.querySelector('#hud-timer-label');
    this._infoEl = this.el.querySelector('#hud-info');
  }

  hide() {
    if (this.el) {
      this.el.remove();
      this.el = null;
    }
    this.hidePause();
    this.hideResults();
  }

  update(dt) {
    if (!this.el || !this.game.currentSport) return;
    const sport = this.game.currentSport;

    if (sport.score !== undefined) {
      this._scoreEls.score1.textContent = sport.score.player;
      this._scoreEls.score2.textContent = sport.score.opponent;
    }

    if (sport.timer !== undefined) {
      if (this._sportName === 'swimming') {
        this._timerEl.textContent = formatTimeMs(sport.timer);
      } else {
        this._timerEl.textContent = formatTime(sport.timer);
      }
    }

    if (sport.infoText) {
      this._infoEl.style.display = 'block';
      this._infoEl.textContent = sport.infoText;
    } else {
      this._infoEl.style.display = 'none';
    }

    if (sport.timerLabel) {
      this._timerLabelEl.textContent = sport.timerLabel;
    }

    if (sport.teamNames) {
      this._scoreEls.name1.textContent = sport.teamNames[0];
      this._scoreEls.name2.textContent = sport.teamNames[1];
    }
  }

  showPause() {
    this.hidePause();
    this._pauseEl = document.createElement('div');
    this._pauseEl.className = 'pause-overlay';
    this._pauseEl.innerHTML = `
      <div class="pause-title">PAUSED</div>
      <div class="pause-buttons">
        <button class="btn btn-primary" id="pause-resume">RESUME</button>
        <button class="btn" id="pause-restart">RESTART</button>
        <button class="btn" id="pause-quit">QUIT TO MENU</button>
      </div>
    `;
    this.overlay.appendChild(this._pauseEl);

    this._pauseEl.querySelector('#pause-resume').onclick = () => this.game.resumeGame();
    this._pauseEl.querySelector('#pause-restart').onclick = () => {
      this.hidePause();
      const sport = this.game.currentSport;
      if (sport) {
        sport.cleanup();
        sport.init();
      }
      this.game.state = 'playing';
    };
    this._pauseEl.querySelector('#pause-quit').onclick = () => {
      this.hidePause();
      this.game.showMainMenu();
    };
  }

  hidePause() {
    if (this._pauseEl) {
      this._pauseEl.remove();
      this._pauseEl = null;
    }
  }

  showResults(result) {
    this.hideResults();
    const banner = result.won ? 'VICTORY!' : (result.draw ? 'DRAW' : 'DEFEAT');
    const bannerClass = result.won ? 'win' : (result.draw ? 'draw' : 'lose');

    const stats = result.stats || {};
    const statsHTML = Object.entries(stats).map(([label, value]) => `
      <div class="stat-card">
        <div class="stat-value">${value}</div>
        <div class="stat-label">${label}</div>
      </div>
    `).join('');

    this._resultsEl = document.createElement('div');
    this._resultsEl.className = 'results-overlay';
    this._resultsEl.innerHTML = `
      <div class="results-banner ${bannerClass}">${banner}</div>
      <div class="results-score">${result.scoreText || ''}</div>
      <div class="results-stats">${statsHTML}</div>
      <div class="results-buttons">
        <button class="btn btn-primary" id="results-again">PLAY AGAIN</button>
        <button class="btn" id="results-menu">MAIN MENU</button>
      </div>
    `;
    this.overlay.appendChild(this._resultsEl);

    this._resultsEl.querySelector('#results-again').onclick = () => {
      this.hideResults();
      const sport = this.game.currentSport;
      if (sport) {
        sport.cleanup();
        sport.init();
      }
      this.game.state = 'playing';
    };
    this._resultsEl.querySelector('#results-menu').onclick = () => {
      this.hideResults();
      this.game.showMainMenu();
    };
  }

  hideResults() {
    if (this._resultsEl) {
      this._resultsEl.remove();
      this._resultsEl = null;
    }
  }
}
