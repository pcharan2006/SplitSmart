// Checks the environment at start-up so a bad deployment fails loudly instead of running insecurely.
// Returns a list of problems (empty = fine).
function validateEnv(env = process.env) {
  const problems = [];

  for (const key of ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET']) {
    if (!env[key]) problems.push(`${key} is not set`);
  }

  if (env.NODE_ENV === 'production') {
    const secret = env.JWT_SECRET || '';
    if (secret && secret.length < 32) problems.push('JWT_SECRET must be at least 32 characters in production');
    if (/change_me|secret|password/i.test(secret)) problems.push('JWT_SECRET looks like a placeholder; generate a random one');
    if (!env.CLIENT_URL) problems.push('CLIENT_URL must be set in production (it controls which website may call the API)');
    if (env.CLIENT_URL === '*') problems.push('CLIENT_URL must be a specific origin, not *');
  }
  return problems;
}

module.exports = { validateEnv };
