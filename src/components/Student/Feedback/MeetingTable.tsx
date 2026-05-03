import { useState } from 'react'
import { toast } from 'sonner'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import { PaperPlaneIcon } from '@/icons'
import type { MeetingHint } from '@/models/Feedback'

const PAGE_SIZE = 5
const FEEDBACK_WINDOW_MS = 24 * 60 * 60 * 1000 // 24 giờ

function formatDateTime(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`
}

// Trạng thái của buổi họp đối với việc gửi phản hồi
type MeetingStatus = 'not_ended' | 'open' | 'expired'

function getMeetingStatus(row: MeetingHint): MeetingStatus {
  if (!row.meeting_end_time) return 'open'
  const endTime = new Date(row.meeting_end_time).getTime()
  const now = Date.now()
  if (now < endTime) return 'not_ended'           // buổi họp chưa kết thúc
  if (now - endTime > FEEDBACK_WINDOW_MS) return 'expired'  // quá 24h
  return 'open'                                   // trong cửa sổ 24h
}

type Props = {
  meetingHints: MeetingHint[]
  onFeedback: (meetingId: string) => void
}

export default function MeetingHintsTable({ meetingHints, onFeedback }: Props) {
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(meetingHints.length / PAGE_SIZE))
  const pagedRows = meetingHints.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleClick = (row: MeetingHint) => {
    const status = getMeetingStatus(row)
    if (status === 'not_ended') {
      toast.info('Buổi họp chưa kết thúc. Vui lòng gửi phản hồi sau khi buổi họp kết thúc.')
      return
    }
    if (status === 'expired') {
      toast.warning('Đã quá thời gian gửi phản hồi. Vui lòng liên hệ cố vấn.')
      return
    }
    onFeedback(row.meeting_id)
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <Table className="text-sm">
          <TableHeader>
            <TableRow className="border-b border-[#F0F0F0] bg-[#F9FAFB] dark:border-gray-800 dark:bg-white/[0.04]">
              <TableCell isHeader className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Buổi họp
              </TableCell>
              <TableCell isHeader className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Lớp cố vấn
              </TableCell>
              <TableCell isHeader className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Cố vấn
              </TableCell>
              <TableCell isHeader className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Kết thúc
              </TableCell>
              <TableCell isHeader className="w-px whitespace-nowrap px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Phản hồi
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {meetingHints.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                  Chưa có buổi họp nào — khi lịch được thêm, bạn sẽ gửi phản hồi tại đây.
                </TableCell>
              </TableRow>
            ) : (
              pagedRows.map(row => {
                const status = getMeetingStatus(row)
                const done = row.feedback_count > 0
                return (
                  <TableRow
                    key={row.meeting_id}
                    className="border-b border-[#F0F0F0] transition-colors last:border-0 hover:bg-[#F9FAFB] dark:border-gray-800/80 dark:hover:bg-white/[0.03]"
                  >
                    <TableCell className="whitespace-nowrap px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                      {formatDateTime(row.meeting_time)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-center text-sm text-gray-700 dark:text-gray-300">
                      {row.class_label}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-center text-sm text-gray-700 dark:text-gray-300">
                      {row.advisor_label || '—'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-4 py-3 text-center text-xs text-gray-600 dark:text-gray-400">
                      {formatDateTime(row.meeting_end_time)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-center align-middle">
                      <button
                        type="button"
                        onClick={() => handleClick(row)}
                        aria-label={
                          done ? 'Đã phản hồi'
                            : status === 'not_ended' ? 'Chưa kết thúc'
                              : status === 'expired' ? 'Hết hạn'
                                : 'Gửi phản hồi'
                        }
                        title={
                          done ? 'Đã gửi phản hồi'
                            : status === 'not_ended' ? 'Buổi họp chưa kết thúc'
                              : status === 'expired' ? 'Đã quá 24 giờ'
                                : 'Gửi phản hồi'
                        }
                        className={`inline-flex size-8 items-center justify-center rounded-lg border transition-colors
                          ${done
                            ? 'cursor-default border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/10'
                            : status === 'not_ended'
                              ? 'cursor-not-allowed border-blue-200 bg-blue-50 text-blue-400 dark:border-blue-500/30 dark:bg-blue-500/10'
                              : status === 'expired'
                                ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-800'
                                : 'border-[#F0F0F0] bg-white text-[#E02020] hover:border-[#E02020]/30 hover:bg-[#FFF0F0] dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-[#E02020]/10'
                          }`}
                      >
                        <PaperPlaneIcon className="size-4 shrink-0" aria-hidden />
                      </button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between border-t border-[#F0F0F0] pt-4 dark:border-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Hiển thị{' '}
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, meetingHints.length)}
            </span>{' '}
            / {meetingHints.length} buổi họp
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Trang trước"
              className="flex size-8 items-center justify-center rounded-lg border border-[#F0F0F0] bg-white text-gray-500 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('ellipsis')
                acc.push(p)
                return acc
              }, [])
              .map((item, idx) =>
                item === 'ellipsis' ? (
                  <span key={`e-${idx}`} className="flex size-8 items-center justify-center text-xs text-gray-400">…</span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPage(item)}
                    aria-current={page === item ? 'page' : undefined}
                    className={`flex size-8 items-center justify-center rounded-lg border text-xs font-semibold transition-colors
                      ${page === item
                        ? 'border-[#E02020] bg-[#E02020] text-white'
                        : 'border-[#F0F0F0] bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'
                      }`}
                  >
                    {item}
                  </button>
                )
              )}
            <button
              type="button"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              aria-label="Trang sau"
              className="flex size-8 items-center justify-center rounded-lg border border-[#F0F0F0] bg-white text-gray-500 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
