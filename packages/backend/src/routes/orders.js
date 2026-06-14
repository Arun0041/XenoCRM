const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { bulkImportOrders } = require('../db/queries/orders');

// Bulk import orders
router.post('/import', asyncHandler(async (req, res) => {
  const { orders } = req.body;
  
  if (!Array.isArray(orders)) {
    return res.status(400).json({ error: 'Expected { orders: [...] }' });
  }
  
  const imported = await bulkImportOrders(orders, req.user.id);
  res.json({ imported: imported.length, orders: imported });
}));

module.exports = router;
