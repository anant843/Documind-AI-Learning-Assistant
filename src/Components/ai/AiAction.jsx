import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BookOpen, Lightbulb, Loader2, FileText, FolderTree, Target, Presentation, ChevronRight } from "lucide-react";
import aiService from "../../services/aiService";
import toast from "react-hot-toast";
import MarkdownRenderer from "../common/MarkdownRenderer";
import Modal from "../common/Modal";
import StudyNotesModal from "./StudyNotesModal";
import MindMapModal from "./MindMapModal";
import PresentationModal from "./PresentationModal";

const AiAction = ({ documentTitle }) => {
  const { id: documentId } = useParams();
  const navigate = useNavigate();
  const [loadingAction,setLoadingAction]=useState(null);
  const [isModalOpen,setIsModalOpen]=useState(false);
  const [modalContent,setModalContent]=useState("");
  const [modalTitle,setModalTitle]=useState("");
  const [concept,setConcept]=useState("");
  const [isNotesModalOpen,setIsNotesModalOpen]=useState(false);
  const [isMindMapModalOpen,setIsMindMapModalOpen]=useState(false);
  const [isPresentationModalOpen,setIsPresentationModalOpen]=useState(false);

  const handleGenerateSummary=async()=>{setLoadingAction("summary");try{const {summary}=await aiService.generateSummary(documentId);setModalTitle("Document summary");setModalContent(summary);setIsModalOpen(true);}catch(error){toast.error(error.message||"Failed to generate summary");}finally{setLoadingAction(null);}};
  const handleExplainConcept=async(e)=>{e.preventDefault();if(!concept.trim()){toast.error("Enter a concept to explain");return;}setLoadingAction("explain");try{const {explanation}=await aiService.explainConcept(documentId,concept);setModalTitle(`Explanation: ${concept}`);setModalContent(explanation);setIsModalOpen(true);setConcept("");}catch(error){toast.error(error.message||"Failed to explain concept");}finally{setLoadingAction(null);}};
  const handleGenerateWeakTopicQuiz=async()=>{setLoadingAction("weak-quiz");try{const res=await aiService.generateWeakTopicQuiz(documentId,5);toast.success("Diagnostic quiz ready");navigate(`/quizzes/${res.data._id}`);}catch(error){toast.error(error.message||"Failed to generate quiz");}finally{setLoadingAction(null);}};

  const actions=[
    {title:"Study notes",description:"Create concise notes and a revision sheet.",icon:FileText,action:()=>setIsNotesModalOpen(true),label:"Create notes"},
    {title:"Concept map",description:"Arrange chapters and ideas in a collapsible tree.",icon:FolderTree,action:()=>setIsMindMapModalOpen(true),label:"Build map"},
    {title:"Slide deck",description:"Turn the source into a structured presentation.",icon:Presentation,action:()=>setIsPresentationModalOpen(true),label:"Create slides"},
    {title:"Diagnostic quiz",description:"Test topics that need more review.",icon:Target,action:handleGenerateWeakTopicQuiz,label:"Create quiz",loading:"weak-quiz"},
    {title:"Document summary",description:"Extract the main argument and supporting ideas.",icon:BookOpen,action:handleGenerateSummary,label:"Summarize",loading:"summary"},
  ];

  return <>
    <section className="surface overflow-hidden">
      <header className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <h3 className="text-sm font-bold text-slate-950 dark:text-white">Create from this document</h3>
        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Choose an output. Generation stays grounded in the uploaded PDF.</p>
      </header>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {actions.map(({title,description,icon:Icon,action,label,loading})=><div key={title} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
          <Icon className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400"/>
          <div className="min-w-0 flex-1"><h4 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h4><p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p></div>
          <button onClick={action} disabled={loadingAction===loading} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
            {loadingAction===loading?<Loader2 className="h-3.5 w-3.5 animate-spin"/>:<>{label}<ChevronRight className="h-3.5 w-3.5"/></>}
          </button>
        </div>)}
      </div>
      <form onSubmit={handleExplainConcept} className="border-t border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/30">
        <div className="flex items-start gap-3"><Lightbulb className="mt-0.5 h-5 w-5 text-blue-600"/><div><h4 className="text-sm font-semibold text-slate-900 dark:text-white">Explain a concept</h4><p className="mt-0.5 text-xs text-slate-500">Enter a term, theorem, formula, or process from the document.</p></div></div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row"><input value={concept} onChange={e=>setConcept(e.target.value)} disabled={loadingAction==="explain"} placeholder="For example: normalization" className="h-10 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 dark:border-slate-700 dark:bg-slate-900"/><button type="submit" disabled={loadingAction==="explain"} className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{loadingAction==="explain"?"Explaining…":"Explain"}</button></div>
      </form>
    </section>
    <Modal isOpen={isModalOpen} onClose={()=>setIsModalOpen(false)} title={modalTitle}><div className="text-sm leading-7 text-slate-700 dark:text-slate-200"><MarkdownRenderer content={modalContent}/></div></Modal>
    <StudyNotesModal isOpen={isNotesModalOpen} onClose={()=>setIsNotesModalOpen(false)} documentId={documentId} documentTitle={documentTitle||"Document"}/>
    <MindMapModal isOpen={isMindMapModalOpen} onClose={()=>setIsMindMapModalOpen(false)} documentId={documentId} documentTitle={documentTitle||"Document"}/>
    <PresentationModal isOpen={isPresentationModalOpen} onClose={()=>setIsPresentationModalOpen(false)} documentId={documentId} documentTitle={documentTitle||"Document"}/>
  </>;
};
export default AiAction;
