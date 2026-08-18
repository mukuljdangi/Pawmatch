import TinderCard from 'react-tinder-card'
import { CATEGORIES, SIZES, ENERGY_LEVELS, labelFor } from '../lib/constants'

function formatSlot(iso) {
  return new Date(iso).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function SwipeCard({ pet, matchScore, availableSlots, onSwipe }) {
  const category = CATEGORIES.find(c => c.value === pet.category)

  return (
    <TinderCard
      className="swipe-card"
      key={pet.id}
      onSwipe={(dir) => onSwipe(dir, pet)}
      preventSwipe={['up', 'down']}
    >
      <div className="relative bg-white rounded-3xl shadow-xl overflow-hidden select-none"
           style={{ height: '520px' }}>

        {/* Pet photo */}
        <img
          src={pet.photo_url || 'https://placedog.net/500/520'}
          alt={pet.name}
          className="w-full h-full object-cover"
          draggable={false}
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {/* Match score badge */}
        {typeof matchScore === 'number' && (
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur text-orange-600 text-xs font-bold px-3 py-1 rounded-full shadow">
            {matchScore}% match
          </div>
        )}

        {/* Info */}
        <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
          <div className="flex items-end justify-between mb-1">
            <h2 className="text-3xl font-bold">{pet.name}</h2>
            {pet.age_years && (
              <span className="text-xl font-semibold">{pet.age_years} yrs</span>
            )}
          </div>
          {pet.breed && (
            <p className="text-sm text-gray-300 mb-2">{pet.breed}</p>
          )}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {category && (
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{category.emoji} {category.label}</span>
            )}
            {pet.size && (
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{labelFor(SIZES, pet.size)}</span>
            )}
            {pet.energy_level && (
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{labelFor(ENERGY_LEVELS, pet.energy_level)}</span>
            )}
          </div>
          {pet.bio && (
            <p className="text-sm text-gray-200 line-clamp-2 mb-2">{pet.bio}</p>
          )}
          {availableSlots?.length > 0 && (
            <p className="text-xs text-green-300 font-medium flex items-center gap-1">
              📅 Meet-and-greet: {formatSlot(availableSlots[0])}
              {availableSlots.length > 1 && <span className="text-white/70">· +{availableSlots.length - 1} more time{availableSlots.length > 2 ? 's' : ''}</span>}
            </p>
          )}
        </div>

        {/* Swipe hint badges (shown via CSS during drag — handled by react-tinder-card) */}
        <div className="swipe-nope absolute top-8 left-6 rotate-[-20deg] border-4 border-red-400 text-red-400 text-2xl font-extrabold px-3 py-1 rounded-lg opacity-0 pointer-events-none">
          NOPE
        </div>
        <div className="swipe-like absolute top-8 right-6 rotate-[20deg] border-4 border-green-400 text-green-400 text-2xl font-extrabold px-3 py-1 rounded-lg opacity-0 pointer-events-none">
          LIKE
        </div>
      </div>
    </TinderCard>
  )
}
