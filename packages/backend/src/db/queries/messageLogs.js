/**
 * Message log query module — raw SQL via pg Pool
 * Implements forward-only status transitions and idempotent event recording
 */
const pool = require('../pool');

// ─── Create a message log entry ──────────────────────────
async function createMessageLog(campaignId, customerId, channel, recipientAddress, personalizedMessage, idempotencyKey) {
  const result = await pool.query(
    `INSERT INTO message_logs (campaign_id, customer_id, channel, recipient_address, personalized_message, idempotency_key)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (idempotency_key) DO NOTHING
     RETURNING *`,
    [campaignId, customerId, channel, recipientAddress, personalizedMessage, idempotencyKey]
  );
  return result.rows[0];
}

// ─── Forward-only status update ──────────────────────────
// The SQL ensures we only move FORWARD in the status lifecycle:
// queued → sent → delivered → opened → read → clicked
// A 'read' cannot downgrade a 'clicked'. 'failed' is a terminal branch.
async function updateMessageLogStatus(idempotencyKey, newStatus, timestampField) {
  const validFields = ['sent_at','delivered_at','opened_at','read_at','clicked_at','failed_at'];
  if (!validFields.includes(timestampField)) throw new Error(`Invalid timestamp field: ${timestampField}`);

  const statusOrder = ['queued','sent','delivered','opened','read','clicked','failed'];

  const sql = `
    UPDATE message_logs
    SET
      status = $2,
      ${timestampField} = NOW()
    WHERE
      idempotency_key = $1
      AND status != $2
      AND (
        $2 = 'failed'
        OR ARRAY_POSITION(
          ARRAY['queued','sent','delivered','opened','read','clicked']::text[],
          status::text
        ) < ARRAY_POSITION(
          ARRAY['queued','sent','delivered','opened','read','clicked']::text[],
          $2::text
        )
      )
    RETURNING *
  `;

  const result = await pool.query(sql, [idempotencyKey, newStatus]);
  return result.rows[0] || null;
}

// ─── Record a message event (idempotent) ─────────────────
// ON CONFLICT DO NOTHING prevents duplicate events for the same (messageLogId, status)
async function recordMessageEvent(messageLogId, status) {
  await pool.query(
    `INSERT INTO message_events (message_log_id, status)
     VALUES ($1, $2)
     ON CONFLICT (message_log_id, status) DO NOTHING`,
    [messageLogId, status]
  );
}

// ─── Get aggregate campaign stats ────────────────────────
async function getCampaignStats(campaignId) {
  const result = await pool.query(
    `SELECT
       COUNT(*) as total,
       COUNT(CASE WHEN status = 'queued' THEN 1 END) as queued,
       COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
       COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
       COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
       COUNT(CASE WHEN status = 'opened' THEN 1 END) as opened,
       COUNT(CASE WHEN status = 'read' THEN 1 END) as read,
       COUNT(CASE WHEN status = 'clicked' THEN 1 END) as clicked
     FROM message_logs
     WHERE campaign_id = $1`,
    [campaignId]
  );
  return result.rows[0];
}

// ─── Get message log by idempotency key ──────────────────
async function getMessageLogByIdempotencyKey(key) {
  const result = await pool.query(
    'SELECT * FROM message_logs WHERE idempotency_key = $1',
    [key]
  );
  return result.rows[0];
}

// ─── Get paginated campaign logs ─────────────────────────
async function getCampaignLogs(campaignId, page = 1, limit = 20) {
  const offset = (page - 1) * limit;

  const [logsResult, countResult] = await Promise.all([
    pool.query(
      `SELECT ml.*, c.name as customer_name, c.email as customer_email
       FROM message_logs ml
       LEFT JOIN customers c ON ml.customer_id = c.id
       WHERE ml.campaign_id = $1
       ORDER BY ml.created_at DESC
       LIMIT $2 OFFSET $3`,
      [campaignId, limit, offset]
    ),
    pool.query(
      'SELECT COUNT(*) FROM message_logs WHERE campaign_id = $1',
      [campaignId]
    ),
  ]);

  return {
    logs: logsResult.rows,
    total: parseInt(countResult.rows[0].count),
    page,
    totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
  };
}

module.exports = {
  createMessageLog,
  updateMessageLogStatus,
  recordMessageEvent,
  getCampaignStats,
  getMessageLogByIdempotencyKey,
  getCampaignLogs,
};
