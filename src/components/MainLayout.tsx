import Header from './Header';
import Footer from './Footer';

const MainLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-col min-h-screen">
    <Header />
    <div className="flex-grow">{children}</div>
    <Footer />
  </div>
);

export default MainLayout;
