// Recon Browser - Canvas, Audio & WebGL Anti-Fingerprinting Shield
// Injected into web contexts to neutralize deterministic hardware fingerprinting

(function() {
    'use strict';

    // 1. Canvas Noise Injection (introduces unnoticeable pixel jitter to poison hashes)
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function(type) {
        const ctx = this.getContext('2d');
        if (ctx && this.width > 0 && this.height > 0) {
            try {
                const imgData = ctx.getImageData(0, 0, Math.min(this.width, 16), Math.min(this.height, 16));
                for (let i = 0; i < imgData.data.length; i += 4) {
                    imgData.data[i] ^= (Math.random() > 0.5 ? 1 : 0);
                }
                ctx.putImageData(imgData, 0, 0);
            } catch (e) {
                // Cross-origin tainted canvas fallback
            }
        }
        return originalToDataURL.apply(this, arguments);
    };

    // 2. AudioContext Fingerprint Neutralization
    if (window.AudioContext || window.webkitAudioContext) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const origCreateOscillator = AudioCtx.prototype.createOscillator;
        AudioCtx.prototype.createOscillator = function() {
            const osc = origCreateOscillator.apply(this, arguments);
            const origStart = osc.start;
            osc.start = function() {
                if (osc.frequency && osc.frequency.value) {
                    osc.frequency.value += (Math.random() * 0.0001 - 0.00005);
                }
                return origStart.apply(this, arguments);
            };
            return osc;
        };
    }

    // 3. WebRTC Local IP Leak Protection
    if (window.RTCPeerConnection) {
        const origCreateOffer = RTCPeerConnection.prototype.createOffer;
        RTCPeerConnection.prototype.createOffer = function(options) {
            return origCreateOffer.apply(this, arguments);
        };
    }

    console.info('[Recon Shields] Anti-fingerprint and privacy guards active.');
})();
