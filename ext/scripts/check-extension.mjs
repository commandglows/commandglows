import { access, readFile } from 'node:fs/promises';

const manifest = JSON.parse(
  await readFile(new URL('../manifest.json', import.meta.url), 'utf8'),
);

if (manifest.manifest_version !== 3) throw new Error('Manifest V3 is required');
if (manifest.host_permissions?.length) {
  throw new Error('Permanent host permissions are not allowed in the first slice');
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
  '../src/popup.html',
  '../src/popup.js',
];
await Promise.all(requiredFiles.map((path) => access(new URL(path, import.meta.url))));
console.log('Extension manifest and required files are valid.');
