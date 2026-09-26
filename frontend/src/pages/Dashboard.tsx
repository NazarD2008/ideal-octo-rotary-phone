import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDevicesStore } from '@/store/devices';
import { useAuthStore } from '@/store/auth';
import { getQuickActions } from '@/config/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users, Wifi, WifiOff, Clock, RefreshCw,
  Activity, Zap, Smartphone, ArrowRight,
  ShieldCheck, UserCog, TrendingUp, TrendingDown,
} from 'lucide-react';
import { formatTime } from '@/lib/utils';
import { t } from '@/locales/i18n';

export default function DashboardPage() {
  const { stats, isLoading, fetchDashboard } = useDevicesStore();
  const { user, hasPermission } = useAuthStore();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = user?.username || t('common.userFallback') || 'Пользователь';
    if (hour < 12) return t('pages.dashboard.greeting.morning', { name }) || `Доброе утро, ${name}!`;
    if (hour < 18) return t('pages.dashboard.greeting.afternoon', { name }) || `Добрый день, ${name}!`;
    return t('pages.dashboard.greeting.evening', { name }) || `Добрый вечер, ${name}!`;
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchDashboard();
    setIsRefreshing(false);
  };

  const statCards = [
    {
      title: t('dashboard.stats.totalDevices') || 'Всего устройств',
      value: stats?.totalClients || 0,
      icon: Users,
      color: 'text-primary',
      bg: 'bg-primary/10',
      trend: 'up'
    },
    {
      title: t('dashboard.stats.online') || 'Онлайн',
      value: stats?.onlineClients || 0,
      icon: Wifi,
      color: 'text-success',
      bg: 'bg-success/10',
      trend: 'up'
    },
    {
      title: t('dashboard.stats.offline') || 'Офлайн',
      value: stats?.offlineClients || 0,
      icon: WifiOff,
      color: 'text-warning',
      bg: 'bg-warning/10',
      trend: 'down'
    },
    {
      title: t('dashboard.stats.totalUsers') || 'Пользователей',
      value: stats?.totalUsers || 0,
      icon: UserCog,
      color: 'text-info',
      bg: 'bg-info/10',
      trend: 'up'
    },
    {
      title: t('dashboard.stats.admins') || 'Администраторы',
      value: stats?.totalAdmins || 0,
      icon: ShieldCheck,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
      trend: 'up'
    },
    {
      title: t('dashboard.stats.uptime') || 'Время работы',
      value: stats ? formatTime(stats.uptime) : '0m',
      icon: Clock,
      color: 'text-primary',
      bg: 'bg-primary/10',
      trend: 'up'
    },
  ];

  const quickActions = getQuickActions(hasPermission);

  const systemHealthy = (stats?.onlineClients || 0) > 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Hero Section с приветствием */}
      <section className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/5 via-primary/3 to-transparent border border-primary/10 p-8">
        <div className="relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
            {getGreeting()}
          </h1>
          <p className="text-lg text-muted-foreground">
            {t('pages.dashboard.welcome') || 'Добро пожаловать в панель управления'}
          </p>
        </div>

        {/* Декоративные элементы */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl -z-0" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-accent/5 rounded-full blur-3xl -z-0" />
      </section>

      {/* Контрольные карточки статистики */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Статистика системы</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Обновление...' : 'Обновить'}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {statCards.map((stat, idx) => {
            const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown;
            const trendColor = stat.trend === 'up' ? 'text-success' : 'text-warning';

            return (
              <Card key={idx} className="group hover:shadow-lg transition-all duration-300 hover:border-primary/50">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`h-12 w-12 rounded-lg flex items-center justify-center transition-all ${stat.bg} group-hover:scale-110`}>
                      <stat.icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                    <TrendIcon className={`h-4 w-4 ${trendColor}`} />
                  </div>

                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    {stat.value}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Основная сетка контента */}
      <section>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Карточка статуса системы */}
          <div className="lg:col-span-2">
            <Card className={`h-full border-2 transition-all ${systemHealthy ? 'border-success/30 bg-success/5' : 'border-warning/30 bg-warning/5'}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${systemHealthy ? 'bg-success/10' : 'bg-warning/10'}`}>
                      <Activity className={`h-6 w-6 ${systemHealthy ? 'text-success' : 'text-warning'}`} />
                    </div>
                    <div>
                      <CardTitle>Статус системы</CardTitle>
                      <CardDescription>
                        {systemHealthy
                          ? 'Все компоненты работают нормально'
                          : 'Внимание: некоторые устройства неактивны'}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={systemHealthy ? 'default' : 'secondary'} className="gap-2">
                    <span className={`h-2 w-2 rounded-full ${systemHealthy ? 'bg-success' : 'bg-warning'}`} />
                    {systemHealthy ? 'Все в норме' : 'Проверить'}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                    <span className="text-sm text-muted-foreground">Активные процессы</span>
                    <span className="font-semibold text-lg">{stats?.onlineClients || 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                    <span className="text-sm text-muted-foreground">Средняя задержка</span>
                    <span className="font-semibold text-lg">
                      {stats && 'avgLatency' in stats ? `${(stats.avgLatency as number).toFixed(0)}ms` : 'N/A'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Быстрые ссылки */}
          <div>
            <Card className="h-full hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Быстрые действия
                </CardTitle>
                <CardDescription>
                  Популярные функции
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="space-y-2">
                  {quickActions.slice(0, 5).map((action) => (
                    <Button
                      key={action.to}
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(action.to)}
                      className="w-full justify-start gap-2 hover:bg-primary/10 hover:border-primary transition-all"
                    >
                      <action.icon className="h-4 w-4" />
                      <span className="flex-1 text-left">{action.label}</span>
                      <ArrowRight className="h-3 w-3 opacity-50" />
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Информация о последнем обновлении */}
      <section className="border-t border-border pt-6">
        <div className="flex items-center justify-between text-sm text-muted-foreground px-2 py-4 rounded-lg bg-background/50">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Последнее обновление: {new Date().toLocaleString()}</span>
          </div>
          <Badge variant="outline" className="gap-2">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            Активно
          </Badge>
        </div>
      </section>
    </div>
  );
}