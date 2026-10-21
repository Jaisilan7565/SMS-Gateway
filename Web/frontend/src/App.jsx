import React, { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Smartphone,
  MessageSquare,
  ShieldAlert,
  Zap,
  X
} from 'lucide-react';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import DashboardPage from './features/dashboard/pages/DashboardPage';
import DevicesPage from './features/devices/pages/DevicesPage';
import SMSInboxPage from './features/sms/pages/SMSInboxPage';
import AuditLogsPage from './features/audit/pages/AuditLogsPage';
import LoginPage from './features/auth/pages/LoginPage';
import PullModal from './features/sms/components/PullModal';
import SyncProgressBanner from './components/common/SyncProgressBanner';
import { useToast } from './components/common/Toast';
import { connectSocket, disconnectSocket } from './services/socket';
import { logout } from './store/slices/authSlice';
import {
  setActiveTab,
  setMobileMenuOpen,
  openPullModal,
  setActiveSyncJob
} from './store/slices/uiSlice';
import { page, ease } from './utils/motion';

const PAGES = {
  dashboard: DashboardPage,
  devices: DevicesPage,
  sms: SMSInboxPage,
  audit: AuditLogsPage
};

const MOBILE_NAV_ITEMS = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'devices', label: 'Devices', icon: Smartphone },
  { id: 'sms', label: 'SMS', icon: MessageSquare },
  { id: 'audit', label: 'Audit', icon: ShieldAlert }
];

