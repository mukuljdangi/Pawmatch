import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { CATEGORIES, SIZES, ENERGY_LEVELS, EXPERIENCE_LEVELS, HOME_TYPES } from '../lib/constants'

const EMPTY = {
  species: [], size: [], energy_level: 'any', experience_level: 'some_experience',
  home_type: 'apartment', has_kids: false, has_other_pets: false,
}

function Chip({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-4 py-2 rounded-full border-2 text-sm font-medium transition-all ${
        active ? 'border-orange-400 bg-orange-50 text-orange-600' : 'border-gray-200 text-gray-500 hover:border-gray-300'
      }`}>
      {children}
    </button>
  )
}

export default function Onboarding() {
  const { user, refreshPreferences, preferences: existing } = useAuth()
  const navigate = useNavigate()
  const [form, setForm]       = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    if (existing) {
      setForm({
        species: existing.species ?? [],
        size: existing.size ?? [],
        energy_level: existing.energy_level ?? 'any',
        experience_level: existing.experience_level ?? 'some_experience',
        home_type: existing.home_type ?? 'apartment',
        has_kids: existing.has_kids ?? false,
        has_other_pets: existing.has_other_pets ?? false,
      })
    }
    setLoading(false)
  }, [existing])

  function toggleIn(field, value) {
    setForm(f => ({
      ...f,
      [field]: f[field].includes(value) ? f[field].filter(v => v !== value) : [...f[field], value],
    }))
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)

    const { error } = await supabase.from('adopter_preferences').upsert({
      adopter_id: user.id,
      ...form,
      updated_at: new Date().toISOString(),
    })

    setSaving(false)
    if (error) { setError(error.message); return }
    await refreshPreferences()
    navigate('/feed')
  }

  if (loading) return null

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-xl">
        <h1 className="text-3xl font-bold text-orange-500 mb-1">Let's find your match 🐾</h1>
        <p className="text-gray-500 mb-6">A few quick questions so we can show you pets that actually fit your life.</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-2 mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">What kind of pet are you open to?</label>
            <p className="text-xs text-gray-400 mb-2">Leave blank to see every species.</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <Chip key={c.value} active={form.species.includes(c.value)} onClick={() => toggleIn('species', c.value)}>
                  {c.emoji} {c.label}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Preferred size</label>
            <p className="text-xs text-gray-400 mb-2">Leave blank for any size.</p>
            <div className="flex flex-wrap gap-2">
              {SIZES.map(s => (
                <Chip key={s.value} active={form.size.includes(s.value)} onClick={() => toggleIn('size', s.value)}>
                  {s.label}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Activity level you're looking for</label>
            <div className="flex flex-wrap gap-2">
              <Chip active={form.energy_level === 'any'} onClick={() => setForm(f => ({ ...f, energy_level: 'any' }))}>Any</Chip>
              {ENERGY_LEVELS.map(e => (
                <Chip key={e.value} active={form.energy_level === e.value} onClick={() => setForm(f => ({ ...f, energy_level: e.value }))}>
                  {e.label}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Your experience with pets</label>
            <div className="flex flex-wrap gap-2">
              {EXPERIENCE_LEVELS.map(x => (
                <Chip key={x.value} active={form.experience_level === x.value} onClick={() => setForm(f => ({ ...f, experience_level: x.value }))}>
                  {x.label}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Where do you live?</label>
            <div className="flex flex-wrap gap-2">
              {HOME_TYPES.map(h => (
                <Chip key={h.value} active={form.home_type === h.value} onClick={() => setForm(f => ({ ...f, home_type: h.value }))}>
                  {h.label}
                </Chip>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Kids at home?</label>
              <div className="flex gap-2">
                <Chip active={form.has_kids === true} onClick={() => setForm(f => ({ ...f, has_kids: true }))}>Yes</Chip>
                <Chip active={form.has_kids === false} onClick={() => setForm(f => ({ ...f, has_kids: false }))}>No</Chip>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Other pets at home?</label>
              <div className="flex gap-2">
                <Chip active={form.has_other_pets === true} onClick={() => setForm(f => ({ ...f, has_other_pets: true }))}>Yes</Chip>
                <Chip active={form.has_other_pets === false} onClick={() => setForm(f => ({ ...f, has_other_pets: false }))}>No</Chip>
              </div>
            </div>
          </div>

          <button type="submit" disabled={saving}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : 'Show me my matches'}
          </button>
        </form>

        {existing && (
          <p className="text-center text-sm text-gray-400 mt-5">
            <Link to="/feed" className="text-orange-500 font-medium hover:underline">← Back to feed</Link>
          </p>
        )}
      </div>
    </div>
  )
}
