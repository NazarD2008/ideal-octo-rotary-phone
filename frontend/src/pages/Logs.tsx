import React, { useEffect, useState } from 'react';
import { logsApi } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { t } from '@/locales/i18n';
import { FileText, Trash2, Search, RefreshCw } from 'lucide-react';

type LogItem = {
  time?: string;
  stream?: string; // info|stderr|stdout|login|logout
  line?: string;
  category?: string;
};

export default function LogsPage() {
  const { isAuthenticated, isChecking, hasPermission } = useAuthStore();
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [limit] = useState<number>(500);

  const fetchLogs = async () => {
    if (!isAuthenticated || isChecking || !hasPermission('logs:view')) return;

    setLoading(true);
    setError(null);
    try {
      const res = await logsApi.getLogs({ search: search || undefined, limit });
      if (res.data && res.data.success) {
        const data = res.data.data || [];

        const parseLogString = (s: string) => {
          // try to find an ISO-like timestamp
          const dtMatch = s.match(/(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2})/);
          const time = dtMatch ? dtMatch[1] : undefined;
          const levelMatch = s.match(/\b(INFO|WARN|WARNING|ERROR|DEBUG|TRACE|LOGIN|LOGOUT|FAILED)\b/i);
          const stream = levelMatch ? levelMatch[1].toLowerCase() : undefined;
          let msg = s.replace(/\[[^\]]*\]/g, '').trim();
          if (time) msg = msg.replace(time, '').trim();
          if (levelMatch) msg = msg.replace(new RegExp(levelMatch[1], 'i'), '').replace(/^[\s:-]+/, '').trim();
          return { time, stream, line: msg } as LogItem;
        };

        const normalized = Array.isArray(data)
          ? data.map((l: any) => {
              if (typeof l === 'string') return parseLogString(l);
              return {
                time: l.time || l.ts || l.timestamp,
                stream: l.stream || l.level || l.levelname,
                line: l.line || l.message || l.msg || String(l),
                category: l.category || l.type,
              } as LogItem;
            })
          : [];

        // Merge token-only lines like ['User admin logged in', 'LOGIN'] into a single entry
        const merged: LogItem[] = [];
        for (let i = 0; i < normalized.length; i++) {
          const cur = normalized[i];
          // token-only (no message text) and has a stream -> merge into previous if present
          if ((cur.line === undefined || cur.line.trim() === '') && cur.stream) {
            if (merged.length > 0) {
              const prev = merged[merged.length - 1];
              if (!prev.stream) prev.stream = cur.stream;
              else if (!String(prev.stream).includes(String(cur.stream))) prev.stream = `${prev.stream},${cur.stream}`;
            } else {
              merged.push(cur);
            }
            continue;
          }

          // if next is token-only, merge it now
          const next = normalized[i + 1];
          if (next && (next.line === undefined || next.line.trim() === '') && next.stream) {
            cur.stream = cur.stream || next.stream;
            i++; // skip token-only next
          }

          merged.push(cur);
        }

        setLogs(merged);
      } else {
        setError(res.data?.error || t('users.errors.fetchFailed'));
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || (err instanceof Error ? err.message : 'Не удалось загрузить логи'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isChecking) return;
    if (!isAuthenticated) return;
    if (!hasPermission('logs:view')) {
      setError('У вас нет прав для просмотра журнала');
      return;
    }
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isChecking, isAuthenticated, hasPermission]);

  useEffect(() => {
    if (!isAuthenticated || isChecking || !hasPermission('logs:view')) return;
    const id = setTimeout(() => fetchLogs(), 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleClear = async () => {
    if (!confirm('Очистить журнал?')) return;
    try {
      setLoading(true);
      await logsApi.clear();
      await fetchLogs();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Не удалось очистить журнал');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          {t('pages.logs.title') || 'Журнал'}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{t('pages.logs.description') || 'Просмотр системных логов и событий'}</p>
      </div>

      <Card className="shadow-sm max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0 w-full">
            <div className="hidden md:flex items-center gap-2">
              <CardDescription className="ml-2">{t('pages.logs.description') || 'Просмотр системных логов и событий'}</CardDescription>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:flex-none md:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('pages.logs.searchPlaceholder') || 'Поиск по сообщениям'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') fetchLogs();
                  }}
                />
              </div>

              <Button size="sm" variant="outline" onClick={fetchLogs} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                {t('common.refresh')}
              </Button>
              <Button size="sm" variant="destructive" onClick={handleClear} className="gap-2">
                <Trash2 className="h-4 w-4" /> {t('pages.logs.clear') || 'Очистить'}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2 mb-3">
              {error}
            </div>
          )}

          <div className="h-96 overflow-auto bg-surface rounded p-2 font-mono text-xs">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-10">Нет записей</div>
            ) : (
              logs.map((L, idx) => (
                <div key={idx} className={`py-1 px-2 rounded ${L.stream === 'stderr' || String(L.stream).toLowerCase().includes('error') ? 'text-destructive' : 'text-muted-foreground'}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-40 text-xs text-muted-foreground">{L.time ? new Date(L.time).toLocaleString() : ''}</div>
                    <div className="w-24 text-xs text-muted-foreground uppercase">
                      {L.stream ? t(`logs.token.${String(L.stream).toUpperCase()}`) || String(L.stream).toUpperCase() : ''}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm break-words text-foreground">{L.line}</div>
                      {L.category && <div className="text-xs text-muted-foreground mt-0.5">{L.category}</div>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
