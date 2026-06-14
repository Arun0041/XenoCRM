/**
 * BullMQ Worker Setup
 * Initializes Redis connection, campaign queue, and exports getters
 * 
 * Design decisions:
 * - Single Queue instance shared across the app
 * - Redis connection configured from environment
 * - concurrency:10 for the worker (process 10 jobs simultaneously)
 * TODO: Add JWT auth for production
 * TODO: Add rate limiting on APIs
 */
const { Queue } = require('bullmq');
const IORedis = require('ioredis');

let connection = null;
let campaignQueue = null;

function getRedisConnection() {
  if (!connection) {
    connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null, // Required by BullMQ
    });
    connection.on('error', (err) => {
      console.error('Redis connection error:', err.message);
    });
  }
  return connection;
}

function getCampaignQueue() {
  if (!campaignQueue) {
    campaignQueue = new Queue('campaign-sends', {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });
  }
  return campaignQueue;
}

async function setupWorkers() {
  // Import and start the send worker
  const { startSendWorker } = require('./sendWorker');
  startSendWorker(getRedisConnection());
  console.log('📨 Send worker started (concurrency: 10)');
}

module.exports = {
  getRedisConnection,
  getCampaignQueue,
  setupWorkers,
};
