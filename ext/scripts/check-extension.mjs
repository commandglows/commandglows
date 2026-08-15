import { access, readFile } from 'node:fs/promises';

const manifest = JSON.parse(
  await readFile(new URL('../manifest.json', import.meta.url), 'utf8'),
);

if (manifest.manifest_version !== 3) throw new Error('Manifest V3 is required');
if (manifest.host_permissions?.length) {
  throw new Error('Permanent host permissions are not allowed in the first slice');
}
if (manifest.web_accessible_resources?.length) {
  throw new Error('Extension UI assets must not be exposed as web-accessible resources');
}

const extensionCsp = manifest.content_security_policy?.extension_pages ?? '';
if (!extensionCsp.includes("script-src 'self'")) {
  throw new Error('Extension pages must use local scripts only');
}
if (!extensionCsp.includes("object-src 'none'")) {
  throw new Error('Extension pages must disable object sources');
}
if (/https?:|\*/i.test(extensionCsp)) {
  throw new Error('Extension CSP must not allow remote or wildcard sources');
}

const allowedPermissions = new Set([
  'activeTab',
  'contextMenus',
  'scripting',
  'storage',
]);
for (const permission of manifest.permissions ?? []) {
  if (!allowedPermissions.has(permission)) {
    throw new Error(`Unexpected permission: ${permission}`);
  }
}

const requiredFiles = [
  '../src/service-worker.js',
  '../src/content-script.js',
  '../src/design-system-mapping.js',
  '../src/popup.html',
  '../src/popup.js',
];
await Promise.all(requiredFiles.map((path) => access(new URL(path, import.meta.url))));

const localUiSources = await Promise.all([
  '../src/content-script.js',
  '../src/design-system-mapping.js',
  '../src/popup.html',
  '../src/popup.js',
].map((path) => readFile(new URL(path, import.meta.url), 'utf8')));
for (const source of localUiSources) {
  if (/(?:src|href)=["']https?:|@import\s+url|url\(\s*["']?https?:/i.test(source)) {
    throw new Error('Remote extension UI code, styles, fonts, and assets are forbidden');
  }
}

const contentScript = localUiSources[0];
if (!contentScript.includes("attachShadow({ mode: 'closed' })")) {
  throw new Error('Injected UI must use a closed Shadow Root');
}
if (contentScript.includes("attachShadow({ mode: 'open' })")) {
  throw new Error('Open Shadow Roots are forbidden for injected UI');
}
console.log('Extension manifest and required files are valid.');
