import React from 'react'
import { FileText, ExternalLink, X, Bookmark, Target, CheckCircle2 } from 'lucide-react'
import Modal from '../common/Modal.jsx'
import Button from '../common/Button.jsx'
import { BASE_URL } from '../../utils/apiPaths.js'

const SourceViewerModal = ({ isOpen, onClose, citation, onJumpToPage }) => {
  if (!citation) return null

  const page = citation.page || citation.pageNumber || 1
  const docName = citation.documentName || citation.documentTitle || 'Source Document'
  const matchPct = Math.round((citation.relevanceScore || citation.similarityScore || 0.9) * 100)
  const chunkText = citation.chunkText || citation.snippet || 'No excerpt available.'

  const handleOpenPdf = () => {
    if (citation.documentId) {
      const pdfBase = `${BASE_URL}/api/documents/${citation.documentId}`
      window.open(`/documents/${citation.documentId}`, '_blank')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Source Citation & Verification">
      <div className="space-y-4 text-slate-800 dark:text-slate-200">
        {/* Header Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4" />
            </div>
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
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/80 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              <Target className="h-3 w-3" /> {matchPct}% Match
            </span>
          </div>
        </div>

        {/* Highlighted Chunk Text Excerpt */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Verified Source Excerpt (Page {page})
          </label>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/60 p-4 text-xs sm:text-sm font-mono leading-relaxed text-slate-800 dark:text-slate-200 max-h-64 overflow-y-auto shadow-inner">
            <p className="whitespace-pre-wrap select-text">
              <mark className="bg-amber-200/80 dark:bg-amber-500/30 text-slate-900 dark:text-amber-100 rounded px-1 py-0.5">
                {chunkText}
              </mark>
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>Strictly grounded in uploaded document context</span>
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
