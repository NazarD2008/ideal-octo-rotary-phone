import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { useThemeStore } from '@/store/theme';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Shield, Sun, Moon, Monitor, Lock, User, Key, Check, X, AlertCircle } from 'lucide-react';
import logoImg from '/logo.png';
import { t } from '@/locales/i18n';

// Компонент для индикатора надежности пароля
function PasswordStrengthIndicator({ password }: { password: string }) {
  const getStrength = (pwd: string) => {
    if (!pwd) return { level: 0, label: '', color: 'bg-gray-300', text: '' };

    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength++;

    const levels = [
      { level: 0, label: '', color: 'bg-gray-300', text: '' },
      { level: 1, label: t('auth.password.weak') || 'Слабый', color: 'bg-red-500', text: 'text-red-600' },
      { level: 2, label: t('auth.password.fair') || 'Средний', color: 'bg-orange-500', text: 'text-orange-600' },
      { level: 3, label: t('auth.password.good') || 'Хороший', color: 'bg-yellow-500', text: 'text-yellow-600' },
      { level: 4, label: t('auth.password.strong') || 'Надёжный', color: 'bg-green-500', text: 'text-green-600' },
    ];

    return levels[Math.min(strength, 4)];
  };

  const strength = getStrength(password);
  if (!password) return null;

  return (
    <div className="space-y-2 mt-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < strength.level ? strength.color : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${strength.text}`}>
        {strength.label}
      </p>
    </div>
  );
}

// Компонент для ошибок валидации
function ValidationMessage({ show, type, message }: { show: boolean; type: 'error' | 'success'; message: string }) {
  if (!show) return null;

  const Icon = type === 'error' ? AlertCircle : Check;
  const colors = type === 'error'
    ? 'text-red-600 bg-red-50'
    : 'text-green-600 bg-green-50';

  return (
    <div className={`flex items-center gap-2 text-xs font-medium ${colors} p-2 rounded transition-all`}>
      <Icon className="h-4 w-4" />
      {message}
    </div>
  );
}

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [bindingKey, setBindingKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showBindingKey, setShowBindingKey] = useState(false);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const { login, isLoading, error, clearError } = useAuthStore();
  const { resolvedTheme, setTheme, theme } = useThemeStore();
  const navigate = useNavigate();

  useEffect(() => {
    clearError();
  }, []);

  // Валидация в реальном времени
  const validateField = (field: string, value: string) => {
    const errors = { ...validationErrors };

    if (field === 'username') {
      if (!value) {
        errors.username = t('auth.validation.usernameRequired') || 'Введите логин';
      } else if (value.length < 3) {
        errors.username = t('auth.validation.usernameTooShort') || 'Минимум 3 символа';
      } else {
        delete errors.username;
      }
    }

    if (field === 'password') {
      if (!value) {
        errors.password = t('auth.validation.passwordRequired') || 'Введите пароль';
      } else if (value.length < 6) {
        errors.password = t('auth.validation.passwordTooShort') || 'Минимум 6 символов';
      } else {
        delete errors.password;
      }
    }

    setValidationErrors(errors);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setIsLockedOut(false);

    // Финальная валидация
    if (!username) {
      setValidationErrors({ username: t('auth.validation.usernameRequired') || 'Введите логин' });
      return;
    }
    if (!password) {
      setValidationErrors({ password: t('auth.validation.passwordRequired') || 'Введите пароль' });
      return;
    }

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
  const isFormValid = username && password && !validationErrors.username && !validationErrors.password;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4 relative overflow-hidden">
      {/* Анимированный фон с градиентом */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      {/* Кнопка переключения темы */}
      <button
        onClick={cycleTheme}
        className="absolute top-6 right-6 z-10 inline-flex items-center justify-center h-10 w-10 rounded-lg border border-border bg-card/50 backdrop-blur text-foreground hover:bg-card hover:border-primary transition-all duration-300 shadow-lg hover:shadow-xl"
        aria-label={t('common.toggleTheme') || 'Toggle theme'}
        title={theme === 'system' ? (t('theme.system') || 'System') : theme === 'light' ? (t('theme.light') || 'Light') : (t('theme.dark') || 'Dark')}
      >
        {theme === 'system' ? <Monitor className="h-5 w-5" /> : <ThemeIcon className="h-5 w-5" />}
      </button>

      {/* Основная карточка */}
      <Card className="w-full max-w-md shadow-2xl border-0 bg-card/80 backdrop-blur relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Заголовок с логотипом */}
        <CardHeader className="text-center space-y-6 pb-8">
          <div className="flex flex-col items-center gap-4">
            {/* Логотип с эффектом */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/40 to-accent/40 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-300 opacity-75 group-hover:opacity-100"></div>
              <img
                src={logoImg}
                alt={t('app.logoAlt') || 'Logo'}
                className="w-20 h-20 object-contain relative drop-shadow-lg"
              />
            </div>

            {/* Текст заголовка */}
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                {t('app.title') || 'My App'}
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                {t('auth.login.subtitle') || 'Вход в вашу учетную запись'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        {/* Форма входа */}
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-5">
            {/* Сообщение об ошибке сервера */}
            {error && (
              <div className={`p-4 rounded-lg border text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2 ${
                isLockedOut
                  ? 'bg-warning/10 border-warning/30 text-warning-dark'
                  : 'bg-destructive/10 border-destructive/30 text-destructive'
              }`}>
                <Shield className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">{error}</p>
                  {isLockedOut && (
                    <p className="text-xs opacity-75 mt-1">
                      {t('auth.login.tryLater') || 'Пожалуйста, попробуйте позже'}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Поле логина */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-foreground font-semibold text-sm">
                {t('auth.login.username') || 'Логин'}
              </Label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none" />
                <Input
                  id="username"
                  type="text"
                  placeholder={t('auth.login.usernamePlaceholder') || 'Введите ваш логин'}
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    validateField('username', e.target.value);
                  }}
                  onFocus={() => setFocusedField('username')}
                  onBlur={() => setFocusedField(null)}
                  required
                  autoFocus
                  disabled={isLockedOut || isLoading}
                  className={`pl-10 transition-all ${
                    focusedField === 'username'
                      ? 'border-primary ring-2 ring-primary/20'
                      : validationErrors.username
                      ? 'border-destructive ring-2 ring-destructive/20'
                      : ''
                  }`}
                />
              </div>
              <ValidationMessage
                show={!!validationErrors.username}
                type="error"
                message={validationErrors.username}
              />
            </div>

            {/* Поле ключа привязки */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="bindingKey" className="text-foreground font-semibold text-sm">
                  {t('auth.login.bindingKey') || 'Ключ привязки'}
                </Label>
                <span className="text-xs text-muted-foreground font-medium">
                  {t('auth.login.optional') || 'Опционально'}
                </span>
              </div>
              <div className="relative group">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none" />
                <Input
                  id="bindingKey"
                  type={showBindingKey ? 'text' : 'password'}
                  placeholder={t('auth.login.bindingKeyPlaceholder') || 'Введите ключ (если требуется)'}
                  value={bindingKey}
                  onChange={(e) => setBindingKey(e.target.value)}
                  onFocus={() => setFocusedField('bindingKey')}
                  onBlur={() => setFocusedField(null)}
                  disabled={isLockedOut || isLoading}
                  className={`pl-10 pr-10 transition-all ${
                    focusedField === 'bindingKey'
                      ? 'border-primary ring-2 ring-primary/20'
                      : ''
                  }`}
                />
                {bindingKey && (
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    onClick={() => setShowBindingKey(!showBindingKey)}
                    aria-label={showBindingKey ? 'Hide key' : 'Show key'}
                  >
                    {showBindingKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                )}
              </div>
              {!bindingKey && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t('auth.login.bindingKeyHint') || 'Если ваша учетная запись привязана к устройству, введите ключ'}
                </p>
              )}
            </div>

            {/* Поле пароля */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground font-semibold text-sm">
                {t('auth.login.password') || 'Пароль'}
              </Label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('auth.login.passwordPlaceholder') || 'Введите ваш пароль'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    validateField('password', e.target.value);
                  }}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  required
                  disabled={isLockedOut || isLoading}
                  className={`pl-10 pr-10 transition-all ${
                    focusedField === 'password'
                      ? 'border-primary ring-2 ring-primary/20'
                      : validationErrors.password
                      ? 'border-destructive ring-2 ring-destructive/20'
                      : ''
                  }`}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Индикатор надежности пароля */}
              <PasswordStrengthIndicator password={password} />

              <ValidationMessage
                show={!!validationErrors.password}
                type="error"
                message={validationErrors.password}
              />
            </div>
          </CardContent>

          {/* Кнопка входа */}
          <CardFooter className="flex flex-col gap-3 pt-6">
            <Button
              type="submit"
              disabled={!isFormValid || isLoading || isLockedOut}
              className="w-full h-11 font-semibold transition-all duration-300"
              size="lg"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  {t('common.loading') || 'Загрузка...'}
                </span>
              ) : (
                t('auth.login.submit') || 'Войти'
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              {t('auth.login.noAccount') || 'Нет учетной записи?'} {' '}
              <a href="/register" className="text-primary hover:text-primary/80 font-semibold transition-colors">
                {t('auth.login.register') || 'Зарегистрируйтесь'}
              </a>
            </p>
          </CardFooter>
        </form>
      </Card>

      {/* Футер */}
      <footer className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center text-xs text-muted-foreground z-0">
        <p>© 2024 {t('app.title') || 'My App'}. {t('common.allRightsReserved') || 'Все права защищены'}.</p>
      </footer>
    </div>
  );
}