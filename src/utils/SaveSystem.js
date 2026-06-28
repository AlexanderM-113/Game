const SAVE_KEY = 'multisport3d_save';

export class SaveSystem {
  save(game) {
    const data = {
      settings: { ...game.settings },
      career: { ...game.career },
      customization: { ...game.playerCustomization },
      difficulty: game.difficulty,
      achievements: game.achievements ? game.achievements.serialize() : [],
      timestamp: Date.now()
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (_) { /* storage full or unavailable */ }
  }

  load(game) {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.settings) Object.assign(game.settings, data.settings);
      if (data.career) Object.assign(game.career, data.career);
      if (data.customization) Object.assign(game.playerCustomization, data.customization);
      if (data.difficulty) game.difficulty = data.difficulty;
      if (data.achievements && game.achievements) {
        game.achievements.deserialize(data.achievements);
      }
    } catch (_) { /* corrupted save */ }
  }

  reset() {
    localStorage.removeItem(SAVE_KEY);
  }
}
