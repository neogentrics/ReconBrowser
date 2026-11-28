'use strict';

/**
 * The user agent Electron builds names this app and Electron. Sites use those
 * tokens to treat the browser as a bot, so send what plain Chrome would.
 */
function cleanUserAgent(userAgent) {
  return String(userAgent)
    .replace(/\s(?:Electron|Recon ?Browser|recon-browser)\/\S+/gi, '')
    // Chrome itself reports only the major version
    .replace(/\bChrome\/(\d+)(?:\.\d+)+/, 'Chrome/$1.0.0.0');
}

module.exports = { cleanUserAgent };
