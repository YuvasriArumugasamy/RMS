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
            className="relative flex-1 flex flex-col max-w-[280px] w-full bg-[#0B0F19] text-white shadow-2xl transition-transform duration-300 transform translate-x-0 h-full"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <span className="font-extrabold text-xs tracking-widest text-orange-500 uppercase">Staff Terminal Menu</span>
              <button 
                onClick={() => setIsMobileSidebarOpen(false)} 
                className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center font-bold text-white text-xs hover:bg-white/10"
              >
                ✕
              </button>
            </div>
            
            {/* Scrollable Navigation Items */}
            <div className="flex-1 overflow-y-auto" onClick={() => setIsMobileSidebarOpen(false)}>
              <Sidebar />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
