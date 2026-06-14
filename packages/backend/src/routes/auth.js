const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { asyncHandler } = require('../middleware/errorHandler');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post('/google', asyncHandler(async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: 'Missing Google credential' });

  // 1. Verify token with Google
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  const { sub: google_id, email, name, picture: avatar_url } = payload;

  // 2. Upsert user into database
  const result = await pool.query(
    `INSERT INTO users (google_id, email, name, avatar_url)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (google_id) DO UPDATE SET
       name = EXCLUDED.name,
       avatar_url = EXCLUDED.avatar_url,
       email = EXCLUDED.email
     RETURNING id, email, name, avatar_url`,
    [google_id, email, name, avatar_url]
  );
  const user = result.rows[0];

  // 3. Generate our own JWT session
  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ token, user });
}));

module.exports = router;
