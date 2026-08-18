import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const THEMES = {
  adopter: {
    bar:    'bg-white/90 backdrop-blur border-b border-orange-100',
    brand:  'text-orange-500',
    link:        'text-gray-500 hover:text-orange-500',
    linkActive:  'text-orange-600 font-semibold',
  },
  shelter: {
    bar:    'bg-slate-900 border-b border-slate-800',
    brand:  'text-white',
    link:        'text-slate-400 hover:text-white',
    linkActive:  'text-white font-semibold',
  },
}

export default function Navbar({ accent = 'adopter', links = [] }) {
  const { profile, signOut } = useAuth()
  const { pathname } = useLocation()
  const theme = THEMES[accent]
  const isShelter = accent === 'shelter'

  return (
    <nav className={`${theme.bar} px-4 sm:px-6 py-4 flex flex-wrap gap-3 justify-between items-center sticky top-0 z-40`}>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className={`text-xl font-bold ${theme.brand}`}>
          PawMatch 🐾{isShelter && <span className="text-slate-500 font-medium text-sm ml-1">for Shelters</span>}
        </span>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {links.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm transition-colors ${pathname === link.to ? theme.linkActive : theme.link}`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span className={`text-sm hidden sm:inline ${isShelter ? 'text-slate-400' : 'text-gray-500'}`}>
          {profile?.name}
        </span>
        <button
          onClick={signOut}
          className={`text-sm transition-colors ${isShelter ? 'text-slate-400 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}
