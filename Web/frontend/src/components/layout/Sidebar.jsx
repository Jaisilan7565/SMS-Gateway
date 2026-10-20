import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Smartphone,
  MessageSquare,
  ShieldAlert,
  LogOut,
  Radio,
  Lock
} from 'lucide-react';
import { setActiveTab } from '../../store/slices/uiSlice';
import { logout } from '../../store/slices/authSlice';
import TopographicCard from '../common/TopographicCard';
import BrandLogo from '../common/BrandLogo';
import { spring } from '../../utils/motion';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'devices', label: 'Android Devices', icon: Smartphone },
  { id: 'sms', label: 'SMS Inbox', icon: MessageSquare },
  { id: 'audit', label: 'Audit Trail', icon: ShieldAlert }
];

export const Sidebar = () => {
  const dispatch = useDispatch();
  const activeTab = useSelector((s) => s.ui.activeTab);
  const user = useSelector((s) => s.auth.user);

  return (
    <aside className="flex flex-col h-full w-64 rounded-[28px] bg-panel p-4 border border-line shadow-card select-none">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3 px-3 py-3 mb-4">
        <BrandLogo size={42} />
        <div>
          <span className="text-[16px] font-bold text-ink tracking-tight flex items-center gap-1.5">
            SMS Gateway
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-brand-100 text-brand-800 font-semibold uppercase">
              PRO
            </span>
          </span>
          <span className="text-[12px] text-muted flex items-center gap-1">
            <Lock className="w-3 h-3 text-brand-700" /> AES-256-GCM
          </span>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 space-y-1">
        <div className="px-3 pb-2 text-[11px] font-semibold text-subtle uppercase tracking-wider">
          Gateway Menu
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => dispatch(setActiveTab(item.id))}
              className={`relative flex items-center gap-3 w-full px-3.5 py-2.5 rounded-full text-[14px] font-medium transition-colors cursor-pointer ${
                isActive ? 'text-white' : 'text-ink-2 hover:bg-brand-50 hover:text-brand-900'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeSidebarNav"
                  transition={spring.snappy}
                  className="absolute inset-0 rounded-full btn-primary"
                />
              )}
              <Icon className="relative z-10 w-4 h-4 shrink-0" />
              <span className="relative z-10">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Mini Topographic Card - Promo/Status */}
      <div className="my-4">
        <TopographicCard pattern="rings" className="p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
            <span className="text-[11px] font-semibold tracking-wider text-brand-200 uppercase">
              Silent FCM Push
            </span>
          </div>
          <p className="text-[12px] text-white/90 leading-relaxed">
            Zero device battery drain. Wakes Android only on demand.
          </p>
        </TopographicCard>
      </div>

      {/* Admin User Profile */}
      <div className="pt-3 border-t border-line flex items-center justify-between px-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="grid place-items-center w-8 h-8 rounded-full bg-brand-100 text-brand-800 font-semibold text-[13px] shrink-0">
            {user?.fullName?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-ink truncate leading-tight">
              {user?.fullName || 'Super Administrator'}
            </p>
            <p className="text-[11px] text-muted truncate">{user?.email}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => dispatch(logout())}
          title="Sign out"
          className="text-muted hover:text-danger p-1.5 rounded-full hover:bg-red-50 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
