import React from "react";

const Tabs = ({ tabs = [], activeTab, setActiveTab }) => (
  <div className="tab-scroll overflow-x-auto border-b border-slate-200 dark:border-slate-800">
    <nav className="flex min-w-max gap-1" aria-label="Document sections">
      {tabs.map((tab) => {
        const active = activeTab === tab.key;
        return <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} className={`relative px-3 py-3 text-sm font-semibold transition-colors ${active ? "text-blue-700 dark:text-blue-300" : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"}`}>
          {tab.label}
          {active && <span className="absolute inset-x-3 bottom-0 h-0.5 bg-blue-600" />}
        </button>;
      })}
    </nav>
  </div>
);
export default Tabs;
