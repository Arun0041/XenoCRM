/**
 * Customer routes
 * GET  /api/customers          — List with filters (search, city, tag, pagination)
 * POST /api/customers          — Create single customer
 * POST /api/customers/import   — Bulk import (JSON array)
 * GET  /api/customers/stats    — Aggregate stats for dashboard
 * GET  /api/customers/dummy    — Generate dummy data
 */
const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { asyncHandler } = require('../middleware/errorHandler');
const { generateDummyData } = require('../utils/dummyData');
const {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  bulkImportCustomers,
  getCustomerStats,
} = require('../db/queries/customers');

// Generate dummy data JSON for the frontend Sandbox
router.get('/dummy', asyncHandler(async (req, res) => {
  const data = generateDummyData();
  res.json(data);
}));

// List customers with optional filters
router.get('/', asyncHandler(async (req, res) => {
  const { search, city, tag, limit, offset } = req.query;
  const result = await getAllCustomers({ search, city, tag, limit, offset }, req.user.id);
  res.json(result);
}));

// Aggregate stats
router.get('/stats', asyncHandler(async (req, res) => {
  const stats = await getCustomerStats(req.user.id);
  res.json(stats);
}));

// Get single customer
router.get('/:id', asyncHandler(async (req, res) => {
  const customer = await getCustomerById(req.params.id, req.user.id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  res.json(customer);
}));

// Create customer
router.post('/', asyncHandler(async (req, res) => {
  const customer = await createCustomer(req.body, req.user.id);
  res.status(201).json(customer);
}));

// Bulk import
router.post('/import', asyncHandler(async (req, res) => {
  const { customers } = req.body;
  if (!Array.isArray(customers)) {
    return res.status(400).json({ error: 'Expected { customers: [...] }' });
  }
  const imported = await bulkImportCustomers(customers, req.user.id);
  res.json({ imported: imported.length, customers: imported });
}));

module.exports = router;
