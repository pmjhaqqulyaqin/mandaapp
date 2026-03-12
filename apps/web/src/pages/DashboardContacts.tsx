import { useState } from 'react';
import { Input, Skeleton, Badge } from '@mandaapp/ui';
import { useContacts } from '../hooks/api/useContacts';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt?: string;
}

export const DashboardContacts = () => {
  const { queryAll } = useContacts();
  const messages: ContactMessage[] = queryAll.data || [];
  const isLoading = queryAll.isLoading;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);

  const filteredMessages = messages.filter(msg =>
    msg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    msg.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    msg.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return dateStr; }
  };

  const getTimeAgo = (dateStr?: string) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m lalu`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}j lalu`;
    const days = Math.floor(hours / 24);
    return `${days}h lalu`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-background-dark p-6 rounded-2xl border border-border-light dark:border-border-dark shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-heading font-semibold text-text-primary dark:text-text-darkPrimary">Pesan Masuk</h2>
            <p className="text-sm text-text-secondary mt-1">Pesan dari pengunjung website melalui form kontak.</p>
          </div>
          <Badge variant="primary">{messages.length} pesan</Badge>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-background-dark p-4 rounded-xl border border-border-light dark:border-border-dark shadow-sm">
        <div className="w-full sm:w-96">
          <Input
            placeholder="Cari berdasarkan nama, email, atau subjek..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>}
          />
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Message List */}
        <div className="lg:col-span-2 bg-white dark:bg-background-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border-light dark:border-border-dark">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Daftar Pesan</h3>
          </div>
          <div className="divide-y divide-border-light dark:divide-border-dark max-h-[600px] overflow-y-auto">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))
            ) : filteredMessages.length === 0 ? (
              <div className="p-8 text-center text-text-secondary">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 opacity-30">
                  <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
                <p className="text-sm">Belum ada pesan masuk</p>
              </div>
            ) : (
              filteredMessages.map((msg) => (
                <button
                  key={msg.id}
                  onClick={() => setSelectedMessage(msg)}
                  className={`w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${
                    selectedMessage?.id === msg.id ? 'bg-primary/5 dark:bg-primary/10 border-l-2 border-primary' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-sm text-text-primary dark:text-text-darkPrimary truncate mr-2">{msg.name}</span>
                    <span className="text-[11px] text-text-secondary whitespace-nowrap">{getTimeAgo(msg.createdAt)}</span>
                  </div>
                  <p className="text-sm font-medium text-text-primary dark:text-text-darkPrimary truncate">{msg.subject}</p>
                  <p className="text-xs text-text-secondary truncate mt-0.5">{msg.message}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Message Detail */}
        <div className="lg:col-span-3 bg-white dark:bg-background-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm overflow-hidden">
          {selectedMessage ? (
            <div className="flex flex-col h-full">
              <div className="p-6 border-b border-border-light dark:border-border-dark">
                <h3 className="text-lg font-heading font-semibold text-text-primary dark:text-text-darkPrimary mb-3">
                  {selectedMessage.subject}
                </h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-secondary">
                  <span className="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    {selectedMessage.name}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                    {selectedMessage.email}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    {formatDate(selectedMessage.createdAt)}
                  </span>
                </div>
              </div>
              <div className="p-6 flex-1">
                <p className="text-text-primary dark:text-text-darkPrimary leading-relaxed whitespace-pre-wrap">
                  {selectedMessage.message}
                </p>
              </div>
              <div className="p-4 border-t border-border-light dark:border-border-dark">
                <a
                  href={`mailto:${selectedMessage.email}?subject=Re: ${selectedMessage.subject}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-opacity-90 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                  Balas via Email
                </a>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[400px] text-text-secondary">
              <div className="text-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 opacity-20">
                  <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
                <p className="text-sm">Pilih pesan untuk melihat detail</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
