import React from 'react'

const Tabs = ({ tabs = [], activeTab, setActiveTab }) => {
  return (
    <div className="w-full border-b border-slate-200 dark:border-slate-800">
      <nav className="flex flex-wrap gap-6">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`relative pb-3 px-1 text-sm font-semibold transition-colors ${
                isActive
                  ? 'text-indigo-600 dark:text-cyan-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              {isActive && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-gradient-to-r from-indigo-500 to-cyan-500 shadow-sm" />
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

export default Tabs