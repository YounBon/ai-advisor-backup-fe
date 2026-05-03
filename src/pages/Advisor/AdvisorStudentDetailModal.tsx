import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/modal'
import Button from '@/components/ui/button/Button'
import { userService } from '@/services/UserService'
import moment from 'moment'

type OrgRef = {
  _id?: string
  department_code?: string
  department_name?: string
  major_code?: string
  major_name?: string
}

type AdvisorBrief = {
  _id?: string
  username?: string
  email?: string
  profile?: { full_name?: string }
  advisor_info?: { staff_code?: string; title?: string }
}

export type InfoUserRecord = {
  _id: string
  username?: string
  email?: string
  role?: string
  status?: string
  last_login_at?: string
  createdAt?: string
  updatedAt?: string
  profile?: {
    full_name?: string
    phone?: string
    gender?: string
    date_of_birth?: string
    address?: string
    avatar_url?: string
  }
  org?: {
    department_id?: string | OrgRef | null
    major_id?: string | OrgRef | null
  }
  student_info?: {
    student_code?: string
    cohort_year?: number
    enrollment_status?: string
    advisor_user_id?: string | AdvisorBrief | null
  }
  advisor_info?: {
    staff_code?: string
    title?: string
  }
  advisor_class_memberships?: {
    membership_status?: string
    joined_at?: string
    class?: {
      _id?: string
      class_code?: string
      class_name?: string
      status?: string
      cohort_year?: number
    } | null
    advisor?: AdvisorBrief | null
  }[]
}

type Props = {
  isOpen: boolean
  studentUserId: string | null
  onClose: () => void
}

function orgLabel(ref: string | OrgRef | null | undefined): string {
  if (ref == null) return '—'
  if (typeof ref === 'string') return ref
  const parts = [
    ref.department_code ?? ref.major_code,
    ref.department_name ?? ref.major_name,
  ].filter(Boolean)
  return parts.length ? parts.join(' — ') : '—'
}

function advisorDisplayName(a: AdvisorBrief | null | undefined): string {
  if (!a) return '—'
  const n =
    a.profile?.full_name?.trim() ||
    a.username?.trim() ||
    a.email?.trim() ||
    String(a._id ?? '')
  const code = a.advisor_info?.staff_code ? ` (${a.advisor_info.staff_code})` : ''
  return `${n}${code}`.trim() || '—'
}

