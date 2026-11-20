const authService = require('../services/authService');
const emailService = require('../services/emailService');

// Controllers only translate HTTP <-> service calls. No business logic here.
exports.register = async (req, res) => {
  const { user, token } = await authService.register(req.body);
  res.status(201).json({ user, token });
};

exports.login = async (req, res) => {
  const { user, token } = await authService.login(req.body);
  res.json({ user, token });
};

exports.me = async (req, res) => {
  res.json({ user: req.user });
};

exports.changePassword = async (req, res) => {
  await authService.changePassword(req.user.id, req.body);
  res.json({ message: 'Password changed successfully' });
};

exports.forgotPassword = async (req, res) => {
  const reset = await authService.createPasswordReset(req.body.email);
  // Same response whether or not the email exists (prevents account enumeration).
  const body = { message: 'If that email is registered, a reset link has been sent.' };
  if (reset) {
    if (emailService.isConfigured()) {
      // Not awaited on purpose: the response time must not reveal whether the email exists.
      // A failure is logged for the operator, never shown to the visitor.
      emailService
        .sendPasswordResetEmail({ to: reset.email, name: reset.name, token: reset.token })
        .catch((err) => console.error('Could not send password reset email:', err.message));
    } else if (process.env.NODE_ENV !== 'production') {
      // No email configured: in development we print the token so you can test the flow.
      console.log(`[DEV] Password reset token for ${req.body.email}: ${reset.token}`);
      if (process.env.NODE_ENV === 'development') body.devResetToken = reset.token;
    } else {
      console.error('Password reset requested but SMTP_HOST is not set, so no email was sent.');
    }
  }
  res.json(body);
};

exports.resetPassword = async (req, res) => {
  await authService.resetPassword(req.body);
  res.json({ message: 'Password reset successfully' });
};
