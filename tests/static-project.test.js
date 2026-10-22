import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

test('the native browser module graph resolves locally at both root and repository URLs', async () => {
  for (const prefix of ['/', '/geometry-glitch/']) {
    const site = new URL(prefix, 'https://example.github.io');
    const queue = [new URL('src/main.js', site)], visited = new Set();
    while (queue.length) {
      const url = queue.pop();
      if (visited.has(url.href)) continue;
      visited.add(url.href);
      assert.equal(url.origin, site.origin);
      assert.ok(url.pathname.startsWith(prefix), `${url.href} escapes the repository path`);
      const file = new URL(url.pathname.slice(prefix.length), root);
      assert.ok((await stat(file)).isFile());
      const source = await readFile(file, 'utf8');
      assert.ok(!source.includes('import.meta.env'), `${file.pathname} requires a build transform`);
      // The self-contained engine has no module imports. Game imports are native ESM.
      if (url.pathname.endsWith('/vendor/babylon-core.js')) continue;
      for (const match of source.matchAll(/^import\s+(?:[^'"\n]+?\s+from\s+)?['"]([^'"]+)['"]/gm)) {
        assert.ok(match[1].startsWith('./') || match[1].startsWith('../'), `bare import: ${match[1]}`);
        queue.push(new URL(match[1], url));
      }
    }
    assert.ok(visited.size > 10);
    assert.ok(visited.has(new URL('vendor/babylon-core.js', site).href));
    for (const name of ['barlow-heavy.ttf', 'space-grotesk.ttf']) {
      const asset = new URL(`../public/fonts/${name}`, new URL('src/main.js', site));
      assert.ok(asset.pathname.startsWith(prefix));
      assert.ok((await stat(new URL(asset.pathname.slice(prefix.length), root))).size > 1000);
    }
  }
});

test('the checked-in engine includes the constructors, shaders and extensions used by the game', async () => {
  const engine = await import('../vendor/babylon-core.js');
  assert.equal(engine.Engine.Version, '8.56.2');
  assert.equal(typeof engine.MeshBuilder.CreateBox, 'function');
  assert.equal(typeof engine.Mesh.prototype.thinInstanceSetBuffer, 'function');
  assert.equal(typeof engine.Scene.prototype.createPickingRay, 'function');
  for (const name of ['defaultVertexShader', 'glowMapGenerationVertexShader', 'layerVertexShader']) assert.ok(engine.Effect.ShadersStore[name], name);
});

test('running and deploying the project require neither dependency installation nor a build', async () => {
  const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
  assert.equal(pkg.dependencies, undefined);
  assert.equal(pkg.devDependencies, undefined);
  assert.equal(pkg.scripts.build, undefined);
  const workflow = await readFile(new URL('.github/workflows/pages.yml', root), 'utf8');
  assert.ok(!/npm\s|setup-node|path:\s*dist/.test(workflow));
  assert.ok((await stat(new URL('.nojekyll', root))).isFile());
  const html = await readFile(new URL('index.html', root), 'utf8');
  assert.ok(html.includes("import('./src/main.js')"));
  assert.ok(!/src=["']\//.test(html));
});
