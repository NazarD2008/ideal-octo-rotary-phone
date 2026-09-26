import React, { useEffect, useRef } from 'react'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import JobRow from './JobRow'
import { cn } from '@/lib/utils'

export default function JobList({
  jobs,
  selectedJobId,
  justCreatedId,
  onSelect,
  onDownload,
  onViewLog,
  onDownloadLog,
  onCancel,
  onRetry,
  actingJobId,
  downloadingId,
}: any) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!justCreatedId) return
    const el = document.querySelector(`[data-job-row=\"${justCreatedId}\"]`)
    if (el && 'scrollIntoView' in el) {
      (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' })
      setTimeout(() => { (el as HTMLElement).classList.remove('job-row--highlight') }, 6000)
    }
  }, [justCreatedId, jobs])

  return (
    <div className="card" ref={containerRef}>
      <Table className="table">
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>App</TableCell>
            <TableCell>Server</TableCell>
            <TableCell>Статус</TableCell>
            <TableCell>Размер</TableCell>
            <TableCell>Создан</TableCell>
            <TableCell align="right">Действия</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {jobs?.map((job: any) => (
            <JobRow
              key={job.id}
              job={job}
              selectedJobId={selectedJobId}
              justCreated={String(justCreatedId) === String(job.id)}
              onSelect={onSelect}
              onDownload={onDownload}
              onViewLog={onViewLog}
              onDownloadLog={onDownloadLog}
              onCancel={onCancel}
              onRetry={onRetry}
              actingJobId={actingJobId}
              downloadingId={downloadingId}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
