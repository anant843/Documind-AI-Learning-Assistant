import React from 'react'
import {FileText, Plus} from 'lucide-react'

const EmptyState = ({onActionClick, title, description, buttonText }) => {
  return (
    <div className='rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 dark:border-slate-700 dark:bg-slate-900/40'>
        <FileText className='h-6 w-6 text-slate-400' />
        <h3 className='mt-4 text-base font-semibold text-slate-900 dark:text-white'>{title}</h3>
        <p className='mt-1 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-400'>{description}</p>
        {onActionClick && buttonText && (
            <div className='mt-5'>
                <button
                    onClick={onActionClick}
                    className='inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                >
                    <Plus className='-ml-1 mr-2 h-5 w-5' aria-hidden="true" />
                    {buttonText}
                </button>
            </div>
        )}
    </div>
  )
}

export default EmptyState
