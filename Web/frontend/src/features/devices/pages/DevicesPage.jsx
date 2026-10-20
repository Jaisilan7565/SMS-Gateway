import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Smartphone,
  Zap,
  Battery,
  Radio,
  Clock,
  Search,
  CheckCircle2,
  AlertCircle,
  MessageSquare
} from 'lucide-react';
import api from '../../../services/api';
import { openPullModal, setFilterDevice } from '../../../store/slices/uiSlice';
import { Card, CardTitle, Button, StatusBadge } from '../../../components/common/ui';
import PageHeader from '../../../components/common/PageHeader';
import { rise } from '../../../utils/motion';

export const DevicesPage = () => {
  const dispatch = useDispatch();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['devices', { search, page }],
    queryFn: () => api.get(`/devices?search=${encodeURIComponent(search)}&page=${page}&limit=12`)
  });

  const devices = data?.data?.devices || [];
  const pagination = data?.data?.pagination || { total: 0, totalPages: 1 };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Connected Android Devices"
        subtitle="Manage enrolled phones, inspect dual-SIM cards, and trigger pulls"
        actions={
          <div className="relative w-full sm:w-64 max-w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search by device or model..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full h-9.5 pl-10 pr-4 rounded-full bg-card border border-line text-[13px] text-ink focus:outline-none focus:border-brand-700"
            />
          </div>
        }
      />

      {devices.length === 0 && !isLoading ? (
        <Card className="text-center py-16">
          <Smartphone className="w-12 h-12 text-muted mx-auto mb-3 opacity-40" />
          <h3 className="text-[17px] font-semibold text-ink">No Android Devices Found</h3>
          <p className="text-[13px] text-muted max-w-sm mx-auto mt-1">
            Install and open the Flutter Android app, sign in with your email or Google OAuth, and your device will automatically register here.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map((device) => (
            <Card key={device._id} className="flex flex-col justify-between h-full">
              <div>
                {/* Header: Name & Status */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="grid place-items-center w-10 h-10 rounded-2xl bg-brand-100 text-brand-800 shrink-0">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-[15px] font-bold text-ink leading-tight">
                        {device.deviceName}
                      </h4>
                      <p className="text-[12px] text-muted mt-0.5">
                        {device.model || 'Android Phone'} ({device.manufacturer || 'OEM'})
                      </p>
                    </div>
                  </div>

                  <StatusBadge tone={device.status === 'ACTIVE' ? 'good' : 'off'}>
                    {device.status}
                  </StatusBadge>
                </div>

                {/* Telephony & Hardware Specs */}
                <div className="space-y-2 py-3 border-y border-line text-[12px]">
                  <div className="flex items-center justify-between text-ink-2">
                    <span className="text-muted flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-blue-600" />
                      SIM 1:
                    </span>
                    <span className="font-medium">{device.simSlots?.sim1?.carrier || 'Not detected'}</span>
                  </div>

                  <div className="flex items-center justify-between text-ink-2">
                    <span className="text-muted flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-purple-600" />
                      SIM 2:
                    </span>
                    <span className="font-medium">{device.simSlots?.sim2?.carrier || 'Not detected'}</span>
                  </div>

                  <div className="flex items-center justify-between text-ink-2">
                    <span className="text-muted flex items-center gap-1.5">
                      <Battery className="w-3.5 h-3.5 text-brand-700" />
                      Battery Level:
                    </span>
                    <span className="font-medium font-mono">{device.batteryLevel}% {device.isCharging && '⚡'}</span>
                  </div>

                  <div className="flex items-center justify-between text-ink-2">
                    <span className="text-muted flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-subtle" />
                      Last Heartbeat:
                    </span>
                    <span className="font-medium text-subtle">
                      {new Date(device.lastSeenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* User Binding */}
                <div className="pt-3 text-[11px] text-muted">
                  <span>Linked User: </span>
                  <span className="font-semibold text-ink">{device.userId?.email || 'N/A'}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() =>
                    dispatch(
                      setFilterDevice({
                        deviceId: device._id,
                        userId: device.userId?._id
                      })
                    )
                  }
                  className="w-full flex items-center justify-center gap-1.5"
                >
                  <MessageSquare className="w-4 h-4 text-brand-700" />
                  <span>View SMS</span>
                </Button>
                <Button
                  size="md"
                  onClick={() => dispatch(openPullModal(device))}
                  className="w-full flex items-center justify-center gap-1.5"
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span>Pull SMS</span>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DevicesPage;
