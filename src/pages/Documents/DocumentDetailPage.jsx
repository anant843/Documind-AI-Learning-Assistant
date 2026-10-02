import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import documentService from '../../services/documentService.js'
import { PageSkeleton, Skeleton } from '../../Components/common/LoadingState.jsx'
import toast from 'react-hot-toast'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import PageHeader from '../../Components/common/PageHeader.jsx'
import Tabs from '../../Components/common/Tabs.jsx'
import ChatInterface from '../../Components/chat/ChatInterface.jsx'
import AiAction from '../../Components/ai/AiAction.jsx'
import FlashcardManager from '../../Components/flashcard/FlashcardManager.jsx'
import QuizManager from '../../Components/quizzes/QuizManager.jsx'


const DocumentDetailPage = () => {

  const { id } = useParams();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('content');
  const [targetPage, setTargetPage] = useState(1);
  const [pdfObjectUrl, setPdfObjectUrl] = useState(null);
  const [pdfError, setPdfError] = useState('');


  useEffect(() => {
    const fetchDocumentDetails = async () => {
      setLoading(true);
      try {
        const data = await documentService.getDocumentById(id);
        setDocument(data);
        try {
          const pdfBlob = await documentService.getDocumentFile(id);
          setPdfObjectUrl(URL.createObjectURL(pdfBlob));
        } catch (pdfFetchError) {
          setPdfError(pdfFetchError.message || 'PDF preview is unavailable. Please upload the document again.');
        }

      } catch (error) {
        toast.error(error.message || "Failed to fetch document details");
      } finally {
        setLoading(false);
      }
    };

    fetchDocumentDetails();
  }, [id]);

  useEffect(() => () => {
    if (pdfObjectUrl) URL.revokeObjectURL(pdfObjectUrl);
  }, [pdfObjectUrl]);


  // Helper function to get the full pdf url
  const getPdfUrl = (pageNumber = null) => {
    return pdfObjectUrl && pageNumber ? `${pdfObjectUrl}#page=${pageNumber}` : pdfObjectUrl;
  };

  const handleNavigateToPage = (pageNum) => {
    if (pageNum) {
      setTargetPage(pageNum);
      setActiveTab('content');
      toast.success(`Jumped to Page ${pageNum}`);
    }
  };

  const renderContent = () => {
    if (pdfError) {
      return <p className="text-center text-slate-600 dark:text-slate-300 p-8">{pdfError}</p>;
    }
    if (!pdfObjectUrl) {
      return <Skeleton className="h-[72vh] min-h-[560px] w-full rounded-xl" />;
    }
    const pdfUrl = getPdfUrl(targetPage);

    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col overflow-hidden h-[85vh] min-h-[720px]">
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/50 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse"></span>
            <span>Document Preview {targetPage > 1 ? `(Page ${targetPage})` : ''}</span>
            <span className="text-[11px] text-slate-400 font-normal ml-1 hidden sm:inline">(Scroll to read entire PDF)</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700 dark:text-cyan-400 font-semibold px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open PDF in new tab
            </a>
          </div>
        </div>
        <div className="flex-1 min-h-[620px] flex flex-col p-2 sm:p-4 bg-slate-100 dark:bg-slate-950">
          <div className="flex-1 min-h-[580px] rounded-xl border border-slate-300 dark:border-slate-800 overflow-hidden shadow-inner bg-white">
            <iframe
              key={`pdf-preview-page-${targetPage}`}
              src={pdfUrl}
              title="Document PDF"
              className="w-full h-full min-h-[580px] border-0"
            ></iframe>
          </div>
        </div>
      </div>
    );
  };

  const renderChat = () => {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-4 flex">
        <ChatInterface onNavigateToPage={handleNavigateToPage} />
      </div>
    );
  };

  const renderAIAction = () => {
    return (
      <AiAction documentTitle={document?.data?.title} />
    );
  };

  const renderFlashcardTab = () => {
    return (
      <FlashcardManager documentId={id} />
    );
  };

  const renderQuizTab = () => {
    return (
      <QuizManager documentId={id} />
    );
  };

  const tabs = [
    { label: 'Content', key: 'content', render: renderContent },
    { label: 'Chat', key: 'chat', render: renderChat },
    { label: 'AI Actions', key: 'ai-actions', render: renderAIAction },
    { label: 'Flashcards', key: 'flashcards', render: renderFlashcardTab },
    { label: 'Quiz', key: 'quiz', render: renderQuizTab },
  ];

  if (loading) {
    return <PageSkeleton />;
  }

  if (!document) {
    return <p className="text-center text-slate-600">Document not found</p>;
  }

  const activeTabData = tabs.find(tab => tab.key === activeTab);

  return (
    <div className="flex flex-col flex-1 gap-4 pb-12">
      <Link to='/documents' className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-cyan-400 hover:text-blue-500 dark:hover:text-cyan-300 font-medium mb-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Documents
      </Link>
      <PageHeader 
        title={document.data.title || "Document Details"} 
        description={document.data.description || "View document details and interact with the content."} 
      />
      <div className="flex-shrink-0">
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      </div>
      <div className="mt-2 flex-1">
        {activeTabData && activeTabData.render()}
      </div>
    </div>
  );
}

export default DocumentDetailPage
