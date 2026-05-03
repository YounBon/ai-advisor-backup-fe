import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { toast } from 'sonner'
import PageMeta from '../components/common/PageMeta'
import { userService } from '@/services/UserService'
import useAuthStore from '@/stores/authStore'
import { PencilIcon, CheckLineIcon, CloseLineIcon } from '@/icons'

type UserDetail = {
  _id?: string
  username?: string
  email?: string
  role?: string
  status?: string
  profile?: {
    full_name?: string
    phone?: string
    date_of_birth?: string
    gender?: string
    address?: string
    avatar_url?: string
  }
  org?: {
    department_id?: { department_name?: string } | null
    major_id?: { major_name?: string } | null
  }
  student_info?: {
    student_code?: string
    cohort_year?: number
    enrollment_status?: string
  }
  advisor_info?: {
    staff_code?: string
    title?: string
  }
}

function getInitials(name?: string | null): string {
  if (!name?.trim()) return '?'
  return name.trim().split(/\s+/).map(w => w[0].toUpperCase()).join('').slice(0, 2)
}

function enrollmentLabel(status?: string): string {
  switch (status) {
    case 'ENROLLED': return 'Đang học'
    case 'ON_LEAVE': return 'Bảo lưu'
    case 'GRADUATED': return 'Đã tốt nghiệp'
    case 'DROPPED': return 'Thôi học'
    default: return status ?? '—'
  }
}

