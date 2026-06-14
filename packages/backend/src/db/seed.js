// seed.js — run with: node src/db/seed.js
require('dotenv').config();
const pool = require('./pool');
const { v4: uuidv4 } = require('uuid');

const CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Pune', 'Hyderabad'];
const TAGS_POOL = [
  ['loyalist', 'high-value'],
  ['new', 'app-user'],
  ['churned'],
  ['weekend-buyer', 'loyalist'],
  ['high-value'],
  ['new'],
  ['churned', 'price-sensitive'],
  ['app-user'],
];
const COFFEE_ITEMS = [
  { name: 'Oat Latte', price: 320 },
  { name: 'Cold Brew', price: 280 },
  { name: 'Cappuccino', price: 250 },
  { name: 'Flat White', price: 300 },
  { name: 'Matcha Latte', price: 350 },
  { name: 'Espresso', price: 180 },
  { name: 'Croissant', price: 220 },
];

async function seed() {
  console.log('Seeding...');

  // Clear in order
  await pool.query(`DELETE FROM message_events`);
  await pool.query(`DELETE FROM message_logs`);
  await pool.query(`DELETE FROM campaigns`);
  await pool.query(`DELETE FROM segments`);
  await pool.query(`DELETE FROM orders`);
  await pool.query(`DELETE FROM customers`);

  // 50 customers
  const customerIds = [];
  const firstNames = ['Priya','Arjun','Sneha','Rahul','Meera','Vikram','Ananya','Karan','Divya','Rohit',
    'Pooja','Amit','Swati','Nikhil','Kavya','Siddharth','Nisha','Aditya','Riya','Manish',
    'Tanya','Suresh','Deepika','Aakash','Simran','Varun','Anjali','Rajesh','Neha','Gaurav',
    'Ishaan','Shruti','Pratik','Komal','Yash','Pallavi','Mihir','Sakshi','Vivek','Trisha',
    'Akshay','Bhavna','Dhruv','Preeti','Chirag','Monika','Harsh','Swara','Neel','Zara'];
  const lastNames = ['Sharma','Patel','Iyer','Singh','Gupta','Mehta','Nair','Joshi','Agarwal','Kumar'];

  for (let i = 0; i < 50; i++) {
    const id = uuidv4();
    const name = `${firstNames[i]} ${lastNames[i % lastNames.length]}`;
    const city = CITIES[i % CITIES.length];
    const tags = TAGS_POOL[i % TAGS_POOL.length];
    const email = `${firstNames[i].toLowerCase()}${i}@example.com`;
    const phone = `+91${9000000000 + i}`;

    await pool.query(`
      INSERT INTO customers (id, name, email, phone, city, tags, created_at)
      VALUES ($1,$2,$3,$4,$5,$6, NOW() - ($7 || ' days')::INTERVAL)
    `, [id, name, email, phone, city, tags, Math.floor(Math.random() * 180)]);

    customerIds.push(id);
  }

  // 3-8 orders per customer
  for (const customerId of customerIds) {
    const orderCount = 3 + Math.floor(Math.random() * 6);
    for (let j = 0; j < orderCount; j++) {
      const items = Array.from({ length: 1 + Math.floor(Math.random() * 3) }, () => {
        const item = COFFEE_ITEMS[Math.floor(Math.random() * COFFEE_ITEMS.length)];
        return { ...item, qty: 1 + Math.floor(Math.random() * 2) };
      });
      const amount = items.reduce((sum, it) => sum + it.price * it.qty, 0);
      const daysAgo = Math.floor(Math.random() * 90);

      await pool.query(`
        INSERT INTO orders (id, customer_id, amount, items, ordered_at)
        VALUES ($1,$2,$3,$4, NOW() - ($5 || ' days')::INTERVAL)
      `, [uuidv4(), customerId, amount, JSON.stringify(items), daysAgo]);
    }
  }

  // Update customer aggregates from actual orders
  await pool.query(`
    UPDATE customers c SET
      total_orders = sub.cnt,
      total_spent = sub.total,
      last_order_date = sub.last_date
    FROM (
      SELECT customer_id, COUNT(*) as cnt, SUM(amount) as total, MAX(ordered_at) as last_date
      FROM orders GROUP BY customer_id
    ) sub
    WHERE c.id = sub.customer_id
  `);

  // 4 segments
  const seg1 = uuidv4(), seg2 = uuidv4(), seg3 = uuidv4(), seg4 = uuidv4();
  await pool.query(`INSERT INTO segments (id,name,description,filters) VALUES
    ($1,'High Value Loyalists','Customers who spent over ₹5000 and are loyal','{"min_spent":5000,"tags":["loyalist"]}'),
    ($2,'At-Risk Churners','Customers inactive for 45+ days','{"days_since_last_order":45}'),
    ($3,'New Users','Recently acquired customers','{"tags":["new"]}'),
    ($4,'Mumbai High Spenders','High spenders in Mumbai','{"city":"Mumbai","min_spent":2000}')
  `, [seg1, seg2, seg3, seg4]);

  // Update segment customer counts
  for (const [segId, filters] of [[seg1,{min_spent:5000,tags:['loyalist']}],[seg2,{days_since_last_order:45}],[seg3,{tags:['new']}],[seg4,{city:'Mumbai',min_spent:2000}]]) {
    // simple count update using tags filter on customers table for seed
    const tagFilter = filters.tags ? `AND tags && ARRAY[${filters.tags.map(t=>`'${t}'`).join(',')}]::text[]` : '';
    const spentFilter = filters.min_spent ? `AND total_spent >= ${filters.min_spent}` : '';
    const cityFilter = filters.city ? `AND city = '${filters.city}'` : '';
    const r = await pool.query(`SELECT COUNT(*) FROM customers WHERE 1=1 ${tagFilter} ${spentFilter} ${cityFilter}`);
    await pool.query(`UPDATE segments SET customer_count = $1 WHERE id = $2`, [parseInt(r.rows[0].count), segId]);
  }

  // 2 completed campaigns with realistic stats already populated
  const camp1Id = uuidv4(), camp2Id = uuidv4();
  await pool.query(`INSERT INTO campaigns (id,name,segment_id,channel,message_template,status,total_recipients,stats,sent_at,completed_at) VALUES
    ($1,'Monsoon Loyalty Drive',${`'${seg1}'`},'whatsapp','Hi {{name}}! ☕ Monsoon calls for your favourite brew. Enjoy 20% off your next order in {{city}}. Use code BREW20. Valid till Sunday!','completed',23,'{"sent":23,"delivered":21,"failed":2,"opened":17,"read":14,"clicked":8}',NOW()-'5 days'::INTERVAL,NOW()-'5 days'::INTERVAL),
    ($2,'Win-Back Campaign',${`'${seg2}'`},'email','Hey {{name}}, we miss you! It has been a while since your last visit. Come back to BrewCo and enjoy a free coffee on us. No strings attached.','completed',18,'{"sent":18,"delivered":15,"failed":3,"opened":7,"read":5,"clicked":2}',NOW()-'2 days'::INTERVAL,NOW()-'2 days'::INTERVAL)
  `, [camp1Id, camp2Id]);

  console.log('Seed complete. 50 customers, orders, 4 segments, 2 completed campaigns.');
  await pool.end();
}

seed().catch(e => { console.error(e); process.exit(1); });
