import React, {useState} from 'react'
import Sidebar from './Sidebar';
import Header from './Header.jsx';


const AppLayout = ({children}) => {
const [isSidebarOpen, setIsSidebarOpen] = useState(false);

const toggleSidebar = () => {
  setIsSidebarOpen(!isSidebarOpen);
}

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-950 text-neutral-900 md:pl-64 overflow-hidden">
      <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      <div className="flex flex-col flex-1 h-screen min-w-0 overflow-hidden">
        <Header toggleSidebar={toggleSidebar} />
        <main className="flex flex-col flex-1 min-h-0 overflow-y-auto bg-slate-50 dark:bg-slate-950/40 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export default AppLayout