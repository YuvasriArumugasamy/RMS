import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f5f6fa]">
      {/* Sidebar - Desktop Only */}
      <div className="w-64 shrink-0 h-screen hidden md:block">
        <Sidebar />
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)} />
        <main className="flex-1 overflow-y-scroll p-5 min-h-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile Sidebar Drawer Overlay */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden" onClick={() => setIsMobileSidebarOpen(false)}>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/60 transition-opacity duration-300" />
          
          {/* Drawer Panel */}
          <div 
            className="relative flex-1 flex flex-col max-w-[256px] w-full bg-[#1e3a8a] text-white shadow-2xl transition-transform duration-300 transform translate-x-0 h-full"
            onClick={e => e.stopPropagation()}
          >
            {/* Scrollable Navigation Items */}
            <div className="flex-1 overflow-y-auto" onClick={() => setIsMobileSidebarOpen(false)}>
              <Sidebar onClose={() => setIsMobileSidebarOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
