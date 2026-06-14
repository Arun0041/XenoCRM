import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Filter, Megaphone, BarChart3, Plus, Zap, Database, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import clsx from 'clsx';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/segments', icon: Filter, label: 'Segments' },
  { to: '/insights', icon: BarChart3, label: 'Insights' },
  { to: '/import', icon: Database, label: 'Data Import' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 h-screen bg-bg-secondary border-r border-bg-border flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-5 border-b border-bg-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent-purple to-accent-blue flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-primary tracking-tight">Xeno CRM</h1>
            <p className="text-[10px] text-text-muted uppercase tracking-widest">AI-Native</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/dashboard'}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-accent-purple/10 text-accent-purple-light border border-accent-purple/20'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
              )
            }
          >
            <item.icon className="w-4.5 h-4.5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* New Campaign CTA */}
      <div className="p-4 border-t border-bg-border">
        <button
          onClick={() => navigate('/campaigns/new')}
          className="w-full btn-primary flex items-center justify-center gap-2 py-2.5"
          id="new-campaign-btn"
        >
          <Plus className="w-4 h-4" />
          New Campaign
        </button>
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-bg-border flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-hidden">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full border border-white/10" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
          )}
          <div className="truncate">
            <p className="text-xs font-medium text-text-primary truncate">{user?.name}</p>
            <p className="text-[10px] text-text-muted truncate">{user?.email}</p>
          </div>
        </div>
        <button onClick={() => { logout(); navigate('/'); }} className="p-1.5 text-text-muted hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors" title="Log Out">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
