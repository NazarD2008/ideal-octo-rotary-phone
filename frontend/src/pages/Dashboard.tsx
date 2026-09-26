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
    const name = user?.username || 'Пользователь';
    if (hour < 12) return t('pages.dashboard.greeting.morning', { name });
    if (hour < 18) return t('pages.dashboard.greeting.afternoon', { name });
    return t('pages.dashboard.greeting.evening', { name });
  };

  const statCards = [
    { title: t('dashboard.stats.totalDevices'), value: stats?.totalClients || 0, icon: Users, color: 'text-primary' },
    { title: t('dashboard.stats.online'), value: stats?.onlineClients || 0, icon: Wifi, color: 'text-success' },
    { title: t('dashboard.stats.offline'), value: stats?.offlineClients || 0, icon: WifiOff, color: 'text-warning' },
    { title: t('dashboard.stats.totalUsers'), value: stats?.totalUsers || 0, icon: UserCog, color: 'text-blue-400' },
    { title: t('dashboard.stats.admins'), value: stats?.totalAdmins || 0, icon: ShieldCheck, color: 'text-orange-400' },
    { title: t('dashboard.stats.uptime'), value: stats ? formatTime(stats.uptime) : '0m', icon: Clock, color: 'text-primary' },
  ];

  const quickActions = getQuickActions(hasPermission);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="hero py-8">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h1 className="text-3xl md:text-4xl font-extrabold gradient-gold mb-2">{getGreeting()}</h1>
          <p className="text-sm text-muted-foreground">{t('pages.dashboard.welcome')}</p>
        </div>
      </section>

      {/* Metrics */}
      <section>
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {statCards.map((s, idx) => (
              <article key={idx} className="metric-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{s.title}</p>
                    <p className="text-2xl font-bold mt-1">{s.value}</p>
                  </div>
                  <div className="h-12 w-12 rounded-lg flex items-center justify-center bg-card-foreground/5">
                    <s.icon className={`h-6 w-6 ${s.color}`} />
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Quick actions */}
          <div className="mt-6 bg-transparent p-4">
            <div className="flex flex-wrap items-center gap-3">
              {quickActions.slice(0,4).map((a) => (
                <Button key={a.to} variant="default" size="sm" onClick={() => navigate(a.to)} className="btn--sm">
                  <a.icon className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">{a.label}</span>
                </Button>
              ))}
              <Button onClick={fetchDashboard} variant="ghost" size="sm" className="btn--sm">
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                {t('pages.dashboard.refreshData')}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Main area */}
      <section>
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <h3 className="text-lg font-semibold mb-2">{t('dashboard.systemStatus')}</h3>
                  <p className="text-sm text-muted-foreground">{t('dashboard.runningNormal')}</p>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">{t('dashboard.quickActions')}</p>
                  <div className="flex flex-col gap-2">
                    {quickActions.map((act) => (
                      <Button key={act.to} variant="outline" size="sm" onClick={() => navigate(act.to)} className="justify-start">
                        <act.icon className="h-3.5 w-3.5 mr-2" /> {act.label}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
