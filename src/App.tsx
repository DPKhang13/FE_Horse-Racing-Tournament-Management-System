import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import SchedulePage from './pages/SchedulePage';
import ResultsPage from './pages/ResultsPage';
import AuthPage from './pages/AuthPage';
import './App.css';

// Component Layout chung cho các trang chính
const MainLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-col min-h-screen">
    <Header />
    <div className="flex-grow">{children}</div>
    <Footer />
  </div>
);

function App() {
  return (
    <Router>
      <Routes>
        {/* Trang Auth không có Header/Footer chung */}
        <Route path="/login" element={<AuthPage />} />

        {/* Các trang khác có Header/Footer chung */}
        <Route path="/" element={<MainLayout><LandingPage /></MainLayout>} />
        <Route path="/schedule" element={<MainLayout><SchedulePage /></MainLayout>} />
        <Route path="/results" element={<MainLayout><ResultsPage /></MainLayout>} />
      </Routes>
    </Router>
  );
}

export default App;
