import { Routes, Route } from 'react-router-dom';
import LandingPage from '../pages/LandingPage';
import SchedulePage from '../pages/SchedulePage';
import ResultsPage from '../pages/ResultsPage';
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
      <Route path="/results" element={<MainLayout><ResultsPage /></MainLayout>} />
      <Route path="/horses" element={<MainLayout><HorseManagementPage /></MainLayout>} />
      <Route path="/spectator-dashboard" element={<MainLayout><SpectatorDashboard /></MainLayout>} />
    </Routes>
  );
};

export default AppRoutes;
