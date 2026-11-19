/**
 * Recon Browser — IPFS & Decentralized Gateway Manager (v1.9.0)
 * Handles ipfs:// and ipns:// URI resolution, local daemon auto-detection,
 * and high-availability gateway fallback cascades without external dependencies.
 */

const http = require('http');
const https = require('https');

const DEFAULT_GATEWAYS = [
  { id: 'local', name: 'Local Daemon (127.0.0.1:8080)', url: 'http://127.0.0.1:8080/ipfs/', isLocal: true },
  { id: 'ipfs_io', name: 'IPFS Official Gateway (ipfs.io)', url: 'https://ipfs.io/ipfs/', isLocal: false },
  { id: 'dweb_link', name: 'DWeb Link (dweb.link)', url: 'https://dweb.link/ipfs/', isLocal: false },
  { id: 'cloudflare', name: 'Cloudflare IPFS (cloudflare-ipfs.com)', url: 'https://cloudflare-ipfs.com/ipfs/', isLocal: false },
  { id: 'pinata', name: 'Pinata Gateway (gateway.pinata.cloud)', url: 'https://gateway.pinata.cloud/ipfs/', isLocal: false }
];

const DEFAULT_IPNS_GATEWAYS = [
  { id: 'local', name: 'Local Daemon (127.0.0.1:8080)', url: 'http://127.0.0.1:8080/ipns/', isLocal: true },
  { id: 'ipfs_io', name: 'IPFS Official Gateway (ipfs.io)', url: 'https://ipfs.io/ipns/', isLocal: false },
  { id: 'dweb_link', name: 'DWeb Link (dweb.link)', url: 'https://dweb.link/ipns/', isLocal: false }
];

class IPFSManager {
  constructor(options = {}) {
    this.localApiPort = options.localApiPort || 5001;
    this.localGatewayPort = options.localGatewayPort || 8080;
    this.preferredGatewayId = options.preferredGatewayId || 'auto'; // 'auto', 'local', 'ipfs_io', etc.
    this.localNodeActive = false;
    this.lastChecked = 0;
  }

  /**
   * Parse an ipfs:// or ipns:// URI into protocol, CID/Name, and subpath
   */
  parseUri(rawUri) {
    if (!rawUri || typeof rawUri !== 'string') return null;
    const trimmed = rawUri.trim();

    let protocol = null;
    let pathPart = '';

    if (trimmed.startsWith('ipfs://')) {
      protocol = 'ipfs';
      pathPart = trimmed.slice(7);
    } else if (trimmed.startsWith('ipns://')) {
      protocol = 'ipns';
      pathPart = trimmed.slice(7);
    } else if (trimmed.startsWith('/ipfs/')) {
      protocol = 'ipfs';
      pathPart = trimmed.slice(6);
    } else if (trimmed.startsWith('/ipns/')) {
      protocol = 'ipns';
      pathPart = trimmed.slice(6);
    } else {
      return null;
    }

    // Clean leading slashes
    pathPart = pathPart.replace(/^\/+/, '');
    const firstSlash = pathPart.indexOf('/');
    let target = '';
    let subpath = '';

    if (firstSlash === -1) {
      target = pathPart;
    } else {
      target = pathPart.slice(0, firstSlash);
      subpath = pathPart.slice(firstSlash);
    }

    return {
      protocol,
      target,
      subpath,
      fullPath: `${target}${subpath}`
    };
  }

  /**
   * Check if a local IPFS daemon is running on 127.0.0.1:5001
   */
  async checkLocalNode(port = this.localApiPort, timeoutMs = 2000) {
    return new Promise((resolve) => {
      const req = http.request({
        hostname: '127.0.0.1',
        port: port,
        path: '/api/v0/version',
        method: 'POST',
        timeout: timeoutMs
      }, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const parsed = JSON.parse(data);
              this.localNodeActive = true;
              this.lastChecked = Date.now();
              resolve({ online: true, version: parsed.Version || 'unknown', repo: parsed.Repo || '' });
            } catch {
              this.localNodeActive = true;
              this.lastChecked = Date.now();
              resolve({ online: true, version: 'detected' });
            }
          } else {
            this.localNodeActive = false;
            resolve({ online: false, error: `HTTP ${res.statusCode}` });
          }
        });
      });

      req.on('error', (err) => {
        this.localNodeActive = false;
        resolve({ online: false, error: err.code || err.message });
      });

      req.on('timeout', () => {
        req.destroy();
        this.localNodeActive = false;
        resolve({ online: false, error: 'Timeout' });
      });

      req.end();
    });
  }

  /**
   * Resolve an ipfs:// or ipns:// URI into a reachable HTTP/HTTPS gateway URL
   */
  async resolveUrl(rawUri, preferredGatewayId = this.preferredGatewayId) {
    const parsed = this.parseUri(rawUri);
    if (!parsed) {
      throw new Error(`Invalid decentralized protocol URI: ${rawUri}`);
    }

    const isIpns = parsed.protocol === 'ipns';
    const gateways = isIpns ? DEFAULT_IPNS_GATEWAYS : DEFAULT_GATEWAYS;

    // Check specific user preference
    if (preferredGatewayId && preferredGatewayId !== 'auto') {
      const match = gateways.find(g => g.id === preferredGatewayId);
      if (match) {
        return `${match.url}${parsed.fullPath}`;
      }
    }

    // Auto resolution: Check local daemon first if not checked recently
    if (Date.now() - this.lastChecked > 30000) {
      await this.checkLocalNode();
    }

    if (this.localNodeActive) {
      const localGateway = gateways.find(g => g.isLocal);
      if (localGateway) {
        return `${localGateway.url}${parsed.fullPath}`;
      }
    }

    // Fallback to high-speed public gateway (ipfs.io or dweb.link)
    const fallback = gateways.find(g => g.id === 'ipfs_io') || gateways[1] || gateways[0];
    return `${fallback.url}${parsed.fullPath}`;
  }

  getGatewayList() {
    return {
      ipfs: DEFAULT_GATEWAYS,
      ipns: DEFAULT_IPNS_GATEWAYS,
      localNodeActive: this.localNodeActive
    };
  }
}

module.exports = {
  IPFSManager,
  DEFAULT_GATEWAYS,
  DEFAULT_IPNS_GATEWAYS
};
