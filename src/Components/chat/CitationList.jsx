import React, { useState } from 'react'
import { FileText, AlertTriangle, ExternalLink, Bookmark, Sparkles } from 'lucide-react'
import SourceViewerModal from './SourceViewerModal.jsx'

const CitationList = ({ citations = [], retrievalMetadata = null, onCitationClick = null }) => {
  const [activeCitation, setActiveCitation] = useState(null)

  const hasCitations = Array.isArray(citations) && citations.length > 0
  const warning = retrievalMetadata?.lowConfidenceWarning

  if (!hasCitations && !warning) {
    return null
  }

  const handleCitationClick = (citation) => {
    if (onCitationClick) {
      onCitationClick(citation)
    } else {
      setActiveCitation(citation)
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
      {/* Low Confidence Warning */}
      {warning && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 px-3 py-2 text-xs font-medium text-amber-800 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>{warning}</span>
        </div>
      )}

      {/* Sources list */}
      {hasCitations && (
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            <Sparkles className="h-3.5 w-3.5 text-blue-500 dark:text-cyan-400" />
            <span>Sources:</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {citations.map((citation, idx) => {
              const docName = citation.documentName || citation.documentTitle || 'Document'
              const page = citation.page || citation.pageNumber || 1
              const matchPct = Math.round((citation.relevanceScore || citation.similarityScore || 0.9) * 100)

              return (
                <button
                  key={`${citation.documentId || 'doc'}-${citation.chunkId || idx}`}
                  type="button"
                  onClick={() => handleCitationClick(citation)}
                  className="group inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/80 dark:bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/60 dark:hover:bg-blue-950/40 hover:text-blue-900 dark:hover:text-blue-200 transition shadow-2xs"
                  title={`Click to verify Page ${page} excerpt in ${docName}`}
                >
                  <span className="text-base leading-none select-none">📄</span>
                  <span className="font-semibold truncate max-w-[170px] sm:max-w-[220px]" title={docName}>
                    {docName}
                  </span>
                  <span className="text-slate-400 dark:text-slate-500 select-none">—</span>
                  <span className="inline-flex items-center gap-1 font-bold text-blue-600 dark:text-cyan-400 shrink-0">
                    <Bookmark className="h-3 w-3" /> Page {page}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono group-hover:text-blue-600 dark:group-hover:text-cyan-300 shrink-0">
                    ({matchPct}%)
                  </span>
                  <ExternalLink className="h-3 w-3 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-cyan-300 opacity-60 group-hover:opacity-100 transition shrink-0" />
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal for viewing excerpt when clicked */}
      <SourceViewerModal
        isOpen={Boolean(activeCitation)}
        onClose={() => setActiveCitation(null)}
        citation={activeCitation}
      />
    </div>
  )
}

export default CitationList
