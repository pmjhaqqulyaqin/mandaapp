import React, { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api';
import { toast } from 'sonner';
import { MessageSquare, Send, RefreshCw, Shield, Eye, EyeOff, CheckCircle, XCircle, Clock, Users, RotateCcw } from 'lucide-react';
import { Button } from '@mandaapp/ui/src/components/Button';
import { Input } from '@mandaapp/ui/src/components/Input';
import { Badge } from '@mandaapp/ui/src/components/Badge';

// ── Types ─────────────────────────────────────────────────

interface WaSettings {
  tokenConfigured: boolean;
  tokenMasked: string;
  waEnabled: boolean;
  notifyStatuses: string[];
}

interface WaStatus {
  configured: boolean;
  provider: string;
  queuePending: number;
  circuitBreakerOpen: boolean;
}

interface WaStats {
  date: string;
  sent: number;
  failed: number;
  pending: number;
  total: number;
  successRate: number;
}

interface WaLogEntry {
  id: string;
  studentName: string;
  className: string;
  phoneMasked: string;
  parentName: string;
  statusSent: string;
  deliveryStatus: string;
  errorMessage: string | null;
  createdAt: string;
}

interface WaCoverage {
  totalStudents: number;
  withPhone: number;
  withoutPhone: number;
  coveragePercent: number;
  studentsWithoutPhone: Array<{ id: string; fullName: string; nis: string; className: string }>;
}

// ── All attendance statuses ───────────────────────────────

const ALL_STATUSES = ['Hadir', 'Terlambat', 'Alpa', 'Bolos', 'Sakit', 'Izin', 'Pulang'];
const STATUS_EMOJI: Record<string, string> = {
  'Hadir': '✅', 'Terlambat': '⏰', 'Alpa': '❌', 'Bolos': '🚫',
  'Sakit': '🏥', 'Izin': '📋', 'Pulang': '🏠',
};

// ── Main Component ────────────────────────────────────────

export function WaSettingsPage() {
  const [settings, setSettings] = useState<WaSettings | null>(null);
  const [status, setStatus] = useState<WaStatus | null>(null);
  const [stats, setStats] = useState<WaStats | null>(null);
  const [coverage, setCoverage] = useState<WaCoverage | null>(null);
  const [logs, setLogs] = useState<WaLogEntry[]>([]);
  const [logsPagination, setLogsPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);

  // Form state
  const [newToken, setNewToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [waEnabled, setWaEnabled] = useState(false);
  const [notifyStatuses, setNotifyStatuses] = useState<string[]>(ALL_STATUSES);
  const [testPhone, setTestPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'monitoring' | 'coverage'>('settings');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [settingsData, statusData, statsData] = await Promise.all([
        apiClient<WaSettings>('/wa/settings'),
        apiClient<WaStatus>('/wa/status'),
        apiClient<WaStats>('/wa/stats'),
      ]);
      setSettings(settingsData);
      setStatus(statusData);
      setStats(statsData);
      setWaEnabled(settingsData.waEnabled);
      setNotifyStatuses(settingsData.notifyStatuses);
    } catch (err) {
      toast.error('Gagal mengambil data pengaturan WA');
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (page = 1) => {
    try {
      const result = await apiClient<{ data: WaLogEntry[]; pagination: typeof logsPagination }>(`/wa/logs?page=${page}&limit=20`);
      setLogs(result.data);
      setLogsPagination(result.pagination);
    } catch (err) {
      toast.error('Gagal mengambil log pengiriman');
    }
  };

  const fetchCoverage = async () => {
    try {
      const data = await apiClient<WaCoverage>('/wa/coverage');
      setCoverage(data);
    } catch (err) {
      toast.error('Gagal mengambil data cakupan');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = { waEnabled, notifyStatuses };
      if (newToken.trim()) payload.fonnteToken = newToken.trim();
      await apiClient('/wa/settings', { method: 'PUT', data: payload });
      toast.success('Pengaturan WhatsApp berhasil disimpan');
      setNewToken('');
      await fetchAll();
    } catch (err) {
      toast.error('Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  const handleTestSend = async () => {
    if (!testPhone.trim()) { toast.error('Masukkan nomor HP tujuan'); return; }
    setTesting(true);
    try {
      const result = await apiClient<{ success: boolean; error?: string }>('/wa/test', { method: 'POST', data: { phone: testPhone } });
      if (result.success) {
        toast.success('Pesan test berhasil dikirim! Cek HP Anda.');
      } else {
        toast.error(`Gagal: ${result.error}`);
      }
    } catch (err: any) {
      toast.error('Gagal mengirim pesan test');
    } finally {
      setTesting(false);
    }
  };

  const handleRetry = async (logId: string) => {
    try {
      const result = await apiClient<{ success: boolean; error?: string }>(`/wa/retry/${logId}`, { method: 'POST' });
      if (result.success) {
        toast.success('Retry berhasil!');
        fetchLogs(logsPagination.page);
      } else {
        toast.error(`Retry gagal: ${result.error}`);
      }
    } catch (err) {
      toast.error('Gagal retry pesan');
    }
  };

  const toggleStatus = (s: string) => {
    setNotifyStatuses(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <MessageSquare className="text-emerald-500" size={28} />
            Pengaturan WhatsApp
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Konfigurasi notifikasi WhatsApp presensi siswa via Fonnte
          </p>
        </div>
        <Button onClick={fetchAll} variant="outline" size="sm">
          <RefreshCw size={14} className="mr-1" /> Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        {[
          { key: 'settings' as const, label: '⚙️ Pengaturan', onClick: () => setActiveTab('settings') },
          { key: 'monitoring' as const, label: '📊 Monitoring', onClick: () => { setActiveTab('monitoring'); fetchLogs(); } },
          { key: 'coverage' as const, label: '📋 Cakupan Data', onClick: () => { setActiveTab('coverage'); fetchCoverage(); } },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={tab.onClick}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === tab.key
                ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Tab: Settings ─────────────────────────────────── */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Connection Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Shield size={18} className="text-emerald-500" />
              Status Koneksi
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-300">Provider</span>
                <Badge variant="secondary">Fonnte.com</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-300">Token</span>
                {settings?.tokenConfigured ? (
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    ✅ Terkonfigurasi ({settings.tokenMasked})
                  </Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    ❌ Belum diisi
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-300">Notifikasi WA</span>
                {waEnabled ? (
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">🟢 Aktif</Badge>
                ) : (
                  <Badge className="bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400">⚪ Nonaktif</Badge>
                )}
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-300">Antrian</span>
                <span className="text-sm font-medium">{status?.queuePending || 0} pesan</span>
              </div>
              {status?.circuitBreakerOpen && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-700 dark:text-red-400">
                  ⚠️ Circuit Breaker OPEN — pengiriman dihentikan sementara (akan reset otomatis dalam 5 menit)
                </div>
              )}
            </div>
          </div>

          {/* Token Config */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold mb-4">🔑 Token Fonnte</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Dapatkan token dari dashboard <a href="https://fonnte.com" target="_blank" rel="noopener" className="text-emerald-600 underline">fonnte.com</a> → Menu Device → Copy Token
            </p>
            <div className="relative">
              <Input
                type={showToken ? 'text' : 'password'}
                placeholder="Paste device token dari Fonnte di sini..."
                value={newToken}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewToken(e.target.value)}
                className="pr-10"
              />
              <button
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {settings?.tokenConfigured && !newToken && (
              <p className="text-xs text-gray-400 mt-2">
                Token saat ini: {settings.tokenMasked} — Kosongkan jika tidak ingin mengubah
              </p>
            )}
          </div>

          {/* Toggle & Status Filter */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold mb-4">📱 Notifikasi</h2>
            
            {/* Global Toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg mb-4">
              <div>
                <span className="text-sm font-medium">Aktifkan Notifikasi WA</span>
                <p className="text-xs text-gray-400">Orang tua menerima WA saat siswa scan barcode</p>
              </div>
              <button
                onClick={() => setWaEnabled(!waEnabled)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  waEnabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                  waEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            {/* Status Checkboxes */}
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Kirim WA untuk status:</p>
            <div className="grid grid-cols-2 gap-2">
              {ALL_STATUSES.map(s => (
                <label key={s} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyStatuses.includes(s)}
                    onChange={() => toggleStatus(s)}
                    className="w-4 h-4 text-emerald-500 rounded"
                  />
                  <span className="text-sm">{STATUS_EMOJI[s]} {s}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Test Send */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold mb-4">📤 Test Kirim</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Kirim pesan test ke nomor Anda untuk memastikan koneksi berjalan
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="08123456789"
                value={testPhone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTestPhone(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleTestSend} disabled={testing || !settings?.tokenConfigured}>
                {testing ? <RefreshCw size={14} className="animate-spin mr-1" /> : <Send size={14} className="mr-1" />}
                {testing ? 'Mengirim...' : 'Kirim Test'}
              </Button>
            </div>
            {!settings?.tokenConfigured && (
              <p className="text-xs text-amber-500 mt-2">⚠️ Isi token Fonnte terlebih dahulu sebelum test</p>
            )}
          </div>

          {/* Save Button — Full Width */}
          <div className="lg:col-span-2">
            <Button onClick={handleSave} disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-700">
              {saving ? <RefreshCw size={14} className="animate-spin mr-2" /> : null}
              {saving ? 'Menyimpan...' : '💾 Simpan Pengaturan'}
            </Button>
          </div>
        </div>
      )}

      {/* ─── Tab: Monitoring ───────────────────────────────── */}
      {activeTab === 'monitoring' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Terkirim', value: stats.sent, icon: <CheckCircle size={20} />, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                { label: 'Gagal', value: stats.failed, icon: <XCircle size={20} />, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
                { label: 'Antrian', value: stats.pending, icon: <Clock size={20} />, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                { label: 'Success Rate', value: `${stats.successRate}%`, icon: <CheckCircle size={20} />, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
              ].map(card => (
                <div key={card.label} className={`${card.bg} rounded-xl p-4 border border-gray-200 dark:border-gray-700`}>
                  <div className={`${card.color} mb-2`}>{card.icon}</div>
                  <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{card.value}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{card.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Logs Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold">Log Pengiriman Hari Ini</h3>
              <Button onClick={() => fetchLogs(1)} variant="outline" size="sm">
                <RefreshCw size={14} className="mr-1" /> Refresh
              </Button>
            </div>

            {logs.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
                <p>Belum ada log pengiriman hari ini</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Siswa</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Kelas</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">No. Ortu</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Status</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Kirim</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Waktu</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {logs.map(log => (
                      <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{log.studentName || '-'}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{log.className || '-'}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">{log.phoneMasked}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs">{STATUS_EMOJI[log.statusSent] || '📋'} {log.statusSent}</span>
                        </td>
                        <td className="px-4 py-3">
                          {log.deliveryStatus === 'sent' ? (
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs">✅ Terkirim</Badge>
                          ) : log.deliveryStatus === 'failed' ? (
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs" title={log.errorMessage || ''}>❌ Gagal</Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs">⏳ Pending</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {log.createdAt ? new Date(log.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {log.deliveryStatus === 'failed' && (
                            <button onClick={() => handleRetry(log.id)} className="text-blue-500 hover:text-blue-700" title="Retry">
                              <RotateCcw size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {logsPagination.totalPages > 1 && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <span className="text-sm text-gray-500">Hal {logsPagination.page}/{logsPagination.totalPages} ({logsPagination.total} total)</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={logsPagination.page <= 1} onClick={() => fetchLogs(logsPagination.page - 1)}>
                    ← Prev
                  </Button>
                  <Button variant="outline" size="sm" disabled={logsPagination.page >= logsPagination.totalPages} onClick={() => fetchLogs(logsPagination.page + 1)}>
                    Next →
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Tab: Coverage ─────────────────────────────────── */}
      {activeTab === 'coverage' && coverage && (
        <div className="space-y-6">
          {/* Coverage Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users size={18} className="text-emerald-500" /> Cakupan Nomor HP Orang Tua
            </h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{coverage.totalStudents}</div>
                <div className="text-xs text-gray-500">Total Siswa</div>
              </div>
              <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <div className="text-2xl font-bold text-emerald-600">{coverage.withPhone}</div>
                <div className="text-xs text-gray-500">✅ Ada Nomor</div>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{coverage.withoutPhone}</div>
                <div className="text-xs text-gray-500">❌ Belum Ada</div>
              </div>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className="bg-emerald-500 h-3 rounded-full transition-all"
                style={{ width: `${coverage.coveragePercent}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2 text-center">{coverage.coveragePercent}% siswa sudah memiliki nomor HP orang tua</p>
          </div>

          {/* Students without phone */}
          {coverage.studentsWithoutPhone.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold">Siswa Belum Ada Nomor HP Orang Tua ({coverage.studentsWithoutPhone.length})</h3>
                <p className="text-xs text-gray-400 mt-1">Input nomor HP melalui halaman Buku Induk masing-masing siswa</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">#</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">NIS</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Nama Siswa</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Kelas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {coverage.studentsWithoutPhone.map((s, i) => (
                      <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                        <td className="px-4 py-2 font-mono text-xs">{s.nis || '-'}</td>
                        <td className="px-4 py-2 font-medium text-gray-800 dark:text-gray-200">{s.fullName}</td>
                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{s.className || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
