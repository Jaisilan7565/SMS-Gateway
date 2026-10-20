import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Clock, User, Globe, Activity, Trash2, AlertTriangle, Database } from 'lucide-react';
import api from '../../../services/api';
import { Card, CardTitle, StatusBadge, Button } from '../../../components/common/ui';
import PageHeader from '../../../components/common/PageHeader';
import { useToast } from '../../../components/common/Toast';
import PurgeConfirmModal from '../components/PurgeConfirmModal';

export const AuditLogsPage = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [page, setPage] = useState(1);
  const [isPurgeOpen, setIsPurgeOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['auditLogs', { page }],
    queryFn: () => api.get(`/audit-logs?page=${page}&limit=20`)
  });

  const purgeMutation = useMutation({
    mutationFn: () => api.post('/sms/purge-all-data'),
    onSuccess: (res) => {
      showToast(res.message || 'Database cleaned successfully. Admin account preserved.', 'success');
      setIsPurgeOpen(false);
      queryClient.invalidateQueries(['auditLogs']);
      queryClient.invalidateQueries(['messages']);
      queryClient.invalidateQueries(['devices']);
      queryClient.invalidateQueries(['usersSummary']);
      queryClient.invalidateQueries(['syncRequests']);
    },
    onError: (err) => {
      showToast(err.message || 'Database purge failed', 'error');
    }
  });

  const logs = data?.data?.logs || [];
  const pagination = data?.data?.pagination || { total: 0, totalPages: 1 };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security Audit Trail"
        subtitle="Immutable ledger of all login events, silent FCM pulls, manual uploads, and deletions"
        actions={
          <Button
            variant="danger"
            size="sm"
            onClick={() => setIsPurgeOpen(true)}
            className="shadow-xs gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clean Database</span>
          </Button>
        }
      />

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] border-collapse">
            <thead>
              <tr className="border-b border-line bg-panel/70 text-subtle text-[11px] font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Performed By</th>
                <th className="py-3.5 px-4">IP Address</th>
                <th className="py-3.5 px-4">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-16 text-muted">
                    No audit records logged yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-panel/50 transition-colors">
                    <td className="py-3.5 px-4 text-subtle whitespace-nowrap text-[12px]">
                      {new Date(log.timestamp).toLocaleString([], {
                        dateStyle: 'short',
                        timeStyle: 'medium'
                      })}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge
                        tone={
                          log.action.includes('PURGE') || log.action.includes('DELETE')
                            ? 'bad'
                            : log.action.includes('PULL') || log.action.includes('PUSH')
                            ? 'info'
                            : 'good'
                        }
                      >
                        {log.action}
                      </StatusBadge>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-ink whitespace-nowrap">
                      {log.performedBy?.email || 'System'}
                    </td>
                    <td className="py-3.5 px-4 text-muted font-mono text-[12px] whitespace-nowrap">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-muted max-w-xs truncate">
                      {JSON.stringify(log.metadata || {})}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-line bg-panel/50 text-[12px] text-muted">
            <span>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total logs)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, pagination.totalPages))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Danger Zone: Database Maintenance Card */}
      <Card className="border border-red-200/70 bg-red-50/20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="grid place-items-center w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-[15px] font-bold text-ink flex items-center gap-2">
                <span>System Maintenance & Danger Zone</span>
              </h4>
              <p className="text-[12px] text-muted mt-0.5 max-w-xl leading-relaxed">
                Purge all synced SMS messages, registered Android devices, sync requests, test users, and logs from MongoDB.
                The seeded administrator account (<span className="font-semibold text-ink">admin@sms.com</span>) is strictly preserved.
              </p>
            </div>
          </div>

          <Button
            variant="danger"
            size="sm"
            onClick={() => setIsPurgeOpen(true)}
            className="shrink-0 gap-1.5 shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clean Database</span>
          </Button>
        </div>
      </Card>

      {/* Purge Confirmation Modal */}
      <PurgeConfirmModal
        isOpen={isPurgeOpen}
        onClose={() => setIsPurgeOpen(false)}
        onConfirm={() => purgeMutation.mutate()}
        isPending={purgeMutation.isPending}
      />
    </div>
  );
};

export default AuditLogsPage;

