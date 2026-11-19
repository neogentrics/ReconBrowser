import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Helper to convert hex to RGB
function hexToRgb(hex) {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

// Relative luminance per WCAG 2.1
function getLuminance({ r, g, b }) {
  const [rs, gs, bs] = [r, g, b].map(v => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Contrast ratio
function getContrast(hex1, hex2) {
  const lum1 = getLuminance(hexToRgb(hex1));
  const lum2 = getLuminance(hexToRgb(hex2));
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Extract theme blocks from CSS file
function extractThemeVars(cssContent) {
  const themeRegex = /(?:body\.(theme-[\w-]+)|:root(?:,\s*body\.(theme-[\w-]+))?)\s*\{([^}]+)\}/g;
  const themes = {};
  let match;

  while ((match = themeRegex.exec(cssContent)) !== null) {
    const themeName = match[1] || match[2] || 'theme-cyber';
    const body = match[3];
    const vars = {};
    const varRegex = /(--[\w-]+)\s*:\s*([^;]+);/g;
    let varMatch;
    while ((varMatch = varRegex.exec(body)) !== null) {
      vars[varMatch[1].trim()] = varMatch[2].trim();
    }
    themes[themeName] = vars;
  }
  return themes;
}

// Extract first solid hex color from gradient or hex string
function extractHex(val) {
  if (!val) return null;
  const hexMatch = val.match(/#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}/);
  return hexMatch ? hexMatch[0] : null;
}

const styleCss = fs.readFileSync(path.join(rootDir, 'src/renderer/style.css'), 'utf8');
const startCss = fs.readFileSync(path.join(rootDir, 'src/renderer/startpage.css'), 'utf8');

const styleThemes = extractThemeVars(styleCss);
const startThemes = extractThemeVars(startCss);

console.log(`Found ${Object.keys(styleThemes).length} themes in style.css`);
console.log(`Found ${Object.keys(startThemes).length} themes in startpage.css`);

assert.ok(Object.keys(styleThemes).length >= 19, 'Must have at least 19 themes defined in style.css');
assert.ok(Object.keys(startThemes).length >= 19, 'Must have at least 19 themes defined in startpage.css');

let passCount = 0;
let testCount = 0;

console.log('\n--- VERIFYING STYLE.CSS CONTRAST RATIOS ---');
for (const [name, vars] of Object.entries(styleThemes)) {
  const bg = extractHex(vars['--bg-primary']);
  const card = extractHex(vars['--card-bg']);
  const textMain = extractHex(vars['--text-main']);
  const textMuted = extractHex(vars['--text-muted']);

  if (bg && textMain) {
    testCount++;
    const ratioMain = getContrast(textMain, bg);
    assert.ok(ratioMain >= 7.0, `[${name}] style.css text-main (${textMain}) on bg (${bg}) must be >= 7:1 (got ${ratioMain.toFixed(2)}:1)`);
    passCount++;
  }

  if (card && textMuted) {
    testCount++;
    const ratioMuted = getContrast(textMuted, card);
    assert.ok(ratioMuted >= 4.5, `[${name}] style.css text-muted (${textMuted}) on card (${card}) must be >= 4.5:1 (got ${ratioMuted.toFixed(2)}:1)`);
    passCount++;
  }
}

console.log('\n--- VERIFYING STARTPAGE.CSS CONTRAST RATIOS ---');
for (const [name, vars] of Object.entries(startThemes)) {
  const bg = extractHex(vars['--start-bg']);
  const card = extractHex(vars['--card-bg']);
  const textMain = extractHex(vars['--text-main']);
  const textMuted = extractHex(vars['--text-muted']);

  if (bg && textMain) {
    testCount++;
    const ratioMain = getContrast(textMain, bg);
    assert.ok(ratioMain >= 7.0, `[${name}] startpage.css text-main (${textMain}) on bg (${bg}) must be >= 7:1 (got ${ratioMain.toFixed(2)}:1)`);
    passCount++;
  }

  if (card && textMuted) {
    testCount++;
    const ratioMuted = getContrast(textMuted, card);
    assert.ok(ratioMuted >= 4.5, `[${name}] startpage.css text-muted (${textMuted}) on card (${card}) must be >= 4.5:1 (got ${ratioMuted.toFixed(2)}:1)`);
    passCount++;
  }
}

console.log('\n--- VERIFYING PLACEHOLDER & ASPECT OVERRIDES ---');
// Verify style.css contains input::placeholder and #omnibar::placeholder
assert.ok(styleCss.includes('input::placeholder'), 'style.css must style input::placeholder');
assert.ok(styleCss.includes('#omnibar::placeholder'), 'style.css must style #omnibar::placeholder');
assert.ok(startCss.includes('#start-search::placeholder'), 'startpage.css must style #start-search::placeholder');

// Verify light theme metallic overrides exist
assert.ok(styleCss.includes('body.theme-sepia.aspect-metallic'), 'style.css must contain sepia metallic override');
assert.ok(styleCss.includes('body.theme-mist.aspect-metallic'), 'style.css must contain mist metallic override');
assert.ok(styleCss.includes('body.theme-yellow.aspect-metallic'), 'style.css must contain yellow metallic override');
assert.ok(styleCss.includes('body.theme-aero.aspect-metallic'), 'style.css must contain aero metallic override');

assert.ok(startCss.includes('body.theme-sepia.aspect-metallic'), 'startpage.css must contain sepia metallic override');
assert.ok(startCss.includes('body.theme-mist.aspect-metallic'), 'startpage.css must contain mist metallic override');
assert.ok(startCss.includes('body.theme-yellow.aspect-metallic'), 'startpage.css must contain yellow metallic override');
assert.ok(startCss.includes('body.theme-aero.aspect-metallic'), 'startpage.css must contain aero metallic override');

console.log(`\nALL CONTRAST & VISIBILITY TESTS PASSED! (${passCount}/${testCount} checks passed, 100% WCAG AA/AAA compliant)`);
