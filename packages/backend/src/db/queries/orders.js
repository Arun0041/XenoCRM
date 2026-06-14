const pool = require('../pool');

/**
 * Bulk import orders and automatically recalculate customer stats
 */
async function bulkImportOrders(orders, userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const imported = [];
    const affectedCustomerIds = new Set();

    for (const o of orders) {
      // customer_email and amount are strictly mandatory
      if (!o.customer_email || o.amount === undefined || o.amount === null) {
        console.warn('Skipping order missing customer_email or amount:', o);
        continue;
      }

      // 1. Lookup customer by email and user_id
      const customerRes = await client.query(
        'SELECT id FROM customers WHERE email = $1 AND user_id = $2',
        [o.customer_email, userId]
      );
      
      if (customerRes.rows.length === 0) {
        console.warn('Skipping order for unknown customer email:', o.customer_email);
        continue;
      }
      
      const customerId = customerRes.rows[0].id;
      affectedCustomerIds.add(customerId);

      // 2. Insert order
      const result = await client.query(
        `INSERT INTO orders (customer_id, amount, items, ordered_at)
         VALUES ($1, $2, $3, COALESCE($4::TIMESTAMPTZ, NOW()))
         RETURNING *`,
        [customerId, o.amount, o.items ? JSON.stringify(o.items) : '[]', o.ordered_at || null]
      );
      
      imported.push(result.rows[0]);
    }

    // 3. Recalculate stats for all affected customers
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
    return imported;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { bulkImportOrders };
