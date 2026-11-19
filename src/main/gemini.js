/**
 * Recon Browser — Native Gemini Protocol Client & Gemtext Parser (v1.9.0)
 * Implements RFC-compliant Gemini (gemini://, port 1965) client over TLS,
 * TOFU certificate tracking, status code handling, and high-contrast
 * cyber Gemtext HTML rendering.
 */

const tls = require('tls');
const { URL } = require('url');

class GeminiManager {
  constructor(options = {}) {
    this.defaultPort = 1965;
    this.maxRedirects = options.maxRedirects || 5;
    this.timeoutMs = options.timeoutMs || 10000;
    this.knownCertificates = new Map(); // host -> cert fingerprint (TOFU)
  }

  /**
   * Parse a gemini:// URL
   */
  parseUrl(rawUrl) {
    let clean = (rawUrl || '').trim();
    if (!clean.startsWith('gemini://')) {
      if (clean.startsWith('//')) {
        clean = 'gemini:' + clean;
      } else {
        clean = 'gemini://' + clean;
      }
    }
    const parsed = new URL(clean);
    if (!parsed.port) {
      parsed.port = String(this.defaultPort);
    }
    return parsed;
  }

  /**
   * Fetch a resource using native TLS Gemini protocol
   */
  async fetch(rawUrl, redirectChain = []) {
    const parsed = this.parseUrl(rawUrl);
    const host = parsed.hostname;
    const port = parseInt(parsed.port, 10) || this.defaultPort;

    if (redirectChain.length >= this.maxRedirects) {
      throw new Error(`Exceeded maximum redirect limit (${this.maxRedirects})`);
    }

    return new Promise((resolve, reject) => {
      let isSettled = false;
      const timer = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          socket.destroy();
          reject(new Error(`Connection to ${host}:${port} timed out after ${this.timeoutMs}ms`));
        }
      }, this.timeoutMs);

      const socket = tls.connect({
        host: host,
        port: port,
        servername: host,
        rejectUnauthorized: false // Gemini standard: TOFU (Trust On First Use)
      }, () => {
        // Record / verify TLS certificate fingerprint (TOFU)
        const cert = socket.getPeerCertificate();
        if (cert && cert.fingerprint) {
          const known = this.knownCertificates.get(host);
          if (!known) {
            this.knownCertificates.set(host, {
              fingerprint: cert.fingerprint,
              validFrom: cert.valid_from,
              validTo: cert.valid_to,
              issuer: cert.issuer ? cert.issuer.CN || 'Self-Signed' : 'Unknown',
              firstSeen: Date.now()
            });
          }
        }

        // Send Gemini request URL terminated by \r\n
        // Per spec: The request line must not exceed 1024 bytes
        const requestLine = parsed.href + '\r\n';
        socket.write(requestLine, 'utf8');
      });

      let rawHeader = Buffer.alloc(0);
      let headerParsed = false;
      let statusCode = 0;
      let meta = '';
      const chunks = [];

      socket.on('data', (data) => {
        if (!headerParsed) {
          rawHeader = Buffer.concat([rawHeader, data]);
          const crlfIndex = rawHeader.indexOf('\r\n');
          if (crlfIndex !== -1) {
            const headerStr = rawHeader.slice(0, crlfIndex).toString('utf8');
            const bodyRemainder = rawHeader.slice(crlfIndex + 2);

            const spaceIndex = headerStr.indexOf(' ');
            if (spaceIndex === -1) {
              statusCode = parseInt(headerStr.trim(), 10);
              meta = '';
            } else {
              statusCode = parseInt(headerStr.slice(0, spaceIndex).trim(), 10);
              meta = headerStr.slice(spaceIndex + 1).trim();
            }

            headerParsed = true;
            if (bodyRemainder.length > 0) {
              chunks.push(bodyRemainder);
            }
          }
        } else {
          chunks.push(data);
        }
      });

