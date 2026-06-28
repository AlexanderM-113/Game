import { Game } from './core/Game.js';

const game = new Game();

const loadingScreen = document.getElementById('loading-screen');
const loaderFill = document.querySelector('.loader-fill');
const loaderText = document.querySelector('.loader-text');

async function boot() {
  const steps = [
    { pct: 10, label: 'Initializing engine...' },
    { pct: 30, label: 'Loading assets...' },
    { pct: 50, label: 'Building stadiums...' },
    { pct: 70, label: 'Setting up physics...' },
    { pct: 85, label: 'Preparing athletes...' },
    { pct: 100, label: 'Ready!' }
  ];

  for (const step of steps) {
    loaderFill.style.width = step.pct + '%';
    loaderText.textContent = step.label;
    await new Promise(r => setTimeout(r, 300));
  }

  await game.init();

  await new Promise(r => setTimeout(r, 400));
  loadingScreen.classList.add('hidden');
  setTimeout(() => loadingScreen.remove(), 600);

  game.showMainMenu();
}

boot().catch(err => {
  console.error('Boot failed:', err);
  loaderText.textContent = 'Error loading game. Please refresh.';
});
