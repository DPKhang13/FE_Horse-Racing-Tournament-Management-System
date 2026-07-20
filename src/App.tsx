import { BrowserRouter as Router } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import './App.css';
import ToastViewport from './components/ToastViewport';

function App() {
  return (
    <Router>
      <AppRoutes />
      <ToastViewport />
    </Router>
  );
}

export default App;
