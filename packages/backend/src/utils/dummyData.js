const CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Pune', 'Hyderabad'];
const TAGS_POOL = [
  ['loyalist', 'high-value'], ['new', 'app-user'], ['churned'], ['weekend-buyer', 'loyalist'],
  ['high-value'], ['new'], ['churned', 'price-sensitive'], ['app-user']
];
const COFFEE_ITEMS = [
  { name: 'Oat Latte', price: 320 }, { name: 'Cold Brew', price: 280 }, { name: 'Cappuccino', price: 250 },
  { name: 'Flat White', price: 300 }, { name: 'Matcha Latte', price: 350 }, { name: 'Espresso', price: 180 }, { name: 'Croissant', price: 220 }
];
const firstNames = ['Priya','Arjun','Sneha','Rahul','Meera','Vikram','Ananya','Karan','Divya','Rohit',
  'Pooja','Amit','Swati','Nikhil','Kavya','Siddharth','Nisha','Aditya','Riya','Manish',
  'Tanya','Suresh','Deepika','Aakash','Simran','Varun','Anjali','Rajesh','Neha','Gaurav',
  'Ishaan','Shruti','Pratik','Komal','Yash','Pallavi','Mihir','Sakshi','Vivek','Trisha',
  'Akshay','Bhavna','Dhruv','Preeti','Chirag','Monika','Harsh','Swara','Neel','Zara'];
const lastNames = ['Sharma','Patel','Iyer','Singh','Gupta','Mehta','Nair','Joshi','Agarwal','Kumar'];

function generateDummyData() {
  const customers = [];
  const orders = [];

  for (let i = 0; i < 50; i++) {
    const name = `${firstNames[i]} ${lastNames[i % lastNames.length]}`;
    const city = CITIES[i % CITIES.length];
    const tags = TAGS_POOL[i % TAGS_POOL.length];
    const email = `${firstNames[i].toLowerCase()}${i}@example.com`;
    const phone = `+91${9000000000 + i}`;
    
    customers.push({ name, email, phone, city, tags });

    const orderCount = 3 + Math.floor(Math.random() * 6);
    for (let j = 0; j < orderCount; j++) {
      const items = Array.from({ length: 1 + Math.floor(Math.random() * 3) }, () => {
        const item = COFFEE_ITEMS[Math.floor(Math.random() * COFFEE_ITEMS.length)];
        return { ...item, qty: 1 + Math.floor(Math.random() * 2) };
      });
      const amount = items.reduce((sum, it) => sum + it.price * it.qty, 0);
      
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 90));

      orders.push({
        customer_email: email,
        amount,
        items,
        ordered_at: date.toISOString(),
      });
    }
  }

  return { customers, orders };
}

module.exports = { generateDummyData };
