import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { useThemeStore } from '@/store/theme';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Shield, Sun, Moon, Monitor } from 'lucide-react';
import logoImg from '/logo.png';
import { t } from '@/locales/i18n';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const { login, isLoading, error, clearError } = useAuthStore();
  const { resolvedTheme, setTheme, theme } = useThemeStore();
  const navigate = useNavigate();

  const [bindingKey, setBindingKey] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setIsLockedOut(false);
    const success = await login(username, password, bindingKey);
    if (success) {
      navigate('/');
    } else {
      const storeError = useAuthStore.getState().error;
      if (storeError?.includes('Too many') || storeError?.includes('locked') || storeError?.includes('429')) {
        setIsLockedOut(true);
      }
    }
  };

  const cycleTheme = () => {
    const next = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
    setTheme(next);
  };

  const ThemeIcon = resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4 relative overflow-hidden">
      {/* Animated Tech Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      <button
        onClick={cycleTheme}
        className="absolute top-4 right-4 z-10 inline-flex items-center justify-center h-9 w-9 rounded-lg border border-primary/50 bg-background/80 backdrop-blur-sm text-foreground hover:bg-accent transition-colors tech-border glow-gold"
        aria-label={t('common.toggleTheme')}
        title={theme === 'system' ? t('theme.system') : theme === 'light' ? t('theme.light') : t('theme.dark')}
      >
        {theme === 'system' ? <Monitor className="h-4 w-4" /> : <ThemeIcon className="h-4 w-4" />}
      </button>

      <Card className="w-full max-w-[400px] shadow-xl border-0 bg-card/90 backdrop-blur-md relative z-10">
        <CardHeader className="text-center space-y-4 pb-4">
          <div className="flex flex-col items-center gap-4">
            <img src={logoImg} alt={t('app.logoAlt')} className="w-24 h-24 object-contain drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]" />
            <div>
              <CardTitle className="text-2xl gradient-gold">{t('app.title')}</CardTitle>
              <CardDescription className="mt-1 text-muted-foreground">{t('auth.login.subtitle')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className={`p-3 rounded-lg border text-sm flex items-center gap-2 ${isLockedOut ? 'bg-orange-500/10 border-orange-500/20 text-orange-600' : 'bg-destructive/10 border-destructive/20 text-destructive'}`}>
                <Shield className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-foreground">{t('auth.login.username')}</Label>
              <Input
                id="username"
                type="text"
                placeholder={t('auth.login.usernamePlaceholder')}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                disabled={isLockedOut}
                className="tech-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bindingKey">Ключ привязки (если есть)</Label>
              <Input id="bindingKey" type="text" placeholder="Binding key" value={bindingKey} onChange={(e) => setBindingKey(e.target.value)} className="tech-border" />
              <p className="text-xs text-muted-foreground">Если учётная запись привязана к машине, необходимо ввести ключ привязки при первом входе с этой машины.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">{t('auth.login.password')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('auth.login.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10 tech-border"
                  disabled={isLockedOut}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading || isLockedOut}>
              {isLoading ? t('auth.login.signing') : isLockedOut ? t('auth.login.lockedOut') : t('auth.login.signIn')}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
