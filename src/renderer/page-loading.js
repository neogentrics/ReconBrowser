// Loading pages in tabs. loadURL() returns a promise that rejects whenever a load
// is interrupted, which is normal. Real failures are reported by the tab's
// did-fail-load event, which also covers links clicked inside pages.
// Loaded as a plain script before renderer.js.
(function (root) {
  const ABORTED = -3; // ERR_ABORTED: replaced by another load, a redirect or Stop

  function navigate(webviewEl, url) {
    try {
      return webviewEl.loadURL(url).catch((err) => {
        if (!String(err?.message).includes('ERR_ABORTED')) {
          console.warn(`Could not load ${url}: ${err?.message}`);
        }
      });
    } catch {
      // A tab that was only just created or woken cannot take loadURL() yet
      webviewEl.setAttribute('src', url);
      return Promise.resolve();
    }
  }

  function reasonFor(code) {
    if (code === -105 || code === -137) return 'The address could not be found. Check the spelling.';
    if (code === -106) return 'You appear to be offline.';
    if (code === -102) return 'The site refused the connection.';
    if (code === -7 || code === -118) return 'The site took too long to answer.';
    if (code <= -200 && code > -300) return 'The site’s security certificate could not be trusted.';
    if (code === -130 || code === -111 || code === -120) return 'The proxy for this tab could not be reached.';
    if (code === -6) return 'The file could not be found.';
    return 'The page could not be loaded.';
  }

  /** What to tell the user about a did-fail-load event, or null when it is not a failed page. */
  function describeLoadFailure({ errorCode, errorDescription, validatedURL, isMainFrame }) {
    if (!isMainFrame || errorCode === ABORTED || !errorCode) return null;
    return {
      url: validatedURL || '',
      reason: reasonFor(errorCode),
      detail: errorDescription || `Error ${errorCode}`
    };
  }

  const api = { navigate, describeLoadFailure };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.pageLoading = api;
})(globalThis);
