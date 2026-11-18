'use strict';

/**
 * Recon Browser Research Clip Builder (v1.3.0)
 * Formats research clips with YAML front matter for Recon Towers App Link.
 */

const MAX_CLIP_BYTES = 1024 * 1024; // 1 MB limit
const VALID_CATEGORIES = ['lore', 'character', 'setting', 'historical', 'science', 'general'];

/**
 * Safely quotes a scalar value for YAML front matter.
 * Properly escapes colons, single/double quotes, newlines, backslashes and special symbols.
 */
function quoteYaml(str) {
  if (str === null || str === undefined) return '""';
  const s = String(str).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g, '');
  if (s.length === 0) return '""';

  // Check if string needs YAML quoting
  const needsQuotes = /[:\n\r"'\t#@\[\]{}&*!|>`%,\\]/.test(s)
    || /^\s|\s$/.test(s)
    || /^-\s/.test(s)
    || /^(true|false|null|yes|no|on|off)$/i.test(s)
    || /^0[0-9]+/.test(s);

  if (!needsQuotes) return s;

  // Use double quotes, escape backslashes, double quotes, and control newlines
  const escaped = s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r\n/g, '\\n')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\n')
    .replace(/\t/g, '\\t');

  return `"${escaped}"`;
}

/**
 * Converts HTML selection to clean Markdown while stripping scripts, styles, iframes, forms, etc.
 */
function htmlToCleanMarkdown(html) {
  if (typeof html !== 'string' || !html.trim()) return '';

  let text = html;

  // Strip dangerous tags and their content
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  text = text.replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '');
  text = text.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  text = text.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '');
  text = text.replace(/<canvas\b[^<]*(?:(?!<\/canvas>)<[^<]*)*<\/canvas>/gi, '');
  text = text.replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '');
  text = text.replace(/<button\b[^<]*(?:(?!<\/button>)<[^<]*)*<\/button>/gi, '');

  // Convert headings
  text = text.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n');
  text = text.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n');
  text = text.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n');
  text = text.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n#### $1\n');
  text = text.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, '\n##### $1\n');
  text = text.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, '\n###### $1\n');

  // Convert pre/code blocks first
  text = text.replace(/<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi, '\n```\n$1\n```\n');
  text = text.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, '\n```\n$1\n```\n');
  text = text.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');

  // Convert inline text formatting
  text = text.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**');
  text = text.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*');

  // Convert blockquotes
  text = text.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (match, content) => {
    const lines = content.trim().split('\n').map(l => `> ${l.trim()}`).join('\n');
    return `\n${lines}\n`;
  });

  // Convert links (keep safe http/https only)
  text = text.replace(/<a\b[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');

  // Convert lists
  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1');
  text = text.replace(/<\/(ul|ol)>/gi, '\n');

  // Convert paragraphs & linebreaks
  text = text.replace(/<br\s*[\/]?>/gi, '\n');
  text = text.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n\n$1\n\n');

  // Strip all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

  // Normalize whitespace: collapse 3+ newlines to 2, trim trailing spaces
  text = text
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
}

/**
 * Generates a safe file name for the document from the clip title.
 * NEVER puts a web address or page body text into the file name.
 */
function safeDocumentName(title) {
  if (typeof title !== 'string' || !title.trim()) return 'research-clip.md';

  // Slugify title: alphanumeric and hyphens only, lowercase, max 48 characters
  let slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  if (!slug) slug = 'research-clip';
  return `${slug}.md`;
}

/**
 * Builds the complete research clip markdown document with YAML front matter.
 */
function buildClipDocument(options = {}) {
  const {
    text = '',
    sourceUrl,
    sourceTitle,
    sourceAuthor,
    sourceDate,
    accessed = new Date().toISOString().slice(0, 10),
    category = 'general',
    tags = ['research', 'web-clip'],
    clipTitle
  } = options;

  const chosenCategory = VALID_CATEGORIES.includes(category) ? category : 'general';

  // Enforce 1 MB limit on clipped text
  let rawText = text;
  let truncated = false;
  const truncateNotice = '\n\n[Clip truncated at 1 MB limit]';
  const noticeBuffer = Buffer.from(truncateNotice, 'utf8');

  let textBuffer = Buffer.from(rawText, 'utf8');
  if (textBuffer.length > MAX_CLIP_BYTES) {
    truncated = true;
    const allowedBytes = MAX_CLIP_BYTES - noticeBuffer.length;
    let cutLength = allowedBytes;
    // Walk back over partial UTF-8 continuation bytes if cut in the middle of a rune
    while (cutLength > 0 && (textBuffer[cutLength] & 0xc0) === 0x80) {
      cutLength--;
    }
    rawText = textBuffer.subarray(0, cutLength).toString('utf8') + truncateNotice;
  }

  // Construct front matter (omit fields not present)
  const fmLines = ['---'];

  if (sourceUrl && typeof sourceUrl === 'string' && sourceUrl.trim()) {
    fmLines.push(`source_url: ${quoteYaml(sourceUrl.trim())}`);
  }
  if (sourceTitle && typeof sourceTitle === 'string' && sourceTitle.trim()) {
    fmLines.push(`source_title: ${quoteYaml(sourceTitle.trim())}`);
  }
  if (sourceAuthor && typeof sourceAuthor === 'string' && sourceAuthor.trim()) {
    fmLines.push(`source_author: ${quoteYaml(sourceAuthor.trim())}`);
  }
  if (sourceDate && typeof sourceDate === 'string' && sourceDate.trim()) {
    fmLines.push(`source_date: ${quoteYaml(sourceDate.trim())}`);
  }

  fmLines.push(`accessed: ${quoteYaml(accessed)}`);
  fmLines.push(`category: ${chosenCategory}`);

  // Format tags array
  const cleanTags = Array.isArray(tags)
    ? tags.map(t => String(t).trim()).filter(Boolean)
    : String(tags).split(',').map(t => t.trim()).filter(Boolean);

  if (cleanTags.length > 0) {
    const formattedTags = cleanTags.map(t => quoteYaml(t)).join(', ');
    fmLines.push(`tags: [${formattedTags}]`);
  }
  fmLines.push('---');

  // Title of the clip
  const headerTitle = clipTitle?.trim() || sourceTitle?.trim() || 'Research Clip';
  const titleBlock = `# ${headerTitle}`;

  // Source citation line
  // Format: "> Source: [page title](url), by author (accessed date)"
  let sourceCitation = '> Source: ';
  const titleDisplay = sourceTitle?.trim() || 'Source';
  if (sourceUrl && typeof sourceUrl === 'string' && sourceUrl.trim()) {
    sourceCitation += `[${titleDisplay}](${sourceUrl.trim()})`;
  } else {
    sourceCitation += titleDisplay;
  }

  if (sourceAuthor && typeof sourceAuthor === 'string' && sourceAuthor.trim()) {
    sourceCitation += `, by ${sourceAuthor.trim()}`;
  }

  sourceCitation += ` (accessed ${accessed})`;

  // Assemble full Markdown text
  const fullMarkdown = `${fmLines.join('\n')}\n${titleBlock}\n\n${rawText}\n\n${sourceCitation}\n`;

  return {
    markdown: fullMarkdown,
    fileName: safeDocumentName(headerTitle),
    truncated,
    originalBytes: textBuffer.length,
    finalBytes: Buffer.byteLength(fullMarkdown, 'utf8')
  };
}

module.exports = {
  MAX_CLIP_BYTES,
  VALID_CATEGORIES,
  quoteYaml,
  htmlToCleanMarkdown,
  safeDocumentName,
  buildClipDocument
};
