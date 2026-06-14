/**
 * Customer query module — raw SQL via pg Pool
 * Handles CRUD, bulk import, stats, and dynamic segment filtering
 */
const pool = require('../pool');

// ─── List customers with optional filters ─────────────────
async function getAllCustomers(filters = {}, userId) {
  const conditions = ['user_id = $1'];
  const values = [userId];
  let i = 2;

  if (filters.city) {
    conditions.push(`city = $${i++}`);
    values.push(filters.city);
  }
  if (filters.search) {
    conditions.push(`(name ILIKE $${i} OR email ILIKE $${i})`);
    values.push(`%${filters.search}%`);
    i++;
  }
  if (filters.tag) {
    conditions.push(`$${i++} = ANY(tags)`);
    values.push(filters.tag);
  }

  const limit = parseInt(filters.limit) || 50;
  const offset = parseInt(filters.offset) || 0;

  const sql = `
    SELECT * FROM customers
    WHERE ${conditions.join(' AND ')}
    ORDER BY created_at DESC
    LIMIT $${i++} OFFSET $${i++}
  `;
  values.push(limit, offset);

  const countSql = `SELECT COUNT(*) FROM customers WHERE ${conditions.join(' AND ')}`;
  const countValues = values.slice(0, values.length - 2);

  const [result, countResult] = await Promise.all([
    pool.query(sql, values),
    pool.query(countSql, countValues),
  ]);

  return {
    customers: result.rows,
    total: parseInt(countResult.rows[0].count),
  };
}

// ─── Get single customer ──────────────────────────────────
async function getCustomerById(id, userId) {
  const result = await pool.query('SELECT * FROM customers WHERE id = $1 AND user_id = $2', [id, userId]);
  return result.rows[0];
}

// ─── Create customer ──────────────────────────────────────
async function createCustomer(data, userId) {
  const { name, email, phone, city, tags = [] } = data;
  const result = await pool.query(
    `INSERT INTO customers (user_id, name, email, phone, city, tags)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [userId, name, email, phone, city, tags]
  );
  return result.rows[0];
}

// ─── Bulk import ──────────────────────────────────────────
async function bulkImportCustomers(customers, userId) {
  const validCustomers = customers.filter(c => c.name && c.email);
  if (validCustomers.length === 0) return [];

  const values = [];
  const params = [];
  let paramIdx = 1;

  for (const c of validCustomers) {
    values.push(`($${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++})`);
    params.push(userId, c.name, c.email, c.phone || null, c.city || null, c.tags || '{}', c.total_orders || 0, c.total_spent || 0);
  }

  const query = `
    INSERT INTO customers (user_id, name, email, phone, city, tags, total_orders, total_spent)
    VALUES ${values.join(', ')}
    ON CONFLICT (user_id, email) DO UPDATE SET
      name = EXCLUDED.name,
      phone = COALESCE(EXCLUDED.phone, customers.phone),
      city = COALESCE(EXCLUDED.city, customers.city),
      tags = COALESCE(EXCLUDED.tags, customers.tags)
    RETURNING *
  `;

  const result = await pool.query(query, params);
  return result.rows;
}

// ─── Aggregate stats ──────────────────────────────────────
async function getCustomerStats(userId) {
  const result = await pool.query(`
    SELECT
      COUNT(*) as total_customers,
      COALESCE(AVG(total_spent), 0) as avg_spent,
      COALESCE(SUM(total_spent), 0) as total_revenue,
      COUNT(CASE WHEN last_order_date > NOW() - INTERVAL '30 days' THEN 1 END) as active_last_30_days
    FROM customers
    WHERE user_id = $1
  `, [userId]);
  return result.rows[0];
}

// ─── Dynamic segment filter engine ────────────────────────
// Builds WHERE clause from filter JSON — core of the segmentation engine
async function getCustomersByFilters(filters = {}, userId) {
  const conditions = ['c.user_id = $1'];
  const values = [userId];
  let i = 2;

  // Always join orders for accurate aggregation
  let baseQuery = `
    SELECT
      c.*,
      COALESCE(SUM(o.amount), 0)::numeric AS computed_spent,
      COUNT(o.id)::int AS computed_orders,
      MAX(o.ordered_at) AS computed_last_order
    FROM customers c
    LEFT JOIN orders o ON o.customer_id = c.id
  `;

  // Order date window filter (applied on the JOIN, not WHERE, so we still get customers with 0 orders)
  // We handle this via HAVING after GROUP BY

  const havingConditions = [];

  if (filters.city) {
    conditions.push(`c.city ILIKE $${i++}`);
    values.push(filters.city);
  }

  if (filters.tags && filters.tags.length > 0) {
    conditions.push(`c.tags && $${i++}`);
    values.push(filters.tags);
  }

  // Build WHERE clause (on customers table columns only)
  if (conditions.length > 0) {
    baseQuery += ` WHERE ${conditions.join(' AND ')}`;
  }

  baseQuery += ` GROUP BY c.id`;

  // HAVING filters (on aggregated order data)
  if (filters.min_spent !== undefined && filters.min_spent !== null && filters.min_spent !== '') {
    const val = Number(filters.min_spent);
    if (!Number.isNaN(val)) {
      havingConditions.push(`COALESCE(SUM(o.amount), 0) >= $${i++}`);
      values.push(val);
    }
  }

  if (filters.max_spent !== undefined && filters.max_spent !== null && filters.max_spent !== '') {
    const val = Number(filters.max_spent);
    if (!Number.isNaN(val)) {
      havingConditions.push(`COALESCE(SUM(o.amount), 0) <= $${i++}`);
      values.push(val);
    }
  }

  if (filters.min_orders !== undefined && filters.min_orders !== null && filters.min_orders !== '') {
    const val = Number(filters.min_orders);
    if (!Number.isNaN(val)) {
      havingConditions.push(`COUNT(o.id) >= $${i++}`);
      values.push(val);
    }
  }

  if (filters.days_since_last_order !== undefined && filters.days_since_last_order !== null && filters.days_since_last_order !== '') {
    const val = Number(filters.days_since_last_order);
    if (!Number.isNaN(val)) {
      havingConditions.push(`(MAX(o.ordered_at) IS NULL OR MAX(o.ordered_at) <= NOW() - ($${i++} || ' days')::INTERVAL)`);
      values.push(val);
    }
  }

  if (filters.days_active_within !== undefined && filters.days_active_within !== null && filters.days_active_within !== '') {
    const val = Number(filters.days_active_within);
    if (!Number.isNaN(val)) {
      havingConditions.push(`MAX(o.ordered_at) >= NOW() - ($${i++} || ' days')::INTERVAL`);
      values.push(val);
    }
  }

  if (filters.last_ordered_before) {
    havingConditions.push(`MAX(o.ordered_at) < $${i++}::DATE`);
    values.push(filters.last_ordered_before);
  }

  if (filters.last_ordered_after) {
    havingConditions.push(`MAX(o.ordered_at) > $${i++}::DATE`);
    values.push(filters.last_ordered_after);
  }

  if (havingConditions.length > 0) {
    baseQuery += ` HAVING ${havingConditions.join(' AND ')}`;
  }

  baseQuery += ` ORDER BY computed_spent DESC`;

  const result = await pool.query(baseQuery, values);
  return result.rows;
}

module.exports = {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  bulkImportCustomers,
  getCustomerStats,
  getCustomersByFilters,
};
