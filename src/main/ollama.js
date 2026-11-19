'use strict';

/**
 * OllamaManager — Local AI Intelligence Bridge for Recon Browser v1.8.0
 * Communicates with a local Ollama instance at localhost:11434.
 * Uses Node.js built-in `http` module only (no fetch, no axios).
 */

const http = require('http');

const OLLAMA_HOST = 'localhost';
const OLLAMA_PORT = 11434;
const TIMEOUT_MS = 60000;

function httpRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ statusCode: res.statusCode, body: data });
        }
      });
    });

    req.setTimeout(TIMEOUT_MS, () => {
      req.destroy();
      reject(new Error('Request timed out after 60 seconds. Is Ollama running?'));
    });

    req.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        reject(new Error('Could not connect to Ollama at localhost:11434. Please start Ollama and try again.'));
      } else {
        reject(new Error(`Network error: ${err.message}`));
      }
    });

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

class OllamaManager {
  /**
   * Check whether Ollama is running and retrieve available models.
   * @returns {{ connected: boolean, models: Array<{name, size, modified}>, error?: string }}
   */
  async checkConnection() {
    try {
      const result = await httpRequest({
        hostname: OLLAMA_HOST,
        port: OLLAMA_PORT,
        path: '/api/tags',
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (result.statusCode !== 200) {
        return { connected: false, models: [], error: `Ollama returned HTTP ${result.statusCode}` };
      }

      const models = (result.body.models || []).map((m) => ({
        name: m.name,
        size: m.size || 0,
        modified: m.modified_at || m.modified || null
      }));

      return { connected: true, models };
    } catch (err) {
      return { connected: false, models: [], error: err.message };
    }
  }

  /**
   * List all locally available Ollama models.
   * @returns {Array<{name, size, modified}>}
   */
  async listModels() {
    const result = await this.checkConnection();
    if (!result.connected) {
      throw new Error(result.error || 'Ollama is not connected.');
    }
    return result.models;
  }

  /**
   * Internal helper: POST to /api/generate and return the response body.
   */
  async _generate(model, prompt) {
    const payload = JSON.stringify({ model, prompt, stream: false });
    const startTime = Date.now();

    const result = await httpRequest({
      hostname: OLLAMA_HOST,
      port: OLLAMA_PORT,
      path: '/api/generate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, payload);

    if (result.statusCode !== 200) {
      throw new Error(`Ollama generate failed with HTTP ${result.statusCode}: ${JSON.stringify(result.body)}`);
    }

    const duration = Date.now() - startTime;
    return { response: result.body.response || '', model: result.body.model || model, duration };
  }

  /**
   * Summarize text using Ollama.
   * @param {string} text
   * @param {string} model
   * @param {number} maxWords
   * @returns {{ summary: string, model: string, duration: number }}
   */
  async summarize(text, model, maxWords = 100) {
    const prompt = `Summarize the following text concisely in ${maxWords} words or less:\n\n${text}`;
    const { response, model: usedModel, duration } = await this._generate(model, prompt);
    return { summary: response.trim(), model: usedModel, duration };
  }

  /**
   * Extract key factual claims from text.
   * @param {string} text
   * @param {string} model
   * @returns {{ claims: string, model: string, duration: number }}
   */
  async extractClaims(text, model) {
    const prompt = `Extract the key factual claims from the following text as a numbered list. Be concise and precise:\n\n${text}`;
    const { response, model: usedModel, duration } = await this._generate(model, prompt);
    return { claims: response.trim(), model: usedModel, duration };
  }

  /**
   * Answer a question based on context.
   * @param {string} question
   * @param {string} context
   * @param {string} model
   * @returns {{ answer: string, model: string, duration: number }}
   */
  async askQuestion(question, context, model) {
    const prompt = `You are a helpful research assistant. Answer the following question based on the provided context.\n\nContext:\n${context}\n\nQuestion: ${question}\n\nAnswer:`;
    const { response, model: usedModel, duration } = await this._generate(model, prompt);
    return { answer: response.trim(), model: usedModel, duration };
  }

  /**
   * Rewrite selected text according to instructions.
   * @param {string} text
   * @param {string} instruction
   * @param {string} model
   * @returns {{ result: string, model: string, duration: number }}
   */
  async rewriteSelection(text, instruction, model) {
    const prompt = `Rewrite the following text according to these instructions: ${instruction}\n\nText:\n${text}`;
    const { response, model: usedModel, duration } = await this._generate(model, prompt);
    return { result: response.trim(), model: usedModel, duration };
  }
}

module.exports = { OllamaManager };
