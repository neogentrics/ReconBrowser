import test from 'node:test';
import assert from 'node:assert/strict';
import {
  quoteYaml,
  htmlToCleanMarkdown,
  safeDocumentName,
  buildClipDocument,
  MAX_CLIP_BYTES
} from '../src/main/clip-builder.js';

test('quoteYaml: safely quotes strings with colons, quotes, newlines, and special symbols', () => {
  // Title with colon
  const colonTitle = 'The Roman Aqueducts: Engineering & History';
  assert.equal(quoteYaml(colonTitle), '"The Roman Aqueducts: Engineering & History"');

  // Title with double quotes
  const quotesTitle = 'Caesar said "Veni, Vidi, Vici" in 47 BC';
  assert.equal(quoteYaml(quotesTitle), '"Caesar said \\"Veni, Vidi, Vici\\" in 47 BC"');

  // Multi-line text
  const multiLine = 'First Line\nSecond Line\r\nThird Line';
  assert.equal(quoteYaml(multiLine), '"First Line\\nSecond Line\\nThird Line"');

  // Backslashes
  const backslashes = 'Path\\To\\Lore';
  assert.equal(quoteYaml(backslashes), '"Path\\\\To\\\\Lore"');

  // Simple clean string needs no quoting
  assert.equal(quoteYaml('simple_title'), 'simple_title');

  // Null/undefined/empty
  assert.equal(quoteYaml(''), '""');
  assert.equal(quoteYaml(null), '""');
  assert.equal(quoteYaml(undefined), '""');
});

test('buildClipDocument: constructs front matter and omits missing fields', () => {
  const clip = buildClipDocument({
    text: 'Aqueducts moved water using gravity alone.',
    sourceUrl: 'https://example.com/aqueducts',
    sourceTitle: 'Roman Aqueducts: Engineering & History',
    sourceAuthor: 'Marcus Vitruvius',
    sourceDate: '2026-05-12',
    accessed: '2026-11-18',
    category: 'historical',
    tags: ['rome', 'engineering'],
    clipTitle: 'Aqueduct Gradient Precision'
  });

  const md = clip.markdown;
  assert.ok(md.startsWith('---\n'));
  assert.ok(md.includes('source_url: "https://example.com/aqueducts"\n'));
  assert.ok(md.includes('source_title: "Roman Aqueducts: Engineering & History"\n'));
  assert.ok(md.includes('source_author: Marcus Vitruvius\n'));
  assert.ok(md.includes('source_date: 2026-05-12\n'));
  assert.ok(md.includes('accessed: 2026-11-18\n'));
  assert.ok(md.includes('category: historical\n'));
  assert.ok(md.includes('tags: [rome, engineering]\n'));
  assert.ok(md.includes('# Aqueduct Gradient Precision\n'));
  assert.ok(md.includes('Aqueducts moved water using gravity alone.'));
  assert.ok(md.includes('> Source: [Roman Aqueducts: Engineering & History](https://example.com/aqueducts), by Marcus Vitruvius (accessed 2026-11-18)'));
  assert.equal(clip.fileName, 'aqueduct-gradient-precision.md');
  assert.equal(clip.truncated, false);
});

test('buildClipDocument: omits author and date when not provided', () => {
  const clip = buildClipDocument({
    text: 'Some clipped lore without author or date.',
    sourceUrl: 'https://example.com/anonymous-lore',
    sourceTitle: 'Ancient Archives',
    accessed: '2026-11-18',
    category: 'lore',
    clipTitle: 'Ancient Archives'
  });

  const md = clip.markdown;
  assert.ok(!md.includes('source_author:'));
  assert.ok(!md.includes('source_date:'));
  assert.ok(md.includes('source_url: "https://example.com/anonymous-lore"\n'));
  assert.ok(md.includes('source_title: Ancient Archives\n'));
  assert.ok(md.includes('category: lore\n'));
  assert.ok(md.includes('> Source: [Ancient Archives](https://example.com/anonymous-lore) (accessed 2026-11-18)'));
  assert.equal(clip.fileName, 'ancient-archives.md');
});

test('buildClipDocument: caps clip at 1 MB and sets truncated flag', () => {
  // Generate 1.2 MB of text
  const largeChunk = 'A'.repeat(1024 * 100); // 100 KB
  const largeText = largeChunk.repeat(12);  // 1.2 MB

  const clip = buildClipDocument({
    text: largeText,
    sourceTitle: 'Massive Document',
    clipTitle: 'Huge Excerpt'
  });

  assert.equal(clip.truncated, true);
  assert.ok(clip.markdown.includes('[Clip truncated at 1 MB limit]'));
  assert.ok(clip.finalBytes <= MAX_CLIP_BYTES + 2048); // total within 1 MB plus front matter
});

test('htmlToCleanMarkdown: strips scripts, iframes, styles and converts formatting', () => {
  const dirtyHtml = `
    <script>alert("hacked")</script>
    <style>body { background: red; }</style>
    <iframe src="https://evil.com"></iframe>
    <form action="/login"><input type="password" /></form>
    <h1>The Inner Citadel</h1>
    <p>This is <strong>bold</strong> and <em>italic</em> text.</p>
    <blockquote>Life is an ongoing journey.</blockquote>
    <ul>
      <li>First principle</li>
      <li>Second principle</li>
    </ul>
    <p>Check <a href="https://recontowers.com">Recon Towers</a> for updates.</p>
    <pre><code>const x = 42;</code></pre>
  `;

  const clean = htmlToCleanMarkdown(dirtyHtml);

  assert.ok(!clean.includes('<script>'));
  assert.ok(!clean.includes('alert('));
  assert.ok(!clean.includes('<style>'));
  assert.ok(!clean.includes('iframe'));
  assert.ok(!clean.includes('<form>'));
  assert.ok(!clean.includes('<input'));

  assert.ok(clean.includes('# The Inner Citadel'));
  assert.ok(clean.includes('**bold** and *italic*'));
  assert.ok(clean.includes('> Life is an ongoing journey.'));
  assert.ok(clean.includes('- First principle'));
  assert.ok(clean.includes('- Second principle'));
  assert.ok(clean.includes('[Recon Towers](https://recontowers.com)'));
  assert.ok(clean.includes('```\nconst x = 42;\n```'));
});

test('safeDocumentName: never includes URLs or page body text in filename', () => {
  assert.equal(safeDocumentName('The Roman Aqueducts: Engineering'), 'the-roman-aqueducts-engineering.md');
  assert.equal(safeDocumentName('https://recontowers.com/lore/page?id=42'), 'https-recontowers-com-lore-page-id-42.md');
  assert.equal(safeDocumentName('Special Characters & Symbols! #1?'), 'special-characters-symbols-1.md');
  assert.equal(safeDocumentName(''), 'research-clip.md');
  assert.equal(safeDocumentName(null), 'research-clip.md');
});
