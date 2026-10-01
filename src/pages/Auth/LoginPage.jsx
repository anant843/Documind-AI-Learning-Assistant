import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import authService from "../../services/authService";
import Logo from "../../Components/common/Logo";
import Button from "../../Components/common/Button";

const LoginPage = () => {
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [error,setError]=useState(""); const [loading,setLoading]=useState(false);
  const navigate=useNavigate(); const { login }=useAuth();
  const submit=async(e)=>{e.preventDefault();setLoading(true);setError("");try{const {token,user}=await authService.login(email,password);login(user,token);toast.success("Signed in");navigate("/dashboard");}catch(err){setError(err.message||"Check your email and password.");}finally{setLoading(false);}};
  return <main className="grid min-h-[100dvh] bg-[#f5f7fa] lg:grid-cols-[minmax(320px,0.85fr)_1.15fr]">
    <section className="hidden border-r border-slate-200 bg-slate-950 p-12 text-white lg:flex lg:flex-col">
      <Logo showSubtitle={false} className="[&_div]:!text-white" />
      <div className="my-auto max-w-md">
        <p className="text-4xl font-bold leading-[1.12] tracking-[-0.035em]">Your reading becomes a working study system.</p>
        <p className="mt-5 max-w-sm text-base leading-7 text-slate-400">Keep PDFs, grounded answers, flashcards, and quizzes connected to the source material.</p>
      </div>
      <p className="text-xs text-slate-500">Answers stay tied to your uploaded documents.</p>
    </section>
    <section className="flex items-center justify-center p-5 sm:p-10">
      <div className="w-full max-w-md">
        <div className="mb-10 lg:hidden"><Logo /></div>
        <h1 className="text-3xl font-bold tracking-[-0.03em] text-slate-950">Welcome back</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Sign in to continue with your documents and study sessions.</p>
        <form onSubmit={submit} className="mt-8 space-y-5">
          <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-800">Email</span><div className="relative"><Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-400"/><input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-slate-950 shadow-sm placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"/></div></label>
          <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-800">Password</span><div className="relative"><Lock className="absolute left-3 top-3.5 h-4 w-4 text-slate-400"/><input required type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Your password" className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-slate-950 shadow-sm placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"/></div></label>
          {error&&<div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">{error}</div>}
          <Button type="submit" disabled={loading} className="w-full">{loading?"Signing in…":"Sign in"}</Button>
        </form>
        <p className="mt-6 text-sm text-slate-600">New to DocuMind? <Link to="/register" className="font-semibold text-blue-700 underline-offset-4 hover:underline">Create an account</Link></p>
      </div>
    </section>
  </main>;
};
export default LoginPage;