function genderLabel(g?: string): string {
  if (g === 'MALE') return 'Nam'
  if (g === 'FEMALE') return 'Nữ'
  if (g === 'OTHER') return 'Khác'
  return '—'
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{value ?? '—'}</p>
    </div>
  )
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export default function UserProfiles() {
  const { pathname } = useLocation()
  const isStudent = pathname.includes('/student/')
  const isAdvisor = pathname.includes('/advisor/')
  const storeUser = useAuthStore(s => s.user)
  const setUser = useAuthStore(s => s.setUser)

  const [user, setLocalUser] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ full_name: '', phone: '', address: '' })
  const [saving, setSaving] = useState(false)

  const [pwOpen, setPwOpen] = useState(false)
  const [pwForm, setPwForm] = useState({ old_password: '', new_password: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const loadMe = useCallback(async () => {
    setLoading(true)
    try {
      const res = await userService.getMe()
      setLocalUser(res.data as UserDetail)
    } catch {
      toast.error('Không tải được thông tin tài khoản')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadMe() }, [loadMe])

  const openEdit = () => {
    setEditForm({
      full_name: user?.profile?.full_name ?? '',
      phone: user?.profile?.phone ?? '',
      address: user?.profile?.address ?? '',
    })
    setEditOpen(true)
  }

  const handleSaveProfile = async () => {
    if (!editForm.full_name.trim()) { toast.error('Họ tên không được để trống'); return }
    setSaving(true)
    try {
      const res = await userService.updateMyProfile({ profile: editForm })
      const updated = res.data as UserDetail
      setLocalUser(updated)
      if (storeUser) setUser({ ...storeUser, profile: { ...storeUser.profile, ...editForm } })
      toast.success('Cập nhật thông tin thành công')
      setEditOpen(false)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      toast.error(err?.response?.data?.message ?? 'Đã có lỗi xảy ra')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!pwForm.old_password) { toast.error('Vui lòng nhập mật khẩu cũ'); return }
    if (pwForm.new_password.length < 6) { toast.error('Mật khẩu mới tối thiểu 6 ký tự'); return }
    if (pwForm.new_password !== pwForm.confirm) { toast.error('Xác nhận mật khẩu không khớp'); return }
    setPwSaving(true)
    try {
      await userService.changePassword({ old_password: pwForm.old_password, new_password: pwForm.new_password })
      toast.success('Đổi mật khẩu thành công')
      setPwOpen(false)
      setPwForm({ old_password: '', new_password: '', confirm: '' })
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      toast.error(err?.response?.data?.message ?? 'Đã có lỗi xảy ra')
    } finally {
      setPwSaving(false)
    }
  }

  const displayName = user?.profile?.full_name || user?.username || '—'
  const initials = getInitials(user?.profile?.full_name || user?.username)
  const roleLabel = isStudent ? 'Sinh viên' : isAdvisor ? 'Cố vấn học tập' : (user?.role ?? '—')

  return (
    <>
      <PageMeta
        title={isStudent ? 'Tài khoản | Sinh viên' : isAdvisor ? 'Tài khoản | Cố vấn' : 'Tài khoản'}
        description="Quản lý thông tin cá nhân và bảo mật tài khoản"
      />

      {/* HERO */}
      <section className="relative mb-8 overflow-hidden rounded-2xl border border-[#E02020]/20 bg-gradient-to-br from-[#FFF0F0] via-white to-rose-50/40 p-5 shadow-[0_12px_40px_-14px_rgba(224,32,32,0.2)] ring-1 ring-[#E02020]/10 sm:p-6">
        <div className="pointer-events-none absolute -right-14 -top-16 size-44 rounded-full bg-[#E02020]/10 blur-3xl" aria-hidden />
        <div className="relative flex flex-wrap items-center gap-5">
          {user?.profile?.avatar_url ? (
            <img src={user.profile.avatar_url} alt={displayName} className="size-16 shrink-0 rounded-full object-cover ring-2 ring-[#E02020]/20" />
          ) : (
            <div className="flex size-16 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white select-none"
              style={{ background: 'linear-gradient(135deg, #E02020, #B01818)' }}>
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{displayName}</h1>
              <span className="rounded-full bg-[#FFF0F0] px-3 py-0.5 text-xs font-semibold text-[#E02020]">{roleLabel}</span>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{user?.email ?? '—'}</p>
            {isStudent && user?.student_info?.student_code && (
              <p className="mt-0.5 text-xs text-gray-400">Mã SV: {user.student_info.student_code}</p>
            )}
          </div>
        </div>
      </section>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-100 dark:bg-white/10" />)}
        </div>
      ) : (
        <div className="space-y-5">

          {/* Thông tin cá nhân */}
          <div className="rounded-2xl border border-[#F0F0F0] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] dark:border-gray-800 dark:bg-gray-900/50 sm:p-6">
            <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
              <h2 className="text-base font-bold text-gray-900 dark:text-white/90">Thông tin cá nhân</h2>
              <button type="button" onClick={openEdit}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#F0F0F0] bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                <PencilIcon className="size-3.5 shrink-0" aria-hidden />
                Chỉnh sửa
              </button>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <InfoRow label="Họ và tên" value={user?.profile?.full_name} />
              <InfoRow label="Email" value={user?.email} />
              <InfoRow label="Tên đăng nhập" value={user?.username} />
              <InfoRow label="Số điện thoại" value={user?.profile?.phone} />
              <InfoRow label="Giới tính" value={genderLabel(user?.profile?.gender)} />
              <InfoRow label="Ngày sinh" value={user?.profile?.date_of_birth ? new Date(user.profile.date_of_birth).toLocaleDateString('vi-VN') : null} />
              <InfoRow label="Địa chỉ" value={user?.profile?.address} />
            </div>
          </div>

          {/* Thông tin học vụ — student only */}
          {isStudent && (
            <div className="rounded-2xl border border-[#F0F0F0] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] dark:border-gray-800 dark:bg-gray-900/50 sm:p-6">
              <h2 className="mb-5 border-b border-gray-100 pb-4 text-base font-bold text-gray-900 dark:border-gray-800 dark:text-white/90">Thông tin học vụ</h2>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <InfoRow label="Mã sinh viên" value={user?.student_info?.student_code} />
                <InfoRow label="Năm nhập học" value={user?.student_info?.cohort_year} />
                <InfoRow label="Trạng thái" value={enrollmentLabel(user?.student_info?.enrollment_status)} />
                <InfoRow label="Ngành học" value={(user?.org?.major_id as { major_name?: string } | null)?.major_name} />
                <InfoRow label="Khoa" value={(user?.org?.department_id as { department_name?: string } | null)?.department_name} />
              </div>
            </div>
          )}

          {/* Thông tin cố vấn — advisor only */}
          {isAdvisor && (
            <div className="rounded-2xl border border-[#F0F0F0] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] dark:border-gray-800 dark:bg-gray-900/50 sm:p-6">
              <h2 className="mb-5 border-b border-gray-100 pb-4 text-base font-bold text-gray-900 dark:border-gray-800 dark:text-white/90">Thông tin cố vấn</h2>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <InfoRow label="Mã cán bộ" value={user?.advisor_info?.staff_code} />
                <InfoRow label="Học hàm / Học vị" value={user?.advisor_info?.title} />
                <InfoRow label="Khoa" value={(user?.org?.department_id as { department_name?: string } | null)?.department_name} />
              </div>
            </div>
          )}

          {/* Bảo mật */}
          <div className="rounded-2xl border border-[#F0F0F0] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] dark:border-gray-800 dark:bg-gray-900/50 sm:p-6">
            <h2 className="mb-5 border-b border-gray-100 pb-4 text-base font-bold text-gray-900 dark:border-gray-800 dark:text-white/90">Bảo mật</h2>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">Mật khẩu</p>
                <p className="mt-0.5 text-xs text-gray-400">Thay đổi mật khẩu định kỳ để bảo vệ tài khoản</p>
              </div>
              <button type="button"
                onClick={() => { setPwForm({ old_password: '', new_password: '', confirm: '' }); setPwOpen(true) }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#E02020]/20 bg-[#FFF0F0] px-4 py-2 text-sm font-semibold text-[#E02020] transition-colors hover:bg-[#FFE0E0] dark:border-[#E02020]/30 dark:bg-[#E02020]/10">
                Đổi mật khẩu
              </button>
            </div>
          </div>

        </div>
      )}

      {/* MODAL CHỈNH SỬA */}
      {editOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center">
          <div className="absolute inset-0 bg-[#1E1E1E]/70" onClick={() => !saving && setEditOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl dark:bg-gray-900">
            <div className="border-b border-[#F0F0F0] px-6 py-4 dark:border-gray-800">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white"
                  style={{ background: 'linear-gradient(135deg, #E02020, #B01818)' }}>
                  <PencilIcon className="size-5" aria-hidden />
                </span>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white/90">Chỉnh sửa thông tin</h3>
                  <p className="mt-0.5 text-xs text-gray-500">Cập nhật họ tên, số điện thoại và địa chỉ</p>
                </div>
              </div>
            </div>
            <div className="space-y-4 p-6">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Họ và tên <span className="text-[#E02020]">*</span></label>
                <input type="text" value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} disabled={saving}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-[#E02020] focus:ring-2 focus:ring-[#E02020]/20 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Số điện thoại</label>
                <input type="text" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} disabled={saving}
                  placeholder="VD: 0901234567"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-[#E02020] focus:ring-2 focus:ring-[#E02020]/20 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Địa chỉ</label>
                <input type="text" value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} disabled={saving}
                  placeholder="VD: 123 Nguyễn Văn Linh, Đà Nẵng"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-[#E02020] focus:ring-2 focus:ring-[#E02020]/20 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#F0F0F0] bg-gray-50/50 px-6 py-4 dark:border-gray-800 dark:bg-white/[0.02]">
              <button type="button" onClick={() => setEditOpen(false)} disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                <CloseLineIcon className="size-4 shrink-0" aria-hidden />
                Hủy
              </button>
              <button type="button" onClick={() => void handleSaveProfile()} disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: 'linear-gradient(to bottom, #E02020, #C01818)' }}>
                <CheckLineIcon className="size-4 shrink-0" aria-hidden />
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ĐỔI MẬT KHẨU */}
      {pwOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center">
          <div className="absolute inset-0 bg-[#1E1E1E]/70" onClick={() => !pwSaving && setPwOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl dark:bg-gray-900">
            <div className="border-b border-[#F0F0F0] px-6 py-4 dark:border-gray-800">
              <h3 className="text-base font-bold text-gray-900 dark:text-white/90">Đổi mật khẩu</h3>
              <p className="mt-0.5 text-xs text-gray-500">Mật khẩu mới tối thiểu 6 ký tự</p>
            </div>
            <div className="space-y-4 p-6">
              {/* Mật khẩu hiện tại */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Mật khẩu hiện tại</label>
                <div className="relative">
                  <input type={showOld ? 'text' : 'password'} value={pwForm.old_password}
                    onChange={e => setPwForm(f => ({ ...f, old_password: e.target.value }))} disabled={pwSaving}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 pr-10 text-sm outline-none transition focus:border-[#E02020] focus:ring-2 focus:ring-[#E02020]/20 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
                  <button type="button" onClick={() => setShowOld(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <EyeIcon open={showOld} />
                  </button>
                </div>
              </div>
              {/* Mật khẩu mới */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Mật khẩu mới</label>
                <div className="relative">
                  <input type={showNew ? 'text' : 'password'} value={pwForm.new_password}
                    onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))} disabled={pwSaving}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 pr-10 text-sm outline-none transition focus:border-[#E02020] focus:ring-2 focus:ring-[#E02020]/20 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
                  <button type="button" onClick={() => setShowNew(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <EyeIcon open={showNew} />
                  </button>
                </div>
              </div>
              {/* Xác nhận mật khẩu mới */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Xác nhận mật khẩu mới</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={pwForm.confirm}
                    onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                    disabled={pwSaving}
                    className={`w-full rounded-xl border px-4 py-2.5 pr-10 text-sm outline-none transition focus:ring-2 disabled:opacity-50 dark:bg-gray-800 dark:text-white ${pwForm.confirm && pwForm.confirm !== pwForm.new_password
                        ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
                        : 'border-gray-200 focus:border-[#E02020] focus:ring-[#E02020]/20 dark:border-gray-700'
                      }`}
                  />
                  <button type="button" onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <EyeIcon open={showConfirm} />
                  </button>
                </div>
                {pwForm.confirm && pwForm.confirm !== pwForm.new_password && (
                  <p className="mt-1 text-xs text-red-500">Mật khẩu xác nhận không khớp</p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#F0F0F0] bg-gray-50/50 px-6 py-4 dark:border-gray-800 dark:bg-white/[0.02]">
              <button type="button" onClick={() => setPwOpen(false)} disabled={pwSaving}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                <CloseLineIcon className="size-4 shrink-0" aria-hidden />
                Hủy
              </button>
              <button type="button" onClick={() => void handleChangePassword()} disabled={pwSaving}
                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: 'linear-gradient(to bottom, #E02020, #C01818)' }}>
                {pwSaving ? 'Đang lưu...' : 'Xác nhận đổi mật khẩu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
