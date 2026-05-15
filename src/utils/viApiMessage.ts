/** Maps common English API `message` strings to Vietnamese for sonner toasts. */

const VI_DIACRITICS = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i

function normKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Known English messages from API responses (success + error). */
const EN_TO_VI: Record<string, string> = {
  'login successfully': 'Đăng nhập thành công',
  'logout successfully': 'Đăng xuất thành công',
  'refresh token successfully': 'Làm mới phiên đăng nhập thành công',
  'invalid email or password': 'Email hoặc mật khẩu không đúng',
  'user is not active': 'Tài khoản chưa được kích hoạt',
  'invalid refresh token': 'Phiên đăng nhập không hợp lệ',
  'invalid refresh token type': 'Loại token làm mới không hợp lệ',
  'user not found': 'Không tìm thấy người dùng',
  'refresh token is expired or revoked': 'Phiên đăng nhập đã hết hạn hoặc bị thu hồi',
  'refresh token does not belong to current user': 'Token không thuộc tài khoản hiện tại',
  'internal server error': 'Đã có lỗi xảy ra',
  'file size must be less than or equal to 5mb':
    'Dung lượng tệp phải nhỏ hơn hoặc bằng 5MB',
  'validation error': 'Dữ liệu không hợp lệ',
  'invalid department_id': 'Khoa không hợp lệ',
  'invalid from_class_id': 'Lớp nguồn không hợp lệ',
  'invalid to_class_id': 'Lớp đích không hợp lệ',
  'invalid student_user_id': 'Sinh viên không hợp lệ',
  'from_class_id is required': 'Thiếu lớp nguồn',
  'to_class_id is required': 'Thiếu lớp đích',
  'student_user_ids must be a non-empty array': 'Vui lòng chọn ít nhất 1 sinh viên',
  'student_user_ids is required': 'Vui lòng chọn ít nhất 1 sinh viên',
  'from_class_id and to_class_id must be different': 'Lớp nguồn và lớp đích phải khác nhau',
  'target class is not active': 'Lớp đích không còn hoạt động',
  'some students do not belong to the source class': 'Có sinh viên không còn thuộc lớp nguồn',
}

function translateKnown(message: string): string | undefined {
  const key = normKey(message)
  if (key.startsWith('student ') && key.includes(' major does not match target class major')) {
    return 'Sinh viên không cùng ngành với lớp đích'
  }
  return EN_TO_VI[key]
}

function looksVietnamese(message: string): boolean {
  return VI_DIACRITICS.test(message)
}

/**
 * Success toasts: translate known English; keep Vietnamese as-is; otherwise use fallback.
 */
export function viApiMessage(message: string | undefined | null, fallback: string): string {
  if (message == null || message === '') return fallback
  const s = String(message).trim()
  const t = translateKnown(s)
  if (t) return t
  if (looksVietnamese(s)) return s
  return fallback
}

/**
 * Error toasts: translate known English; keep Vietnamese as-is; otherwise use fallback.
 */
export function viApiError(message: string | undefined | null, fallback: string): string {
  if (message == null || message === '') return fallback
  const s = String(message).trim()
  const t = translateKnown(s)
  if (t) return t
  if (looksVietnamese(s)) return s
  return fallback
}
