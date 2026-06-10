import { Routes, Route } from 'react-router-dom';
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
import SpectatorDashboard from '../pages/SpectatorDashboard/SpectatorDashboard';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Trang Auth không có Header/Footer chung */}
      <Route path="/login" element={<AuthPage />} />

      {/* Các trang khác có Header/Footer chung */}
      <Route path="/" element={<MainLayout><LandingPage /></MainLayout>} />
      <Route path="/schedule" element={<MainLayout><SchedulePage /></MainLayout>} />
      <Route path="/results" element={<MainLayout><RaceResultList /></MainLayout>} />
      <Route path="/results/rankings" element={<MainLayout><RankingPage /></MainLayout>} />
      <Route path="/results/:resultId" element={<MainLayout><RaceResultDetail /></MainLayout>} />
      <Route path="/horses" element={<MainLayout><HorseManagementPage /></MainLayout>} />
      <Route path="/spectator-dashboard" element={<MainLayout><SpectatorDashboard /></MainLayout>} />
      <Route path="/prediction" element={<MainLayout><PredictionPage /></MainLayout>} />
      <Route path="/tracking" element={<MainLayout><ResultTrackingPage /></MainLayout>} />
    </Routes>
  );
};

export default AppRoutes;
