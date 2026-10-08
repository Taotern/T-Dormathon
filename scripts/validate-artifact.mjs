import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve, dirname, posix } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const workerPath = resolve(projectRoot, "dist/server/index.js");
const manifestPath = resolve(projectRoot, "dist/.openai/hosting.json");

const [source, manifest] = await Promise.all([
  readFile(workerPath, "utf8"),
  readFile(manifestPath, "utf8"),
]);
JSON.parse(manifest);

// A data URL forces ESM parsing even though the generated output has no package.json.
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const workerModule = await import(moduleUrl);
assert.equal(
  typeof workerModule.default?.fetch,
  "function",
  `${pathToFileURL(workerPath)} must export default.fetch`,
);

// Validate the served client graph, not only the backend module. Source transforms
// must never modify JavaScript or binary bytes embedded as response assets.
const sourceAssets = (await import(pathToFileURL(resolve(projectRoot, 'worker/generated.js')).href+'?verify='+Date.now())).ASSETS;
const served = new Map();
for (const [name, asset] of Object.entries(sourceAssets)) {
  const response = await workerModule.default.fetch(new Request('https://dormathon-risk-private-20261007.liuyz8715.chatgpt.site'+name), {}, {});
  assert.equal(response.status, 200, 'Missing built static asset '+name);
  const bytes = Buffer.from(await response.arrayBuffer());
  const expected = Buffer.from(asset.body, asset.encoding === 'base64' ? 'base64' : 'utf8');
  assert.deepEqual(bytes, expected, 'Built asset bytes changed: '+name);
  if (name.endsWith('.js')) served.set(name, bytes.toString('utf8'));
}
const urls = new Map();
function clientURL(name) {
  if (urls.has(name)) return urls.get(name);
  const code = served.get(name);
  assert.ok(code, 'Missing client module dependency '+name);
  const rewritten = code.replace(/^import([^;]+?)from\s*['"]([^'"]+)['"];?/gm, (_, names, specifier) => {
    assert.ok(specifier.startsWith('./') || specifier.startsWith('../'), 'Nonlocal client module');
    return 'import'+names+'from '+JSON.stringify(clientURL(posix.normalize(posix.join(posix.dirname(name),specifier))))+';';
  });
  const url = 'data:text/javascript;base64,'+Buffer.from(rewritten).toString('base64');
  urls.set(name, url); return url;
}
// App bootstrap requires a browser, but all its named dependencies must link
// successfully from the exact built response bytes before publication.
for (const entry of ['/collector-workbench.js']) for (const match of served.get(entry).matchAll(/^import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/gm)) {
  const name=posix.normalize(posix.join('/',match[2])), dependency=await import(clientURL(name));
  for (const binding of match[1].split(',')) {
    const exported=binding.trim().split(/\s+as\s+/)[0];
    assert.ok(Object.hasOwn(dependency,exported), 'Missing served named export '+name+':'+exported);
  }
}

console.log("Artifact exports default.fetch; all "+Object.keys(sourceAssets).length+" static assets retain exact bytes and client named imports link successfully");
