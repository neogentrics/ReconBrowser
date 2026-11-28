import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { askForText } = require('../src/renderer/input-dialog.js');
const read = (file) => fs.readFileSync(path.join(root, 'src/renderer', file), 'utf8');

function element(extra = {}) {
  const listeners = new Map();
  return {
    textContent: '', value: '', placeholder: '', disabled: false,
    addEventListener: (type, fn) => (listeners.get(type) || listeners.set(type, new Set()).get(type)).add(fn),
    removeEventListener: (type, fn) => listeners.get(type)?.delete(fn),
    fire: (type) => [...(listeners.get(type) || [])].forEach(fn => fn({ preventDefault() {} })),
    count: () => [...listeners.values()].reduce((n, set) => n + set.size, 0),
    focus() {},
    ...extra
  };
}

function fakeDialog() {
  const parts = Object.fromEntries(['form', 'input', 'confirm', 'cancel', 'title', 'label'].map(n => [n, element()]));
  const dialog = element({
    open: false,
    returnValue: '',
    querySelector: (selector) => parts[selector.match(/="(\w+)"/)[1]],
    showModal() { dialog.open = true; },
    close(value) { if (value !== undefined) dialog.returnValue = value; dialog.open = false; dialog.fire('close'); }
  });
  const type = (text) => { parts.input.value = text; parts.input.fire('input'); };
  const listening = () => [dialog, ...Object.values(parts)].reduce((n, e) => n + e.count(), 0);
  return { dialog, parts, type, listening };
}

const ask = (dialog) => askForText(dialog, { title: 'New workspace', label: 'Name', confirmLabel: 'Create' });

describe('Issue #13: in-app input dialog', () => {
  it('returns the trimmed text on submit, and cleans up after itself', async () => {
    const { dialog, parts, type, listening } = fakeDialog();
    const answer = ask(dialog);
    assert.equal(parts.title.textContent, 'New workspace');
    assert.equal(parts.confirm.textContent, 'Create');
    type('  Research  ');
    parts.form.fire('submit');
    assert.equal(await answer, 'Research');
    assert.equal(listening(), 0);
  });

  it('will not submit an empty name', async () => {
    const { dialog, parts, type } = fakeDialog();
    const answer = ask(dialog);
    assert.equal(parts.confirm.disabled, true);
    type('   ');
    parts.form.fire('submit');
    assert.equal(dialog.open, true);
    type('x');
    assert.equal(parts.confirm.disabled, false);
    parts.cancel.fire('click');
    assert.equal(await answer, null);
  });

  it('gives null for Esc, even straight after an accepted name', async () => {
    const { dialog, parts, type } = fakeDialog();
    const first = ask(dialog);
    type('Kept');
    parts.form.fire('submit');
    await first;
    const second = ask(dialog);
    assert.equal(parts.input.value, '');
    type('Not wanted');
    dialog.close(); // what Esc does: closes without a new return value
    assert.equal(await second, null);
  });

  it('does not open twice', async () => {
    const { dialog } = fakeDialog();
    ask(dialog);
    assert.equal(await ask(dialog), null);
  });

  it('replaces every prompt() in the browser pages', () => {
    for (const file of ['renderer.js', 'startpage.html', 'history.html', 'gemini-viewer.html']) {
      assert.doesNotMatch(read(file), /(?<![\w.])prompt\(/, file);
    }
    const html = read('index.html');
    assert.ok(html.indexOf('src="input-dialog.js"') < html.indexOf('src="renderer.js"'));
    for (const part of ['form', 'title', 'label', 'input', 'confirm', 'cancel']) {
      assert.ok(html.includes(`data-input-dialog="${part}"`), part);
    }
  });
});