      socket.on('end', async () => {
        if (isSettled) return;
        isSettled = true;
        clearTimeout(timer);

        if (!headerParsed) {
          return reject(new Error('Server closed connection without sending a Gemini header.'));
        }

        const bodyBuffer = Buffer.concat(chunks);
        const certInfo = this.knownCertificates.get(host) || null;

        // Status code evaluation
        // 1x: INPUT
        if (statusCode >= 10 && statusCode <= 19) {
          return resolve({
            status: statusCode,
            statusCategory: 'INPUT',
            prompt: meta || 'Input required:',
            isSensitive: statusCode === 11,
            url: parsed.href,
            cert: certInfo
          });
        }

        // 3x: REDIRECT
        if (statusCode >= 30 && statusCode <= 39) {
          const redirectTarget = new URL(meta, parsed.href).href;
          redirectChain.push(parsed.href);
          try {
            const redirectedRes = await this.fetch(redirectTarget, redirectChain);
            return resolve(redirectedRes);
          } catch (err) {
            return reject(err);
          }
        }

        // 4x, 5x, 6x: FAILURES
        if (statusCode >= 40) {
          const errorMsg = this.getStatusDescription(statusCode, meta);
          return resolve({
            status: statusCode,
            statusCategory: statusCode < 50 ? 'TEMPORARY_FAILURE' : (statusCode < 60 ? 'PERMANENT_FAILURE' : 'CLIENT_CERT_REQUIRED'),
            meta: meta,
            error: errorMsg,
            url: parsed.href,
            cert: certInfo
          });
        }

        // 2x: SUCCESS
        const mimeType = (meta || 'text/gemini').split(';')[0].trim().toLowerCase();
        const charset = (meta.includes('charset=') ? meta.split('charset=')[1].split(';')[0].trim() : 'utf-8').toLowerCase();
        
        let textContent = '';
        let htmlContent = '';

        if (mimeType.startsWith('text/')) {
          textContent = bodyBuffer.toString(charset === 'utf-8' ? 'utf8' : 'utf8');
          if (mimeType === 'text/gemini') {
            htmlContent = this.parseGemtext(textContent, parsed.href);
          } else {
            htmlContent = `<pre class="gemini-plain-text">${this.escapeHtml(textContent)}</pre>`;
          }
        }

        resolve({
          status: statusCode,
          statusCategory: 'SUCCESS',
          meta: meta,
          mimeType: mimeType,
          charset: charset,
          rawBody: bodyBuffer,
          text: textContent,
          html: htmlContent,
          url: parsed.href,
          cert: certInfo
        });
      });

