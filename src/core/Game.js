import { SceneManager } from './SceneManager.js';
import { InputManager } from './InputManager.js';
import { AudioManager } from './AudioManager.js';
import { MenuSystem } from '../ui/MenuSystem.js';
import { HUD } from '../ui/HUD.js';
import { Football } from '../sports/Football.js';
import { Swimming } from '../sports/Swimming.js';
import { Tennis } from '../sports/Tennis.js';
import { Soccer } from '../sports/Soccer.js';
import { SaveSystem } from '../utils/SaveSystem.js';
import { AchievementSystem } from '../ui/Achievements.js';

export class Game {
  constructor() {
    this.scene = null;
    this.input = null;
    this.audio = null;
    this.menu = null;
    this.hud = null;
    this.save = null;
    this.achievements = null;
    this.currentSport = null;
    this.state = 'loading'; // loading, menu, playing, paused, results
    this.difficulty = 'pro';
    this.settings = {
      masterVolume: 0.7,
      sfxVolume: 0.8,
      musicVolume: 0.5,
      quality: 'high',
      weather: true,
      dayNight: true,
      shadows: true,
      particles: true
    };
    this.career = {
      wins: 0,
      losses: 0,
      tournamentRound: 0,
      trophies: []
    };
    this.playerCustomization = {
      primaryColor: '#0077be',
      secondaryColor: '#ffffff',
      name: 'PLAYER'
    };
    this._animFrame = null;
    this._lastTime = 0;
  }

  async init() {
    const canvas = document.getElementById('game-canvas');
    const overlay = document.getElementById('ui-overlay');

    this.save = new SaveSystem();
    this.save.load(this);

    this.scene = new SceneManager(canvas, this);
    this.input = new InputManager();
    this.audio = new AudioManager(this.settings);
    this.menu = new MenuSystem(overlay, this);
    this.hud = new HUD(overlay, this);
    this.achievements = new AchievementSystem(this);

    this.scene.init();
    this.audio.init();

    this._loop = this._loop.bind(this);
    this._lastTime = performance.now();
    this._animFrame = requestAnimationFrame(this._loop);
  }

  _loop(now) {
    this._animFrame = requestAnimationFrame(this._loop);
    const dt = Math.min((now - this._lastTime) / 1000, 0.05);
    this._lastTime = now;

    if (this.state === 'playing' && this.currentSport) {
      this.currentSport.update(dt);
      this.hud.update(dt);
    }

    this.scene.update(dt);
    this.scene.render();
  }

  showMainMenu() {
    this.state = 'menu';
    if (this.currentSport) {
      this.currentSport.cleanup();
      this.currentSport = null;
    }
    this.hud.hide();
    this.scene.showMenuScene();
    this.menu.showMain();
    this.audio.playMusic('menu');
  }

  selectSport(sportName) {
    this.menu.showSportMenu(sportName);
  }

  startGame(sportName, mode) {
    this.menu.hide();
    this.state = 'playing';

    const sportMap = {
      football: Football,
      swimming: Swimming,
      tennis: Tennis,
      soccer: Soccer
    };

    const SportClass = sportMap[sportName];
    if (!SportClass) return;

    this.currentSport = new SportClass(this, mode);
    this.currentSport.init();
    this.hud.show(sportName);
    this.audio.playMusic(sportName);
  }

  pauseGame() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.hud.showPause();
  }

  resumeGame() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.hud.hidePause();
  }

  endGame(result) {
    this.state = 'results';
    if (result.won) {
      this.career.wins++;
      this.achievements.check('win', this.currentSport);
    } else {
      this.career.losses++;
    }
    this.save.save(this);
    this.hud.showResults(result);
    this.audio.play('whistle');
  }

  showSettings() {
    this.menu.showSettings();
  }

  showAchievements() {
    this.menu.showAchievements(this.achievements.getAll());
  }

  showCareer(sportName) {
    this.startGame(sportName, 'career');
  }

  showCustomize() {
    this.menu.showCustomize(this.playerCustomization);
  }

  updateSetting(key, value) {
    this.settings[key] = value;
    if (key === 'masterVolume' || key === 'sfxVolume' || key === 'musicVolume') {
      this.audio.updateVolumes(this.settings);
    }
    if (key === 'shadows') {
      this.scene.setShadows(value);
    }
    this.save.save(this);
  }

  updateCustomization(key, value) {
    this.playerCustomization[key] = value;
    if (this.currentSport && this.currentSport.updatePlayerAppearance) {
      this.currentSport.updatePlayerAppearance(this.playerCustomization);
    }
    this.save.save(this);
  }
}
