/**
 * Segment query module — raw SQL via pg Pool
 */
const pool = require('../pool');
const { getCustomersByFilters } = require('./customers');

// ─── List all segments ────────────────────────────────────
async function getAllSegments(userId) {
  const result = await pool.query(
    'SELECT * FROM segments WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return result.rows;
}

// ─── Get segment by ID ───────────────────────────────────
async function getSegmentById(id, userId) {
  const result = await pool.query('SELECT * FROM segments WHERE id = $1 AND user_id = $2', [id, userId]);
  return result.rows[0];
}

// ─── Create segment ──────────────────────────────────────
async function createSegment(name, description, filters, aiPrompt, customerCount, userId) {
  const result = await pool.query(
    `INSERT INTO segments (user_id, name, description, filters, ai_prompt, customer_count)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [userId, name, description, JSON.stringify(filters), aiPrompt, customerCount]
  );
  return result.rows[0];
}

// ─── Get customers in a segment (resolves filters) ────────
async function getCustomersInSegment(segmentId, userId) {
  const segment = await getSegmentById(segmentId, userId);
  if (!segment) throw new Error('Segment not found');

  const filters = typeof segment.filters === 'string'
    ? JSON.parse(segment.filters)
    : segment.filters;

  return getCustomersByFilters(filters, userId);
}

// ─── Update segment customer count ────────────────────────
async function updateSegmentCount(id, count, userId) {
  await pool.query(
    'UPDATE segments SET customer_count = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
    [count, id, userId]
  );
}

module.exports = {
  getAllSegments,
  getSegmentById,
  createSegment,
  getCustomersInSegment,
  updateSegmentCount,
};
