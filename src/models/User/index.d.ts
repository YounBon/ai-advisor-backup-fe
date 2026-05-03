interface User {
  _id: string
  username: string
  email: string
  role: string
  status: string
  last_login_at: string
  org?: {
    department_id?: string
    major_id?: string
  }
  profile?: {
    full_name?: string
    phone?: string
    address?: string
    avatar_url?: string
  }
}

interface AuthLoginPayload {
  user: User
  token_type: string
  access_token: string
  refresh_token: string
  access_expires_in: string
  refresh_expires_in: string
}

interface LoginResponse {
  message: string
  data: AuthLoginPayload
}
