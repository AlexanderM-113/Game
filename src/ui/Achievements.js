const ACHIEVEMENT_DEFS = [
  { id: 'first_win', name: 'First Victory', desc: 'Win your first match', icon: '🏆', sport: null },
  { id: 'win_5', name: 'Rising Star', desc: 'Win 5 matches', icon: '⭐', sport: null },
  { id: 'win_20', name: 'Champion', desc: 'Win 20 matches', icon: '👑', sport: null },
  { id: 'perfect_game', name: 'Perfect Game', desc: 'Win without conceding a point', icon: '💎', sport: null },
  { id: 'football_td', name: 'Touchdown!', desc: 'Score a touchdown in Football', icon: '🏈', sport: 'football' },
  { id: 'football_shutout', name: 'Iron Defense', desc: 'Shutout the opponent in Football', icon: '🛡️', sport: 'football' },
  { id: 'swimming_gold', name: 'Gold Medal', desc: 'Win a swimming race', icon: '🥇', sport: 'swimming' },
  { id: 'swimming_record', name: 'Record Breaker', desc: 'Finish a swim under 25 seconds', icon: '⏱️', sport: 'swimming' },
  { id: 'tennis_ace', name: 'Ace!', desc: 'Serve an ace in Tennis', icon: '🎾', sport: 'tennis' },
  { id: 'tennis_love', name: 'Love Game', desc: 'Win a set at love in Tennis', icon: '❤️', sport: 'tennis' },
  { id: 'soccer_hat_trick', name: 'Hat Trick', desc: 'Score 3 goals in one Soccer match', icon: '⚽', sport: 'soccer' },
  { id: 'soccer_clean', name: 'Clean Sheet', desc: 'Win without conceding in Soccer', icon: '🧤', sport: 'soccer' },
  { id: 'all_sports', name: 'All-Rounder', desc: 'Win a match in every sport', icon: '🌟', sport: null },
  { id: 'legend_win', name: 'Legendary', desc: 'Win on Legend difficulty', icon: '🔥', sport: null },
  { id: 'customize', name: 'Stylish', desc: 'Customize your athlete', icon: '🎨', sport: null },
  { id: 'career_start', name: 'Career Begins', desc: 'Start a career tournament', icon: '📋', sport: null },
  { id: 'goat_win', name: 'G.O.A.T.', desc: 'Win on GOAT difficulty', icon: '🐐', sport: null },
  { id: 'play_all', name: 'Sports Fan', desc: 'Play all four sports', icon: '🏅', sport: null }
];

export class AchievementSystem {
  constructor(game) {
    this.game = game;
    this.unlocked = new Set();
    this.sportsPlayed = new Set();
    this.sportsWon = new Set();
  }

  check(event, sport) {
    const newUnlocks = [];

    if (event === 'win') {
      const wins = this.game.career.wins;
      if (!this.unlocked.has('first_win')) { this.unlocked.add('first_win'); newUnlocks.push('first_win'); }
      if (wins >= 5 && !this.unlocked.has('win_5')) { this.unlocked.add('win_5'); newUnlocks.push('win_5'); }
      if (wins >= 20 && !this.unlocked.has('win_20')) { this.unlocked.add('win_20'); newUnlocks.push('win_20'); }

      if (sport) {
        const sportName = sport.sportName || '';
        this.sportsWon.add(sportName);

        if (this.sportsWon.size >= 4 && !this.unlocked.has('all_sports')) {
          this.unlocked.add('all_sports');
          newUnlocks.push('all_sports');
        }

        if (this.game.difficulty === 'legend' && !this.unlocked.has('legend_win')) {
          this.unlocked.add('legend_win');
          newUnlocks.push('legend_win');
        }
        if (this.game.difficulty === 'goat' && !this.unlocked.has('goat_win')) {
          this.unlocked.add('goat_win');
          newUnlocks.push('goat_win');
        }
      }
    }

    if (event === 'play') {
      if (sport) {
        const sportName = sport.sportName || sport;
        this.sportsPlayed.add(sportName);
        if (this.sportsPlayed.size >= 4 && !this.unlocked.has('play_all')) {
          this.unlocked.add('play_all');
          newUnlocks.push('play_all');
        }
      }
    }

    if (event === 'customize' && !this.unlocked.has('customize')) {
      this.unlocked.add('customize');
      newUnlocks.push('customize');
    }

    if (event === 'career_start' && !this.unlocked.has('career_start')) {
      this.unlocked.add('career_start');
      newUnlocks.push('career_start');
    }

    const sportChecks = {
      football_td: event === 'football_td',
      football_shutout: event === 'football_shutout',
      swimming_gold: event === 'swimming_gold',
      swimming_record: event === 'swimming_record',
      tennis_ace: event === 'tennis_ace',
      tennis_love: event === 'tennis_love',
      soccer_hat_trick: event === 'soccer_hat_trick',
      soccer_clean: event === 'soccer_clean',
      perfect_game: event === 'perfect_game'
    };

    for (const [id, condition] of Object.entries(sportChecks)) {
      if (condition && !this.unlocked.has(id)) {
        this.unlocked.add(id);
        newUnlocks.push(id);
      }
    }

    for (const id of newUnlocks) {
      this._showToast(id);
    }
  }

  _showToast(id) {
    const def = ACHIEVEMENT_DEFS.find(a => a.id === id);
    if (!def) return;

    this.game.audio.play('unlock');

    const toast = document.createElement('div');
    toast.className = 'achievement-toast';
    toast.innerHTML = `
      <span class="toast-icon">${def.icon}</span>
      <div class="toast-text">
        <div class="toast-label">Achievement Unlocked</div>
        <div>${def.name}</div>
      </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  getAll() {
    return ACHIEVEMENT_DEFS.map(def => ({
      ...def,
      unlocked: this.unlocked.has(def.id)
    }));
  }

  serialize() {
    return {
      unlocked: [...this.unlocked],
      sportsPlayed: [...this.sportsPlayed],
      sportsWon: [...this.sportsWon]
    };
  }

  deserialize(data) {
    if (data.unlocked) this.unlocked = new Set(data.unlocked);
    if (data.sportsPlayed) this.sportsPlayed = new Set(data.sportsPlayed);
    if (data.sportsWon) this.sportsWon = new Set(data.sportsWon);
  }
}
