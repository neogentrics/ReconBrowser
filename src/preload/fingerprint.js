'use strict';

/**
 * Session preload for web pages: anti-fingerprinting noise. It runs sandboxed in
 * the isolated world, and installs the guard in the page's own world before the
 * page's scripts run. The page gets no Node access and no bridge back.
 * A sandboxed preload cannot require local files, so this file stands alone.
 */

// Serialised into the page, so it must not use anything outside its own body
function installFingerprintGuard(seed) {
  // A repeatable pseudo-random number for position `n`
  const mix = (n) => {
    let x = (seed ^ Math.imul(n + 1, 0x9e3779b1)) >>> 0;
    x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0;
    x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
    return (x ^ (x >>> 16)) >>> 0;
  };

  const originals = new WeakMap();
  const replace = (proto, name, build) => {
    const descriptor = proto && Object.getOwnPropertyDescriptor(proto, name);
    if (!descriptor || typeof descriptor.value !== 'function') return;
    const original = descriptor.value;
    const body = build(original);
    // A method, like the original: same name and length, and not constructible
    const wrapper = { [name](...args) { return body.apply(this, args); } }[name];
    Object.defineProperty(wrapper, 'length', { value: original.length, configurable: true });
    originals.set(wrapper, original);
    Object.defineProperty(proto, name, { ...descriptor, value: wrapper });
  };
  replace(Function.prototype, 'toString', (original) => function () {
    return original.call(originals.get(this) || this);
  });

  // ---- Canvas: flip the lowest bit of one pixel in every 16. Positions are
  // counted on the whole canvas, so overlapping reads agree with each other.
  const noisePixels = (data, left, top, width, canvasWidth) => {
    const height = data.length / 4 / width;
    for (let row = 0; row < height; row++) {
      const start = (top + row) * canvasWidth + left;
      for (let block = start >> 4; block <= (start + width - 1) >> 4; block++) {
        const choice = mix(block);
        const column = block * 16 + (choice & 15) - start;
        if (column < 0 || column >= width) continue;
        const offset = (row * width + column) * 4;
        if (data[offset + 3] !== 0) data[offset + ((choice >>> 4) % 3)] ^= 1;
      }
    }
  };

  let readPixels = null;
  for (const type of ['CanvasRenderingContext2D', 'OffscreenCanvasRenderingContext2D']) {
    replace(window[type]?.prototype, 'getImageData', (original) => {
      if (type === 'CanvasRenderingContext2D') readPixels = original;
      return function (...args) {
        const image = original.apply(this, args);
        const [x, y, w, h] = args.map((v) => Math.trunc(Number(v)) || 0);
        noisePixels(image.data, Math.min(x, x + w), Math.min(y, y + h), image.width, this.canvas.width);
        return image;
      };
    });
  }

  // Exports are made from a noisy copy. The canvas on the page is never changed.
  const noisyCopy = (canvas) => {
    if (!canvas.width || !canvas.height || !readPixels) return canvas;
    try {
      const copy = document.createElement('canvas');
      copy.width = canvas.width;
      copy.height = canvas.height;
      const context = copy.getContext('2d');
      context.drawImage(canvas, 0, 0);
      const image = readPixels.call(context, 0, 0, copy.width, copy.height);
      noisePixels(image.data, 0, 0, copy.width, copy.width);
      context.putImageData(image, 0, 0);
      return copy;
    } catch {
      return canvas; // a cross-origin canvas: the original call reports the error
    }
  };
  for (const name of ['toDataURL', 'toBlob']) {
    replace(window.HTMLCanvasElement?.prototype, name, (original) => function (...args) {
      return original.apply(this instanceof window.HTMLCanvasElement ? noisyCopy(this) : this, args);
    });
  }

  // ---- Audio: far below anything audible. Offline rendering is what audio
  // fingerprinting uses; buffers a page fills itself are not touched.
  const noiseSamples = (samples, size) => {
    for (let i = 0; i < samples.length; i += 100) {
      const choice = mix(i);
      samples[i] += (choice & 1 ? size : -size) * (1 + ((choice >>> 1) & 255) / 256);
    }
  };
  const readChannel = window.AudioBuffer?.prototype.getChannelData;
  replace(window.OfflineAudioContext?.prototype, 'startRendering', (original) => function (...args) {
    return original.apply(this, args).then((buffer) => {
      for (let c = 0; c < buffer.numberOfChannels; c++) noiseSamples(readChannel.call(buffer, c), 1e-7);
      return buffer;
    });
  });
  for (const name of ['getFloatFrequencyData', 'getFloatTimeDomainData']) {
    replace(window.AnalyserNode?.prototype, name, (original) => function (array) {
      original.call(this, array);
      noiseSamples(array, 1e-4);
    });
  }

  // ---- Core count: a common value instead of the real one
  const cores = window.Navigator && Object.getOwnPropertyDescriptor(window.Navigator.prototype, 'hardwareConcurrency');
  if (cores?.get) {
    const capped = { get hardwareConcurrency() { return Math.min(cores.get.call(this), 4); } };
    const getter = Object.getOwnPropertyDescriptor(capped, 'hardwareConcurrency').get;
    originals.set(getter, cores.get);
    Object.defineProperty(window.Navigator.prototype, 'hardwareConcurrency', { ...cores, get: getter });
  }
}

const { ipcRenderer, webFrame } = require('electron');

if (/^(https?|about|blob|data):$/.test(window.location.protocol)) {
  const config = ipcRenderer.sendSync('privacy:page-config');
  if (config && config.fingerprint) {
    webFrame.executeJavaScript(`(${installFingerprintGuard})(${Number(config.seed)})`)
      .catch((err) => console.warn('[Recon Shields] Anti-fingerprinting guard failed:', err.message));
  }
}
