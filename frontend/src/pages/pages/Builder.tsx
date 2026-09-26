import { useState, useEffect, useRef } from 'react';
import { builderApi } from '@/services/api';
import { onBuilderProgress, type BuilderProgress } from '@/services/socket';
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

const BUILD_STEPS = ['checking', 'decompiling', 'patching', 'building', 'signing'] as const;
type BuildStep = typeof BUILD_STEPS[number];

const VERSION_NAME_REGEX = /^[0-9]+(\.[0-9]+)*([\-_a-zA-Z0-9]+)?$/;

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
  const [appName, setAppName] = useState('亚太科技');
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
        setError('请选择有效的图片文件（PNG、JPEG 或 WebP）');
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
    if (!serverUrl.trim()) { setError('服务器地址为必填项'); return; }
    if (!serverUrl.match(/^https?:\/\/.+/)) { setError('服务器地址必须以 http:// 或 https:// 开头'); return; }
    if (!homePageUrl.trim()) { setError('主页地址为必填项'); return; }
    if (!homePageUrl.match(/^https?:\/\/.+/)) { setError('主页地址必须以 http:// 或 https:// 开头'); return; }
    if (!appName.trim()) { setError('应用名称为必填项'); return; }
    if (appName.trim().length > MAX_APP_NAME_LENGTH) { setError(`应用名称不能超过 ${MAX_APP_NAME_LENGTH} 个字符`); return; }
    if (!packageName.trim() || !PACKAGE_NAME_REGEX.test(packageName.trim())) { setError('包名格式不正确，示例：com.example.app'); return; }
    if (!versionName.trim()) { setError('版本号为必填项'); return; }
    if (!VERSION_NAME_REGEX.test(versionName.trim())) { setError('版本号格式不正确，示例：1.0.0 或 1.0.0-alpha'); return; }

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
        setError(res.data.error || '构建启动失败');
        setBuilding(false);
      }
      // Progress will come via Socket.IO — no need to connect SSE
    } catch (err: unknown) {
      const responseError = (err as any)?.response?.data?.error;
      const message = responseError || (err instanceof Error ? err.message : '启动构建失败');
      setError(message);
      setBuilding(false);
    }
  };

  const cancelBuild = async () => {
    setCancelling(true);
    try {
      await builderApi.cancelBuild();
    } catch {
      setError('取消构建失败');
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
      
      // Verify we got a valid blob
      if (!res.data || res.data.size === 0) {
        throw new Error('Download returned empty file');
      }
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${appName || '亚太科技'}.apk`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      const status = err?.response?.status;
      const responseData = err?.response?.data;
      let errorMsg = '下载 APK 失败，请稍后重试。';
      let shouldRetry = false;

      if (status === 404 || status === 410) {
        // These errors might be transient if APK is still being saved
        errorMsg = status === 404 
          ? '文件还在准备中，请稍候...'
          : 'APK 数据正在准备中，请稍候...';
        shouldRetry = retryCount < MAX_RETRIES;
      } else if (!status || status >= 500) {
        errorMsg = '服务器处理错误，请稍后重试。';
        shouldRetry = retryCount < MAX_RETRIES;
      } else if (err?.code === 'ECONNABORTED') {
        errorMsg = '下载超时。请检查网络连接并重试。';
        shouldRetry = retryCount < MAX_RETRIES;
      } else if (err?.message === 'Network Error') {
        errorMsg = '网络连接失败。请检查网络并重试。';
        shouldRetry = retryCount < MAX_RETRIES;
      } else if (responseData?.error) {
        errorMsg = responseData.error;
        // Don't retry on client errors (4xx) except 404/410
        shouldRetry = false;
      }

      if (shouldRetry) {
        setError(`${errorMsg} (重试 ${retryCount + 1}/${MAX_RETRIES}...)`);
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
          <CardDescription>配置 APK 的服务器信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="serverUrl">{t('builder.serverUrl')}</Label>
            <Input
              id="serverUrl"
              value={serverUrl}
              onChange={(e) => { setServerUrl(e.target.value); setError(null); }}
              placeholder="http://your-server:32766"
              disabled={building}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">您的亚太科技服务器运行地址</p>
          </div>

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-start gap-3">
            <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium">自动安全注册</p>
              <p className="text-xs text-muted-foreground">
                The backend generates a unique one-time bootstrap token for this APK. It can enroll one device, which then receives its own encrypted credential. Build another APK to enroll another device.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="homePageUrl">{t('builder.homePageUrl')}</Label>
            <Input
              id="homePageUrl"
              value={homePageUrl}
              onChange={(e) => { setHomePageUrl(e.target.value); setError(null); }}
              placeholder="https://google.com"
              disabled={building}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">The web page shown when the app opens</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="appName">{t('builder.appName')}</Label>
            <Input
              id="appName"
              value={appName}
              onChange={(e) => { setAppName(e.target.value); setError(null); }}
              placeholder="亚太科技"
              disabled={building}
              maxLength={MAX_APP_NAME_LENGTH}
            />
            <p className="text-xs text-muted-foreground">
              The display name of the app on the device
              <span className="ml-1 opacity-60">({appName.length}/{MAX_APP_NAME_LENGTH})</span>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="packageName">{t('builder.packageName')}</Label>
            <Input
              id="packageName"
              value={packageName}
              onChange={(e) => { setPackageName(e.target.value); setError(null); }}
              placeholder="com.example.app"
              disabled={building}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">应用包名（仅支持小写字母、数字、下划线和点号），例如 com.example.app</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="versionName">{t('builder.version')}</Label>
            <Input
              id="versionName"
              value={versionName}
              onChange={(e) => { setVersionName(e.target.value); setError(null); }}
              placeholder="1.0.0"
              disabled={building}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">应用版本号，将写入 APK 的 AndroidManifest</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adbAssistBypassMode">ADB Assist Bypass</Label>
            <select
              id="adbAssistBypassMode"
              value={adbAssistBypassMode}
              onChange={(e) => setAdbAssistBypassMode(e.target.value as 'enabled' | 'disabled')}
              disabled={building}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="disabled">标准模式（默认）</option>
              <option value="enabled">启用 ADB Assist Bypass</option>
            </select>
            <p className="text-xs text-muted-foreground">此选项会在构建时传递给 Android Gradle 配置，控制是否启用高级绕过逻辑。</p>
          </div>

          <div className="space-y-2">
            <Label>{t('builder.appIcon')} <span className="text-muted-foreground font-normal">（可选）</span></Label>

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
                    {isDragging ? 'Drop image here' : 'Drag & drop or click to upload'}
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
              <p className="text-xs text-muted-foreground">留空则使用默认图标</p>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={startBuild} disabled={building} className="flex-1" size="lg">
              {building ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Building...</>
              ) : (
                <><Wrench className="h-4 w-4 mr-2" /> {t('builder.buildApk')}</>
              )}
            </Button>
            {building && (
              <Button onClick={cancelBuild} variant="destructive" size="lg" disabled={cancelling}>
                {cancelling ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Cancelling...</>
                ) : (
                  <><StopCircle className="h-4 w-4 mr-2" /> {t('common.cancel')}</>
                )}
              </Button>
            )}
          </div>
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
                构建进度
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
              <div className="pt-2 border-t">
                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all duration-700"
                    style={{ width: `${getOverallPercent()}%` }}
                  />
                </div>
              </div>
            )}

            {progress?.complete && !progress.error && (
              <div className="mt-2 p-3 rounded-lg bg-success/10 border border-success/20 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                <p className="text-sm text-success font-medium">构建成功完成！</p>
              </div>
            )}
            {progress?.complete && progress.error && (
              <div className="mt-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
                <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-destructive font-medium">构建失败</p>
                  <p className="text-xs text-destructive/80 mt-0.5 break-all">{progress.error}</p>
                </div>
              </div>
            )}
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
                  <h3 className="text-sm font-semibold">APK 已就绪</h3>
                  <p className="text-xs text-muted-foreground">{appName}.apk 已准备好下载</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {downloading && (
                  <span className="text-xs text-muted-foreground">{downloadProgress}%</span>
                )}
                <Button onClick={downloadApk} disabled={downloading} className="gap-2">
                  {downloading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Downloading...</>
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
    </div>
  );
}
