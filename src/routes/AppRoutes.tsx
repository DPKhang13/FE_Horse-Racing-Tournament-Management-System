import { Routes, Route } from 'react-router-dom';
import LandingPage from '../pages/LandingPage';
import SchedulePage from '../pages/SchedulePage';
import ResultsPage from '../pages/ResultsPage';
import PredictionPage from '../pages/PredictionPage';
import ResultTrackingPage from '../pages/ResultTrackingPage';
import AuthPage from '../pages/AuthPage';
import MainLayout from '../components/MainLayout';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Trang Auth không có Header/Footer chung */}
      <Route path="/login" element={<AuthPage />} />

      {/* Các trang khác có Header/Footer chung */}
      <Route path="/" element={<MainLayout><LandingPage /></MainLayout>} />
      <Route path="/schedule" element={<MainLayout><SchedulePage /></MainLayout>} />
      <Route path="/results" element={<MainLayout><ResultsPage /></MainLayout>} />
      <Route path="/prediction" element={<MainLayout><PredictionPage /></MainLayout>} />
      <Route path="/tracking" element={<MainLayout><ResultTrackingPage /></MainLayout>} />
    </Routes>
  );
};

export default AppRoutes;
