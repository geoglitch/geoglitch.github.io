# Runtime art

All ship, drone, enemy, weapon, terrain and effect artwork is native Babylon.js geometry and shaders. No character illustrations or creature sprites are loaded or exported.

- `src/geometry.js`: original geometric solids and ship hull.
- `src/renderer.js`: neon edges, faceted fills, weapon strings, bouncing block fragments, linked reactor arcs, effects, distinct animated 3D weapon previews, pickup plinths and terrain shader.
- `src/hud.js` and `src/weapon-beacons.js`: high-contrast weapon diagrams, equipment badges and tap-target placement.
- `src/surface.js`: shared terrain geometry and deformation.

Unused earlier bitmap experiments remain in `art/`; their historical generation prompts are in `art/ART-ASSETS-archive.md`. They are outside the production build.

The checked-in browser engine is `vendor/babylon-core.js`. Runtime assets use relative `public/` URLs and work directly on static hosting without Vite or compilation.
