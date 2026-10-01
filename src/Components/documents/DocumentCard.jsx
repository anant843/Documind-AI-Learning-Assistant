import React from "react";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import { FileText, Trash2, BookOpen, ListChecks } from "lucide-react";

const formatFileSize = (bytes) => {
  if (!bytes) return "Unknown size";
  const units = ["B","KB","MB","GB"]; let size = bytes; let i = 0;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i += 1; }
  return `${size.toFixed(1)} ${units[i]}`;
};

const DocumentCard = ({ document, onDelete }) => {
  const navigate = useNavigate();
  return (
    <article onClick={() => navigate(`/documents/${document._id}`)} onKeyDown={(e) => { if (e.key === "Enter") navigate(`/documents/${document._id}`); }} role="button" tabIndex={0} className="group surface cursor-pointer p-4 transition-colors hover:border-blue-300 hover:bg-blue-50/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:hover:border-blue-800 dark:hover:bg-blue-950/20">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-blue-600 dark:text-blue-400"><FileText className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold text-slate-950 dark:text-white">{document.title}</h3>
          <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{document.filename || "PDF document"} · {formatFileSize(document.filesize)}</p>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onDelete?.(document); }} className="rounded-md p-1.5 text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-red-700 group-hover:opacity-100 focus:opacity-100 dark:hover:bg-red-950/30 dark:hover:text-red-300" aria-label={`Delete ${document.title}`}><Trash2 className="h-4 w-4" /></button>
      </div>
      <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <span className="flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" />{document.flashcardsCount ?? 0} cards</span>
        <span className="flex items-center gap-1.5"><ListChecks className="h-3.5 w-3.5" />{document.quizzesCount ?? 0} quizzes</span>
        <span className="ml-auto">{moment(document.uploadDate || document.createdAt).fromNow()}</span>
      </div>
    </article>
  );
};
export default DocumentCard;
