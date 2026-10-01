import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

const AppLayout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const toggleSidebar = () => setIsSidebarOpen((open) => !open);
  return (
    <div className="app-shell flex h-[100dvh] overflow-hidden text-slate-950 md:pl-60 dark:text-slate-100">
      <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header toggleSidebar={toggleSidebar} />
        <main className="app-main min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1500px] p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
};
export default AppLayout;
