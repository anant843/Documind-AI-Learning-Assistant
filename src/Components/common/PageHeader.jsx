import React from 'react'

const PageHeader = ({title,subtitle,children}) => {
  return (
    <div className="space-y-1">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
      {subtitle && <p className="text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>}
      {children && (
        <div className="text-slate-500 dark:text-slate-400 mt-2">
          {children}
        </div>
      )}
    </div>
  )
}

export default PageHeader