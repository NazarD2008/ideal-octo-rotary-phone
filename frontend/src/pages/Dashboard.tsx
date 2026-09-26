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
    if (hour < 12) return t('pages.dashboard.greeting.morning');
    if (hour < 18) return t('pages.dashboard.greeting.afternoon');
    return t('pages.dashboard.greeting.evening');
  };

  const statCards = [
    { title: t('dashboard.stats.totalDevices'), value: stats?.totalClients || 0, icon: Users, color: 'text-primary', bg: 'bg-primary/10', hover: 'hover:shadow-primary/10' },
    { title: t('dashboard.stats.online'), value: stats?.onlineClients || 0, icon: Wifi, color: 'text-success', bg: 'bg-success/10', hover: 'hover:shadow-success/10' },
    { title: t('dashboard.stats.offline'), value: stats?.offlineClients || 0, icon: WifiOff, color: 'text-warning', bg: 'bg-warning/10', hover: 'hover:shadow-warning/10' },
    { title: t('dashboard.stats.totalUsers'), value: stats?.totalUsers || 0, icon: UserCog, color: 'text-blue-500', bg: 'bg-blue-500/10', hover: 'hover:shadow-blue-500/10' },
    { title: t('dashboard.stats.admins'), value: stats?.totalAdmins || 0, icon: ShieldCheck, color: 'text-orange-500', bg: 'bg-orange-500/10', hover: 'hover:shadow-orange-500/10' },
    { title: t('dashboard.stats.uptime'), value: stats ? formatTime(stats.uptime) : '0m', icon: Clock, color: 'text-primary', bg: 'bg-primary/10', hover: 'hover:shadow-primary/10' },
  ];

  const quickActions = getQuickActions(hasPermission);

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-4">Метрики</div>
          <div className="card p-4">Статистика</div>
          <div className="card p-4">Активность</div>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight gradient-gold">
            {getGreeting()}, <span className="text-primary">{user?.username || 'з”Ёж€·'}</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('pages.dashboard.welcome')}
          </p>
        </div>
        <Button onClick={fetchDashboard} variant="outline" disabled={isLoading} className="self-start">
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {t('pages.dashboard.refreshData')}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((stat) => (
          <Card
            key={stat.title}
            className={`border-0 shadow-sm hover:shadow-md transition-shadow duration-200 ${stat.hover}`}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`h-10 w-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border-0 shadow-sm tech-border glow-gold">
          <CardContent className="p-4">
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-success" />
                <span className="text-sm text-muted-foreground">{t('dashboard.systemStatus')}:</span>
                <Badge className="bg-success text-white border-0 text-xs glow-green">{t('dashboard.runningNormal')}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">{t('dashboard.activeConnections')}:</span>
                <span className="text-sm font-medium">{stats?.onlineClients || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t('dashboard.memoryUsage')}:</span>
                <span className="text-sm font-medium">{stats?.memoryUsage != null ? `${stats.memoryUsage} MB` : 'N/A'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm tech-border glow-gold">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 gradient-gold">{t('dashboard.quickActions')}</p>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(action.to)}
                  className="justify-start"
                >
                  <action.icon className="h-3.5 w-3.5 mr-1.5" />
                  {action.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {hasPermission('device:view') && (
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer tech-border glow-gold" onClick={() => navigate('/devices')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center glow-gold">
                  <Smartphone className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold gradient-gold">{t('pages.devices.title')}</h3>
                  <p className="text-sm text-muted-foreground">{t('pages.devices.description')}</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
