import React from 'react'

export const LogoIcon = ({ className = 'h-9 w-9' }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      className={className}
      fill="none"
    >
      <defs>
        {/* Document Outline Gradient (Cyan at bottom to Purple/Indigo at top) */}
        <linearGradient id="docGradient" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#00D2FF" />
          <stop offset="45%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#818CF8" />
        </linearGradient>

        {/* Right Sparkle Gradient */}
        <linearGradient id="starGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#00D2FF" />
        </linearGradient>

        {/* Node Gradient */}
        <linearGradient id="nodeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>

        {/* Soft Glow Effect */}
        <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#00D2FF" floodOpacity="0.3" />
        </filter>
      </defs>

      <g filter="url(#logoGlow)">
        {/* Document Outline with Folded Top-Right Corner */}
        <path
          d="M26 12 H62 L78 28 V86 C78 87.1 77.1 88 76 88 H26 C24.9 88 24 87.1 24 86 V14 C24 12.9 24.9 12 26 12 Z"
          fill="none"
          stroke="url(#docGradient)"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Folded Corner Flap */}
        <path
          d="M62 12 V28 H78"
          fill="none"
          stroke="url(#docGradient)"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Connecting Lines */}
        <line x1="42" y1="53" x2="58" y2="44" stroke="#00D2FF" strokeWidth="2.8" strokeLinecap="round" />
        <line x1="42" y1="53" x2="54" y2="67" stroke="#00D2FF" strokeWidth="2.8" strokeLinecap="round" />

        {/* Central Cyan Node */}
        <circle cx="42" cy="53" r="5" fill="#00D2FF" />
        
        {/* Top-Right Purple Node */}
        <circle cx="58" cy="44" r="4" fill="url(#nodeGradient)" />
        
        {/* Bottom-Right Purple Node */}
        <circle cx="54" cy="67" r="4" fill="url(#nodeGradient)" />

        {/* 4-Pointed Sparkle Star on Right Edge */}
        <path
          d="M78 48 Q84 48 84 42 Q84 48 90 48 Q84 48 84 54 Q84 48 78 48 Z"
          fill="url(#starGradient)"
        />
      </g>
    </svg>
  )
}

const Logo = ({ className = 'h-10 w-auto', showSubtitle = true, iconOnly = false }) => {
  if (iconOnly) {
    return <LogoIcon className={className} />
  }

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoIcon className="h-10 w-10 shrink-0" />
      <div className="flex flex-col leading-tight select-none">
        <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Docu<span className="text-indigo-600 dark:text-indigo-400">Mind</span>
        </span>
        {showSubtitle && (
          <span className="text-[9.5px] font-semibold text-slate-500 dark:text-slate-400 tracking-[0.14em] uppercase">
            AI Study Assistant
          </span>
        )}
      </div>
    </div>
  )
}

export default Logo
