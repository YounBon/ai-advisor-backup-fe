import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router'
import RequireAuth from './components/auth/RequireAuth'
import SignIn from './pages/AuthPages/SignIn'
import NotFound from './pages/OtherPage/NotFound'
import UserProfiles from './pages/UserProfiles'
// Admin Pages
import {
  MasterDataPage,
  AdvisorClassPage,
  AdminUsersPage,
  Home,
} from './pages/Admin'
import {
  AdvisorDashboardPage,
  AdvisorFeedbackPage,
  AdvisorMeetingsPage,
  AdvisorNotificationsPage,
} from './pages/Advisor'
import {
  DashboardPage,
  AcademicPage,
  FeedbackPage,
  StudentNotificationsPage,
} from './pages/Student'
import LandingPage from './pages/LandingPage'
import AppLayout from './layout/AppLayout'
import AdvisorLayout from './layout/AdvisorLayout'
import ProtectLayout from './layout/ProtectLayout'
import { ScrollToTop } from './components/common/ScrollToTop'
import ProtectRoute from './components/auth/ProtectRoute'

export default function App() {
  return (
    <>
      <Router>
        <ScrollToTop />
        <Routes>
          <Route element={<RequireAuth />}>
            {/* Sinh viên: layout riêng */}
            <Route path="student" element={<ProtectRoute allowedRoles={['STUDENT']} />}>
              <Route element={<ProtectLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="academic" element={<AcademicPage />} />
                <Route path="feedback" element={<FeedbackPage />} />
                <Route path="notifications" element={<StudentNotificationsPage />} />
                <Route path="profile" element={<UserProfiles />} />
              </Route>
            </Route>

            {/* ADVISOR */}
            <Route path="advisor" element={<ProtectRoute allowedRoles={['ADVISOR']} />}>
              <Route element={<AdvisorLayout />}>
                <Route index element={<AdvisorDashboardPage />} />
                <Route path="classes" element={<AdvisorClassPage />} />
                <Route path="meetings" element={<AdvisorMeetingsPage />} />
                <Route path="feedback" element={<AdvisorFeedbackPage />} />
                <Route path="notifications" element={<AdvisorNotificationsPage />} />
                <Route path="profile" element={<UserProfiles />} />
              </Route>
            </Route>

            {/* FACULTY / ADMIN */}
            <Route element={<ProtectRoute allowedRoles={['FACULTY', 'ADMIN']} />}>
              <Route element={<AppLayout />}>
                <Route path="dashboard" element={<Home />} />
                <Route path="profile" element={<UserProfiles />} />
                <Route path="master-data" element={<MasterDataPage />} />
                <Route path="admin-users" element={<AdminUsersPage />} />
              </Route>
            </Route>
          </Route>

          {/* Auth Layout */}
          <Route path="/signin" element={<SignIn />} />

          {/* Landing Page — trang mặc định */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/landing" element={<Navigate to="/" replace />} />

          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </>
  )
}
