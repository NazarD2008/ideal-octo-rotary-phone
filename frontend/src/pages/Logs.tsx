import React, { useEffect, useState } from 'react';
import { logsApi } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { t } from '@/locales/i18n';
import { FileText, Trash2, Search, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

type LogItem = {
  id?: number;
  time?: string;
  stream?: string;
  line?: string;
  category?: string;
  username?: string | null;
  ip?: string | null;
};

const PAGE_SIZE = 50;

export default function LogsPage() {
  const { isAuthenticated, isChecking, hasPermission } = useAuthStore();
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [typeOptions, setTypeOptions] = useState<string[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);

  const fetchLogs = async () => {
    if (!isAuthenticated || isChecking || !hasPermission('logs:view')) return;

    setLoading(true);
    setError(null);
    try {
      const start = dateFrom ? new Date(dateFrom + 'T00:00:00') : null;
      const end = dateTo ? new Date(dateTo + 'T00:00:00') : null;
      if (end) end.setDate(end.getDate() + 1);

      const res = await logsApi.getLogs({
        search: search.trim() || undefined,
        type: typeFilter || undefined,
        category: categoryFilter || undefined,
        dateFrom: start && !Number.isNaN(start.getTime()) ? start.toISOString() : undefined,
        dateTo: end && !Number.isNaN(end.getTime()) ? end.toISOString() : undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      });
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
                id: l.id,
                time: l.time || l.created_at || l.ts || l.timestamp,
                stream: l.type || l.stream || l.level || l.levelname,
                line: l.message || l.line || l.msg || String(l),
                category: l.category || '',
                username: l.username ?? null,
                ip: l.ip ?? null,
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
        const pagination = res.data.pagination || {};
        setTotal(Number(pagination.total ?? merged.length));
        setTotalPages(Math.max(1, Number(pagination.totalPages ?? 1)));
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
  }, [search, typeFilter, categoryFilter, dateFrom, dateTo, page]);

  useEffect(() => {
    if (!isAuthenticated || isChecking || !hasPermission('logs:view')) return;
    logsApi.getStats().then((res) => {
      if (!res.data?.success) return;
      const stats = res.data.data || {};
      setTypeOptions((stats.byType || []).map((x: any) => String(x.type)).filter(Boolean));
      setCategoryOptions((stats.byCategory || []).map((x: any) => String(x.category)).filter(Boolean));
    }).catch(() => {});
  }, [isAuthenticated, isChecking, hasPermission]);

  const formatLogTime = (value?: string) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const typeClass = (type?: string) => {
    const normalized = String(type || '').toUpperCase();
    if (normalized === 'ERROR') return 'text-destructive';
    if (normalized === 'WARNING' || normalized === 'WARN') return 'text-amber-500';
    if (normalized === 'SUCCESS') return 'text-success';
    if (normalized === 'AUTH') return 'text-primary';
    return 'text-muted-foreground';
  };

  const handleClear = async () => {
    if (!confirm('Очистить журнал?')) return;
    try {
      setLoading(true);
      await logsApi.clear();
      setPage(1);
      setTotal(0);
      setTotalPages(1);
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

      <Card className="shadow-sm max-w-6xl mx-auto">
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Журнал событий</h2>
                <CardDescription>Время, тип, категория, пользователь и IP для каждой записи.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => fetchLogs()} className="gap-2">
                  <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
                  {t('common.refresh')}
                </Button>
                <Button size="sm" variant="destructive" onClick={handleClear} className="gap-2">
                  <Trash2 className="h-4 w-4" /> {t('pages.logs.clear') || 'Очистить'}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-2">
              <div className="relative xl:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск: пользователь, IP, сообщение..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-9"
                />
              </div>

              <select
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                className="h-10 rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Все типы</option>
                {typeOptions.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
                className="h-10 rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Все категории</option>
                {categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>

              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                title="Дата от"
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                title="Дата до"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm mb-3">
              {error}
            </div>
          )}

          <div className="rounded-lg border overflow-hidden">
            <div className="md:hidden">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-10">Нет записей по текущему фильтру</div>
              ) : (
                <div className="divide-y divide-border">
                  {logs.map((L, idx) => (
                    <div key={L.id || idx} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={typeClass(L.stream) + ' text-xs font-semibold uppercase'}>{L.stream || 'INFO'}</span>
                            <span className="text-xs text-muted-foreground">{L.category || 'SYSTEM'}</span>
                          </div>
                          <p className="text-sm font-medium mt-1 break-words">{L.line}</p>
                        </div>
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap">{formatLogTime(L.time)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                        <span>Пользователь: {L.username || 'Система'}</span>
                        <span className="text-right break-all">IP: {L.ip || '—'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="hidden md:grid grid-cols-[170px_90px_120px_130px_150px_minmax(280px,1fr)] gap-3 px-3 py-2 bg-muted/40 border-b text-xs font-semibold text-muted-foreground">
              <div>Дата и время</div>
              <div>Тип</div>
              <div>Категория</div>
              <div>Пользователь</div>
              <div>IP</div>
              <div>Событие</div>
            </div>

            <div className="max-h-[520px] overflow-auto">
              {loading ? (
                <div className="flex items-center justify-center h-40">
                  <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-12">
                  Нет записей по текущему фильтру
                </div>
              ) : (
                logs.map((L, idx) => (
                  <div key={L.id || idx} className="grid grid-cols-[170px_90px_120px_130px_150px_minmax(280px,1fr)] gap-3 px-3 py-3 border-b last:border-b-0 hover:bg-muted/20 text-sm">
                    <div className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {formatLogTime(L.time)}
                    </div>
                    <div className={typeClass(L.stream) + ' font-semibold text-xs uppercase'}>
                      {L.stream || '—'}
                    </div>
                    <div className="text-xs text-muted-foreground break-words">
                      {L.category || '—'}
                    </div>
                    <div className="text-xs break-words">
                      {L.username || 'Система'}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground break-all">
                      {L.ip || '—'}
                    </div>
                    <div className="min-w-0">
                      <div className="break-words text-foreground">{L.line}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-3 py-3 border-t bg-muted/20">
              <span className="text-xs text-muted-foreground">
                {total === 0 ? '0 записей' : 'Показано ' + (((page - 1) * PAGE_SIZE) + 1) + '-' + Math.min(page * PAGE_SIZE, total) + ' из ' + total}
              </span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage(Math.max(1, page - 1))}>
                  <ChevronLeft className="h-4 w-4" /> Назад
                </Button>
                <span className="text-xs font-mono">{page} / {totalPages}</span>
                <Button size="sm" variant="outline" disabled={page >= totalPages || loading} onClick={() => setPage(page + 1)}>
                  Далее <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
