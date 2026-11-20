// Same password rules as the backend, so people get instant feedback (the server still checks).
export function passwordProblem(password) {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (password.length > 72) return 'Password must be at most 72 characters';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Password needs at least one letter and one number';
  return null;
}
