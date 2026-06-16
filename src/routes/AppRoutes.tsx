import { Routes, Route } from 'react-router-dom';
import type { ReactNode } from 'react';
import LandingPage from '../pages/LandingPage';
import SchedulePage from '../pages/SchedulePage';
import RaceResultList from '../pages/Result/RaceResultList';
import RaceResultDetail from '../pages/Result/RaceResultDetail';
import RankingPage from '../pages/Result/RankingPage';
import PredictionPage from '../pages/PredictionPage';
import ResultTrackingPage from '../pages/ResultTrackingPage';
import AuthPage from '../pages/AuthPage';
import HorseManagementPage from '../pages/HorseManagementPage';
import MainLayout from '../components/MainLayout';
import ProtectedRoute from '../components/ProtectedRoute';
import SpectatorDashboard from '../pages/SpectatorDashboard/SpectatorDashboard';
import UserProfilePage from '../pages/UserProfilePage';
import { AUTHENTICATED_ROLES } from '../utils/permissions';

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
    </Routes>
  );
};

export default AppRoutes;
