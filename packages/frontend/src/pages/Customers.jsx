import { useState, useEffect } from 'react';
import { Search, Upload, Plus, X } from 'lucide-react';
import { fetchCustomers } from '../services/api';
import CustomerTable from '../components/CustomerTable';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [page, setPage] = useState(0);
  const limit = 20;

  const loadCustomers = () => {
    setLoading(true);
    fetchCustomers({ search, city, limit, offset: page * limit })
      .then(res => {
        setCustomers(res.data.customers);
        setTotal(res.data.total);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load customers:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadCustomers();
  }, [search, city, page]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6" id="customers-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Customers</h1>
          <p className="text-sm text-text-secondary mt-1">{total} customers in your database</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search by name or email..."
            className="input-field pl-10 text-sm"
            id="customer-search"
          />
        </div>
        <select
          value={city}
          onChange={e => { setCity(e.target.value); setPage(0); }}
          className="select-field w-40 text-sm"
          id="city-filter"
        >
          <option value="">All Cities</option>
          {['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Pune'].map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {(search || city) && (
          <button
            onClick={() => { setSearch(''); setCity(''); setPage(0); }}
            className="btn-secondary text-sm flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="skeleton h-96 rounded-xl" />
      ) : (
        <CustomerTable customers={customers} />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-text-muted">
            Showing {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="btn-secondary text-xs px-3 py-1.5"
            >
              Previous
            </button>
            {[...Array(Math.min(totalPages, 5))].map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  page === i ? 'bg-accent-purple text-white' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="btn-secondary text-xs px-3 py-1.5"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
