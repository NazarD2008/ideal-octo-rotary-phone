import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Check, X, Smartphone, Package, Clock3, ShieldAlert } from 'lucide-react';
import { deviceActivationApi } from '@/services/api';

type ActivationRequest = {
  id: string;
  enrollmentId: string;
  deviceId: string;
  model?: string | null;
  manufacturer?: string | null;
  release?: string | null;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  buildId?: number | null;
  buildName?: string | null;
  creatorUsername?: string | null;
};

export default function ActivationsPage() {
  const [requests, setRequests] = useState<ActivationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setError(null);
    try {
      const res = await deviceActivationApi.list();
      if (res.data?.success) {
        setRequests(res.data.data?.requests || []);
      } else {
        setError(res.data?.error || 'Не удалось получить заявки');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Не удалось получить заявки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
    const timer = setInterval(loadRequests, 10000);
    return () => clearInterval(timer);
  }, [loadRequests]);

  const pending = useMemo(() => requests.filter(r => r.status === 'pending'), [requests]);
  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setActionId(id);
    setError(null);
    try {
      const res = action === 'approve'
        ? await deviceActivationApi.approve(id)
        : await deviceActivationApi.reject(id);
      if (!res.data?.success) {
        setError(res.data?.error || 'Операция не выполнена');
      }
      await loadRequests();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Операция не выполнена');
    } finally {
      setActionId(null);
    }
  };

  const formatDate = (value?: string) => {
    if (!value) return '—';
    try { return new Date(value).toLocaleString(); } catch { return value; }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Разрешения устройств</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Запросы на подключение устройств и их подтверждение.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={loadRequests} disabled={loading}>
          <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          Обновить
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Ожидают решения</span>
            <Badge variant={pending.length ? 'default' : 'secondary'}>{pending.length}</Badge>
          </div>
        </CardContent>
      </Card>
      <div className="space-y-3">
        {requests.length === 0 ? (
          <Card>
            <CardContent className="py-14 text-center text-muted-foreground">
              <Smartphone className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Заявок пока нет</p>
              <p className="text-sm mt-1">После запроса активации он появится здесь.</p>
            </CardContent>
          </Card>
        ) : (
          requests.map((request) => {
            const pendingRequest = request.status === 'pending';
            return (
              <Card key={request.id} className={pendingRequest ? 'border-primary/30' : ''}>
                <CardContent className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={pendingRequest ? 'default' : 'secondary'}>{request.status}</Badge>
                        <span className="font-mono text-xs text-muted-foreground break-all">#{request.id}</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                        <div className="rounded-lg border p-3">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Smartphone className="h-4 w-4" /> Устройство
                          </div>
                          <div className="font-medium mt-1">
                            {[request.manufacturer, request.model].filter(Boolean).join(' ') || 'Неизвестное устройство'}
                          </div>
                          <div className="font-mono text-xs text-muted-foreground mt-1 break-all">
                            {request.deviceId || 'ID не передан'}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">Android {request.release || '—'}</div>
                        </div>

                        <div className="rounded-lg border p-3">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Package className="h-4 w-4" /> Сборка
                          </div>
                          <div className="font-medium mt-1">
                            {request.buildName || (request.buildId ? 'Build #' + request.buildId : 'Не указана')}
                          </div>
                          {request.creatorUsername && (
                            <div className="text-xs text-muted-foreground mt-1">Создатель: {request.creatorUsername}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-4">
                        <Clock3 className="h-4 w-4" />
                        Создано: {formatDate(request.createdAt)}
                      </div>
                    </div>

                    {pendingRequest && (
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" className="gap-1.5" onClick={() => handleAction(request.id, 'approve')} disabled={actionId !== null}>
                          <Check className="h-4 w-4" /> Одобрить
                        </Button>
                        <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => handleAction(request.id, 'reject')} disabled={actionId !== null}>
                          <X className="h-4 w-4" /> Отклонить
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
