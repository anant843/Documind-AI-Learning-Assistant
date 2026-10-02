import React from "react";
import { cn } from "../../lib/utils";

export const Skeleton = ({ className = "", ...props }) => (
  <div
    aria-hidden="true"
    className={cn("animate-pulse rounded-md bg-slate-200/80 dark:bg-slate-800", className)}
    {...props}
  />
);

export const AppBootSkeleton = () => (
  <div className="flex min-h-[100dvh] bg-[#f5f7fa] dark:bg-[#111318]" role="status" aria-label="Loading application">
    <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#181b21] md:block">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-5 dark:border-slate-800">
        <Skeleton className="h-8 w-8" /><div className="space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-2.5 w-16" /></div>
      </div>
      <div className="mt-7 space-y-3">{Array.from({length:6}).map((_,i)=><Skeleton key={i} className={cn("h-9",i===0?"w-full":"w-[88%]")} />)}</div>
    </aside>
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 dark:border-slate-800 dark:bg-[#181b21]"><Skeleton className="h-4 w-36"/><Skeleton className="h-8 w-32"/></div>
      <div className="flex-1 p-6 lg:p-8"><PageSkeleton /></div>
    </div>
  </div>
);

export const PageSkeleton = ({ variant = "default" }) => (
  <div className="w-full space-y-6" role="status" aria-label="Loading content">
    <div className="space-y-2"><Skeleton className="h-8 w-56 max-w-[70%]" /><Skeleton className="h-4 w-96 max-w-full" /></div>
    {variant === "list" ? (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({length:6}).map((_,i)=><div key={i} className="surface space-y-4 p-4"><div className="flex gap-3"><Skeleton className="h-5 w-5"/><div className="flex-1 space-y-2"><Skeleton className="h-4 w-3/4"/><Skeleton className="h-3 w-1/2"/></div></div><Skeleton className="h-px w-full"/><Skeleton className="h-3 w-2/3"/></div>)}</div>
    ) : variant === "form" ? (
      <div className="surface max-w-3xl space-y-5 p-6">{Array.from({length:4}).map((_,i)=><div key={i} className="space-y-2"><Skeleton className="h-3 w-24"/><Skeleton className="h-10 w-full"/></div>)}</div>
    ) : (
      <div className="space-y-4"><div className="grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 dark:border-slate-800 dark:bg-slate-800 sm:grid-cols-3">{Array.from({length:3}).map((_,i)=><div key={i} className="space-y-3 bg-white p-5 dark:bg-[#181b21]"><Skeleton className="h-5 w-5"/><Skeleton className="h-7 w-20"/><Skeleton className="h-3 w-28"/></div>)}</div><div className="surface space-y-4 p-5">{Array.from({length:5}).map((_,i)=><div key={i} className="flex items-center gap-4"><Skeleton className="h-8 w-8"/><Skeleton className="h-4 flex-1"/><Skeleton className="h-3 w-20"/></div>)}</div></div>
    )}
    <span className="sr-only">Loading…</span>
  </div>
);

export const ChatSkeleton = () => (
  <div className="flex h-[70vh] min-h-[480px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" role="status" aria-label="Loading conversation">
    <div className="flex-1 space-y-6 p-6">
      <div className="max-w-[68%] space-y-2"><Skeleton className="h-4 w-24"/><Skeleton className="h-4 w-full"/><Skeleton className="h-4 w-[82%]"/></div>
      <div className="ml-auto max-w-[55%]"><Skeleton className="h-16 w-full"/></div>
      <div className="max-w-[72%] space-y-2"><Skeleton className="h-4 w-full"/><Skeleton className="h-4 w-[90%]"/><Skeleton className="h-4 w-32"/></div>
    </div>
    <div className="flex gap-2 border-t border-slate-200 p-3 dark:border-slate-800"><Skeleton className="h-10 w-10"/><Skeleton className="h-10 flex-1"/><Skeleton className="h-10 w-10"/></div>
    <span className="sr-only">Loading conversation…</span>
  </div>
);
