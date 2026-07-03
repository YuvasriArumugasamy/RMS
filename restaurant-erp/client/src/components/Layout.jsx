import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = () => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f5f6fa]">
      {/* Sidebar */}
      <div className="w-64 shrink-0 h-screen hidden md:block">
        <Sidebar />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-scroll p-5 min-h-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
