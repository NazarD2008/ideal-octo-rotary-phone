import { useState, useCallback, useRef, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useDeviceData } from '@/hooks/useDeviceData';
import type { DeviceOutletContext } from '@/types';
import { CMD } from '@/types';
import { DevicePageHeader, ErrorAlert, StatusBadge, LoadingSkeleton } from '@/components/device/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, EyeOff, Eye } from 'lucide-react';

export default function LiumaPage() {
  const { clientId, loadClient, online } = useOutletContext<DeviceOutletContext>();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const { data: hidden, loading, error, refresh, sendCommand, commandStatus } = useDeviceData<boolean>({
    clientId,
    page: 'fason',
    extractData: (d) => !!d.hidden,
    dataType: 'fason',
    defaultValue: false,
  });

  const hideApp = useCallback(async () => {
    await sendCommand(CMD.FASON, { action: 'hide' });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { refresh(); loadClient(); }, 2000);
  }, [sendCommand, refresh, loadClient]);

  const showApp = useCallback(async () => {
    await sendCommand(CMD.FASON, { action: 'show' });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { refresh(); loadClient(); }, 2000);
  }, [sendCommand, refresh, loadClient]);

  const checkStatus = useCallback(async () => {
    await sendCommand(CMD.FASON, { action: 'status' });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { refresh(); loadClient(); }, 2000);
  }, [sendCommand, refresh, loadClient]);

  return (
    <div className="space-y-5">
      <DevicePageHeader
        title="應用程式可見性"
        subtitle="切換裝置上應用程式圖示的可見性"
        actions={[
          { label: '檢查狀態', icon: RefreshCw, onClick: checkStatus, disabled: loading || !online, variant: 'outline' },
        ]}
        refresh={refresh}
        loading={loading}
        commandStatus={commandStatus}
      />

      {error && <ErrorAlert message={error} onRetry={refresh} />}

      {loading && !error ? (
        <LoadingSkeleton rows={2} />
      ) : (
        <Card className="shadow-none">
          <CardContent className="py-8 text-center">
            <div className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
              {hidden ? <EyeOff className="h-8 w-8 text-primary" /> : <Eye className="h-8 w-8 text-primary" />}
            </div>
            <h4 className="text-base font-semibold mb-1">
              應用程式目前{hidden ? '已隱藏' : '可見'}
            </h4>
            <p className="text-xs text-muted-foreground mb-5 max-w-xs mx-auto">
              {hidden
                ? '應用程式圖示已從裝置啟動器隱藏。應用程式仍在背景執行。'
                : '應用程式圖示在裝置啟動器中可見。'}
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={hideApp} variant="destructive" disabled={!!hidden || loading || !online} size="sm">
                <EyeOff className="h-3.5 w-3.5 mr-1.5" /> 隱藏應用程式
              </Button>
              <Button onClick={showApp} disabled={!hidden || loading || !online} size="sm">
                <Eye className="h-3.5 w-3.5 mr-1.5" /> 顯示應用程式
              </Button>
            </div>
            <StatusBadge
              label={hidden ? '已從啟動器隱藏' : '在啟動器中可見'}
              status={hidden ? 'warning' : 'success'}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
