import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDevicesStore } from '@/store/devices';
import { useAuthStore } from '@/store/auth';
import { getQuickActions } from '@/config/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Wifi, WifiOff, Clock, Activity, Zap, ShieldCheck, UserCog } from 'lucide-react';
import { formatTime } from '@/lib/utils';
import { t } from '@/locales/i18n';

export default function DashboardPage() {
  const { stats, isLoading, fetchDashboard } = useDevicesStore();
  const { user, hasPermission } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = user?.username || t('common.userFallback') || 'Пользователь';
    if (hour < 12) return `${t('pages.dashboard.greeting.morning', { name }) || `Доброе утро, ${name}`}`;
    if (hour < 18) return `${t('pages.dashboard.greeting.afternoon', { name }) || `Добрый день, ${name}`}`;
    return `${t('pages.dashboard.greeting.evening', { name }) || `Добрый вечер, ${name}`}`;
  };

  const statCards = [
    { title: t('dashboard.stats.totalDevices') || 'Устройства', value: stats?.totalClients || 0, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
    { title: t('dashboard.stats.online') || 'Онлайн', value: stats?.onlineClients || 0, icon: Wifi, color: 'text-success', bg: 'bg-success/10' },
    { title: t('dashboard.stats.offline') || 'Офлайн', value: stats?.offlineClients || 0, icon: WifiOff, color: 'text-warning', bg: 'bg-warning/10' },
    { title: t('dashboard.stats.totalUsers') || 'Пользователи', value: stats?.totalUsers || 0, icon: UserCog, color: 'text-info', bg: 'bg-info/10' },
    { title: t('dashboard.stats.admins') || 'Админы', value: stats?.totalAdmins || 0, icon: ShieldCheck, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { title: t('dashboard.stats.uptime') || 'Аптайм', value: stats ? formatTime(stats.uptime) : '0m', icon: Clock, color: 'text-primary', bg: 'bg-primary/10' },
  ];

  const quickActions = getQuickActions(hasPermission);

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

          {/* Quick actions */}
          <div className="mt-6 flex justify-center">
            <div className="flex flex-wrap gap-3">
              {quickActions.map((act) => (
                <Button key={act.to} variant="outline" size="sm" onClick={() => navigate(act.to)} className="gap-2">
                  <act.icon className="h-4 w-4" /> <span>{act.label}</span>
                </Button>
              ))}
            </div>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {statCards.map((s, idx) => (
              <Card key={idx} className="h-full">
                <CardContent className="p-6">
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
                  </div>
                </CardContent>
              </Card>
            </div>
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