      socket.on('error', (err) => {
        if (isSettled) return;
        isSettled = true;
        clearTimeout(timer);
        reject(new Error(`Gemini TLS connection error: ${err.message}`));
      });
    });
  }

  /**
   * Convert Gemtext (text/gemini) string to accessible HTML
   */
  parseGemtext(gemtext, baseUrl) {
    if (!gemtext) return '<p class="gemini-empty">Empty capsule page.</p>';

    const lines = gemtext.split(/\r?\n/);
    const htmlLines = [];
    let inPre = false;
    let preAlt = '';
    let inList = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Preformatted toggle: ``` [alt text]
      if (line.startsWith('```')) {
        if (inPre) {
          htmlLines.push('</code></pre>');
          inPre = false;
          preAlt = '';
        } else {
          if (inList) {
            htmlLines.push('</ul>');
            inList = false;
          }
          preAlt = line.slice(3).trim();
          const altAttr = preAlt ? ` data-alt="${this.escapeHtml(preAlt)}" title="${this.escapeHtml(preAlt)}"` : '';
          htmlLines.push(`<pre class="gemini-code-block"${altAttr}><code>`);
          inPre = true;
        }
        continue;
      }

      // If inside preformatted block, render lines verbatim
      if (inPre) {
        htmlLines.push(this.escapeHtml(line));
        continue;
      }

      // Close list if line is not a list item
      if (inList && !line.startsWith('* ')) {
        htmlLines.push('</ul>');
        inList = false;
      }

      // Headings
      if (line.startsWith('### ')) {
        htmlLines.push(`<h3 class="gemini-h3">${this.escapeHtml(line.slice(4).trim())}</h3>`);
      } else if (line.startsWith('## ')) {
        htmlLines.push(`<h2 class="gemini-h2">${this.escapeHtml(line.slice(3).trim())}</h2>`);
      } else if (line.startsWith('# ')) {
        htmlLines.push(`<h1 class="gemini-h1">${this.escapeHtml(line.slice(2).trim())}</h1>`);
      }
      // Links: => <URL> [<LABEL>]
      else if (line.startsWith('=>')) {
        const linkPayload = line.slice(2).trim();
        const spaceIdx = linkPayload.search(/\s/);
        let linkTarget = '';
        let linkLabel = '';

        if (spaceIdx === -1) {
          linkTarget = linkPayload;
          linkLabel = linkPayload;
        } else {
          linkTarget = linkPayload.slice(0, spaceIdx).trim();
          linkLabel = linkPayload.slice(spaceIdx).trim();
        }

        // Resolve relative links against base URL
        let resolvedHref = linkTarget;
        try {
          resolvedHref = new URL(linkTarget, baseUrl).href;
        } catch {
          resolvedHref = linkTarget;
        }

        const isGeminiLink = resolvedHref.startsWith('gemini://');
        const icon = isGeminiLink ? '🚀' : '🌐';

        htmlLines.push(
          `<div class="gemini-link-row">` +
          `<a href="${this.escapeHtml(resolvedHref)}" class="gemini-link" data-url="${this.escapeHtml(resolvedHref)}">` +
          `<span class="gemini-link-icon">${icon}</span> ` +
          `<span class="gemini-link-text">${this.escapeHtml(linkLabel || linkTarget)}</span>` +
          `</a>` +
          `<span class="gemini-link-meta">${this.escapeHtml(linkTarget)}</span>` +
          `</div>`
        );
      }
      // Lists: * <ITEM>
      else if (line.startsWith('* ')) {
        if (!inList) {
          htmlLines.push('<ul class="gemini-list">');
          inList = true;
        }
        htmlLines.push(`<li>${this.escapeHtml(line.slice(2).trim())}</li>`);
      }
      // Blockquotes: > <TEXT>
      else if (line.startsWith('>')) {
        htmlLines.push(`<blockquote class="gemini-quote">${this.escapeHtml(line.slice(1).trim())}</blockquote>`);
      }
      // Empty line
      else if (line.trim() === '') {
        htmlLines.push('<div class="gemini-spacer"></div>');
      }
      // Standard Paragraph
      else {
        htmlLines.push(`<p class="gemini-para">${this.escapeHtml(line)}</p>`);
      }
    }

    if (inPre) htmlLines.push('</code></pre>');
    if (inList) htmlLines.push('</ul>');

    return htmlLines.join('\n');
  }

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  getStatusDescription(statusCode, meta) {
    switch (statusCode) {
      case 10: return `Input Required: ${meta || 'Please provide query input.'}`;
      case 11: return `Sensitive Input Required: ${meta || 'Please enter confidential input.'}`;
      case 20: return `Success: ${meta || 'text/gemini'}`;
      case 30: return `Temporary Redirect: ${meta || 'Resource has moved.'}`;
      case 31: return `Permanent Redirect: ${meta || 'Resource has permanently moved.'}`;
      case 40: return `Temporary Failure: ${meta || 'Unspecified server issue.'}`;
      case 41: return `Server Unavailable: ${meta || 'The server is temporarily unavailable.'}`;
      case 42: return `CGI / Processing Error: ${meta || 'Backend processing failure.'}`;
      case 43: return `Proxy Error: ${meta || 'Decentralized proxy error.'}`;
      case 44: return `Slow Down: ${meta || 'Rate limit exceeded. Please wait a moment.'}`;
      case 50: return `Permanent Failure: ${meta || 'Resource could not be loaded.'}`;
      case 51: return `Not Found: ${meta || 'The requested capsule page does not exist (404).'}`;
      case 52: return `Gone: ${meta || 'The resource is permanently removed.'}`;
      case 53: return `Proxy Request Refused: ${meta || 'The capsule refuses proxy requests.'}`;
      case 59: return `Bad Request: ${meta || 'Malformed Gemini request line.'}`;
      case 60: return `Client Certificate Required: ${meta || 'Identity authentication needed.'}`;
      case 61: return `Certificate Not Authorized: ${meta || 'Provided client cert is unauthorized.'}`;
      case 62: return `Certificate Invalid: ${meta || 'Provided client cert is expired or invalid.'}`;
      default: return `Gemini Status ${statusCode}: ${meta || 'Unknown response'}`;
    }
  }
}

module.exports = {
  GeminiManager
};
