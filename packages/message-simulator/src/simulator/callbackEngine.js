/**
 * Callback Engine — POSTs delivery events back to CRM with retry
 * Simulates real-world webhook callbacks from a messaging provider
 */
const axios = require('axios');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Send callback with exponential backoff retry
 * @param {string} url - CRM receipt webhook URL
 * @param {object} body - Event payload
 * @param {number} attempts - Max retry attempts (default 3)
 */
async function callbackWithRetry(url, body, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      await axios.post(url, body, { timeout: 5000 });
      return true;
    } catch (err) {
      if (i === attempts - 1) {
        console.error(`❌ Callback failed after ${attempts} retries:`, err.message, body.idempotencyKey);
        return false;
      }
      // Exponential backoff: 1s, 2s, 4s
      await sleep(1000 * Math.pow(2, i));
    }
  }
}

module.exports = { callbackWithRetry, sleep };
