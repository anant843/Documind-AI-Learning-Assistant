import React from 'react'
import { FileText, ExternalLink, Bookmark, Target, ShieldCheck } from 'lucide-react'
import Modal from '../common/Modal.jsx'
import Button from '../common/Button.jsx'

const SourceViewerModal = ({ isOpen, onClose, citation }) => {
  if (!citation) return null

  const page = citation.page || citation.pageNumber || 1
  const docName = citation.documentName || citation.documentTitle || 'Source Document'
  const matchPct = Math.round((citation.relevanceScore || citation.similarityScore || 0.9) * 100)
  const chunkText = citation.chunkText || citation.snippet || 'No excerpt available.'

  const handleOpenPdf = () => {
    if (citation.documentId) {
      window.open(`/documents/${citation.documentId}`, '_blank')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Verify source">
      <div className="space-y-4 text-slate-800 dark:text-slate-200">
        {/* Header Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-5 w-5 shrink-0 text-blue-600" />
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate" title={docName}>
                {docName}
              </h4>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Chunk ID: {citation.chunkId || `chunk_${citation.chunkIndex ?? 0}`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800/80 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:text-blue-300">
              <Bookmark className="h-3 w-3" /> Page {page}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800/80 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:text-blue-300">
              <Target className="h-3 w-3" /> {matchPct}% Match
            </span>
          </div>
        </div>

        {/* Highlighted Chunk Text Excerpt */}
        <div>
          <label className="mb-2 block text-xs font-semibold text-slate-500 dark:text-slate-400">
            Excerpt from page {page}
          </label>
          <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-800 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200">
            <p className="whitespace-pre-wrap select-text">
              <mark className="rounded bg-indigo-200/80 px-1 py-0.5 text-indigo-950 dark:bg-indigo-500/30 dark:text-indigo-100">
                {chunkText}
              </mark>
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
            <span>Retrieved from the uploaded PDF</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            {citation.documentId && (
              <Button onClick={handleOpenPdf}>
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Open Document
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default SourceViewerModal
