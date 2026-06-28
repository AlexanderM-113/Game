export class MenuSystem {
  constructor(overlay, game) {
    this.overlay = overlay;
    this.game = game;
    this._el = null;
  }

  hide() {
    if (this._el) {
      this._el.remove();
      this._el = null;
    }
  }

  _mount(html) {
    this.hide();
    this._el = document.createElement('div');
    this._el.innerHTML = html;
    this.overlay.appendChild(this._el);
    return this._el;
  }

  showMain() {
    const el = this._mount(`
      <div class="main-menu">
        <h1 class="menu-title">MULTISPORT <span style="color:var(--primary)">3D</span></h1>
        <p class="menu-subtitle">Choose Your Sport</p>
        <div class="sport-grid">
          <div class="sport-card" data-sport="football">
            <div class="sport-icon">🏈</div>
            <div class="sport-name">Football</div>
            <div class="sport-desc">American Football</div>
          </div>
          <div class="sport-card" data-sport="swimming">
            <div class="sport-icon">🏊</div>
            <div class="sport-name">Swimming</div>
            <div class="sport-desc">Pool Racing</div>
          </div>
          <div class="sport-card" data-sport="tennis">
            <div class="sport-icon">🎾</div>
            <div class="sport-name">Tennis</div>
            <div class="sport-desc">Court Battle</div>
          </div>
          <div class="sport-card" data-sport="soccer">
            <div class="sport-icon">⚽</div>
            <div class="sport-name">Soccer</div>
            <div class="sport-desc">The Beautiful Game</div>
          </div>
        </div>
        <div class="menu-buttons">
          <button class="btn" id="menu-settings">SETTINGS</button>
          <button class="btn" id="menu-achievements">ACHIEVEMENTS</button>
          <button class="btn" id="menu-customize">CUSTOMIZE</button>
        </div>
      </div>
    `);

    el.querySelectorAll('.sport-card').forEach(card => {
      card.addEventListener('click', () => {
        this.game.audio.play('click');
        this.game.selectSport(card.dataset.sport);
      });
    });

    el.querySelector('#menu-settings').onclick = () => {
      this.game.audio.play('click');
      this.game.showSettings();
    };
    el.querySelector('#menu-achievements').onclick = () => {
      this.game.audio.play('click');
      this.game.showAchievements();
    };
    el.querySelector('#menu-customize').onclick = () => {
      this.game.audio.play('click');
      this.game.showCustomize();
    };
  }

  showSportMenu(sportName) {
    const icons = { football: '🏈', swimming: '🏊', tennis: '🎾', soccer: '⚽' };
    const titles = { football: 'FOOTBALL', swimming: 'SWIMMING', tennis: 'TENNIS', soccer: 'SOCCER' };

    const el = this._mount(`
      <div class="sport-menu">
        <div class="sport-menu-header">
          <span class="sport-menu-icon">${icons[sportName]}</span>
          <h2 class="sport-menu-title">${titles[sportName]}</h2>
        </div>
        <div class="mode-grid">
          <div class="mode-card" data-mode="quick">
            <div class="mode-card-icon">⚡</div>
            <div class="mode-card-title">Quick Match</div>
            <div class="mode-card-desc">Jump right in</div>
          </div>
          <div class="mode-card" data-mode="career">
            <div class="mode-card-icon">🏆</div>
            <div class="mode-card-title">Career Mode</div>
            <div class="mode-card-desc">Tournament bracket</div>
          </div>
          <div class="mode-card" data-mode="practice">
            <div class="mode-card-icon">🎯</div>
            <div class="mode-card-title">Practice</div>
            <div class="mode-card-desc">No pressure</div>
          </div>
          <div class="mode-card" data-mode="tournament">
            <div class="mode-card-icon">🏅</div>
            <div class="mode-card-title">Tournament</div>
            <div class="mode-card-desc">Full season</div>
          </div>
        </div>
        <button class="btn" id="sport-back">BACK</button>
      </div>
    `);

    el.querySelectorAll('.mode-card').forEach(card => {
      card.addEventListener('click', () => {
        this.game.audio.play('click');
        if (card.dataset.mode === 'career' || card.dataset.mode === 'tournament') {
          this.game.achievements.check('career_start');
        }
        this._showDifficulty(sportName, card.dataset.mode);
      });
    });

    el.querySelector('#sport-back').onclick = () => {
      this.game.audio.play('click');
      this.showMain();
    };
  }

  _showDifficulty(sportName, mode) {
    const el = this._mount(`
      <div class="difficulty-panel">
        <h2 class="difficulty-title">SELECT DIFFICULTY</h2>
        <div class="difficulty-options">
          <div class="diff-btn ${this.game.difficulty === 'rookie' ? 'active' : ''}" data-diff="rookie">
            <div class="diff-label">ROOKIE</div>
            <div class="diff-desc">Easy AI, forgiving</div>
          </div>
          <div class="diff-btn ${this.game.difficulty === 'pro' ? 'active' : ''}" data-diff="pro">
            <div class="diff-label">PRO</div>
            <div class="diff-desc">Balanced challenge</div>
          </div>
          <div class="diff-btn ${this.game.difficulty === 'legend' ? 'active' : ''}" data-diff="legend">
            <div class="diff-label">LEGEND</div>
            <div class="diff-desc">Tough opponents</div>
          </div>
          <div class="diff-btn ${this.game.difficulty === 'goat' ? 'active' : ''}" data-diff="goat">
            <div class="diff-label">G.O.A.T.</div>
            <div class="diff-desc">Ultimate challenge</div>
          </div>
        </div>
        <div style="display:flex; gap:1rem;">
          <button class="btn btn-primary" id="diff-start">START GAME</button>
          <button class="btn" id="diff-back">BACK</button>
        </div>
      </div>
    `);

    el.querySelectorAll('.diff-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        el.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.game.difficulty = btn.dataset.diff;
        this.game.audio.play('click');
      });
    });

    el.querySelector('#diff-start').onclick = () => {
      this.game.audio.play('click');
      this.game.startGame(sportName, mode);
    };
    el.querySelector('#diff-back').onclick = () => {
      this.game.audio.play('click');
      this.showSportMenu(sportName);
    };
  }

  showSettings() {
    const s = this.game.settings;
    const el = this._mount(`
      <div class="settings-panel">
        <h2 class="settings-title">SETTINGS</h2>
        <div class="settings-grid">
          <div class="setting-row">
            <span class="setting-label">Master Volume</span>
            <div class="setting-control"><input type="range" min="0" max="1" step="0.05" value="${s.masterVolume}" data-key="masterVolume"></div>
          </div>
          <div class="setting-row">
            <span class="setting-label">SFX Volume</span>
            <div class="setting-control"><input type="range" min="0" max="1" step="0.05" value="${s.sfxVolume}" data-key="sfxVolume"></div>
          </div>
          <div class="setting-row">
            <span class="setting-label">Music Volume</span>
            <div class="setting-control"><input type="range" min="0" max="1" step="0.05" value="${s.musicVolume}" data-key="musicVolume"></div>
          </div>
          <div class="setting-row">
            <span class="setting-label">Graphics Quality</span>
            <div class="setting-control">
              <select data-key="quality">
                <option value="low" ${s.quality === 'low' ? 'selected' : ''}>Low</option>
                <option value="medium" ${s.quality === 'medium' ? 'selected' : ''}>Medium</option>
                <option value="high" ${s.quality === 'high' ? 'selected' : ''}>High</option>
              </select>
            </div>
          </div>
          <div class="setting-row">
            <span class="setting-label">Shadows</span>
            <div class="setting-control">
              <div class="toggle ${s.shadows ? 'active' : ''}" data-key="shadows"></div>
            </div>
          </div>
          <div class="setting-row">
            <span class="setting-label">Weather Effects</span>
            <div class="setting-control">
              <div class="toggle ${s.weather ? 'active' : ''}" data-key="weather"></div>
            </div>
          </div>
          <div class="setting-row">
            <span class="setting-label">Day/Night Cycle</span>
            <div class="setting-control">
              <div class="toggle ${s.dayNight ? 'active' : ''}" data-key="dayNight"></div>
            </div>
          </div>
          <div class="setting-row">
            <span class="setting-label">Particles</span>
            <div class="setting-control">
              <div class="toggle ${s.particles ? 'active' : ''}" data-key="particles"></div>
            </div>
          </div>
        </div>
        <button class="btn" id="settings-back">BACK</button>
      </div>
    `);

    el.querySelectorAll('input[type="range"]').forEach(input => {
      input.addEventListener('input', () => {
        this.game.updateSetting(input.dataset.key, parseFloat(input.value));
      });
    });

    el.querySelectorAll('select').forEach(select => {
      select.addEventListener('change', () => {
        this.game.updateSetting(select.dataset.key, select.value);
      });
    });

    el.querySelectorAll('.toggle').forEach(toggle => {
      toggle.addEventListener('click', () => {
        const key = toggle.dataset.key;
        const newVal = !this.game.settings[key];
        this.game.updateSetting(key, newVal);
        toggle.classList.toggle('active', newVal);
        this.game.audio.play('click');
      });
    });

    el.querySelector('#settings-back').onclick = () => {
      this.game.audio.play('click');
      this.showMain();
    };
  }

  showAchievements(achievements) {
    const cards = achievements.map(a => `
      <div class="achievement-card ${a.unlocked ? 'unlocked' : 'locked'}">
        <div class="achievement-icon">${a.icon}</div>
        <div class="achievement-name">${a.name}</div>
        <div class="achievement-desc">${a.unlocked ? a.desc : '???'}</div>
      </div>
    `).join('');

    const unlockCount = achievements.filter(a => a.unlocked).length;

    const el = this._mount(`
      <div class="achievements-panel">
        <h2 class="settings-title">ACHIEVEMENTS</h2>
        <p style="color:var(--text-dim); margin-bottom:2rem;">${unlockCount} / ${achievements.length} Unlocked</p>
        <div class="achievement-grid">${cards}</div>
        <button class="btn" id="ach-back">BACK</button>
      </div>
    `);

    el.querySelector('#ach-back').onclick = () => {
      this.game.audio.play('click');
      this.showMain();
    };
  }

  showCustomize(customization) {
    const colors = [
      '#0077be', '#ff1744', '#00e676', '#ffd700', '#9c27b0',
      '#ff6b35', '#00bcd4', '#e91e63', '#4caf50', '#ff9800',
      '#ffffff', '#333333'
    ];

    const primarySwatches = colors.map(c =>
      `<div class="color-swatch ${customization.primaryColor === c ? 'active' : ''}" data-color="${c}" data-type="primary" style="background:${c}"></div>`
    ).join('');

    const secondarySwatches = colors.map(c =>
      `<div class="color-swatch ${customization.secondaryColor === c ? 'active' : ''}" data-color="${c}" data-type="secondary" style="background:${c}"></div>`
    ).join('');

    const el = this._mount(`
      <div class="customize-panel">
        <h2 class="settings-title">CUSTOMIZE ATHLETE</h2>
        <div style="margin-bottom:2rem; text-align:center;">
          <label style="display:block; margin-bottom:0.5rem; color:var(--text-dim); font-size:0.8rem; text-transform:uppercase; letter-spacing:0.1em;">Player Name</label>
          <input type="text" id="custom-name" value="${customization.name}" maxlength="12"
            style="background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.15); color:var(--text); padding:0.5rem 1rem; border-radius:8px; font-family:'Orbitron',monospace; font-size:1rem; text-align:center; outline:none; width:200px;">
        </div>
        <div style="margin-bottom:1.5rem; text-align:center;">
          <label style="display:block; margin-bottom:0.5rem; color:var(--text-dim); font-size:0.8rem; text-transform:uppercase; letter-spacing:0.1em;">Primary Color</label>
          <div class="color-picker-row" style="justify-content:center;">${primarySwatches}</div>
        </div>
        <div style="margin-bottom:2rem; text-align:center;">
          <label style="display:block; margin-bottom:0.5rem; color:var(--text-dim); font-size:0.8rem; text-transform:uppercase; letter-spacing:0.1em;">Secondary Color</label>
          <div class="color-picker-row" style="justify-content:center;">${secondarySwatches}</div>
        </div>
        <button class="btn" id="custom-back">BACK</button>
      </div>
    `);

    el.querySelector('#custom-name').addEventListener('input', (e) => {
      this.game.updateCustomization('name', e.target.value.toUpperCase() || 'PLAYER');
    });

    el.querySelectorAll('.color-swatch').forEach(swatch => {
      swatch.addEventListener('click', () => {
        const type = swatch.dataset.type;
        const color = swatch.dataset.color;
        const key = type === 'primary' ? 'primaryColor' : 'secondaryColor';
        this.game.updateCustomization(key, color);
        this.game.achievements.check('customize');

        el.querySelectorAll(`.color-swatch[data-type="${type}"]`).forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        this.game.audio.play('click');
      });
    });

    el.querySelector('#custom-back').onclick = () => {
      this.game.audio.play('click');
      this.showMain();
    };
  }
}
