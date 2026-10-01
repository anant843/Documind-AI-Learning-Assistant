import React, { useEffect, useState } from 'react'
import { Mail, User, Lock, Award, Flame, Sparkles, Clock, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import authService from '../../services/authService'
import Spinner from '../../Components/common/Spinner'

const ProfilePage = () => {
  const { user, updateUser } = useAuth()

  const [profile, setProfile] = useState({ 
    username: '', 
    email: '', 
    xp: 0, 
    level: 1, 
    streak: { current: 1 }, 
    badges: [],
    totalStudyMinutes: 0,
    questionsAskedCount: 0 
  })
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      setLoadingProfile(true)
      try {
        const response = await authService.getProfile()
        const data = response?.data || response?.user || response || {}
        const nextProfile = {
          username: data.username || user?.username || '',
          email: data.email || user?.email || '',
          xp: data.xp || 0,
          level: data.level || 1,
          streak: data.streak || { current: 1 },
          badges: data.badges || [],
          totalStudyMinutes: data.totalStudyMinutes || 0,
          questionsAskedCount: data.questionsAskedCount || 0
        }
        setProfile(nextProfile)
        updateUser(nextProfile)
      } catch (error) {
        toast.error(error.message || 'Failed to load profile')
      } finally {
        setLoadingProfile(false)
      }
    }

    fetchProfile()
  }, [])

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()

    if (passwords.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters')
      return
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('New password and confirmation do not match')
      return
    }

    setSavingPassword(true)
    try {
      await authService.changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      })
      toast.success('Password updated')
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error) {
      toast.error(error.message || 'Failed to change password')
    } finally {
      setSavingPassword(false)
    }
  }

  const handlePasswordInput = (key, value) => {
    setPasswords((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">Profile</h1>
        <p className="text-sm text-slate-600">Manage your account details and password.</p>
      </div>

      <div className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Account information</h2>
              <p className="text-sm text-slate-600">Your username and email.</p>
            </div>
          </div>

          {loadingProfile ? (
            <div className="flex items-center justify-center py-8">
              <Spinner />
            </div>
          ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-800">Username</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex pl-4 items-center pointer-events-none text-slate-400">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      className="w-full rounded-xl border bg-slate-50 pl-11 pr-4 py-3 text-slate-900 shadow-sm border-slate-200"
                      value={profile.username}
                      readOnly
                      disabled
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-800">Email</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex pl-4 items-center pointer-events-none text-slate-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type="email"
                      className="w-full rounded-xl border bg-slate-50 pl-11 pr-4 py-3 text-slate-900 shadow-sm border-slate-200"
                      value={profile.email}
                      readOnly
                      disabled
                    />
                  </div>
                </div>
              </div>
          )}
        </div>

        {/* Gamification & Achievements Card */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Learning Level & Achievements</h2>
                <p className="text-sm text-slate-600">Your gamified experience points and badges.</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
              Level {profile.level || 1} Scholar
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs text-slate-500 font-medium">Total XP</p>
              <p className="text-xl font-bold text-slate-900 mt-1">{profile.xp || 0}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs text-slate-500 font-medium">Daily Streak</p>
              <p className="text-xl font-bold text-amber-600 mt-1 flex items-center gap-1">
                <Flame className="h-5 w-5" /> {profile.streak?.current || 1}d
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs text-slate-500 font-medium">Study Minutes</p>
              <p className="text-xl font-bold text-slate-900 mt-1 flex items-center gap-1">
                <Clock className="h-4 w-4 text-slate-400" /> {profile.totalStudyMinutes || 0}m
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs text-slate-500 font-medium">Questions Asked</p>
              <p className="text-xl font-bold text-slate-900 mt-1 flex items-center gap-1">
                <MessageSquare className="h-4 w-4 text-slate-400" /> {profile.questionsAskedCount || 0}
              </p>
            </div>
          </div>

          {/* Badges Earned */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-800">Unlocked Badges ({(profile.badges || []).length})</h3>
            <div className="flex flex-wrap gap-2.5">
              {(profile.badges || []).length > 0 ? (
                profile.badges.map((b, i) => (
                  <div key={i} className="flex items-center gap-2 p-2.5 px-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-xl">{b.icon || '🏅'}</span>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{b.name}</p>
                      <p className="text-[10px] text-slate-500">{b.description}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-2 p-2.5 px-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-medium">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  <span>🌱 First Step: Welcome to AI Learning Assistant!</span>
                </div>
              )}
            </div>
          </div>
        </div>


        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-slate-50 text-slate-700">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Change password</h2>
              <p className="text-sm text-slate-600">Use a strong, unique password.</p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handlePasswordSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800">Current password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex pl-4 items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  className="w-full rounded-xl border bg-white pl-11 pr-4 py-3 text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 border-slate-200"
                  value={passwords.currentPassword}
                  onChange={(e) => handlePasswordInput('currentPassword', e.target.value)}
                  autoComplete="current-password"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800">New password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex pl-4 items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  className="w-full rounded-xl border bg-white pl-11 pr-4 py-3 text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 border-slate-200"
                  value={passwords.newPassword}
                  onChange={(e) => handlePasswordInput('newPassword', e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800">Confirm new password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex pl-4 items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  className="w-full rounded-xl border bg-white pl-11 pr-4 py-3 text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 border-slate-200"
                  value={passwords.confirmPassword}
                  onChange={(e) => handlePasswordInput('confirmPassword', e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingPassword}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {savingPassword ? 'Updating...' : 'Update password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage