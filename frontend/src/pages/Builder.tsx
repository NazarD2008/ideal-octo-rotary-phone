import React, { useState, useEffect, useRef } from 'react';
import { builderApi } from '@/services/api';
import { initAdminSocket, onBuilderProgress, onBuilderLog, type BuilderProgress, type BuilderLogPayload } from '@/services/socket';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Wrench, Download, CheckCircle2, XCircle, Loader2, AlertCircle, X,
  Upload, Server, Package, Info, StopCircle, ShieldCheck,
} from 'lucide-react';
import { t } from '@/locales/i18n';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import ButtonMUI from '@mui/material/Button';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Chip from '@mui/material/Chip';

import JobList from '@/components/builder/JobList';

const BUILD_STEPS = ['checking', 'decompiling', 'patching', 'building', 'signing'] as const;
type BuildStep = typeof BUILD_STEPS[number];

const VERSION_NAME_REGEX = /^[0-9]+(\.[0-9]+)*(?:[-_a-zA-Z0-9]+)?$/;

const STEP_LABELS: Record<BuildStep, string> = {
  checking: t('builder.steps.checking'),
  decompiling: t('builder.steps.decompiling'),
  patching: t('builder.steps.patching'),
  building: t('builder.steps.building'),
  signing: t('builder.steps.signing'),
};

const MAX_APP_NAME_LENGTH = 50;
const PACKAGE_NAME_REGEX = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;

export default function BuilderPage() {
  const getDefaultServerUrl = () => {
    const protocol = window.location.protocol;
    const host = window.location.hostname;
    const port = window.location.port;
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      if (port) return `${protocol}//${host}:${port}`;
      return `${protocol}//${host}`;
    }
    return 'http://127.0.0.1:32766';
  };

  const [serverUrl, setServerUrl] = useState(getDefaultServerUrl);
  const [homePageUrl, setHomePageUrl] = useState('https://google.com');
  const [appName, setAppName] = useState('Лиума');
  const [packageName, setPackageName] = useState('com.liuma.app');
  const [versionName, setVersionName] = useState('1.0.0');
  const [adbAssistBypassMode, setAdbAssistBypassMode] = useState<'enabled' | 'disabled'>('disabled');
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const [progress, setProgress] = useState<BuilderProgress | null>(null);
  const [buildComplete, setBuildComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const iconPreviewUrlRef = useRef<string | null>(null);
  const dragCounterRef = useRef(0);

  // New: selected job and per-job logs
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [jobLogs, setJobLogs] = useState<Record<number, Array<{ time: string; line: string; stream: string }>>>({});
  const logsContainerRef = useRef<HTMLDivElement | null>(null);

  // Initialize admin socket once
  useEffect(() => {
    try { initAdminSocket(); } catch { /* ignore */ }
  }, []);

  // Listen for builder progress via Socket.IO
  useEffect(() => {
    const unsubscribe = onBuilderProgress((data: BuilderProgress) => {
      setProgress(data);
      if (data.complete) {
        setBuilding(false);
        setCancelling(false);
        if (!data.error) setBuildComplete(true);
      }
    });
    return unsubscribe;
  }, []);

  // Listen for builder logs and append to per-job buffers
  useEffect(() => {
    const unsub = onBuilderLog((payload: BuilderLogPayload) => {
      const id = typeof payload.jobId === 'number' ? payload.jobId : -1;
      setJobLogs(prev => {
        const arr = prev[id] ? [...prev[id]] : [];
        arr.push({ time: payload.time, line: payload.line, stream: payload.stream });
        // keep last 2000 lines per job
        const capped = arr.slice(-2000);
        return { ...prev, [id]: capped };
      });
    });
    return unsub;
  }, []);

  // Auto-scroll logs when new lines arrive for selected job
  useEffect(() => {
    const el = logsContainerRef.current;
    if (!el) return;
    // scroll to bottom
    el.scrollTop = el.scrollHeight;
  }, [jobLogs, selectedJobId]);

  useEffect(() => {
    return () => {
      if (iconPreviewUrlRef.current) URL.revokeObjectURL(iconPreviewUrlRef.current);
    };
  }, []);

  const processIconFile = (file: File | null) => {
    if (iconPreviewUrlRef.current) {
      URL.revokeObjectURL(iconPreviewUrlRef.current);
      iconPreviewUrlRef.current = null;
    }
    setIconFile(file);
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Пожалуйста, выберите корректный файл изображения (PNG, JPEG или WebP)');
        return;
      }
      const url = URL.createObjectURL(file);
      iconPreviewUrlRef.current = url;
      setIconPreview(url);
    } else {
      setIconPreview(null);
    }
  };

  const removeIcon = () => {
    if (iconPreviewUrlRef.current) {
      URL.revokeObjectURL(iconPreviewUrlRef.current);
      iconPreviewUrlRef.current = null;
    }
    setIconFile(null);
    setIconPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounterRef.current++;
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setIsDragging(false);
  };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;
    const file = e.dataTransfer.files?.[0] || null;
    if (file) processIconFile(file);
  };

  const startBuild = async () => {
    setError(null);
    if (!serverUrl.trim()) { setError('Адрес сервера обязателен'); return; }
    if (!serverUrl.match(/^https?:\/\/.+/)) { setError('Адрес сервера должен начинаться с http:// или https://'); return; }
    if (!homePageUrl.trim()) { setError('Адрес главной страницы обязателен'); return; }
    if (!homePageUrl.match(/^https?:\/\/.+/)) { setError('Адрес главной страницы должен начинаться с http:// или https://'); return; }
    if (!appName.trim()) { setError('Название приложения обязательно'); return; }
    if (appName.trim().length > MAX_APP_NAME_LENGTH) { setError(`Название приложения не может содержать более ${MAX_APP_NAME_LENGTH} символов`); return; }
    if (!packageName.trim() || !PACKAGE_NAME_REGEX.test(packageName.trim())) { setError('Неверный формат имени пакета, например: com.example.app'); return; }
    if (!versionName.trim()) { setError('Поле версии обязательно'); return; }
    if (!VERSION_NAME_REGEX.test(versionName.trim())) { setError('Неверный формат версии, например: 1.0.0 или 1.0.0-alpha'); return; }

    setBuilding(true);
    setProgress(null);
    setBuildComplete(false);
    setCancelling(false);

    const formData = new FormData();
    formData.append('serverUrl', serverUrl.trim());
    formData.append('homePageUrl', homePageUrl.trim());
    formData.append('appName', appName.trim());
    formData.append('packageName', packageName.trim());
    formData.append('versionName', versionName.trim());
    formData.append('adbAssistBypassMode', adbAssistBypassMode);
    if (iconFile) formData.append('appIcon', iconFile);

    try {
      const res = await builderApi.build(formData);
      if (!res.data.success) {
        setError(res.data.error || 'Не удалось запустить сборку');
        setBuilding(false);
      } else if (typeof res.data.jobId === 'number') {
        // Select the job so logs/progress can be tied to it
        setSelectedJobId(res.data.jobId);
        // initialize empty logs buffer for this job
        setJobLogs(prev => ({ ...prev, [res.data.jobId]: prev[res.data.jobId] || [] }));
      }
      // Progress will come via Socket.IO — no need to connect SSE
    } catch (err: unknown) {
      const responseError = (err as any)?.response?.data?.error;
      const message = responseError || (err instanceof Error ? err.message : 'Не удалось запустить сборку');
      setError(message);
      setBuilding(false);
    }
  };

  const cancelBuild = async () => {
    setCancelling(true);
    try {
      await builderApi.cancelBuild();
    } catch {
      setError('Не удалось отменить сборку');
      setCancelling(false);
    }
  };

  const downloadApk = async (retryCount = 0) => {
    const MAX_RETRIES = 5;
    const RETRY_DELAY_MS = 800 + Math.random() * 1200; // 0.8-2s delay

    setDownloading(true);
    setDownloadProgress(0);
    try {
      const res = await builderApi.downloadApk((e) => {
        if (e.total) setDownloadProgress(Math.round((e.loaded * 100) / e.total));
      });

      if (!res.data || res.data.size === 0) {
        throw new Error('Download returned empty file');
      }

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${appName || 'Лиума'}.apk`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      const status = err?.response?.status;
      const responseData = err?.response?.data;
      let errorMsg = 'Не удалось скачать APK, повторите попытку.';
      let shouldRetry = false;

      if (status === 404 || status === 410) {
        errorMsg = status === 404
          ? 'Файл ещё готовится, пожалуйста подождите...'
          : 'APK данных нет, пожалуйста, попробуйте пересобрать APK...';
        shouldRetry = retryCount < MAX_RETRIES;
      } else if (!status || status >= 500) {
        errorMsg = 'Ошибка сервера, попробуйте позже.';
        shouldRetry = retryCount < MAX_RETRIES;
      } else if (err?.code === 'ECONNABORTED') {
        errorMsg = 'Таймаут загрузки. Проверьте соединение и повторите.';
        shouldRetry = retryCount < MAX_RETRIES;
      } else if (err?.message === 'Network Error') {
        errorMsg = 'Сетевая ошибка. Проверьте соединение.';
        shouldRetry = retryCount < MAX_RETRIES;
      } else if (responseData?.error) {
        errorMsg = responseData.error;
        shouldRetry = false;
      }

      if (shouldRetry) {
        setError(`${errorMsg} (Повтор ${retryCount + 1}/${MAX_RETRIES}...)`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        return downloadApk(retryCount + 1);
      }

      setError(errorMsg);
    } finally {
      setDownloading(false);
      setDownloadProgress(0);
    }
  };

  const getStepStatus = (step: BuildStep): 'pending' | 'active' | 'done' | 'failed' => {
    if (!progress) return 'pending';
    const currentIdx = BUILD_STEPS.indexOf(progress.step as BuildStep);
    const stepIdx = BUILD_STEPS.indexOf(step);
    if (progress.complete && progress.error && progress.step === step) return 'failed';
    if (progress.complete && !progress.error && progress.step === step) return 'done';
    if (!progress.complete && progress.step === step) return 'active';
    if (currentIdx > stepIdx) return 'done';
    return 'pending';
  };

  const getOverallPercent = (): number => {
    if (!progress) return 0;
    if (progress.complete) return 100;
    const idx = BUILD_STEPS.indexOf(progress.step as BuildStep);
    if (idx < 0) return 0;
    return Math.round(((idx + 0.5) / BUILD_STEPS.length) * 100);
  };

  const clearSelectedLogs = () => {
    if (selectedJobId == null) return;
    setJobLogs(prev => ({ ...prev, [selectedJobId]: [] }));
  };

  const downloadLogs = () => {
    if (selectedJobId == null) return;
    const lines = (jobLogs[selectedJobId] || []).map(l => `[${l.time}] ${l.stream.toUpperCase()}: ${l.line}`).join('\n');
    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `build-${selectedJobId}.log`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Wrench className="h-5 w-5 text-primary" />
          </div>
          {t('pages.builder.title')}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {t('pages.builder.description')}
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-sm">{t('common.error')}</p>
            <p className="text-sm mt-0.5 opacity-90">{error}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setError(null)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" /> {t('builder.configuration')}
          </CardTitle>
          <CardDescription>{t('pages.builder.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="serverUrl">{t('builder.serverUrl')}</Label>
           
              <TextField id="serverUrl"
              value={serverUrl}
              onChange={(e) => { setServerUrl(e.target.value); setError(null); }}
              placeholder="http://your-server:32766"
              disabled={building}
              sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.875rem' } }}
            fullWidth
            />
            <p className="text-xs text-muted-foreground">{t('builder.serverHelp') || 'Адрес, по которому запущен ваш сервер Лиума'}</p>
          </div>

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-start gap-3">
            <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Автоматическая безопасная регистрация</p>
              <p className="text-xs text-muted-foreground">
                Бэкенд генерирует уникальный одноразовый токен регистрации для этого APK. Он может зарегистрировать одно устройство, которое получит зашифрованные учётные данные. Чтобы зарегистрировать другое устройство, соберите новый APK.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="homePageUrl">{t('builder.homePageUrl')}</Label>
            <TextField
              id="homePageUrl"
              value={homePageUrl}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setHomePageUrl(e.target.value); setError(null); }}
              placeholder="https://example.com"
              disabled={building}
              sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.875rem' } }} variant="outlined" size="small"
            fullWidth
            />
            <p className="text-xs text-muted-foreground">Веб-страница, открываемая приложением</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="appName">{t('builder.appName')}</Label>
            <TextField
              id="appName"
              value={appName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setAppName(e.target.value); setError(null); }}
              placeholder="Лиума"
              disabled={building}
              
            
            fullWidth/>
            <p className="text-xs text-muted-foreground">
              {"Название приложения на устройстве"}
              <span className="ml-1 opacity-60">({appName.length}/{MAX_APP_NAME_LENGTH})</span>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="packageName">{t('builder.packageName')}</Label>
            <TextField
              id="packageName"
              value={packageName}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setPackageName(e.target.value); setError(null); }}
              placeholder="com.example.app"
              disabled={building}
              sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.875rem' } }} variant="outlined" size="small"
            fullWidth
            />
            <p className="text-xs text-muted-foreground">Имя пакета (только строчные буквы, цифры, подчёркивания и точки), например com.example.app</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="versionName">{t('builder.version')}</Label>
            <TextField
              id="versionName"
              value={versionName}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setVersionName(e.target.value); setError(null); }}
              placeholder="1.0.0"
              disabled={building}
              sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.875rem' } }} variant="outlined" size="small"
            fullWidth
            />
            <p className="text-xs text-muted-foreground">Номер версии приложения; будет записан в AndroidManifest</p>
          </div>

          <div className="space-y-2">
            <InputLabel htmlFor="adbAssistBypassMode">ADB Assist Bypass</InputLabel>
            <FormControl fullWidth size="small">
              <Select
                id="adbAssistBypassMode"
                value={adbAssistBypassMode}
                onChange={(e: SelectChangeEvent<string>) => setAdbAssistBypassMode(e.target.value as 'enabled' | 'disabled')}
                disabled={building}
              >
                <MenuItem value="disabled">Стандартный режим (по умолчанию)</MenuItem>
                <MenuItem value="enabled">Включить ADB Assist Bypass</MenuItem>
              </Select>
            </FormControl>
            <p className="text-xs text-muted-foreground">Эта опция передаётся в конфигурацию сборки и управляет дополнительными обходными механизмами.</p>
          </div>

          <div className="space-y-2">
            <Label>{t('builder.appIcon')} <span className="text-muted-foreground font-normal">({t('common.optional') || 'опционально'})</span></Label>

            {iconPreview ? (
              <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden border shrink-0">
                  <img src={iconPreview} alt="Preview" className="h-full w-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{iconFile?.name}</p>
                  <p className="text-xs text-muted-foreground">{iconFile ? `${(iconFile.size / 1024).toFixed(1)} KB` : ''}</p>
                </div>
                <Button variant="outline" size="sm" onClick={removeIcon} disabled={building}>
                  <X className="h-3 w-3 mr-1" /> {t('builder.removeIcon')}
                </Button>
              </div>
            ) : (
              <div
                className={`rounded-lg border-2 border-dashed transition-colors cursor-pointer ${
                  isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <div className="flex items-center justify-center gap-2 py-4 px-4">
                  <Upload className={`h-4 w-4 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
                  <p className="text-sm text-muted-foreground">
                    {isDragging ? 'Перетащите изображение сюда' : 'Перетащите или нажмите для загрузки'}
                  </p>
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => processIconFile(e.target.files?.[0] || null)}
              disabled={building}
              className="hidden"
            />
            {!iconFile && (
              <p className="text-xs text-muted-foreground">Оставьте пустым для использования иконки по умолчанию</p>
            )}
          </div>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <ButtonMUI variant="contained" onClick={startBuild} disabled={building} sx={{ flex: 1 }} size="large">
              {building ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Сборка...</>
              ) : (
                <><Wrench className="h-4 w-4 mr-2" /> {t('builder.buildApk')}</>
              )}
            </ButtonMUI>
            {building && (
              <ButtonMUI onClick={cancelBuild} variant="outlined" color="error" size="large" disabled={cancelling}>
                {cancelling ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Отмена...</>
                ) : (
                  <><StopCircle className="h-4 w-4 mr-2" /> {t('common.cancel')}</>
                )}
              </ButtonMUI>
            )}
          </Box>
        </CardContent>
      </Card>

      {(building || progress) && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                {building ? (
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                ) : progress?.complete ? (
                  progress.error ? (
                    <XCircle className="h-5 w-5 text-destructive" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  )
                ) : (
                  <Package className="h-5 w-5 text-muted-foreground" />
                )}
                Прогресс сборки
              </span>
              {building && (
                <Badge variant="secondary" className="text-xs font-mono">{getOverallPercent()}%</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {BUILD_STEPS.map((step, index) => {
              const status = getStepStatus(step);
              const isLast = index === BUILD_STEPS.length - 1;
              return (
                <div key={step} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      status === 'active' ? 'bg-primary text-primary-foreground ring-4 ring-primary/10' :
                      status === 'done' ? 'bg-success/15 text-success' :
                      status === 'failed' ? 'bg-destructive/15 text-destructive' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {status === 'done' ? <CheckCircle2 className="h-4 w-4" /> :
                       status === 'failed' ? <XCircle className="h-4 w-4" /> :
                       status === 'active' ? <Loader2 className="h-4 w-4 animate-spin" /> :
                       <Info className="h-4 w-4" />}
                    </div>
                    {!isLast && (
                      <div className={`w-0.5 h-4 ${status === 'done' ? 'bg-success/40' : 'bg-muted'}`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium ${
                        status === 'active' ? 'text-foreground' :
                        status === 'done' ? 'text-success' :
                        status === 'failed' ? 'text-destructive' :
                        'text-muted-foreground'
                      }`}>
                        {STEP_LABELS[step]}
                      </p>
                      {status === 'active' && (
                        <Loader2 className="h-3 w-3 animate-spin text-primary" />
                      )}
                    </div>
                    {status === 'active' && progress?.message && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{progress.message}</p>
                    )}
                    {status === 'failed' && progress?.error && (
                      <p className="text-xs text-destructive/80 mt-0.5 break-all">{progress.error}</p>
                    )}
                  </div>
                </div>
              );
            })}

            {building && (
              <Box sx={{ pt: 2, borderTop: 1, borderColor: 'divider' }}>
                <LinearProgress variant="determinate" value={getOverallPercent()} />
              </Box>
            )}

            {progress?.complete && !progress.error && (
              <div className="mt-2 p-3 rounded-lg bg-success/10 border border-success/20 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                <p className="text-sm text-success font-medium">Сборка успешно завершена!</p>
              </div>
            )}
            {progress?.complete && progress.error && (
              <div className="mt-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
                <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-destructive font-medium">Сборка не удалась</p>
                  <p className="text-xs text-destructive/80 mt-0.5 break-all">{progress.error}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Per-job logs viewer */}
      {selectedJobId != null && (
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Журнал (Job {selectedJobId})</CardTitle>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={clearSelectedLogs}>Очистить</Button>
                <Button size="sm" variant="outline" onClick={downloadLogs}>Скачать</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div ref={logsContainerRef} className="h-48 overflow-auto font-mono text-xs bg-surface rounded p-2">
              {(jobLogs[selectedJobId] || []).map((L, idx) => (
                <div key={idx} className={`whitespace-pre-wrap ${L.stream === 'stderr' ? 'text-destructive' : L.stream === 'info' ? 'text-muted-foreground' : ''}`}>
                  <span className="opacity-60 mr-2">[{new Date(L.time).toLocaleTimeString()}]</span>
                  <span className="font-semibold mr-2">{L.stream.toUpperCase()}</span>
                  <span>{L.line}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {buildComplete && (
        <Card className="shadow-sm border-success/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-success/15 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">APK готов</h3>
                  <p className="text-xs text-muted-foreground">{appName}.apk готов к загрузке</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {downloading && (
                  <span className="text-xs text-muted-foreground">{downloadProgress}%</span>
                )}
                <Button onClick={() => downloadApk()} disabled={downloading} className="gap-2">
                  {downloading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Загрузка...</>
                  ) : (
                    <><Download className="h-4 w-4" /> {t('builder.downloadApk')}</>
                  )}
                </Button>
              </div>
            </div>
            {downloading && (
              <div className="mt-3">
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <JobList selectedJobId={selectedJobId} onSelect={(id: number) => setSelectedJobId(id)} />
    </div>
  );
}
