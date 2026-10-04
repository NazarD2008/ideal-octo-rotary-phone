import { useEffect, useState } from 'react';
import { usersApi } from '../services/usersApi';
import { useNavigate } from 'react-router-dom';
import { useDevicesStore } from '@/store/devices';
import { useAuthStore } from '@/store/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Smartphone, Trash2, RefreshCw, ChevronRight, Search, MapPin, Clock } from 'lucide-react';
import { getCountryFlag, formatDate } from '@/lib/utils';
import { t } from '@/locales/i18n';
import { clientsApi } from '@/services/api';

export default function DevicesPage() {
  const { onlineClients, offlineClients, isLoading, fetchDashboard, deleteDevice } = useDevicesStore();
  const { hasPermission, isAdmin } = useAuthStore();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'online' | 'offline' | 'all'>('all');
  const [assigningOwnerFor, setAssigningOwnerFor] = useState<string | null>(null);
  const [ownerCandidate, setOwnerCandidate] = useState<string>('');
  const [selectedOwnerId, setSelectedOwnerId] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<Array<{id:number; username:string; email:string}>>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Вы уверены, что хотите удалить это устройство?')) return;
    setDeleting(id);
    await deleteDevice(id);
    setDeleting(null);
  };

  const allDevices = [...onlineClients, ...offlineClients];

  const filteredDevices = allDevices.filter((d) => {
    if (search) {
      const q = search.toLowerCase();
      return (
        d.id.toLowerCase().includes(q) ||
        (d.deviceModel || '').toLowerCase().includes(q) ||
        (d.deviceBrand || '').toLowerCase().includes(q) ||
        (d.ip || '').toLowerCase().includes(q) ||
        (d.city || '').toLowerCase().includes(q) ||
        (d.country || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const displayedDevices = filteredDevices.filter((d) => {
    if (tab === 'online') return d.online;
    if (tab === 'offline') return !d.online;
    return true;
  });

  const tabs = [
    { key: 'all' as const, label: t('devices.tabs.all'), count: allDevices.length },
    { key: 'online' as const, label: t('devices.tabs.online'), count: onlineClients.length },
    { key: 'offline' as const, label: t('devices.tabs.offline'), count: offlineClients.length },
  ];

  const openAssignOwner = (clientId: string, currentOwner?: { id: number; username: string } | null) => {
    setAssigningOwnerFor(clientId);
    setOwnerCandidate(currentOwner?.username || '');
    setSelectedOwnerId(currentOwner?.id ?? null);
    setSuggestions([]);
  };

  const submitAssignOwner = async () => {
    if (!assigningOwnerFor) return;
    try {
      // selectedOwnerId may be null -> unassign
      await clientsApi.setOwner(assigningOwnerFor, selectedOwnerId ?? null);
      setAssigningOwnerFor(null);
      setOwnerCandidate('');
      setSelectedOwnerId(null);
      setSuggestions([]);
      fetchDashboard();
    } catch (e) {
      alert(String(e));
    }
  };

  const clearOwner = async () => {
    if (!assigningOwnerFor) return;
    if (!confirm('Удалить владельца устройства?')) return;
    try {
      await clientsApi.setOwner(assigningOwnerFor, null);
      setAssigningOwnerFor(null);
      setOwnerCandidate('');
      setSelectedOwnerId(null);
      setSuggestions([]);
      fetchDashboard();
    } catch (e) {
      alert(String(e));
    }
  };

  useEffect(() => {
    if (!assigningOwnerFor) return;
    const q = (ownerCandidate || '').trim();
    if (q.length < 2) {
      setSuggestions([]);
      setIsSearchingUsers(false);
      return;
    }
    let cancelled = false;
    const id = setTimeout(async () => {
      setIsSearchingUsers(true);
      try {
        const res = await usersApi.search(q);
        const list = (res.data && (res.data.data ?? res.data)) || [];
        if (!cancelled) setSuggestions(Array.isArray(list) ? list : []);
      } catch (err) {
        if (!cancelled) setSuggestions([]);
        console.error('user search failed', err);
      } finally {
        if (!cancelled) setIsSearchingUsers(false);
      }
    }, 220);
    return () => { cancelled = true; clearTimeout(id); setIsSearchingUsers(false); };
  }, [ownerCandidate, assigningOwnerFor]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Smartphone className="h-6 w-6 text-primary" />
            {t('pages.devices.title')}
          </h1>
          <p className="text-muted-foreground mt-1">{t('pages.devices.description')}</p>
        </div>
        <Button onClick={fetchDashboard} variant="outline" disabled={isLoading} className="self-start">
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {t('common.refresh')}
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                tab === t.key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
              <span className={`ml-1.5 text-xs ${tab === t.key ? 'text-primary' : 'text-muted-foreground'}`}>
                ({t.count})
              </span>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('pages.devices.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          {displayedDevices.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Smartphone className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">
                {search ? t('pages.devices.noDevicesMatch') : t('pages.devices.noDevices')}
              </p>
              <p className="text-sm mt-1">
                {search ? t('pages.devices.tryDifferentSearch') : t('pages.devices.noDevicesConnect')}
              </p>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('devices.table.device')}</TableHead>
                      <TableHead>Пользователь</TableHead>
                      <TableHead>{t('devices.table.location')}</TableHead>
                      <TableHead>{t('devices.table.ipAddress')}</TableHead>
                      <TableHead>{t('devices.table.lastSeen')}</TableHead>
                      <TableHead>{t('devices.table.status')}</TableHead>
                      <TableHead className="w-[160px]">{t('devices.table.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedDevices.map((client) => (
                      <TableRow
                        key={client.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/device/${client.id}/info`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <Smartphone className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{client.deviceModel || t('common.unknown')}</p>
                              <p className="text-xs text-muted-foreground">{client.deviceBrand || ''} {client.deviceVersion || ''}</p>
                              {client.apkCreator && (
                                <p className="text-xs text-muted-foreground mt-1">Создатель APK: {client.apkCreator.username}{client.apkName ? ` · ${client.apkName}` : ''}</p>
                              )}
                              {client.owner && (
                                <p className="text-xs text-muted-foreground mt-1">{t('pages.devices.ownerLabel')}: {client.owner.username}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {client.apkCreator ? (
                            <div>
                              <p className="font-medium text-sm">{client.apkCreator.username}</p>
                              <p className="text-xs text-muted-foreground">Создатель APK{client.apkName ? ` · ${client.apkName}` : ''}</p>
                            </div>
                          ) : client.owner ? (
                            <div>
                              <p className="font-medium text-sm">{client.owner.username}</p>
                              <p className="text-xs text-muted-foreground">Владелец устройства</p>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Не указан</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span>{getCountryFlag(client.country)}</span>
                            <span>{client.city || client.country || t('common.unknown')}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{client.ip}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDate(client.lastSeen)}</TableCell>
                        <TableCell>
                          {client.online ? (
                            <Badge className="bg-success text-card-foreground border-0">{t('common.online')}</Badge>
                          ) : (
                            <Badge variant="secondary">{t('common.offline')}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); navigate(`/device/${client.id}/info`); }}>
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                            {hasPermission('device:delete') && (
                              <Button variant="ghost" size="icon" onClick={(e) => handleDelete(client.id, e)} disabled={deleting === client.id}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                            {isAdmin() && (
                              <div className="flex gap-1">
                                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openAssignOwner(client.id, client.owner); }}>
                                  {client.owner ? t('pages.devices.changeOwner') : t('pages.devices.assignOwner')}
                                </Button>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="md:hidden divide-y">
                {displayedDevices.map((client) => (
                  <div
                    key={client.id}
                    className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/device/${client.id}/info`)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Smartphone className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{client.deviceModel || 'Unknown'}</p>
                          {client.online ? (
                            <Badge className="bg-success text-card-foreground border-0 text-[10px] px-1.5 py-0">{t('common.online')}</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{t('common.offline')}</Badge>
                          )}
                          {client.owner && (
                            <p className="text-xs text-muted-foreground ml-2">{t('pages.devices.ownerLabel')}: {client.owner.username}</p>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{client.deviceBrand || ''} {client.deviceVersion || ''}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {getCountryFlag(client.country)} {client.city || client.country || t('common.unknown')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(client.lastSeen)}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {assigningOwnerFor && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-card p-4 rounded max-w-md w-full relative">
            <h3 className="font-semibold mb-2">{t('pages.devices.assignOwnerModalTitle') || 'Назначить владельца'}</h3>
            <p className="text-sm text-muted-foreground mb-3">{t('pages.devices.assignOwnerModalDesc') || 'Введите имя пользователя для поиска и выбора владельца'}</p>

            <div className="relative">
              <Input
                value={ownerCandidate}
                onChange={(e) => { setOwnerCandidate(e.target.value); setSelectedOwnerId(null); }}
                placeholder={t('pages.users.fields.username')}
              />
              {isSearchingUsers && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">...</div>}
              {suggestions.length > 0 && (
                <div className="absolute left-0 right-0 z-50 mt-1 bg-card border rounded max-h-48 overflow-y-auto">
                  {suggestions.map(u => (
                    <button
                      key={u.id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-muted"
                      onClick={(e) => { e.stopPropagation(); setOwnerCandidate(u.username); setSelectedOwnerId(u.id); setSuggestions([]); }}
                    >
                      <div className="text-sm">{u.username}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-between gap-2 mt-3">
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setAssigningOwnerFor(null); setOwnerCandidate(''); setSelectedOwnerId(null); }}>{t('common.cancel')}</Button>
                <Button onClick={submitAssignOwner} disabled={selectedOwnerId === null && !ownerCandidate}>
                  {t('common.save')}
                </Button>
              </div>
              <div>
                <Button variant="destructive" onClick={clearOwner} className="ml-2">
                  {t('pages.devices.clearOwner') || 'Снять владельца'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
