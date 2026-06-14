import { MapPin, Mail, Phone, Tag } from 'lucide-react';

export default function CustomerTable({ customers, compact = false }) {
  if (!customers || customers.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-text-muted text-sm">No customers found</p>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" id="customer-table">
          <thead>
            <tr className="border-b border-bg-border bg-bg-secondary/50">
              <th className="text-left p-3 text-text-muted font-medium text-xs uppercase tracking-wider">Customer</th>
              {!compact && <th className="text-left p-3 text-text-muted font-medium text-xs uppercase tracking-wider">Contact</th>}
              <th className="text-left p-3 text-text-muted font-medium text-xs uppercase tracking-wider">City</th>
              <th className="text-right p-3 text-text-muted font-medium text-xs uppercase tracking-wider">Orders</th>
              <th className="text-right p-3 text-text-muted font-medium text-xs uppercase tracking-wider">Spent</th>
              {!compact && <th className="text-left p-3 text-text-muted font-medium text-xs uppercase tracking-wider">Tags</th>}
              {!compact && <th className="text-left p-3 text-text-muted font-medium text-xs uppercase tracking-wider">Last Order</th>}
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id} className="border-b border-bg-border/50 hover:bg-bg-hover/50 transition-colors">
                <td className="p-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-purple to-accent-blue flex items-center justify-center text-xs font-bold text-white shrink-0">
                      {customer.name?.charAt(0)}
                    </div>
                    <span className="text-text-primary font-medium">{customer.name}</span>
                  </div>
                </td>
                {!compact && (
                  <td className="p-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-text-secondary text-xs">
                        <Mail className="w-3 h-3" /> {customer.email}
                      </div>
                      {customer.phone && (
                        <div className="flex items-center gap-1.5 text-text-secondary text-xs">
                          <Phone className="w-3 h-3" /> {customer.phone}
                        </div>
                      )}
                    </div>
                  </td>
                )}
                <td className="p-3">
                  <div className="flex items-center gap-1.5 text-text-secondary">
                    <MapPin className="w-3 h-3" />
                    <span className="text-xs">{customer.city}</span>
                  </div>
                </td>
                <td className="p-3 text-right text-text-primary font-medium">{customer.total_orders}</td>
                <td className="p-3 text-right text-text-primary font-medium">₹{parseFloat(customer.total_spent || 0).toLocaleString()}</td>
                {!compact && (
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {(customer.tags || []).map(tag => (
                        <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent-purple/10 text-accent-purple-light">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                )}
                {!compact && (
                  <td className="p-3 text-text-secondary text-xs">
                    {customer.last_order_date
                      ? new Date(customer.last_order_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                      : '—'}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
