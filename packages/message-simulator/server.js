require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sendRouter = require('./src/routes/send');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/', sendRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'channel-stub', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`📡 Channel Stub running on http://localhost:${PORT}`);
});
