import React, { useState } from 'react'
import { FileText, AlertTriangle, ExternalLink, Bookmark } from 'lucide-react'
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
        <div className="flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200">
          <AlertTriangle className="h-4 w-4 text-slate-600 dark:text-slate-300 shrink-0" />
          <span>{warning}</span>
        </div>
      )}

      {/* Sources list */}
      {hasCitations && (
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
            <FileText className="h-3.5 w-3.5 text-blue-600" />
            <span>Supporting passages</span>
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
                  className="group inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-blue-400 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-600 dark:hover:bg-blue-950/30"
                  title={`Click to verify Page ${page} excerpt in ${docName}`}
                >
                  <FileText className="h-3.5 w-3.5 shrink-0 text-blue-700 dark:text-blue-300" />
                  <span className="font-semibold truncate max-w-[170px] sm:max-w-[220px]" title={docName}>
                    {docName}
                  </span>
                  <span className="select-none text-slate-300">·</span>
                  <span className="inline-flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400 shrink-0">
                    <Bookmark className="h-3 w-3" /> Page {page}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono group-hover:text-blue-600 dark:group-hover:text-blue-300 shrink-0">
                    ({matchPct}%)
                  </span>
                  <ExternalLink className="h-3 w-3 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-300 opacity-60 group-hover:opacity-100 transition shrink-0" />
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
