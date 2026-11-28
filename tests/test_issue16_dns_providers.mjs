import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const main = read('src/main/index.js');
const readme = read('README.md');

// The resolvers the app really configures
const list = main.slice(main.indexOf('secureDnsServers: ['), main.indexOf(']', main.indexOf('secureDnsServers: [')));
const hosts = [...list.matchAll(/https:\/\/([^/']+)\/dns-query/g)].map(m => m[1]);
const PROVIDERS = { '1.1.1.1': 'Cloudflare', '1.0.0.1': 'Cloudflare', 'cloudflare-dns.com': 'Cloudflare', 'dns.google': 'Google' };

describe('Issue #16: the DNS providers are stated truthfully', () => {
  it('knows who runs every resolver the app uses', () => {
    assert.ok(hosts.length > 0);
    // A new resolver fails here until it is added above and to the README
    for (const host of hosts) assert.ok(PROVIDERS[host], host);
  });

  it('names every resolver and its provider in the README', () => {
    const section = readme.split('\n').find(line => line.startsWith('**Who sees your DNS lookups.**'));
    assert.ok(section);
    for (const host of hosts) {
      assert.ok(section.includes(`\`${host}\``), host);
      assert.ok(section.includes(PROVIDERS[host]), PROVIDERS[host]);
    }
    assert.match(readme, /\*\*Encrypted DoH by Default\*\* \| \*\*Yes \(Cloudflare & Google\)\*\*/);
  });

  it('names no provider the app does not use', () => {
    for (const file of ['README.md', 'config/shields-config.json', 'src/renderer/index.html', 'src/renderer/renderer.js']) {
      assert.doesNotMatch(read(file), /quad9/i, file);
    }
  });

  it('names both providers wherever the app announces encrypted DNS', () => {
    assert.match(read('src/renderer/index.html'), /DNS-over-HTTPS \(Cloudflare &amp; Google\)/);
    const toasts = [...read('src/renderer/renderer.js').matchAll(/'DNS-over-HTTPS: Encrypted[^']*'/g)].map(m => m[0]);
    assert.ok(toasts.length > 0);
    for (const toast of toasts) assert.match(toast, /Cloudflare & Google/);
  });
});
