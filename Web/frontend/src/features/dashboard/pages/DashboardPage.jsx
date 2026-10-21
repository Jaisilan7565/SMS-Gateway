import React from 'react';
import { useDispatch } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Smartphone,
  MessageSquare,
  Zap,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Copy,
  Radio
} from 'lucide-react';
import api from '../../../services/api';
import { openPullModal, setActiveTab } from '../../../store/slices/uiSlice';
import { Card, CardTitle, Button, StatusBadge } from '../../../components/common/ui';
import TopographicCard from '../../../components/common/TopographicCard';
import AnimatedNumber from '../../../components/common/AnimatedNumber';
import PageHeader from '../../../components/common/PageHeader';
import { useToast } from '../../../components/common/Toast';
import { rise } from '../../../utils/motion';

export const DashboardPage = () => {
  const dispatch = useDispatch();
  const { showToast } = useToast();

  const { data: devicesData, isLoading: loadingDevices } = useQuery({
    queryKey: ['devices'],
    queryFn: () => api.get('/devices?limit=5')
  });

  const { data: messagesData, isLoading: loadingMessages } = useQuery({
    queryKey: ['messages', { limit: 10 }],
    queryFn: () => api.get('/sms/messages?limit=10')
  });

  const { data: requestsData } = useQuery({
    queryKey: ['syncRequests'],
    queryFn: () => api.get('/sms/sync-requests?limit=5')
  });

  const devices = devicesData?.data?.devices || [];
  const totalDevices = devicesData?.data?.pagination?.total || 0;
  const messages = messagesData?.data?.messages || [];
  const totalMessages = messagesData?.data?.pagination?.total || 0;
  const recentRequests = requestsData?.data?.requests || [];

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard', 'info');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Overview"
        subtitle="Real-time Android SMS sync gateway & device telemetry"
        actions={
          <Button
            size="sm"
            onClick={() => dispatch(openPullModal())}
            className="shadow-xs"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Pull SMS Now</span>
          </Button>
        }
      />

      {/* Hero Topographic Card */}
      <motion.div variants={rise}>
        <TopographicCard pattern="lines" className="p-6 sm:p-8">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-[12px] font-medium backdrop-blur-sm mb-4">
                <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
                <span>Zero-Polling Architecture (FCM Silent Wakeup)</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-snug">
                On-Demand SMS Ingestion & AES-256-GCM Armor
              </h2>
              <p className="text-white/80 text-[14px] mt-2 leading-relaxed">
                Android devices stay completely asleep until a pull request is dispatched from this console.
                Messages are end-to-end encrypted before transmission and authenticated with 128-bit tags.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
              <Button
                variant="light"
                size="lg"
                onClick={() => dispatch(openPullModal())}
                className="shadow-hero"
              >
                <Zap className="w-4 h-4 text-brand-900 fill-current" />
                <span className="text-brand-950 font-semibold">Trigger New Pull</span>
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={() => dispatch(setActiveTab('devices'))}
                className="bg-transparent text-white border-white/30 hover:bg-white/10"
              >
                <span>Manage Devices</span>
                <ArrowUpRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </TopographicCard>
      </motion.div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-semibold text-subtle uppercase tracking-wider">
              Connected Devices
            </span>
            <div className="grid place-items-center w-8 h-8 rounded-full bg-brand-100 text-brand-800">
              <Smartphone className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-ink">
            {loadingDevices ? (
              <div className="h-9 w-16 rounded-lg bg-black/6 dark:bg-white/10 animate-pulse my-0.5" />
            ) : (
              <AnimatedNumber value={totalDevices} />
            )}
          </div>
          <p className="text-[12px] text-muted mt-1.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-700" />
            {loadingDevices ? '...' : `${devices.filter((d) => d.status === 'ACTIVE').length} currently active`}
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-semibold text-subtle uppercase tracking-wider">
              Encrypted Messages
            </span>
            <div className="grid place-items-center w-8 h-8 rounded-full bg-brand-100 text-brand-800">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-ink">
            {loadingMessages ? (
              <div className="h-9 w-20 rounded-lg bg-black/6 dark:bg-white/10 animate-pulse my-0.5" />
            ) : (
              <AnimatedNumber value={totalMessages} />
            )}
          </div>
          <p className="text-[12px] text-muted mt-1.5 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-700" />
            Stored encrypted at rest
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-semibold text-subtle uppercase tracking-wider">
              Dual SIM Detection
            </span>
            <div className="grid place-items-center w-8 h-8 rounded-full bg-blue-100 text-blue-800">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-ink">
            <span>SIM 1 & 2</span>
          </div>
          <p className="text-[12px] text-muted mt-1.5">
            Auto-tagged by Android slot index
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-semibold text-subtle uppercase tracking-wider">
              Sync Mode
            </span>
            <div className="grid place-items-center w-8 h-8 rounded-full bg-purple-100 text-purple-800">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-ink">
            <span>Delta ⚡</span>
          </div>
          <p className="text-[12px] text-muted mt-1.5">
            Watermarked deduplication
          </p>
        </Card>
      </div>

      {/* Main Grid: Devices Snapshot + Live SMS Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Connected Devices (1 col) */}
        <Card className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Connected Android Phones</CardTitle>
            <button
              type="button"
              onClick={() => dispatch(setActiveTab('devices'))}
              className="text-[12px] font-semibold text-brand-700 hover:text-brand-900 cursor-pointer"
            >
              View all
            </button>
          </div>

          {loadingDevices ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-panel border border-line animate-pulse flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-black/6 dark:bg-white/10" />
                    <div className="space-y-1.5">
                      <div className="h-3.5 w-24 rounded bg-black/7 dark:bg-white/10" />
                      <div className="h-3 w-16 rounded bg-black/5 dark:bg-white/8" />
                    </div>
                  </div>
                  <div className="h-8 w-14 rounded-full bg-black/6 dark:bg-white/10" />
                </div>
              ))}
            </div>
          ) : devices.length === 0 ? (
            <div className="text-center py-8 text-muted text-[13px]">
              No Android devices enrolled yet. Login from the Flutter app to pair.
            </div>
          ) : (
            <div className="space-y-3">
              {devices.map((d) => {
                const isLoggedOut = d.status === 'LOGGED_OUT';
                const statusTone = d.status === 'ACTIVE' ? 'good' : isLoggedOut ? 'logged_out' : 'offline';
                const statusLabel = d.status === 'ACTIVE' ? 'Online' : isLoggedOut ? 'Logged Out' : 'Offline';

                return (
                  <div
                    key={d._id}
                    className="p-3.5 rounded-2xl bg-panel border border-line flex items-center justify-between hover:border-brand-600 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid place-items-center w-9 h-9 rounded-xl bg-card border border-line text-ink">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-[13px] font-semibold text-ink leading-tight">
                            {d.deviceName}
                          </p>
                          <StatusBadge tone={statusTone} className="text-[10px] py-0 px-1.5">
                            {statusLabel}
                          </StatusBadge>
                        </div>
                        <p className="text-[11px] text-muted mt-0.5">
                          {d.model || 'Android Phone'} • {d.batteryLevel}% 🔋
                        </p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isLoggedOut}
                      onClick={() => dispatch(openPullModal(d))}
                      className={isLoggedOut ? 'opacity-40 cursor-not-allowed' : ''}
                      title={isLoggedOut ? 'Device is logged out' : 'Pull SMS'}
                    >
                      {isLoggedOut ? 'Logged Out' : 'Pull'}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Live Incoming SMS Feed (2 cols) */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle>Live Decrypted SMS Stream</CardTitle>
              <p className="text-[12px] text-muted mt-0.5">
                Decrypted in-memory on demand over TLS 1.3
              </p>
            </div>
            <button
              type="button"
              onClick={() => dispatch(setActiveTab('sms'))}
              className="text-[12px] font-semibold text-brand-700 hover:text-brand-900 cursor-pointer"
            >
              Open Inbox Explorer
            </button>
          </div>

          {loadingMessages ? (
            <div className="space-y-2.5">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-panel border border-line animate-pulse space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-24 rounded bg-black/7 dark:bg-white/10" />
                    <div className="h-3.5 w-12 rounded-full bg-black/5 dark:bg-white/10" />
                    <div className="h-3 w-16 rounded bg-black/4 dark:bg-white/8" />
                  </div>
                  <div className="h-4 w-4/5 rounded bg-black/5 dark:bg-white/8" />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-muted text-[13px]">
              No messages synced yet. Click "Pull SMS Now" to trigger an ingestion batch.
            </div>
          ) : (
            <div className="space-y-2.5">
              {messages.map((m) => {
                const otp = m.body.match(/\b\d{4,8}\b/)?.[0];
                return (
                  <div
                    key={m.id}
                    className="p-3.5 rounded-2xl bg-panel border border-line hover:border-line-strong transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[13px] font-bold text-ink">{m.sender}</span>
                        {m.simSlot === 'SIM 1' && <StatusBadge tone="sim1">SIM 1</StatusBadge>}
                        {m.simSlot === 'SIM 2' && <StatusBadge tone="sim2">SIM 2</StatusBadge>}
                        <span className="text-[11px] text-subtle">
                          {new Date(m.messageDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[13px] text-ink-2 leading-relaxed break-words font-mono">
                        {m.body}
                      </p>
                    </div>

                    {otp && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(otp)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-100 text-brand-900 text-[12px] font-bold hover:bg-brand-200 transition-colors shrink-0 self-start cursor-pointer"
                        title="Copy OTP"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>OTP: {otp}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
