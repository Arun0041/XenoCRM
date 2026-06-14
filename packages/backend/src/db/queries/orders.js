const pool = require('../pool');

/**
 * Bulk import orders and automatically recalculate customer stats
 */
async function bulkImportOrders(orders, userId) {
  const validOrders = orders.filter(o => o.customer_email && o.amount !== undefined && o.amount !== null);
  if (validOrders.length === 0) return [];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Get all customer IDs in a single query
    const emails = [...new Set(validOrders.map(o => o.customer_email))];
    const customerRes = await client.query(
      'SELECT id, email FROM customers WHERE user_id = $1 AND email = ANY($2)',
      [userId, emails]
    );
    const emailToId = {};
    customerRes.rows.forEach(r => { emailToId[r.email] = r.id; });

    // 2. Prepare bulk insert
    const values = [];
    const params = [];
    let paramIdx = 1;
    const affectedCustomerIds = new Set();

    for (const o of validOrders) {
      const customerId = emailToId[o.customer_email];
      if (!customerId) continue; // Skip if customer doesn't exist

      affectedCustomerIds.add(customerId);
      values.push(`($${paramIdx++}, $${paramIdx++}, $${paramIdx++}, COALESCE($${paramIdx++}::TIMESTAMPTZ, NOW()))`);
      params.push(customerId, o.amount, o.items ? JSON.stringify(o.items) : '[]', o.ordered_at || null);
    }

    if (values.length === 0) {
      await client.query('ROLLBACK');
      return [];
    }

    const insertQuery = `
      INSERT INTO orders (customer_id, amount, items, ordered_at)
      VALUES ${values.join(', ')}
      RETURNING *
    `;
    const result = await client.query(insertQuery, params);

    // 3. Recalculate stats for all affected customers in bulk
    if (affectedCustomerIds.size > 0) {
      const idsArray = Array.from(affectedCustomerIds);
      await client.query(
        `UPDATE customers c SET
          total_orders = sub.cnt,
          total_spent = sub.total,
          last_order_date = sub.last_date
        FROM (
          SELECT customer_id, COUNT(*) as cnt, SUM(amount) as total, MAX(ordered_at) as last_date
          FROM orders
          WHERE customer_id = ANY($1::uuid[])
          GROUP BY customer_id
        ) sub
        WHERE c.id = sub.customer_id`,
        [idsArray]
      );
    }

    await client.query('COMMIT');
    return result.rows;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { bulkImportOrders };
