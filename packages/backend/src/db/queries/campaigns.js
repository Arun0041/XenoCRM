/**
 * Campaign query module — raw SQL via pg Pool
 */
const pool = require('../pool');

// ─── List all campaigns ──────────────────────────────────
async function getAllCampaigns(userId) {
  const result = await pool.query(`
    SELECT c.*, s.name as segment_name, s.customer_count as segment_size
    FROM campaigns c
    LEFT JOIN segments s ON c.segment_id = s.id
    WHERE c.user_id = $1
    ORDER BY c.created_at DESC
  `, [userId]);
  return result.rows;
}

// ─── Get campaign by ID ──────────────────────────────────
async function getCampaignById(id, userId) {
  const result = await pool.query(`
    SELECT c.*, s.name as segment_name, s.filters as segment_filters
    FROM campaigns c
    LEFT JOIN segments s ON c.segment_id = s.id
    WHERE c.id = $1 AND c.user_id = $2
  `, [id, userId]);
  return result.rows[0];
}

// ─── Create campaign ─────────────────────────────────────
async function createCampaign(data, userId) {
  const { name, segment_id, channel, message_template, scheduled_at } = data;
  const result = await pool.query(
    `INSERT INTO campaigns (user_id, name, segment_id, channel, message_template, scheduled_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [userId, name, segment_id, channel, message_template, scheduled_at || null]
  );
  return result.rows[0];
}

// ─── Update campaign status ──────────────────────────────
async function updateCampaignStatus(id, status, extra = {}) {
  const sets = ['status = $2'];
  const values = [id, status];
  let i = 3;

  if (extra.sent_at) {
    sets.push(`sent_at = $${i++}`);
    values.push(extra.sent_at);
  }
  if (extra.completed_at) {
    sets.push(`completed_at = $${i++}`);
    values.push(extra.completed_at);
  }
  if (extra.total_recipients != null) {
    sets.push(`total_recipients = $${i++}`);
    values.push(extra.total_recipients);
  }

  const result = await pool.query(
    `UPDATE campaigns SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
    values
  );
  return result.rows[0];
}

// ─── Atomic stats increment ──────────────────────────────
// Uses JSONB set to atomically increment a specific stat counter
async function incrementCampaignStat(campaignId, statKey) {
  const validKeys = ['sent', 'delivered', 'failed', 'opened', 'read', 'clicked'];
  if (!validKeys.includes(statKey)) return;

  await pool.query(
    `UPDATE campaigns
     SET stats = jsonb_set(
       stats,
       $2,
       (COALESCE((stats->>$3)::int, 0) + 1)::text::jsonb
     )
     WHERE id = $1`,
    [campaignId, `{${statKey}}`, statKey]
  );
}

// ─── Get campaign count ──────────────────────────────────
async function getCampaignCount(userId) {
  const result = await pool.query('SELECT COUNT(*) FROM campaigns WHERE user_id = $1', [userId]);
  return parseInt(result.rows[0].count);
}

// ─── Get recent campaigns ────────────────────────────────
async function getRecentCampaigns(userId, limit = 5) {
  const result = await pool.query(`
    SELECT c.*, s.name as segment_name
    FROM campaigns c
    LEFT JOIN segments s ON c.segment_id = s.id
    WHERE c.user_id = $1
    ORDER BY c.created_at DESC
    LIMIT $2
  `, [userId, limit]);
  return result.rows;
}

module.exports = {
  getAllCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaignStatus,
  incrementCampaignStat,
  getCampaignCount,
  getRecentCampaigns,
};
