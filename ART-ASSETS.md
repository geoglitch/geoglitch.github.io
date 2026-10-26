# Runtime art

All ship, drone, enemy, weapon, terrain and effect artwork is native Babylon.js geometry and shaders. No character illustrations or creature sprites are loaded or exported.

- `src/geometry.js`: original geometric solids and ship hull.
- `src/renderer.js`: neon edges, faceted fills, weapon strings, bouncing block fragments, linked reactor arcs, effects, static ground-level weapon symbols and terrain shader.
- `src/hud.js`: inventory attack diagrams and invisible tap targets over floor equipment. Floating equipment cards and previews were removed.
- `src/camera.js`: continuous camera clearance and eased orientation following the large world shape.
- `src/surface.js`: shared terrain geometry and deformation.

Unused earlier bitmap experiments remain in `art/`; their historical generation prompts are in `art/ART-ASSETS-archive.md`. They are outside the production build.

The checked-in browser engine is `vendor/babylon-core.js`. Runtime assets use relative `public/` URLs and work directly on static hosting without Vite or compilation.

Current portrait combat verification: `art/geometry-glitch-playable.png` (25 October 2026). Weapon pads use flat dark terrain patches behind native neon glyphs; the opening world uses broad rounded faces. This screenshot is not a runtime asset.

New native geometric assets: hexagonal emitters in `src/geometry.js`, rift warning/fire lines in `src/renderer.js`, and pure encounter collision helpers in `src/rifts.js`. `src/layout.js` controls safe touch placement. Verification captures: `art/geometry-glitch-chaos.png` and `art/geometry-glitch-ipad.png`; neither is loaded by the game.