export const App = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const isAuthenticated = useSelector((s) => s.auth.isAuthenticated);
  const activeTab = useSelector((s) => s.ui.activeTab);
  const mobileMenuOpen = useSelector((s) => s.ui.mobileMenuOpen);
  const scroller = useRef(null);

  // Handle session expiration
  useEffect(() => {
    const handleAuthExpired = () => {
      dispatch(logout());
      showToast('Session expired. Please log in again.', 'warn');
    };
    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, [dispatch, showToast]);

  // Real-time Socket.io gateway synchronization
  useEffect(() => {
    if (!isAuthenticated) {
      disconnectSocket();
      return;
    }

    const socket = connectSocket();
    if (!socket) return;

    // FCM trigger acknowledged by backend
    socket.on('sync:triggered', (data) => {
      queryClient.invalidateQueries(['syncRequests']);
      dispatch(
        setActiveSyncJob({
          requestId: data.requestId,
          deviceName: data.deviceName || 'Android Device',
          status: 'triggered'
        })
      );
    });

    // Live SMS batch arrived from Android!
    socket.on('admin:sms_synced', (data) => {
      queryClient.invalidateQueries(['messages']);
      queryClient.invalidateQueries(['devices']);
      queryClient.invalidateQueries(['syncRequests']);
      queryClient.invalidateQueries(['usersSummary']);
      dispatch(
        setActiveSyncJob({
          requestId: data.requestId,
          deviceName: data.deviceName || 'Android Device',
          count: data.count,
          status: 'completed'
        })
      );
      showToast(`⚡ ${data.count} new messages ingested from ${data.deviceName}!`, 'success');
    });

    // New device registered
    socket.on('device:registered', (data) => {
      queryClient.invalidateQueries(['devices']);
      queryClient.invalidateQueries(['usersSummary']);
      showToast(`📱 Android device enrolled: ${data.deviceName}`, 'info');
    });

    // Device heartbeat / battery update
    socket.on('device:heartbeat', () => {
      queryClient.invalidateQueries(['devices']);
      queryClient.invalidateQueries(['usersSummary']);
    });

    // Device status changed (e.g. logged out)
    socket.on('device:status_changed', (data) => {
      queryClient.invalidateQueries(['devices']);
      queryClient.invalidateQueries(['usersSummary']);
      showToast(`📱 ${data.deviceName}: ${data.status === 'LOGGED_OUT' ? 'Logged Out' : data.status}`, 'info');
    });

    // Sync pull failed on mobile or timed out
    socket.on('sync:failed', (data) => {
      queryClient.invalidateQueries(['syncRequests']);
      dispatch(
        setActiveSyncJob({
          requestId: data.requestId,
          deviceName: data.deviceName || 'Android Device',
          status: 'failed',
          error: data.error || 'Device could not complete pull'
        })
      );
      showToast(`❌ Sync failed for ${data.deviceName}: ${data.error || 'Device unresponsive'}`, 'error');
    });

    // System database purged
    socket.on('system:purged', () => {
      queryClient.invalidateQueries(['messages']);
      queryClient.invalidateQueries(['devices']);
      queryClient.invalidateQueries(['syncRequests']);
      queryClient.invalidateQueries(['usersSummary']);
      queryClient.invalidateQueries(['auditLogs']);
      showToast('⚠️ Database reset executed. All telemetry purged.', 'info');
    });

    return () => {
      socket.off('sync:triggered');
      socket.off('admin:sms_synced');
      socket.off('device:registered');
      socket.off('device:heartbeat');
      socket.off('system:purged');
    };
  }, [isAuthenticated, queryClient, showToast, dispatch]);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const ActivePageComponent = PAGES[activeTab] || DashboardPage;

  return (
    <div className="flex h-dvh gap-3 p-2 sm:p-3.5 bg-canvas overflow-hidden relative">
      {/* Real-time Sync Progress Floating Banner */}
      <SyncProgressBanner />

      {/* Desktop Floating Sidebar */}
      <motion.div
        className="hidden lg:block shrink-0 h-full"
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: ease.out }}
      >
        <Sidebar />
      </motion.div>

      {/* Mobile Drawer (Slide-Over) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => dispatch(setMobileMenuOpen(false))}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Sliding Drawer Content */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 260 }}
              className="relative w-[280px] max-w-[85vw] h-full p-3 bg-canvas z-10"
            >
              <div className="relative h-full">
                <Sidebar />
                <button
                  type="button"
                  onClick={() => dispatch(setMobileMenuOpen(false))}
                  className="absolute top-4 right-4 p-1.5 rounded-full bg-card border border-line text-muted hover:text-ink cursor-pointer"
                  title="Close Menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Column */}
      <div className="flex min-w-0 flex-1 flex-col gap-2.5 sm:gap-3 h-full">
        {/* Floating Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: ease.out, delay: 0.05 }}
        >
          <Header />
        </motion.div>

        {/* Floating Main Content Panel */}
        <motion.main
          ref={scroller}
          initial={{ opacity: 0, y: 14, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: ease.out, delay: 0.1 }}
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-[24px] sm:rounded-[28px] bg-panel border border-line shadow-card p-3.5 sm:p-6 lg:p-7 pb-24 lg:pb-7"
        >
          <AnimatePresence mode="wait" onExitComplete={() => scroller.current?.scrollTo({ top: 0 })}>
            <motion.div
              key={activeTab}
              variants={page}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <ActivePageComponent />
            </motion.div>
          </AnimatePresence>
        </motion.main>
      </div>

      {/* Mobile Bottom Navigation Dock */}
      <nav className="fixed bottom-3 left-3 right-3 z-40 lg:hidden flex items-center justify-around h-16 px-2 rounded-full bg-panel/95 backdrop-blur-md border border-line-strong shadow-hero">
        {MOBILE_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => dispatch(setActiveTab(item.id))}
              className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all cursor-pointer ${
                isActive ? 'text-brand-800 font-bold scale-105' : 'text-muted hover:text-ink'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-brand-800 stroke-[2.5]' : ''}`} />
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* Quick Pull Action */}
        <button
          type="button"
          onClick={() => dispatch(openPullModal())}
          className="grid place-items-center w-10 h-10 rounded-full btn-primary text-white shadow-md active:scale-95 cursor-pointer"
          title="Pull SMS from Device"
        >
          <Zap className="w-4 h-4 fill-current" />
        </button>
      </nav>

      {/* Global Modals */}
      <PullModal />
    </div>
  );
};

export default App;
