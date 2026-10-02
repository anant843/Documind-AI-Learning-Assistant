import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, BookOpen, ListChecks, Clock, ArrowUpRight } from "lucide-react";
import toast from "react-hot-toast";
import { PageSkeleton } from "../../Components/common/LoadingState";
import progressService from "../../services/progressService";

const DashboardPage = () => {
  const [data,setData]=useState(null); const [loading,setLoading]=useState(true);
  useEffect(()=>{progressService.getDashboard().then(r=>setData(r?.data||r)).catch(e=>toast.error(e.message||"Could not load your workspace.")).finally(()=>setLoading(false));},[]);
  if(loading)return <PageSkeleton />;
  const overview=data?.overview||{};
  const stats=[
    ["Documents",overview.totalDocuments??0,FileText,"/documents"],
    ["Flashcards",overview.totalFlashcards??0,BookOpen,"/flashcards"],
    ["Quizzes",overview.totalQuizzes??0,ListChecks,"/documents"],
  ];
  const activities=[
    ...(data?.recentActivities?.documents||[]).map(x=>({...x,type:"Document",timestamp:x.lastAccessed,link:`/documents/${x._id}`})),
    ...(data?.recentActivities?.quizzes||[]).map(x=>({...x,type:"Quiz",timestamp:x.lastAttempt,link:`/quizzes/${x._id}`})),
  ].filter(x=>x.timestamp).sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)).slice(0,6);
  return <div className="space-y-8">
    <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
      <div><h1 className="text-3xl font-bold tracking-[-0.035em] text-slate-950 dark:text-white">Your study desk</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">Pick up where you left off, or add new source material to your library.</p></div>
      <Link to="/documents" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">Open library <ArrowUpRight className="h-4 w-4"/></Link>
    </header>
    <section className="surface overflow-hidden">
      <div className="grid divide-y divide-slate-200 dark:divide-slate-800 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {stats.map(([label,value,Icon,to])=><Link key={label} to={to} className="group flex items-center gap-4 p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50"><Icon className="h-5 w-5 text-blue-600 dark:text-blue-400"/><div><p className="text-2xl font-bold tabular-nums text-slate-950 dark:text-white">{value}</p><p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p></div><ArrowUpRight className="ml-auto h-4 w-4 text-slate-300 transition group-hover:text-blue-600"/></Link>)}
      </div>
    </section>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="surface">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800"><h2 className="text-sm font-bold text-slate-950 dark:text-white">Recent work</h2><span className="text-xs text-slate-500">Latest activity</span></div>
        {activities.length?<ul className="divide-y divide-slate-100 dark:divide-slate-800">{activities.map(item=><li key={item._id+item.type}><Link to={item.link} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50"><span className="w-20 text-xs font-semibold text-slate-500">{item.type}</span><span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900 dark:text-white">{item.title}</span><span className="hidden items-center gap-1 text-xs text-slate-400 sm:flex"><Clock className="h-3.5 w-3.5"/>{new Date(item.timestamp).toLocaleDateString()}</span></Link></li>)}</ul>:<div className="px-5 py-12 text-center"><p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No recent work</p><p className="mt-1 text-sm text-slate-500">Upload a PDF to begin.</p></div>}
      </section>
      <aside className="surface p-5">
        <h2 className="text-sm font-bold text-slate-950 dark:text-white">A focused workflow</h2>
        <ol className="mt-5 space-y-5">
          {[["Add a source","Upload a PDF to your library."],["Ask with evidence","Use chat to retrieve grounded answers."],["Review actively","Turn the material into cards and quizzes."]].map(([title,text],i)=><li key={title} className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-slate-900 text-[11px] font-bold text-white dark:bg-blue-600">{i+1}</span><div><p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p><p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">{text}</p></div></li>)}
        </ol>
      </aside>
    </div>
  </div>;
};
export default DashboardPage;
