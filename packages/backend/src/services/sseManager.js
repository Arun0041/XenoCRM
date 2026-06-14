/**
 * SSE (Server-Sent Events) Manager
 * Manages persistent connections per campaign for real-time stat updates.
 * In-memory — suitable for single-instance deployment.
 * TODO: For horizontal scaling, use Redis pub/sub to broadcast across instances
 */
const clients = new Map(); // campaignId → Set<res>

function addClient(campaignId, res) {
  if (!clients.has(campaignId)) {
    clients.set(campaignId, new Set());
  }
  clients.get(campaignId).add(res);
  console.log(`📡 SSE client connected for campaign ${campaignId} (${clients.get(campaignId).size} total)`);
}

function removeClient(campaignId, res) {
  const campaignClients = clients.get(campaignId);
  if (campaignClients) {
    campaignClients.delete(res);
    if (campaignClients.size === 0) {
      clients.delete(campaignId);
    }
    console.log(`📡 SSE client disconnected for campaign ${campaignId}`);
  }
}

function pushStats(campaignId, stats) {
  const campaignClients = clients.get(campaignId);
  if (!campaignClients || campaignClients.size === 0) return;

  const data = `data: ${JSON.stringify(stats)}\n\n`;
  campaignClients.forEach(res => {
    try {
      res.write(data);
    } catch (err) {
      // Client likely disconnected
      campaignClients.delete(res);
    }
  });
}

function getClientCount(campaignId) {
  return clients.get(campaignId)?.size || 0;
}

module.exports = { addClient, removeClient, pushStats, getClientCount };
