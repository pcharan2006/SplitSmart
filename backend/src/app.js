require('dotenv').config({ quiet: true });
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { pool } = require('./config/db');
const { errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// Behind a hosting provider's proxy/load balancer every request appears to come from the proxy.
// Set TRUST_PROXY=1 there so rate limiting sees each visitor's real IP. Leave unset locally.
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);

// Allow the frontend (on another origin) to load uploaded avatars.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Health check: confirms the API is up and can reach MySQL.
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', database: 'unreachable' });
  }
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/groups', require('./routes/groupRoutes'));
app.use('/api/expenses', require('./routes/expenseRoutes'));
app.use('/api/settlements', require('./routes/settlementRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/budgets', require('./routes/budgetRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
// More routes will be mounted here as we build each module.

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use(errorHandler);

module.exports = app;
