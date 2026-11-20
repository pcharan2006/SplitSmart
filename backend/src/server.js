require('dotenv').config({ quiet: true });
const { validateEnv } = require('./config/validateEnv');

const problems = validateEnv();
if (problems.length) {
  console.error('Cannot start. Fix these configuration problems:\n - ' + problems.join('\n - '));
  process.exit(1);
}

if (process.env.NODE_ENV === 'production' && !process.env.SMTP_HOST) {
  console.warn('WARNING: SMTP_HOST is not set, so password-reset emails cannot be sent.');
}

const app = require('./app');

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
