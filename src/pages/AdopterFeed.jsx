import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import SwipeCard from '../components/SwipeCard'
import Navbar from '../components/Navbar'
import { matchesSpecies, scoreMatch } from '../lib/matching'

const NAV_LINKS = [
  { to: '/matches', label: '❤️ Matches' },
  { to: '/onboarding', label: '⚙️ Preferences' },
]

export default function AdopterFeed() {
  const { user, preferences } = useAuth()
  const [pets, setPets]             = useState([])
  const [slotsByPet, setSlotsByPet] = useState({})
  const [loading, setLoading]       = useState(true)
  const [matchAlert, setMatchAlert] = useState(null) // pet name when match occurs

  useEffect(() => {
    loadPets()
  }, [])

  async function loadPets() {
    setLoading(true)

    // Get IDs of pets this user already swiped on
    const { data: swiped } = await supabase
      .from('swipes')
      .select('pet_id')
      .eq('adopter_id', user.id)

    const swipedIds = swiped?.map(s => s.pet_id) ?? []

    // Fetch available pets not yet swiped
    let query = supabase
      .from('pets')
      .select('*')
      .eq('status', 'available')
      .order('created_at', { ascending: false })

    if (swipedIds.length > 0) {
      query = query.not('id', 'in', `(${swipedIds.join(',')})`)
    }

    const { data } = await query

    // Hard-filter by species preference, then rank the rest by best fit
    const filtered = (data ?? []).filter(pet => matchesSpecies(pet, preferences))
    const ranked = filtered
      .map(pet => ({ pet, score: scoreMatch(pet, preferences) }))
      .sort((a, b) => b.score - a.score)

    setPets(ranked)
    await loadOpenSlots(filtered.map(pet => pet.id))
    setLoading(false)
  }

  async function loadOpenSlots(petIds) {
    if (petIds.length === 0) { setSlotsByPet({}); return }

    const { data } = await supabase
      .from('meeting_slots')
      .select('pet_id, start_time')
      .in('pet_id', petIds)
      .eq('status', 'open')
      .gt('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })

    const grouped = {}
    for (const slot of data ?? []) {
      (grouped[slot.pet_id] ??= []).push(slot.start_time)
    }
    setSlotsByPet(grouped)
  }

  async function handleSwipe(direction, pet) {
    // Record the swipe (the DB trigger auto-creates a match on right swipe)
    await supabase.from('swipes').insert({
      adopter_id: user.id,
      pet_id: pet.id,
      direction,
    })

    if (direction === 'right') {
      setMatchAlert(pet.name)
      setTimeout(() => setMatchAlert(null), 3000)
    }

    // Remove from local stack
    setPets(prev => prev.filter(p => p.pet.id !== pet.id))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-lg">Loading pets…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar accent="adopter" links={NAV_LINKS} />

      {/* Match alert */}
      {matchAlert && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-3 rounded-full shadow-lg font-semibold animate-bounce">
          It's a match with {matchAlert}! ❤️
        </div>
      )}

      {/* Swipe area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        {pets.length === 0 ? (
          <div className="text-center">
            <p className="text-5xl mb-4">🐾</p>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">You've seen all the pets!</h2>
            <p className="text-gray-400 mb-6">Check back later for new arrivals.</p>
            <Link to="/matches" className="bg-orange-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-orange-600 transition-colors">
              View your matches
            </Link>
          </div>
        ) : (
          <>
            <div className="relative w-full max-w-sm" style={{ height: '520px' }}>
              {/* Render last 3 cards (stack effect) */}
              {pets.slice(0, 3).reverse().map(({ pet, score }, i, arr) => (
                <div
                  key={pet.id}
                  style={{
                    position: 'absolute',
                    width: '100%',
                    transform: `scale(${1 - (arr.length - 1 - i) * 0.04}) translateY(${(arr.length - 1 - i) * 10}px)`,
                    zIndex: i,
                  }}
                >
                  {i === arr.length - 1 ? (
                    <SwipeCard pet={pet} matchScore={score} availableSlots={slotsByPet[pet.id]} onSwipe={handleSwipe} />
                  ) : (
                    // Background cards (not interactive)
                    <div className="bg-white rounded-3xl shadow-md overflow-hidden" style={{ height: '520px' }}>
                      <img
                        src={pet.photo_url || 'https://placedog.net/500/520'}
                        alt={pet.name}
                        className="w-full h-full object-cover opacity-60"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex gap-6 mt-8">
              <button
                onClick={() => handleSwipe('left', pets[0].pet)}
                className="w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center text-2xl hover:scale-110 transition-transform border border-gray-100"
                title="Pass"
              >
                ✕
              </button>
              <button
                onClick={() => handleSwipe('right', pets[0].pet)}
                className="w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center text-2xl hover:scale-110 transition-transform border border-gray-100"
                title="Like"
              >
                ❤️
              </button>
            </div>

            <p className="text-sm text-gray-400 mt-4">
              {pets.length} pet{pets.length !== 1 ? 's' : ''} remaining
            </p>
          </>
        )}
      </div>
    </div>
  )
}
