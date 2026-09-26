import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDevicesStore } from '@/store/devices';
import { useAuthStore } from '@/store/auth';
import { getQuickActions } from '@/config/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users, Wifi, WifiOff, Clock, RefreshCw,
  Activity, Zap, Smartphone, ArrowRight,
  ShieldCheck, UserCog,
} from 'lucide-react';
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
    if (hour < 12) return t('pages.dashboard.greeting.morning', { name });
    if (hour < 18) return t('pages.dashboard.greeting.afternoon', { name });
    return t('pages.dashboard.greeting.evening', { name });
  };

  const statCards = [
    { title: t('dashboard.stats.totalDevices'), value: stats?.totalClients || 0, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
    { title: t('dashboard.stats.online'), value: stats?.onlineClients || 0, icon: Wifi, color: 'text-success', bg: 'bg-success/10' },
    { title: t('dashboard.stats.offline'), value: stats?.offlineClients || 0, icon: WifiOff, color: 'text-warning', bg: 'bg-warning/10' },
    { title: t('dashboard.stats.totalUsers'), value: stats?.totalUsers || 0, icon: UserCog, color: 'text-info', bg: 'bg-info/10' },
    { title: t('dashboard.stats.admins'), value: stats?.totalAdmins || 0, icon: ShieldCheck, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { title: t('dashboard.stats.uptime'), value: stats ? formatTime(stats.uptime) : '0m', icon: Clock, color: 'text-primary', bg: 'bg-primary/10' },
  ];

  const quickActions = getQuickActions(hasPermission);

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="mb-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-primary via-primary-light to-primary bg-clip-text text-transparent">
            {getGreeting()}
          </h1>
          <p className="text-muted-foreground text-lg">{t('pages.dashboard.welcome')}</p>
        </div>
      </section>

      {/* Compact Stats Grid */}
      <section>
        <div className="metrics-grid">
          {statCards.map((s, idx) => (
            <Card key={idx} className="stat-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${s.bg}`}>
                    <s.icon className={`h-6 w-6 ${s.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{s.title}</p>
                    <p className="text-2xl font-bold mt-1">{s.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Main Content Grid */}
      <section>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Status Card */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardContent className="p-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
                    <Activity className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Статус системы</h3>
                    <p className="text-sm text-muted-foreground">Все компоненты работают нормально</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-border">
                  <Badge variant="success">Все системы в норме</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Links compact */}
          <div>
            <Card className="h-full">
              <CardContent className="p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-4 tracking-wider">Быстрые ссылки</p>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2 flex-wrap">
                    {quickActions.map((act) => (
                      <Button key={act.to} variant="outline" size="sm" onClick={() => navigate(act.to)} className="gap-2">
                        <act.icon className="h-4 w-4" /> <span>{act.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer Info */}
      <section className="text-center pt-8 border-t border-border">
        <p className="text-sm text-muted-foreground">
          Последнее обновление: {new Date().toLocaleString()} • Статус: <Badge variant="success">Активно</Badge>
        </p>
      </section>
    </div>
  );
}
