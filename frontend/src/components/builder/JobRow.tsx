import React from 'react'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import LinearProgress from '@mui/material/LinearProgress'
import { cn } from '@/lib/utils'
import { formatDate, formatBytes, statusVariant } from './utils'
import { Download, RefreshCw, Info, X, FileText, Eye } from 'lucide-react'

export default function JobRow({
  job,
  selectedJobId,
  justCreated,
  onSelect,
  onDownload,
  onViewLog,
  onDownloadLog,
  onCancel,
  onRetry,
  actingJobId,
  downloadingId,
}: any) {
  const isSelected = selectedJobId === job.id
  const canCancel = ['pending', 'started'].includes(String(job.status))
  const canRetry = ['failed', 'cancelled'].includes(String(job.status))
  const isDownloading = downloadingId !== null && downloadingId === job.id

  return (
    <TableRow
      key={job.id}
      onClick={() => onSelect && onSelect(job.id)}
      className={cn(
        'job-row',
        justCreated ? 'job-row--highlight' : '',
        isSelected ? 'job-row--selected' : ''
      )}
      data-job-row={job.id}
      hover
    >
      <TableCell className="font-mono text-xs">{job.id}</TableCell>
      <TableCell>{job.appName || '-'}</TableCell>
      <TableCell className="font-mono text-xs truncate max-w-sm">{job.serverUrl || '-'}</TableCell>
      <TableCell>
        <span className={`chip ${statusVariant(job.status) || ''}`}>{job.status || '-'}</span>
      </TableCell>
      <TableCell>{formatBytes(job.fileSize || 0)}</TableCell>
      <TableCell className="font-mono text-xs">{formatDate(job.createdAt)}</TableCell>
      <TableCell style={{ minWidth: 220 }} align="right">
        {job.progress?.complete != null ? (
          <div style={{ width: 160, display: 'inline-block', marginRight: 12 }}>
            <LinearProgress variant="determinate" value={Number(job.progress.complete) * 100} />
          </div>
        ) : null}
        <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
          <Tooltip title="Скачать APK"><span><IconButton size="small" onClick={(e)=>{e.stopPropagation();onDownload && onDownload(job.id);}} disabled={job.status !== 'completed' || isDownloading}><Download/></IconButton></span></Tooltip>
          <Tooltip title="Информация"><IconButton size="small" onClick={(e)=>{e.stopPropagation();alert(JSON.stringify(job,null,2));}}><Info/></IconButton></Tooltip>
          <Tooltip title="Показать лог"><IconButton size="small" onClick={(e)=>{e.stopPropagation();onViewLog && onViewLog(job.id);}}><Eye/></IconButton></Tooltip>
          <Tooltip title="Скачать лог"><IconButton size="small" onClick={(e)=>{e.stopPropagation();onDownloadLog && onDownloadLog(job.id);}}><FileText/></IconButton></Tooltip>
          <Tooltip title="Отменить"><span><IconButton size="small" onClick={(e)=>{e.stopPropagation();onCancel && onCancel(job.id);}} disabled={actingJobId === job.id || !canCancel}><X/></IconButton></span></Tooltip>
          <Tooltip title="Повторить"><span><IconButton size="small" onClick={(e)=>{e.stopPropagation();onRetry && onRetry(job.id);}} disabled={actingJobId === job.id || !canRetry}><RefreshCw/></IconButton></span></Tooltip>
        </div>
      </TableCell>
    </TableRow>
  )
}
