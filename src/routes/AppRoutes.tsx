import { Routes, Route } from 'react-router-dom';
import LandingPage from '../pages/LandingPage';
import SchedulePage from '../pages/SchedulePage';
import ResultsPage from '../pages/ResultsPage';
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
    </Routes>
  );
};

export default AppRoutes;
