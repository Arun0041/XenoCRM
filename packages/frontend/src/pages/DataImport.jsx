import { useState, useMemo } from 'react';
import { Database, Upload, AlertCircle, CheckCircle2, Loader2, FileJson } from 'lucide-react';
import api from '../services/api';
import clsx from 'clsx';

export default function DataImport() {
  const [activeTab, setActiveTab] = useState('customers');
  const [jsonText, setJsonText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const customerExample = `[
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+919876543210",
    "city": "Mumbai",
    "tags": ["vip"]
  }
]`;

  const orderExample = `[
  {
    "customer_email": "jane@example.com",
    "amount": 450,
    "items": [{"name": "Latte", "qty": 2}],
    "ordered_at": "2023-10-15T10:00:00Z"
  }
]`;

  const { seedCustomers, seedOrders } = useMemo(() => {
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

    return {
      seedCustomers: JSON.stringify(customers, null, 2),
      seedOrders: JSON.stringify(orders, null, 2)
    };
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setJsonText('');
    setResult(null);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setJsonText(event.target.result);
      setResult(null);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setResult(null);
    if (!jsonText.trim()) {
      setResult({ type: 'error', message: 'Please paste or upload JSON data.' });
      return;
    }

    let parsedData;
    try {
      parsedData = JSON.parse(jsonText);
      if (!Array.isArray(parsedData)) {
        throw new Error('Data must be a JSON array.');
      }
    } catch (err) {
      setResult({ type: 'error', message: `Invalid JSON: ${err.message}` });
      return;
    }

    setLoading(true);
    try {
      if (activeTab === 'customers') {
        const res = await api.post('/customers/import', { customers: parsedData });
        setResult({ type: 'success', message: `Successfully imported ${res.data.imported} customers!` });
      } else {
        const res = await api.post('/orders/import', { orders: parsedData });
        setResult({ type: 'success', message: `Successfully imported ${res.data.imported} orders and updated their lifetime stats!` });
      }
      setJsonText('');
    } catch (err) {
      setResult({
        type: 'error',
        message: err.response?.data?.error || 'Failed to import data. Check the format.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in" id="data-import-page">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Database className="w-6 h-6 text-accent-purple-light" />
          Data Import
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Bulk import your historical customers and orders via JSON to instantly populate the CRM.
        </p>
      </div>

      <div className="glass-card overflow-hidden flex flex-col md:flex-row">
        {/* Left Side: Input Area */}
        <div className="flex-1 p-6 border-b md:border-b-0 md:border-r border-bg-border">
          {/* Tabs */}
          <div className="flex gap-2 mb-6 p-1 bg-bg-secondary rounded-lg">
            <button
              onClick={() => handleTabChange('customers')}
              className={clsx(
                'flex-1 py-2 text-sm font-medium rounded-md transition-all',
                activeTab === 'customers'
                  ? 'bg-bg-primary text-text-primary shadow'
                  : 'text-text-muted hover:text-text-secondary'
              )}
            >
              1. Import Customers
            </button>
            <button
              onClick={() => handleTabChange('orders')}
              className={clsx(
                'flex-1 py-2 text-sm font-medium rounded-md transition-all',
                activeTab === 'orders'
                  ? 'bg-bg-primary text-text-primary shadow'
                  : 'text-text-muted hover:text-text-secondary'
              )}
            >
              2. Import Orders
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-text-primary">Paste JSON Data</label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setJsonText(activeTab === 'customers' ? seedCustomers : seedOrders)}
                  className="text-xs font-medium text-accent-blue-light hover:text-accent-blue transition-colors flex items-center gap-1"
                >
                  <Database className="w-3.5 h-3.5" />
                  Load Test Data
                </button>
                <label className="cursor-pointer flex items-center gap-1.5 text-xs font-medium text-accent-purple-light hover:text-accent-purple transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  Upload .json file
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            </div>

            <textarea
              className="w-full h-64 bg-bg-secondary border border-bg-border rounded-xl p-4 text-sm text-text-primary font-mono focus:border-accent-purple/50 focus:ring-1 focus:ring-accent-purple/50 outline-none resize-none"
              placeholder={activeTab === 'customers' ? customerExample : orderExample}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              spellCheck={false}
            />

            <button
              onClick={handleImport}
              disabled={loading || !jsonText.trim()}
              className="w-full btn-primary py-3 flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Importing...</>
              ) : (
                <><Database className="w-5 h-5" /> Import Data</>
              )}
            </button>

            {result && (
              <div
                className={clsx(
                  'p-4 rounded-lg flex items-start gap-3 animate-fade-in text-sm',
                  result.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                )}
              >
                {result.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 shrink-0" />
                )}
                <div className="leading-relaxed">{result.message}</div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Instructions */}
        <div className="w-full md:w-80 bg-bg-secondary/50 p-6">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-4">
            <FileJson className="w-4 h-4 text-text-muted" />
            Format Guide
          </h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
                Mandatory Fields
              </h4>
              {activeTab === 'customers' ? (
                <ul className="text-sm text-text-muted space-y-1.5 list-disc pl-4">
                  <li><code className="text-accent-purple-light bg-accent-purple/10 px-1 rounded">name</code> (String)</li>
                  <li><code className="text-accent-purple-light bg-accent-purple/10 px-1 rounded">email</code> (String) - Used to identify duplicates</li>
                </ul>
              ) : (
                <ul className="text-sm text-text-muted space-y-1.5 list-disc pl-4">
                  <li><code className="text-accent-purple-light bg-accent-purple/10 px-1 rounded">customer_email</code> (String) - Must match an existing customer</li>
                  <li><code className="text-accent-purple-light bg-accent-purple/10 px-1 rounded">amount</code> (Number)</li>
                </ul>
              )}
            </div>

            <div>
              <h4 className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
                Optional Fields
              </h4>
              {activeTab === 'customers' ? (
                <ul className="text-sm text-text-muted space-y-1.5 list-disc pl-4">
                  <li><code className="text-text-primary bg-bg-primary px-1 border border-bg-border rounded">phone</code> (String)</li>
                  <li><code className="text-text-primary bg-bg-primary px-1 border border-bg-border rounded">city</code> (String)</li>
                  <li><code className="text-text-primary bg-bg-primary px-1 border border-bg-border rounded">tags</code> (Array of strings)</li>
                </ul>
              ) : (
                <ul className="text-sm text-text-muted space-y-1.5 list-disc pl-4">
                  <li><code className="text-text-primary bg-bg-primary px-1 border border-bg-border rounded">items</code> (Array of objects)</li>
                  <li><code className="text-text-primary bg-bg-primary px-1 border border-bg-border rounded">ordered_at</code> (ISO 8601 Date string)</li>
                </ul>
              )}
            </div>

            <div className="bg-bg-primary/50 border border-bg-border rounded-lg p-3 mt-6">
              <p className="text-xs text-text-secondary leading-relaxed">
                <strong>Important:</strong> Import your customers first. Order imports will silently skip orders if the <code className="text-accent-purple-light">customer_email</code> does not already exist in the database.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
