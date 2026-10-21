# Manual playtest notes — 21 October 2026

The first two runs below preceded the latest balance, formation and terrain update. They are historical observations, not results for the current weapon strength. This is an endless game; these were survival runs, not completion of every encounter template.

## Keyboard run

- Tested at 1280 × 720 with movement, auto fire, collected weapons, boosts and floor pulses.
- Full shields at about 40 seconds; 39 active enemies and two shields at about 63 seconds.
- Continued to 1:56.7 and the first boss, then paused deliberately. Score 1,352,725; shields had recovered through energy collection.
- Regular navigation was around 60 FPS. Continuous travel exposed objectives left too far behind, including a boss that could remain outside the active chart.

## Destination run

- Tested floor destinations, weapon marker navigation, Nova explosions, seeking missiles and spread fire.
- Tapping weapon markers collected and equipped the selected modules. Tapping the green recharge marker restored shields and continued into the next flow without a level-ending screen.
- Ended at 1:25.5 with 476 targets cleared and score 2,087,818.
- Heavy spread fire and accumulated projectiles reached the low 40s in FPS. The first boss arrived with too much leftover swarm and projectile pressure.

## Fixes and follow-up checks

- Added tappable weapon, recharge and boss markers. Boss navigation approaches to attack range and maintains aim. A distant boss re-enters ahead after a visible warmup, preserving health.
- Made weapon resupply recover quickly if no pickups remain, and biased new areas toward travel.
- Cleared lingering hostile shots on boss entrance, limited the supporting swarm and softened the first boss's patterns and protected phase.
- Reduced cosmetic projection and geometry work: bounded particle/ring rendering, fewer curve segments, one rendered pixel per CSS pixel, and culled effects on hidden sides. Combat and collisions remain fully simulated.
- Checked a 492 × 900 portrait panel. Marker collection, score and shield layout were usable. A focused encounter selected with the debug controls confirmed that the first boss could be approached, defeated and followed by continued play. That focused check ran around 60 FPS; it was not a matched desktop benchmark of the earlier heavy scene.
- A sharply curved transition exposed a rare surface projection failure. Projection now uses bounded, backtracked steps and brackets a nearby surface when gradients cancel. The ship marker projects the actual ship basis instead of independently projecting its corners.
- Automated checks cover the pressure ramp, overdrive duration, boost chains, reactor chains, boss re-entry, boss entrance cleanup, canceled gradients, all fifty morph transitions and bridge continuity.

Physical phone touch input and real controller hardware remain unverified. Their mappings are covered by input tests; the browser destination checks used mouse clicks.

## Latest balance, formation and terrain pass

- A normal keyboard run used movement, a boost and a floor pulse, then tap navigation to the ribbon. It reached 35.5 seconds, cleared 114 targets and scored 150,405 before losing the ship in encounter two. No invulnerability or encounter skipping was used in this run. The close-range ribbon could not passively hold off ranged prisms and the surrounding swarm.
- Browser pickup checks confirmed Twin Echo deploys exactly two temporary ships while retaining one permanent drone and returning to Filament. The final preview shows this active pair at 5.2 seconds alongside the first 20-enemy formation. Later checks observed 22-enemy and 48-mote synchronized groups.
- Tap navigation collected the rainbow ribbon both from the opening world and while the first world morphed. Testing first found that the larger ridges trapped a greedy route. A local surface path search and nearby clear landing pads fixed that route. A second check found that a weapon route could accidentally pass through a gate; equipment routes now avoid unselected gates.
- Tapping the blue gate moved the ship to the violet gate, cleared the navigation target and started a 2.8-second cooldown. The check observed a cross-world travel jump and a 2.4-second remaining cooldown. Automated tests additionally cover standing on the receiving gate without bouncing back and the limited departure blast.
- A focused check used encounter skipping and invulnerability to inspect encounter seven. Both large stacked pillars descended onto marked positions, remained solid and kept the exit closed. Tests verify that both must be destroyed, that ribbon contact cannot instantly erase them, and that repeated contact does not apply multiple hits in one swing. This was not a normal survival run to encounter seven.
- The camera blends its orientation and position, while terrain morphs ease over 6.5 seconds. The ship stayed on the surface throughout the observed transitions. All fifty transitions, pulse travel and the split-world bridge remain covered by automated sampling.
- Desktop checks with multiple game contexts showed roughly 32–60 FPS depending on view and effects; the final twin-ship scene reached 60 FPS with adaptive rendering at 1.25 hardware scale. These are observations, not a controlled performance benchmark. The existing 492 × 899 portrait panel was inspected without controlling it; its title/demo layout ran at 60 FPS.
- The current suite passes 70 checks, including grouped waves, musical timing, individual shape behavior, weapon limits, controller cycling during summon cooldown, terrain routes and gate avoidance. Real phone touch and physical controller hardware remain unverified.

Current gameplay preview: `art/vector-shift-update.png`. The static ZIP is rebuilt from this pass. Its 47 files passed archive integrity and relative-asset checks. The production preview booted in the browser; movement, a gate traversal and floor pulse worked, with no captured console warnings or errors.

## Geometry Glitch identity and rotation polish

Renamed the title, loading screen, browser metadata and static package to Geometry Glitch. Existing locally saved scores and settings migrate from the earlier save key. Added sparse, low-contrast cyan dashes and magenta pixel flecks anchored to the terrain shader. They do not affect terrain collision or spawn mechanics.

The camera now eases its orientation more slowly, caps angular speed and smooths its focus point; ship turns are also eased and capped. Browser checks exercised several keyboard direction changes with the ship visible and the surface anchor stable. The portrait title fits without overlapping the settings icons; no console warnings or errors were captured. Current identity preview: `art/geometry-glitch-preview.png`.

Disabled browser text selection, image dragging, tap highlights and touch callouts on the game. Pointer handling prevents browser selection while explicitly focusing the canvas. A browser click/drag check retained game controls with computed `user-select: none` and no console warnings or errors.
