# MultiSport 3D

A polished 3D multi-sport game built with Three.js featuring four unique sports experiences in one seamless package.

## Sports

- **Football** (American) - Run plays, throw passes, score touchdowns with full team gameplay
- **Swimming** - Rhythm-based lane racing with stroke timing mechanics
- **Tennis** - Serve, rally, and volley with full tennis scoring
- **Soccer** - Full-pitch action with teammates, opponents, and goalkeepers

## Features

- 3D environments with detailed stadiums, courts, pools, and pitches
- Physics-based ball mechanics per sport
- AI opponents with 4 difficulty levels: Rookie, Pro, Legend, G.O.A.T.
- Quick Match, Career, Practice, and Tournament modes
- Dynamic weather (rain, snow) and day/night cycle
- Customizable athlete (name, colors)
- Achievement system with 18 unlockable achievements
- Procedural sound design (synthesized SFX and music)
- Persistent save system (settings, career progress, achievements)
- Smooth character animations
- Responsive controls with keyboard input

## Controls

| Action | Key |
|--------|-----|
| Move | W/A/S/D or Arrow Keys |
| Primary Action | Space |
| Sprint / Lob | Shift |
| Pass (Soccer) | E |
| Pause | Escape |

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

## Build

```bash
npm run build
npm run preview
```

## Tech Stack

- [Three.js](https://threejs.org/) - 3D rendering
- [Vite](https://vitejs.dev/) - Build tooling
- Web Audio API - Procedural sound
- localStorage - Save system
