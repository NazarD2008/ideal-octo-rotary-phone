import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDevicesStore } from '@/store/devices';
import { useAuthStore } from '@/store/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Wifi, WifiOff, Clock, Activity, Zap, ShieldCheck, UserCog, Package, FileText, HardDrive, AlertTriangle, Smartphone, RefreshCw, UserRoundCheck } from 'lucide-react';
import { formatTime, formatBytes, formatDate } from '@/lib/utils';
import { t } from '@/locales/i18n';
import { deviceActivationApi } from '@/services/api';

export default function DashboardPage() {
  const { stats, onlineClients, offlineClients, isLoading, fetchDashboard } = useDevicesStore();
  const { user, hasPermission, isAdmin } = useAuthStore();
  const navigate = useNavigate();
  const [pendingActivationCount, setPendingActivationCount] = useState(0);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  useEffect(() => {
    if (!hasPermission('device:activation')) {
      setPendingActivationCount(0);
      return;
    }

    let cancelled = false;
    const loadActivationCount = async () => {
      try {
        const res = await deviceActivationApi.list();
        if (!cancelled && res.data?.success) {
          const requests = res.data.data?.requests || [];
          setPendingActivationCount(requests.filter((request: any) => request.status === 'pending').length);
        }
      } catch {
        if (!cancelled) setPendingActivationCount(0);
      }
    };

    loadActivationCount();
    const interval = setInterval(loadActivationCount, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [hasPermission]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = user?.username || t('common.userFallback') || 'Пользователь';
    if (hour < 12) return `${t('pages.dashboard.greeting.morning', { name }) || `Доброе утро, ${name}`}`;
    if (hour < 18) return `${t('pages.dashboard.greeting.afternoon', { name }) || `Добрый день, ${name}`}`;
    return `${t('pages.dashboard.greeting.evening', { name }) || `Добрый вечер, ${name}`}`;
  };

  const statCards = [
    { title: 'Устройства', value: stats?.totalClients || 0, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
    { title: 'Онлайн', value: stats?.onlineClients || 0, icon: Wifi, color: 'text-success', bg: 'bg-success/10' },
    { title: 'Офлайн', value: stats?.offlineClients || 0, icon: WifiOff, color: 'text-warning', bg: 'bg-warning/10' },
    { title: 'Пользователи', value: stats?.totalUsers || 0, icon: UserCog, color: 'text-info', bg: 'bg-info/10' },
    { title: 'Активации', value: stats?.pendingActivations || 0, icon: ShieldCheck, color: 'text-warning', bg: 'bg-warning/10' },
    { title: 'Билды', value: stats?.totalBuilds || 0, icon: Package, color: 'text-primary', bg: 'bg-primary/10' },
    { title: 'Готовые APK', value: stats?.completedBuilds || 0, icon: Zap, color: 'text-success', bg: 'bg-success/10' },
    { title: 'Ошибки сборки', value: stats?.failedBuilds || 0, icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
    { title: 'События', value: stats?.totalLogs || 0, icon: FileText, color: 'text-info', bg: 'bg-info/10' },
    { title: 'APK storage', value: formatBytes(stats?.apkStorageBytes || 0), icon: HardDrive, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { title: 'Аптайм', value: stats ? formatTime(stats.uptime) : '0m', icon: Clock, color: 'text-primary', bg: 'bg-primary/10' },
  ];

  if (!isAdmin()) {
    const userStatCards = [
      { title: 'Устройства', value: stats?.totalClients || onlineClients.length + offlineClients.length, icon: Smartphone, color: 'text-primary', bg: 'bg-primary/10' },
      { title: 'Онлайн', value: stats?.onlineClients || onlineClients.length, icon: Wifi, color: 'text-success', bg: 'bg-success/10' },
      { title: 'Офлайн', value: stats?.offlineClients || offlineClients.length, icon: WifiOff, color: 'text-warning', bg: 'bg-warning/10' },
      { title: 'Активации', value: stats?.pendingActivations || 0, icon: ShieldCheck, color: 'text-warning', bg: 'bg-warning/10' },
      { title: 'Готовые APK', value: stats?.completedBuilds || 0, icon: Zap, color: 'text-success', bg: 'bg-success/10' },
      { title: 'Ошибки сборки', value: stats?.failedBuilds || 0, icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
      { title: 'Аптайм', value: stats ? formatTime(stats.uptime) : '0m', icon: Clock, color: 'text-primary', bg: 'bg-primary/10' },
    ];

    return (
      <div className="w-full">
        <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
          <section className="py-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-3 leading-tight text-foreground">
              {getGreeting()}
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t('pages.dashboard.welcome') || 'Добро пожаловать в консоль.'}
            </p>
          </section>

          <section className="py-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {userStatCards.map((s, idx) => (
                <Card key={idx} className="h-full">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${s.bg}`}>
                        <s.icon className={`h-6 w-6 ${s.color}`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{s.title}</p>
                        <p className="text-2xl font-bold mt-1">{s.value}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section className="py-6">
            <Card>
              <CardContent className="p-6">
                <h4 className="text-sm font-semibold mb-2">Короткая сводка</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Ваши устройства: {stats?.totalClients || onlineClients.length + offlineClients.length}. Готовых APK: {stats?.completedBuilds || 0}. Ошибок сборки: {stats?.failedBuilds || 0}. Ожидающих активаций: {stats?.pendingActivations || 0}.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => navigate('/devices')}>Устройства</Button>
                  <Button size="sm" onClick={() => navigate('/builder')}>Сборщик APK</Button>
                  {hasPermission('device:activation') && (
                    <Button size="sm" variant="outline" className="gap-2" onClick={() => navigate('/activations')}>
                      <UserRoundCheck className="h-4 w-4" />
                      Разрешения устройств
                      {pendingActivationCount > 0 && (
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-bold leading-none text-destructive-foreground">
                          {pendingActivationCount > 99 ? '99+' : pendingActivationCount}
                        </span>
                      )}
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => navigate('/settings')}>Настройки</Button>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
        {/* Hero */}
        <section className="py-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-3 leading-tight text-foreground">
            {getGreeting()}
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t('pages.dashboard.welcome') || 'Добро пожаловать в консоль — здесь собрана основная информация о состоянии системы.'}
          </p>

          {/* Quick actions are available in the top navigation; removed duplicate buttons here. */}
        </section>

        {/* Stats Grid */}
        <section className="py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {statCards.map((s, idx) => (
              <Card key={idx} className="h-full">
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${s.bg}`}>
                      <s.icon className={`h-6 w-6 ${s.color}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{s.title}</p>
                      <p className="text-2xl font-bold mt-1">{s.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Main status and details */}
        <section className="py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="h-full">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
                      <Activity className="h-6 w-6 text-success" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">{t('pages.dashboard.systemStatus') || 'Статус системы'}</h3>
                      <p className="text-sm text-muted-foreground">{t('pages.dashboard.systemSubtitle') || 'Все ключевые компоненты работают в пределах нормы.'}</p>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-border">
                    <Badge variant="success">{t('pages.dashboard.allSystemsNominal') || 'Все системы в норме'}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card className="h-full">
                <CardContent className="p-6">
                  <h4 className="text-sm font-semibold mb-2">{t('pages.dashboard.quickSummary') || 'Короткая сводка'}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{t('pages.dashboard.quickSummaryText') || 'Здесь отображаются последние показатели и быстрые ссылки для действий.'}</p>
                  <div className="mt-4 flex flex-col gap-2">
                    <Button size="sm" variant="outline" onClick={() => navigate('/devices')}>Просмотреть устройства</Button>
                    <Button size="sm" onClick={() => navigate('/builder')}>Открыть сборку</Button>
                    {hasPermission('device:activation') && (
                      <Button size="sm" variant="outline" className="gap-2" onClick={() => navigate('/activations')}>
                        <UserRoundCheck className="h-4 w-4" />
                        <span>Разрешения устройств</span>
                        {pendingActivationCount > 0 && (
                          <span
                            className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-bold leading-none text-destructive-foreground"
                            aria-label={`${pendingActivationCount} заявок ожидают подтверждения`}
                          >
                            {pendingActivationCount > 99 ? '99+' : pendingActivationCount}
                          </span>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Admin-only detailed information */}
        <section className="py-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Последняя активность</h3>
                    <p className="text-sm text-muted-foreground">Последние события из системного журнала.</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate('/logs')}>Открыть журнал</Button>
                </div>
                <div className="space-y-3">
                  {((stats?.recentLogs || []) as any[]).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Событий пока нет.</p>
                  ) : (
                    ((stats?.recentLogs || []) as any[]).map((entry: any, index: number) => (
                      <div key={entry.id || index} className="border-b last:border-b-0 pb-2">
                        <div className="text-[11px] text-muted-foreground">
                          {entry.time ? formatDate(entry.time) : '—'} · {entry.type || 'INFO'} · {entry.category || 'SYSTEM'}
                        </div>
                        <div className="text-sm mt-1 break-words">{entry.message}</div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <HardDrive className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Хранилище и сборки</h3>
                    <p className="text-sm text-muted-foreground">Использование места и состояние Builder.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">APK в базе</span>
                    <span className="font-semibold">{formatBytes(stats?.apkStorageBytes || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Размер БД</span>
                    <span className="font-semibold">{formatBytes(stats?.databaseBytes || 0)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-muted/40 p-3 text-center">
                      <div className="text-lg font-bold">{stats?.totalBuilds || 0}</div>
                      <div className="text-[11px] text-muted-foreground">Всего</div>
                    </div>
                    <div className="rounded-lg bg-success/10 p-3 text-center">
                      <div className="text-lg font-bold text-success">{stats?.completedBuilds || 0}</div>
                      <div className="text-[11px] text-muted-foreground">Готово</div>
                    </div>
                    <div className="rounded-lg bg-destructive/10 p-3 text-center">
                      <div className="text-lg font-bold text-destructive">{stats?.failedBuilds || 0}</div>
                      <div className="text-[11px] text-muted-foreground">Ошибки</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Footer info */}
        <section className="text-center pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground">
            {t('pages.dashboard.lastUpdate') || 'Последнее обновление:'} {new Date().toLocaleString()} • {t('pages.dashboard.status') || 'Статус:'} <Badge variant="success">{t('pages.dashboard.active') || 'Активно'}</Badge>
          </p>
        </section>
      </div>
    </div>
  );
}
