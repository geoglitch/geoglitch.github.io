# Runtime art

All ship, drone, enemy, weapon, terrain and effect artwork is native Babylon.js geometry and shaders. No character illustrations or creature sprites are loaded or exported.

- `src/geometry.js`: original geometric solids and ship hull.
- `src/renderer.js`: neon edges, faceted fills, weapon strings, effects and terrain shader.
- `src/surface.js`: shared terrain geometry and deformation.

Unused earlier bitmap experiments remain in `art/`; their historical generation prompts are in `art/ART-ASSETS-archive.md`. They are outside the production build.