export default function AdvisorStudentDetailModal({ isOpen, studentUserId, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<InfoUserRecord | null>(null)

  useEffect(() => {
    if (!isOpen || !studentUserId) {
      setUser(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setUser(null)
    void userService
      .getInfoUser({ user_id: studentUserId })
      .then(res => {
        if (!cancelled) setUser((res.data as InfoUserRecord) ?? null)
      })
      .catch(() => {
        if (!cancelled) {
          toast.error('Không tải được thông tin người dùng')
          setUser(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isOpen, studentUserId])

  const handleClose = () => {
    if (!loading) onClose()
  }

  const p = user?.profile
  const si = user?.student_info
  const ai = user?.advisor_info
  const org = user?.org
  const memberships = user?.advisor_class_memberships ?? []
  const profileAdvisor =
    si?.advisor_user_id && typeof si.advisor_user_id === 'object'
      ? si.advisor_user_id
      : null

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-2xl p-6">
      <h3 className="mb-1  text-center text-lg font-semibold text-gray-800 dark:text-white/90">
        Chi tiết người dùng
      </h3>
      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Đang tải...</p>
      ) : user ? (
        <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-1 text-sm">
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Tài khoản
            </h4>
            <dl className="grid gap-2 sm:grid-cols-2">
              <Row label="Username" value={user.username} />
              <Row label="Email" value={user.email} />
              <Row label="Vai trò" value={user.role} />
              <Row label="Trạng thái" value={user.status} />
              <Row
                label="Đăng nhập gần nhất"
                value={
                  user.last_login_at
                    ? moment(user.last_login_at).format('DD/MM/YYYY HH:mm')
                    : '—'
                }
              />
            </dl>
          </section>

          {org && (org.department_id || org.major_id) ? (
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Khoa / Ngành
              </h4>
              <dl className="grid gap-2 sm:grid-cols-2">
                <Row label="Khoa" value={orgLabel(org.department_id)} />
                <Row label="Ngành" value={orgLabel(org.major_id)} />
              </dl>
            </section>
          ) : null}

          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Hồ sơ
            </h4>
            <dl className="grid gap-2 sm:grid-cols-2">
              <Row label="Họ tên" value={p?.full_name} />
              <Row label="Điện thoại" value={p?.phone} />
              <Row label="Giới tính" value={p?.gender} />
              <Row label="Ngày sinh" value={p?.date_of_birth ? moment(p.date_of_birth).format('DD/MM/YYYY') : '—'} />
              <Row label="Địa chỉ" value={p?.address} className="sm:col-span-2" />
            </dl>
          </section>
          {user.role === 'STUDENT' && si ? (
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Sinh viên
              </h4>
              <dl className="grid gap-2 sm:grid-cols-2">
                <Row label="Mã SV" value={si.student_code} />
                <Row label="Khóa / cohort" value={si.cohort_year} />
                <Row label="Trạng thái học" value={si.enrollment_status} />
              </dl>
              {profileAdvisor ? (
                <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50/80 p-3 dark:border-gray-800 dark:bg-white/5">
                  <p className="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Cố vấn ghi trên hồ sơ sinh viên (student_info)
                  </p>
                  <dl className="grid gap-2 sm:grid-cols-2">
                    <Row label="Họ tên / tài khoản" value={advisorDisplayName(profileAdvisor)} />
                    <Row label="Email" value={profileAdvisor.email} />
                    <Row label="Mã cán bộ" value={profileAdvisor.advisor_info?.staff_code} />
                    <Row label="Chức danh" value={profileAdvisor.advisor_info?.title} />
                  </dl>
                </div>
              ) : null}
            </section>
          ) : null}

          {memberships.length > 0 ? (
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Lớp cố vấn & cố vấn chủ nhiệm
              </h4>
              <ul className="space-y-3">
                {memberships.map((m, idx) => (
                  <li
                    key={`${m.class?._id ?? idx}-${m.membership_status ?? ''}`}
                    className="rounded-lg border border-gray-100 p-3 dark:border-gray-800"
                  >
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Lớp{' '}
                      <span className="text-gray-800 dark:text-white/90">
                        {m.class?.class_code ?? '—'}
                        {m.class?.class_name ? ` — ${m.class.class_name}` : ''}
                      </span>
                    </p>
                    <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                      <Row label="Trạng thái lớp" value={m.class?.status} />
                      <Row label="Khóa (lớp)" value={m.class?.cohort_year} />
                      <Row label="Trạng thái thành viên" value={m.membership_status} />
                      <Row
                        label="Tham gia"
                        value={
                          m.joined_at
                            ? moment(m.joined_at).format('DD/MM/YYYY HH:mm')
                            : '—'
                        }
                      />
                      <Row
                        label="Cố vấn chủ nhiệm"
                        value={advisorDisplayName(m.advisor ?? undefined)}
                        className="sm:col-span-2"
                      />
                      <Row label="Email CVHT" value={m.advisor?.email} />
                    </dl>
                  </li>
                ))}
              </ul>
            </section>
          ) : user?.role === 'STUDENT' ? (
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Lớp cố vấn
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Chưa có bản ghi thành viên lớp cố vấn.
              </p>
            </section>
          ) : null}

          {user.role === 'ADVISOR' && ai ? (
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Cố vấn
              </h4>
              <dl className="grid gap-2 sm:grid-cols-2">
                <Row label="Mã cán bộ" value={ai.staff_code} />
                <Row label="Chức danh" value={ai.title} />
              </dl>
            </section>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">Không có dữ liệu.</p>
      )}

      <div className="mt-6 flex justify-end">
        <Button size="sm" variant="outline" onClick={handleClose} disabled={loading}>
          Đóng
        </Button>
      </div>
    </Modal>
  )
}

function Row({
  label,
  value,
  className = '',
}: {
  label: string
  value?: string | number | null
  className?: string
}) {
  const text =
    value == null || value === ''
      ? '—'
      : typeof value === 'string'
        ? value.trim() || '—'
        : String(value)
  return (
    <div className={`flex flex-col gap-0.5 border-b border-gray-100 pb-2 dark:border-gray-800 ${className}`}>
      <dt className="text-xs text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="break-words font-medium text-gray-800 dark:text-white/90">{text}</dd>
    </div>
  )
}
