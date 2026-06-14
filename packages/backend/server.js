require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./src/middleware/errorHandler');
const { setupWorkers } = require('./src/workers/workerSetup');

const app = express();

// ─── Middleware ────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// ─── Routes ───────────────────────────────────────────────
const { requireAuth } = require('./src/middleware/authMiddleware');

app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/webhooks', require('./src/routes/webhooks')); // Webhooks must be public

// Protect all CRM routes
app.use('/api/customers', requireAuth, require('./src/routes/customers'));
app.use('/api/segments', requireAuth, require('./src/routes/segments'));
app.use('/api/orders', requireAuth, require('./src/routes/orders'));
app.use('/api/campaigns', requireAuth, require('./src/routes/campaigns'));
app.use('/api/ai', requireAuth, require('./src/routes/ai'));

app.use('/api', require('./src/routes/sse')); // Custom auth inside sse.js

// ─── Health Check ─────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'crm-backend', timestamp: new Date().toISOString() });
});

// ─── Error Handler ────────────────────────────────────────
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

async function start() {
  try {
    // Initialize BullMQ workers
    await setupWorkers();
    console.log('✅ BullMQ workers initialized');

    app.listen(PORT, () => {
      console.log(`🚀 CRM Backend running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to start CRM backend:', err);
    process.exit(1);
  }
}

start();
