import { Routes, Route } from 'react-router-dom';
import type { ReactNode } from 'react';
import LandingPage from '../pages/Home/LandingPage';
import SchedulePage from '../pages/Race/SchedulePage';
import RaceResultList from '../pages/Result/RaceResultList';
import RaceResultDetail from '../pages/Result/RaceResultDetail';
import RankingPage from '../pages/Result/RankingPage';
import PredictionPage from '../pages/Prediction/PredictionPage';
import ResultTrackingPage from '../pages/Prediction/ResultTrackingPage';
import AuthPage from '../pages/Auth/AuthPage';
import HorseManagementPage from '../pages/Horse/HorseManagementPage';
import MainLayout from '../components/MainLayout';
import ProtectedRoute from '../components/ProtectedRoute';
import SpectatorDashboard from '../pages/SpectatorDashboard/SpectatorDashboard';
import UserProfilePage from '../pages/Profile/UserProfilePage';
import { AUTHENTICATED_ROLES } from '../utils/permissions';
import AdminOperationsPage from '../pages/Admin/AdminOperationsPage';
import RaceRegistrationPage from '../pages/Race/RaceRegistrationPage';
import JockeyAssignmentsPage from '../pages/Race/JockeyAssignmentsPage';
import RaceControlPage from '../pages/Race/RaceControlPage';
import NotificationsPage from '../pages/Notifications/NotificationsPage';
import WalletPaymentPage from '../pages/Wallet/WalletPaymentPage';

const withLayout = (page: ReactNode) => <MainLayout>{page}</MainLayout>;

const protectedPage = (page: ReactNode, allowedRoles = AUTHENTICATED_ROLES) => (
  withLayout(
    <ProtectedRoute allowedRoles={allowedRoles}>
      {page}
    </ProtectedRoute>,
  )
);

const AppRoutes = () => {
  return (
    <Routes>
      {/* Trang Auth không có Header/Footer chung */}
      <Route path="/login" element={<AuthPage />} />

      {/* Các trang khác có Header/Footer chung */}
      <Route path="/" element={withLayout(<LandingPage />)} />
      <Route path="/schedule" element={protectedPage(<SchedulePage />, ['horse_owner'])} />
      <Route path="/results" element={protectedPage(<RaceResultList />)} />
      <Route path="/results/rankings" element={protectedPage(<RankingPage />)} />
      <Route path="/results/:resultId" element={protectedPage(<RaceResultDetail />)} />
      <Route path="/horses" element={protectedPage(<HorseManagementPage />, ['horse_owner'])} />
      <Route path="/spectator-dashboard" element={protectedPage(<SpectatorDashboard />, ['spectator'])} />
      <Route path="/prediction" element={protectedPage(<PredictionPage />, ['spectator'])} />
      <Route path="/tracking" element={protectedPage(<ResultTrackingPage />, ['spectator'])} />
      <Route path="/profile" element={protectedPage(<UserProfilePage />)} />
      <Route path="/admin-ops" element={protectedPage(<AdminOperationsPage />, ['admin'])} />
      <Route path="/registrations" element={protectedPage(<RaceRegistrationPage />, ['horse_owner', 'admin', 'race_referee'])} />
      <Route path="/jockey-assignments" element={protectedPage(<JockeyAssignmentsPage />, ['horse_owner', 'jockey'])} />
      <Route path="/race-control" element={protectedPage(<RaceControlPage />, ['admin', 'race_referee'])} />
      <Route path="/notifications" element={protectedPage(<NotificationsPage />)} />
      <Route path="/wallet" element={protectedPage(<WalletPaymentPage />, ['spectator'])} />
    </Routes>
  );
};

export default AppRoutes;
