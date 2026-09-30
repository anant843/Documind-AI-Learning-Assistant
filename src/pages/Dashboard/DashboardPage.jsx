import React, { useState, useEffect } from 'react'
import Spinner from '../../Components/common/Spinner'
import progressService from '../../services/progressService'
import toast from 'react-hot-toast'
import {
  FileText,
  BookOpen,
  TrendingUp,
  Clock,
  FileBadge2,
  ClipboardCheck,
  Flame,
  AlertTriangle,
  Award,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Sparkles,
  Zap
} from 'lucide-react'
import { Link } from 'react-router-dom'

const DashboardPage = () => {
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchDashboardData = async () => {
    try {
      const data = await progressService.getDashboard()
      setDashboardData(data?.data || data)
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      toast.error(error.message || "Failed to load dashboard data")
    }
  }

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await fetchDashboardData()
      setLoading(false)
    }
    init()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!dashboardData || !dashboardData.overview) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <p className="text-slate-500 dark:text-slate-400">No dashboard data available.</p>
      </div>
    )
  }

  const { overview, weakTopics = [], topicAccuracy = [], quizPerformanceTrend = [] } = dashboardData

  const stats = [
    { 
      label: "Total Documents", 
      value: overview.totalDocuments, 
      icon: FileText, 
      gradient: "from-blue-600 to-indigo-600",
      accentBorder: "border-t-blue-500",
      accentBg: "bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400",
      glow: "group-hover:border-blue-500/40"
    },
    { 
      label: "Flashcards Reviewed", 
      value: `${overview.totalFlashcardsReviewed}/${overview.totalFlashcards || 0}`, 
      icon: BookOpen, 
      gradient: "from-emerald-500 to-teal-600",
      accentBorder: "border-t-emerald-500",
      accentBg: "bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
      glow: "group-hover:border-emerald-500/40"
    },
    { 
      label: "Quizzes Completed", 
      value: overview.completedQuizzes, 
      icon: TrendingUp, 
      gradient: "from-amber-500 to-orange-600",
      accentBorder: "border-t-amber-500",
      accentBg: "bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400",
      glow: "group-hover:border-amber-500/40"
    },
    { 
      label: "Average Score", 
      value: `${overview.averageScore}%`, 
      icon: Award, 
      gradient: "from-purple-600 to-pink-600",
      accentBorder: "border-t-purple-500",
      accentBg: "bg-purple-500/10 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400",
      glow: "group-hover:border-purple-500/40"
    },
  ]

  const activities = [
    ...(dashboardData.recentActivities?.documents || []).map((doc) => ({
      id: doc._id,
      type: 'document',
      title: doc.title,
      timestamp: doc.lastAccessed,
      link: `/documents/${doc._id}`,
    })),
    ...(dashboardData.recentActivities?.quizzes || []).map((quiz) => ({
      id: quiz._id,
      type: 'quiz',
      title: quiz.title,
      timestamp: quiz.completedAt || quiz.createdAt,
      link: `/quizzes/${quiz._id}/results`,
    })),
  ]
    .filter((item) => item.timestamp)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 5)

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-6">
      {/* Header & Learning Streak / Gamification Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider mb-1">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Learning Assistant</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Learning Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
            Track your retention, master weak topics, and stay on streak.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Level & XP Widget */}
          <div className="inline-flex items-center gap-3.5 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 text-slate-900 dark:text-white shadow-xs backdrop-blur-sm">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-extrabold text-sm shadow-sm shadow-indigo-500/20">
              L{overview.level || 1}
            </div>
            <div>
              <div className="flex items-center justify-between gap-3 text-xs font-bold">
                <span className="text-slate-800 dark:text-slate-200">Level {overview.level || 1} Scholar</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-mono text-[11px]">{overview.xp || 0} / {overview.nextLevelThreshold || 100} XP</span>
              </div>
              <div className="w-32 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mt-1.5">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round(((overview.xp || 0) % 250) / 2.5))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Real Learning Streak Widget */}
          <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white shadow-md shadow-orange-500/20 ring-1 ring-white/20">
            <div className="h-9 w-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Flame className="h-5 w-5 text-white animate-bounce" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider font-bold text-orange-100">Daily Streak</div>
              <div className="text-base font-black tracking-tight">{overview.studyStreak} Day Streak 🔥</div>
            </div>
          </div>
        </div>
      </div>

      {/* Gamification Badges & Quick Stats Strip */}
      <div className="rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 p-5 shadow-xs backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Achievement Badges Earned</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">Milestones unlocked through continuous learning</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(overview.badges || []).length > 0 ? (
            overview.badges.map((b, idx) => (
              <div
                key={idx}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-xs"
                title={b.description}
              >
                <span>{b.icon || '🏅'}</span>
                <span>{b.name}</span>
              </div>
            ))
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/70 dark:border-indigo-800/40 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
              <span>🌱</span>
              <span>First Step: Welcome Learner!</span>
            </div>
          )}

          {/* Quick study metrics pills */}
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
            <Clock className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
            <span>{overview.totalStudyMinutes || 0}m studied</span>
          </div>

          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-xs font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/40">
            <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>{overview.masteryPercentage || 0}% SRS Mastery</span>
          </div>
        </div>
      </div>

      {/* Weak Topic Detection Alert / Intelligent AI Recommendation */}
      {weakTopics.length > 0 && (
        <div className="rounded-2xl sm:rounded-3xl border border-indigo-200/70 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/70 via-slate-50 to-amber-50/40 dark:from-slate-900 dark:via-indigo-950/30 dark:to-slate-900 p-6 shadow-xs">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-indigo-600 text-white shrink-0 shadow-md shadow-indigo-600/20">
              <Zap className="h-6 w-6" />
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    AI Diagnostic Insights & Targeted Revision
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Our cognitive engine evaluated your recent assessments. Focus on these concepts to maximize your mastery:
                  </p>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                  Adaptive Focus
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {weakTopics.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-2 hover:border-indigo-300 dark:hover:border-indigo-700 transition duration-200">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white truncate">{item.topic}</span>
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/60 px-2 py-0.5 rounded-lg shrink-0">
                        {item.avgScore}% Avg
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">{item.recommendation}</p>
                    {item.documentId && item.documentId !== 'unknown' && (
                      <Link
                        to={`/documents/${item.documentId}`}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 pt-1 transition"
                      >
                        <span>Open Document Notes</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Core Stats Grid with Distinct Accent Identities */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat) => (
          <div 
            key={stat.label} 
            className={`group relative overflow-hidden p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 ${stat.glow}`}
          >
            {/* Top Accent Indicator */}
            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${stat.gradient}`} />

            <div className="flex items-center gap-4">
              <div className={`p-3.5 rounded-2xl bg-gradient-to-br ${stat.gradient} text-white shadow-md shrink-0`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">{stat.label}</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1 tracking-tight">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Analytics Charts & Topic-wise Accuracy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Topic-wise Accuracy Breakdown */}
        <div className="rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <BarChart3 className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Topic-wise Accuracy Breakdown</h3>
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{topicAccuracy.length} Topics Evaluated</span>
          </div>

          {topicAccuracy.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-8 text-center">Complete quizzes to generate topic accuracy breakdown.</p>
          ) : (
            <div className="space-y-4">
              {topicAccuracy.map((t, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[250px]">{t.topic}</span>
                    <span className={`font-extrabold ${t.avgScore >= 80 ? 'text-emerald-600 dark:text-emerald-400' : t.avgScore >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {t.avgScore}% <span className="font-normal text-slate-500 dark:text-slate-400">({t.quizzesCount} {t.quizzesCount === 1 ? 'quiz' : 'quizzes'})</span>
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        t.avgScore >= 80
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                          : t.avgScore >= 60
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                          : 'bg-gradient-to-r from-rose-500 to-red-500'
                      }`}
                      style={{ width: `${Math.max(5, t.avgScore)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quiz Performance Trend */}
        <div className="rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                <TrendingUp className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Quiz Score Performance Trend</h3>
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Recent Assessments</span>
          </div>

          {quizPerformanceTrend.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-8 text-center">Take quizzes to visualize your score progression.</p>
          ) : (
            <div className="h-44 flex items-end gap-3 pt-6 px-2">
              {quizPerformanceTrend.map((q, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                  {/* Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 transition absolute -top-9 bg-slate-900 text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg whitespace-nowrap z-10 pointer-events-none shadow-lg border border-slate-700">
                    {q.title}: {q.score}%
                  </div>
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{q.score}%</div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-xl h-28 flex items-end overflow-hidden">
                    <div
                      className={`w-full transition-all rounded-t-xl ${
                        q.score >= 80 
                          ? 'bg-gradient-to-t from-emerald-600 to-teal-400' 
                          : q.score >= 60 
                          ? 'bg-gradient-to-t from-amber-600 to-orange-400' 
                          : 'bg-gradient-to-t from-rose-600 to-red-400'
                      }`}
                      style={{ height: `${Math.max(10, q.score)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[50px]">{q.date}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 shadow-xs overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-white text-base">Recent Activities</h3>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Latest updates</span>
        </div>

        {activities.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
            No recent activity yet. Upload documents or take quizzes to see your updates here.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {activities.map((activity) => {
              const isDoc = activity.type === 'document'
              return (
                <li key={activity.id} className="px-6 py-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition duration-150">
                  <div className="flex items-center gap-3.5">
                    <div className={`p-2.5 rounded-2xl shrink-0 ${isDoc ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400' : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'}`}>
                      {isDoc ? <FileBadge2 className="h-5 w-5" /> : <ClipboardCheck className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        to={activity.link}
                        className="text-sm font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 truncate block transition"
                      >
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-2">
                          {isDoc ? 'Document' : 'Quiz'}
                        </span>
                        {activity.title}
                      </Link>
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

export default DashboardPage