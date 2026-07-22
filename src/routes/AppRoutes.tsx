import { Navigate, Routes, Route } from 'react-router-dom';
import type { ReactNode } from 'react';
import LandingPage from '../pages/Home/LandingPage';
import SchedulePage from '../pages/Race/SchedulePage';
import RaceResultList from '../pages/Result/RaceResultList';
import RaceResultDetail from '../pages/Result/RaceResultDetail';
import RankingPage from '../pages/Result/RankingPage';
import PredictionPage from '../pages/Prediction/PredictionPage';
import ResultTrackingPage from '../pages/Prediction/ResultTrackingPage';
import AuthPage from '../pages/Auth/AuthPage';
import RegistrationPage from '../pages/Auth/RegistrationPage';
import HorseManagementPage from '../pages/Horse/HorseManagementPage';
import MainLayout from '../components/MainLayout';
import ProtectedRoute from '../components/ProtectedRoute';
import SpectatorDashboard from '../pages/SpectatorDashboard/SpectatorDashboard';
import UserProfilePage from '../pages/Profile/UserProfilePage';
import { AUTHENTICATED_ROLES } from '../utils/permissions';
import AdminHorseManagementPage from '../pages/Admin/AdminHorseManagementPage';
import AdminOperationsPage from '../pages/Admin/AdminOperationsPage';
import RegistrationManagementPage from '../pages/Admin/RegistrationManagementPage';
import AdminRacesPage from '../pages/Admin/AdminRacesPage';
import AdminSchedulePage from '../pages/Admin/AdminSchedulePage';
import AdminBetManagementPage from '../pages/Admin/AdminBetManagementPage';
import RaceRegistrationPage from '../pages/Race/RaceRegistrationPage';
import OwnerInvitationsPage from '../pages/Owner/OwnerInvitationsPage';
import JockeyInvitationsPage from '../pages/Jockey/JockeyInvitationsPage';
import RaceControlPage from '../pages/Race/RaceControlPage';
import NotificationsPage from '../pages/Notifications/NotificationsPage';
import WalletPaymentPage from '../pages/Wallet/WalletPaymentPage';
import PaymentResultPage from '../pages/Wallet/PaymentResultPage';
import WalletHistoryPage from '../pages/Wallet/WalletHistoryPage';
import WalletTransactionDetailPage from '../pages/Wallet/WalletTransactionDetailPage';
import TournamentManagementPage from '../pages/Tournament/TournamentManagementPage';
import TournamentSchedulePage from '../pages/Tournament/TournamentSchedulePage';
import UserManagementPage from '../pages/Admin/UserManagementPage';
import OwnerDashboardPage from '../pages/Owner/OwnerDashboardPage';
import AdminRaceResultsPage from '../pages/Admin/AdminRaceResultsPage';
import RefereeDashboardPage from '../pages/Referee/RefereeDashboardPage';
import { authService } from '../services/authService';

const withLayout = (page: ReactNode) => <MainLayout>{page}</MainLayout>;

const protectedPage = (page: ReactNode, allowedRoles = AUTHENTICATED_ROLES) => (
  withLayout(
    <ProtectedRoute allowedRoles={allowedRoles}>
      {page}
    </ProtectedRoute>,
  )
);

const LegacyInvitationsRedirect = () => {
  const roleType = authService.getStoredUserProfile()?.roleType;
  return <Navigate to={roleType === 'horse_owner' ? '/owner/invitations' : '/jockey/invitations'} replace />;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Trang Auth không có Header/Footer chung */}
      <Route path="/login" element={<AuthPage />} />
      <Route path="/registration" element={<RegistrationPage />} />

      {/* Các trang khác có Header/Footer chung */}
      <Route path="/" element={withLayout(<LandingPage />)} />
      <Route path="/schedule" element={protectedPage(<SchedulePage />, ['horse_owner'])} />
      <Route path="/results" element={protectedPage(<RaceResultList />)} />
      <Route path="/results/rankings" element={protectedPage(<RankingPage />)} />
      <Route path="/results/:resultId" element={protectedPage(<RaceResultDetail />)} />
      <Route path="/horses" element={protectedPage(<HorseManagementPage />, ['horse_owner'])} />
      <Route path="/owner-dashboard" element={protectedPage(<OwnerDashboardPage />, ['horse_owner'])} />
      <Route path="/referee-dashboard" element={protectedPage(<RefereeDashboardPage />, ['race_referee'])} />
      <Route path="/spectator-dashboard" element={protectedPage(<SpectatorDashboard />, ['spectator'])} />
      <Route path="/prediction" element={protectedPage(<PredictionPage />, ['spectator'])} />
      <Route path="/tracking" element={protectedPage(<ResultTrackingPage />, ['spectator'])} />
      <Route path="/profile" element={protectedPage(<UserProfilePage />)} />
      <Route path="/admin-ops" element={protectedPage(<AdminOperationsPage />, ['admin'])} />
      <Route path="/admin/horses" element={protectedPage(<AdminHorseManagementPage />, ['admin'])} />
      <Route path="/admin/users" element={protectedPage(<UserManagementPage />, ['admin'])} />
      <Route path="/admin/registrations" element={protectedPage(<RegistrationManagementPage />, ['admin'])} />
      <Route path="/admin/race-registrations" element={protectedPage(<RegistrationManagementPage />, ['admin'])} />
      <Route path="/admin/schedule" element={protectedPage(<AdminSchedulePage />, ['admin'])} />
      <Route path="/admin/races" element={protectedPage(<AdminRacesPage />, ['admin'])} />
      <Route path="/admin/race-results" element={protectedPage(<AdminRaceResultsPage />, ['admin'])} />
      <Route path="/admin/bets" element={protectedPage(<AdminBetManagementPage />, ['admin'])} />
      <Route path="/admin/race-schedule" element={<Navigate to="/admin/schedule" replace />} />
      <Route path="/tournaments" element={protectedPage(<TournamentManagementPage />, ['admin'])} />
      <Route path="/tournaments/:tournamentId/schedule" element={protectedPage(<TournamentSchedulePage />, ['admin'])} />
      <Route path="/registrations" element={protectedPage(<RaceRegistrationPage />, ['horse_owner', 'admin'])} />
      <Route path="/owner/invitations" element={protectedPage(<OwnerInvitationsPage />, ['horse_owner'])} />
      <Route path="/jockey/invitations" element={protectedPage(<JockeyInvitationsPage />, ['jockey'])} />
      <Route path="/jockey-assignments" element={protectedPage(<LegacyInvitationsRedirect />, ['horse_owner', 'jockey'])} />
      <Route path="/race-control" element={protectedPage(<RaceControlPage />, ['admin', 'race_referee'])} />
      <Route path="/notifications" element={protectedPage(<NotificationsPage />)} />
      <Route path="/wallet" element={protectedPage(<WalletPaymentPage />, ['spectator'])} />
      <Route path="/wallet/history" element={protectedPage(<WalletHistoryPage />, ['spectator'])} />
      <Route path="/wallet/transactions/:txId" element={protectedPage(<WalletTransactionDetailPage />, ['spectator'])} />
      <Route path="/payment-result" element={protectedPage(<PaymentResultPage />, ['spectator'])} />
    </Routes>
  );
};

export default AppRoutes;
