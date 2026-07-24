import { Navigate, Routes, Route } from 'react-router-dom';
import { lazy, Suspense, type ReactNode } from 'react';
import MainLayout from '../components/MainLayout';
import ProtectedRoute from '../components/ProtectedRoute';
import { PageTransition, RouteLoadingState } from '../components/motion/MotionPrimitives';
import { AUTHENTICATED_ROLES, RESULT_VIEWER_ROLES } from '../utils/permissions';
import { authService } from '../services/authService';

const LandingPage = lazy(() => import('../pages/Home/LandingPage'));
const SchedulePage = lazy(() => import('../pages/Race/SchedulePage'));
const RaceResultList = lazy(() => import('../pages/Result/RaceResultList'));
const RaceResultDetail = lazy(() => import('../pages/Result/RaceResultDetail'));
const RankingPage = lazy(() => import('../pages/Result/RankingPage'));
const PredictionPage = lazy(() => import('../pages/Prediction/PredictionPage'));
const ResultTrackingPage = lazy(() => import('../pages/Prediction/ResultTrackingPage'));
const AuthPage = lazy(() => import('../pages/Auth/AuthPage'));
const RegistrationPage = lazy(() => import('../pages/Auth/RegistrationPage'));
const HorseManagementPage = lazy(() => import('../pages/Horse/HorseManagementPage'));
const SpectatorDashboard = lazy(() => import('../pages/SpectatorDashboard/SpectatorDashboard'));
const UserProfilePage = lazy(() => import('../pages/Profile/UserProfilePage'));
const AdminHorseManagementPage = lazy(() => import('../pages/Admin/AdminHorseManagementPage'));
const AdminOperationsPage = lazy(() => import('../pages/Admin/AdminOperationsPage'));
const RegistrationManagementPage = lazy(() => import('../pages/Admin/RegistrationManagementPage'));
const AdminRacesPage = lazy(() => import('../pages/Admin/AdminRacesPage'));
const AdminSchedulePage = lazy(() => import('../pages/Admin/AdminSchedulePage'));
const AdminBetManagementPage = lazy(() => import('../pages/Admin/AdminBetManagementPage'));
const RaceRegistrationPage = lazy(() => import('../pages/Race/RaceRegistrationPage'));
const OwnerInvitationsPage = lazy(() => import('../pages/Owner/OwnerInvitationsPage'));
const JockeyInvitationsPage = lazy(() => import('../pages/Jockey/JockeyInvitationsPage'));
const JockeyDashboardPage = lazy(() => import('../pages/Jockey/JockeyDashboardPage'));
const JockeySchedulePage = lazy(() => import('../pages/Jockey/JockeySchedulePage'));
const RaceControlPage = lazy(() => import('../pages/Race/RaceControlPage'));
const NotificationsPage = lazy(() => import('../pages/Notifications/NotificationsPage'));
const WalletPaymentPage = lazy(() => import('../pages/Wallet/WalletPaymentPage'));
const PaymentResultPage = lazy(() => import('../pages/Wallet/PaymentResultPage'));
const WalletHistoryPage = lazy(() => import('../pages/Wallet/WalletHistoryPage'));
const WalletTransactionDetailPage = lazy(() => import('../pages/Wallet/WalletTransactionDetailPage'));
const TournamentManagementPage = lazy(() => import('../pages/Tournament/TournamentManagementPage'));
const TournamentSchedulePage = lazy(() => import('../pages/Tournament/TournamentSchedulePage'));
const TournamentPrizeAwardsPage = lazy(() => import('../pages/Tournament/TournamentPrizeAwardsPage'));
const UserManagementPage = lazy(() => import('../pages/Admin/UserManagementPage'));
const OwnerDashboardPage = lazy(() => import('../pages/Owner/OwnerDashboardPage'));
const AdminRaceResultsPage = lazy(() => import('../pages/Admin/AdminRaceResultsPage'));
const AdminPrizeAwardsPage = lazy(() => import('../pages/Admin/AdminPrizeAwardsPage'));
const RefereeDashboardPage = lazy(() => import('../pages/Referee/RefereeDashboardPage'));

const asyncPage = (page: ReactNode) => (
  <Suspense fallback={<RouteLoadingState />}>
    <PageTransition>{page}</PageTransition>
  </Suspense>
);

const withLayout = (page: ReactNode) => <MainLayout>{asyncPage(page)}</MainLayout>;

const standalonePage = (page: ReactNode) => asyncPage(page);

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
      <Route path="/login" element={standalonePage(<AuthPage />)} />
      <Route path="/registration" element={standalonePage(<RegistrationPage />)} />

      {/* Các trang khác có Header/Footer chung */}
      <Route path="/" element={withLayout(<LandingPage />)} />
      <Route path="/schedule" element={protectedPage(<SchedulePage />, ['horse_owner'])} />
      <Route path="/results" element={protectedPage(<RaceResultList />, RESULT_VIEWER_ROLES)} />
      <Route path="/results/rankings" element={protectedPage(<RankingPage />, RESULT_VIEWER_ROLES)} />
      <Route path="/results/:resultId" element={protectedPage(<RaceResultDetail />, RESULT_VIEWER_ROLES)} />
      <Route path="/horses" element={protectedPage(<HorseManagementPage />, ['horse_owner'])} />
      <Route path="/owner-dashboard" element={protectedPage(<OwnerDashboardPage />, ['horse_owner'])} />
      <Route path="/jockey-dashboard" element={protectedPage(<JockeyDashboardPage />, ['jockey'])} />
      <Route path="/jockey/schedule" element={protectedPage(<JockeySchedulePage />, ['jockey'])} />
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
      <Route path="/admin/prize-awards" element={protectedPage(<AdminPrizeAwardsPage />, ['admin'])} />
      <Route path="/admin/bets" element={protectedPage(<AdminBetManagementPage />, ['admin'])} />
      <Route path="/admin/race-schedule" element={<Navigate to="/admin/schedule" replace />} />
      <Route path="/tournaments" element={protectedPage(<TournamentManagementPage />, ['admin'])} />
      <Route path="/tournaments/:tournamentId/schedule" element={protectedPage(<TournamentSchedulePage />, ['admin'])} />
      <Route path="/tournaments/:tournamentId/prize-awards" element={protectedPage(<TournamentPrizeAwardsPage />, ['admin'])} />
      <Route path="/registrations" element={protectedPage(<RaceRegistrationPage />, ['horse_owner', 'admin'])} />
      <Route path="/owner/invitations" element={protectedPage(<OwnerInvitationsPage />, ['horse_owner'])} />
      <Route path="/jockey/invitations" element={protectedPage(<JockeyInvitationsPage />, ['jockey'])} />
      <Route path="/jockey-assignments" element={protectedPage(<LegacyInvitationsRedirect />, ['horse_owner', 'jockey'])} />
      <Route path="/race-control" element={protectedPage(<RaceControlPage />, ['race_referee'])} />
      <Route path="/notifications" element={protectedPage(<NotificationsPage />)} />
      <Route path="/wallet" element={protectedPage(<WalletPaymentPage />, ['spectator'])} />
      <Route path="/wallet/history" element={protectedPage(<WalletHistoryPage />, ['spectator'])} />
      <Route path="/wallet/transactions/:txId" element={protectedPage(<WalletTransactionDetailPage />, ['spectator'])} />
      <Route path="/payment-result" element={protectedPage(<PaymentResultPage />, ['spectator'])} />
    </Routes>
  );
};

export default AppRoutes;
