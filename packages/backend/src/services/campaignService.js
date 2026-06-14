/**
 * Campaign Service — orchestrates campaign dispatch
 * Personalizes messages and enqueues one BullMQ job per recipient
 */
const { getCustomersInSegment } = require('../db/queries/segments');
const { getCampaignById, updateCampaignStatus, incrementCampaignStat } = require('../db/queries/campaigns');
const { createMessageLog } = require('../db/queries/messageLogs');
const { getCampaignQueue } = require('../workers/workerSetup');

async function dispatchCampaign(campaignId, userId) {
  const campaign = await getCampaignById(campaignId, userId);
  if (!campaign) throw new Error('Campaign not found');
  if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
    throw new Error(`Campaign cannot be sent — current status: ${campaign.status}`);
  }

  const customers = await getCustomersInSegment(campaign.segment_id, userId);
  if (customers.length === 0) {
    throw new Error('No customers match this segment');
  }

  // Mark campaign as sending
  await updateCampaignStatus(campaign.id, 'sending', {
    sent_at: new Date(),
    total_recipients: customers.length,
  });

  const queue = getCampaignQueue();

  // Personalize and enqueue one job per recipient
  // Personalization before enqueue: the worker receives the final message,
  // making worker logic simpler and job payloads inspectable
  for (const customer of customers) {
    const personalizedMessage = campaign.message_template
      .replace(/\{\{name\}\}/g, customer.name.split(' ')[0])
      .replace(/\{\{city\}\}/g, customer.city || '');

    const idempotencyKey = `${campaign.id}:${customer.id}`;
    const recipientAddress = campaign.channel === 'email'
      ? customer.email
      : customer.phone;

    // Insert message log (idempotent — ON CONFLICT DO NOTHING)
    const log = await createMessageLog(
      campaign.id,
      customer.id,
      campaign.channel,
      recipientAddress,
      personalizedMessage,
      idempotencyKey
    );

    if (log) {
      // Enqueue to BullMQ for the worker to process
      await queue.add('send-message', {
        messageLogId: log.id,
        recipientAddress,
        personalizedMessage,
        channel: campaign.channel,
        campaignId: campaign.id,
        idempotencyKey,
      }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      });
    }
  }

  return { totalRecipients: customers.length };
}

async function checkAndFinalizeCampaign(campaignId) {
  const pool = require('../db/pool');
  const result = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'queued' OR status = 'sent') AS pending,
      COUNT(*) FILTER (WHERE status = 'failed') AS failed,
      COUNT(*) AS total
    FROM message_logs
    WHERE campaign_id = $1
  `, [campaignId]);

  const { pending, failed, total } = result.rows[0];

  if (parseInt(pending) === 0) {
    const finalStatus = parseInt(failed) > 0 && parseInt(failed) < parseInt(total)
      ? 'partially_failed'
      : parseInt(failed) === parseInt(total)
      ? 'failed'
      : 'completed';

    await pool.query(
      `UPDATE campaigns SET status = $2, completed_at = NOW() WHERE id = $1`,
      [campaignId, finalStatus]
    );
  }
}

module.exports = { dispatchCampaign, checkAndFinalizeCampaign };
