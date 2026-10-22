# Local Babylon.js runtime

`babylon-core.js` contains the Babylon.js 8.56.2 browser engine and the shader registrations used by this game. It is a self-contained ES module checked into the project. The game source remains ordinary editable JavaScript modules; running or publishing changes needs no compilation, package install, CDN or build tool.

This vendor file was prepared from the installed `@babylonjs/core` 8.56.2 package, using the engine classes and side-effect registrations previously imported by `src/renderer.js`. Dynamic engine dependencies are included in this one file. Updating the third-party engine is a separate maintenance task; editing the game does not require regenerating it.

Babylon.js is distributed under Apache-2.0. The license and upstream notice are in `public/licenses/`; third-party legal comments are retained in the module.
