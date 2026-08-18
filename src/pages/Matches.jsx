import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import MeetingScheduler from '../components/MeetingScheduler'

const SHELTER_LINKS  = [
  { to: '/shelter', label: 'Listings' },
  { to: '/shelter/meetings', label: '📅 Meeting times' },
  { to: '/matches', label: '❤️ Interested adopters' },
]
const ADOPTER_LINKS = [
  { to: '/matches', label: '❤️ Matches' },
  { to: '/onboarding', label: '⚙️ Preferences' },
]

function fmt(dt) {
  return new Date(dt).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function Matches() {
  const { user, profile } = useAuth()
  const [matches, setMatches]           = useState([])
  const [bookedByMatch, setBookedByMatch] = useState({}) // shelter view: `${pet_id}_${adopter_id}` -> slot
  const [loading, setLoading]           = useState(true)

  const isShelter = profile?.role === 'shelter'

  useEffect(() => { loadMatches() }, [])

  async function loadMatches() {
    setLoading(true)

    const { data } = await supabase
      .from('matches')
      .select(`
        *,
        pet:pets(*),
        adopter:profiles!matches_adopter_id_fkey(name, email),
        shelter:profiles!matches_shelter_id_fkey(name)
      `)
      .eq(isShelter ? 'shelter_id' : 'adopter_id', user.id)
      .order('created_at', { ascending: false })

    setMatches(data ?? [])

    if (isShelter && data?.length) {
      const { data: slots } = await supabase
        .from('meeting_slots')
        .select('*')
        .eq('shelter_id', user.id)
        .eq('status', 'booked')

      const lookup = {}
      for (const slot of slots ?? []) {
        lookup[`${slot.pet_id}_${slot.adopter_id}`] = slot
      }
      setBookedByMatch(lookup)
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar accent={isShelter ? 'shelter' : 'adopter'} links={isShelter ? SHELTER_LINKS : ADOPTER_LINKS} />

      <div className="max-w-xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">
          {isShelter ? '❤️ Interested Adopters' : '❤️ Your Matches'}
        </h1>

        {loading ? (
          <p className="text-slate-400 text-center py-16">Loading…</p>
        ) : matches.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-4xl mb-3">💔</p>
            <p className="font-medium text-slate-600 mb-1">No matches yet</p>
            <p className="text-sm">
              {isShelter
                ? 'Adopters who like your pets will appear here.'
                : 'Keep swiping — your perfect match is out there!'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map(match => {
              const bookedSlot = isShelter ? bookedByMatch[`${match.pet_id}_${match.adopter_id}`] : null
              return (
                <div key={match.id} className="bg-white rounded-2xl shadow p-4 border border-slate-100">
                  <div className="flex gap-4 items-center">
                    <img
                      src={match.pet?.photo_url || 'https://placedog.net/80/80'}
                      alt={match.pet?.name}
                      className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-800">{match.pet?.name}</h3>
                      <p className="text-sm text-slate-500">
                        {[match.pet?.breed, match.pet?.age_years && `${match.pet.age_years} yrs`]
                          .filter(Boolean).join(' · ')}
                      </p>

                      {isShelter ? (
                        <div className="mt-1">
                          <p className="text-sm text-indigo-600 font-medium">{match.adopter?.name}</p>
                          <a
                            href={`mailto:${match.adopter?.email}`}
                            className="text-xs text-blue-500 hover:underline"
                          >
                            {match.adopter?.email}
                          </a>
                        </div>
                      ) : (
                        <p className="text-sm text-orange-600 font-medium mt-1">
                          {match.shelter?.name}
                        </p>
                      )}

                      <p className="text-xs text-slate-400 mt-1">
                        Matched {new Date(match.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="text-2xl flex-shrink-0">❤️</span>
                  </div>

                  {!isShelter && match.pet && (
                    <MeetingScheduler petId={match.pet.id} />
                  )}

                  {isShelter && bookedSlot && (
                    <div className="mt-3 pt-3 border-t border-slate-100 bg-indigo-50 -mx-4 -mb-4 px-4 pb-4 rounded-b-2xl">
                      <p className="text-sm text-indigo-700 font-medium">📅 Meeting booked: {fmt(bookedSlot.start_time)}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
