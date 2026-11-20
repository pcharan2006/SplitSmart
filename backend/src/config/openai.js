const mod = require('openai');
const OpenAI = mod.OpenAI || mod.default || mod;

let client = null;

// Returns null when no key is configured, so the app still runs (AI endpoints answer 503).
// The key is read from the server's environment only and never sent to the browser.
function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  if (!client) client = new OpenAI({ apiKey, timeout: 20000, maxRetries: 1 });
  return client;
}

const getModel = () => process.env.OPENAI_MODEL || 'gpt-4o-mini';

module.exports = { getClient, getModel };
