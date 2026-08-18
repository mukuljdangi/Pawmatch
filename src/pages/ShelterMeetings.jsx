import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'

const NAV_LINKS = [
  { to: '/shelter', label: 'Listings' },
  { to: '/shelter/meetings', label: '📅 Meeting times' },
  { to: '/matches', label: '❤️ Interested adopters' },
]

function pad(n) { return String(n).padStart(2, '0') }

function localDateStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
function localTimeStr(d) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Default the picker to the next half-hour so "today" doesn't default to an already-past slot
function defaultStart() {
  const d = new Date()
  d.setMinutes(d.getMinutes() < 30 ? 30 : 0, 0, 0)
  if (d.getMinutes() === 0) d.setHours(d.getHours() + 1)
  return d
}

function todayStr() {
  return localDateStr(new Date())
}

export default function ShelterMeetings() {
  const { user } = useAuth()
  const location = useLocation()

  const [pets, setPets]   = useState([])
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [petId, setPetId]     = useState(location.state?.petId ?? '')

  const [form, setForm] = useState(() => {
    const start = defaultStart()
    const end = new Date(start.getTime() + 30 * 60000)
    return {
      date: localDateStr(start),
      start_time: localTimeStr(start),
      end_time: localTimeStr(end),
    }
  })

  useEffect(() => { loadPets(); loadSlots() }, [])

  async function loadPets() {
    const { data } = await supabase
      .from('pets')
      .select('id, name, photo_url, category, breed')
      .eq('shelter_id', user.id)
      .order('name')
    setPets(data ?? [])
    if (!petId && data?.length) setPetId(data[0].id)
  }

  async function loadSlots() {
    setLoading(true)
    const { data } = await supabase
      .from('meeting_slots')
      .select('*, adopter:profiles!meeting_slots_adopter_id_fkey(name, email)')
      .eq('shelter_id', user.id)
      .order('start_time', { ascending: true })
    setSlots(data ?? [])
    setLoading(false)
  }

  function handle(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function addSlot(e) {
    e.preventDefault()
    setError('')

    if (!petId) { setError('Add a pet before scheduling meeting times.'); return }
    const start = new Date(`${form.date}T${form.start_time}`)
    const end   = new Date(`${form.date}T${form.end_time}`)
    if (end <= start) { setError('End time must be after start time.'); return }
    if (start <= new Date()) { setError('Start time must be in the future.'); return }

    setSaving(true)
    const { error } = await supabase.from('meeting_slots').insert({
      shelter_id: user.id,
      pet_id: petId,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
    })
    setSaving(false)
    if (error) { setError(error.message); return }
    loadSlots()
  }

  async function removeSlot(slot) {
    if (slot.status === 'booked') {
      if (!confirm('This slot is booked. Cancel the meeting?')) return
      const { error } = await supabase.rpc('cancel_meeting_slot', { p_slot_id: slot.id })
      if (error) { setError(error.message); return }
    } else {
      await supabase.from('meeting_slots').delete().eq('id', slot.id)
    }
    loadSlots()
  }

  const selectedPet = pets.find(p => p.id === petId)
  const upcoming = slots.filter(s =>
    s.pet_id === petId && new Date(s.end_time) >= new Date() && s.status !== 'cancelled'
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar accent="shelter" links={NAV_LINKS} />

      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">Meeting Times</h1>

        {pets.length === 0 ? (
          <p className="text-sm text-slate-400">Add a pet on the Listings page first.</p>
        ) : (
          <>
            {/* Pet picker */}
            <div className="bg-white rounded-2xl shadow p-4 mb-6 border border-slate-100 flex items-center gap-4">
              <img
                src={selectedPet?.photo_url || 'https://placedog.net/60/60'}
                alt={selectedPet?.name}
                className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
              />
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">Assigning dates for</label>
                <select value={petId} onChange={e => setPetId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  {pets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>

            <form onSubmit={addSlot} className="bg-white rounded-2xl shadow p-6 mb-8 space-y-4 border border-slate-100">
              <h2 className="font-semibold text-slate-700">Add a meet-and-greet slot for {selectedPet?.name}</h2>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-2">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input type="date" name="date" value={form.date} min={todayStr()} onChange={handle} required
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start</label>
                  <input type="time" name="start_time" value={form.start_time} onChange={handle} required
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End</label>
                  <input type="time" name="end_time" value={form.end_time} onChange={handle} required
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
              </div>

              <button type="submit" disabled={saving}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50">
                {saving ? 'Adding…' : `+ Add date for ${selectedPet?.name ?? 'this pet'}`}
              </button>
            </form>

            <h2 className="font-semibold text-slate-700 mb-3">Upcoming dates for {selectedPet?.name}</h2>
            {loading ? (
              <p className="text-slate-400 text-center py-10">Loading…</p>
            ) : upcoming.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <p className="text-4xl mb-3">📅</p>
                <p>No upcoming meeting times for {selectedPet?.name} yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.map(slot => (
                  <div key={slot.id} className="bg-white rounded-2xl shadow p-4 flex items-center gap-4 border border-slate-100">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800">
                        {new Date(slot.start_time).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        {' – '}
                        {new Date(slot.end_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </p>
                      {slot.status === 'booked' && slot.adopter && (
                        <p className="text-sm text-indigo-600 mt-0.5">
                          Booked by {slot.adopter.name} · <a href={`mailto:${slot.adopter.email}`} className="hover:underline">{slot.adopter.email}</a>
                        </p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                      slot.status === 'booked' ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {slot.status}
                    </span>
                    <button onClick={() => removeSlot(slot)}
                      className="text-xs bg-red-50 hover:bg-red-100 text-red-500 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0">
                      {slot.status === 'booked' ? 'Cancel' : 'Remove'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
