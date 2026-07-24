import { BrowserRouter as Router } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import './App.css';
import ToastViewport from './components/ToastViewport';
import { AppMotionProvider } from './components/motion/MotionPrimitives';

function App() {
  return (
    <Router>
      <AppMotionProvider>
        <AppRoutes />
        <ToastViewport />
      </AppMotionProvider>
    </Router>
  );
}

export default App;
