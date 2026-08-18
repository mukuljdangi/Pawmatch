import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

function fmt(dt) {
  return new Date(dt).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function MeetingScheduler({ petId }) {
  const { user } = useAuth()
  const [open, setOpen]       = useState(false)
  const [slots, setSlots]     = useState([])
  const [booked, setBooked]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [booking, setBooking] = useState(null)
  const [error, setError]     = useState('')

  useEffect(() => { if (open) loadSlots() }, [open])

  async function loadSlots() {
    setLoading(true)
    const { data } = await supabase
      .from('meeting_slots')
      .select('*')
      .eq('pet_id', petId)
      .gt('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })

    setBooked((data ?? []).find(s => s.status === 'booked' && s.adopter_id === user.id) ?? null)
    setSlots((data ?? []).filter(s => s.status === 'open'))
    setLoading(false)
  }

  async function book(slotId) {
    setBooking(slotId)
    setError('')
    const { error } = await supabase.rpc('book_meeting_slot', { p_slot_id: slotId })
    setBooking(null)
    if (error) setError(error.message)
    loadSlots()
  }

  async function cancel() {
    if (!booked || !confirm('Cancel this meeting?')) return
    await supabase.rpc('cancel_meeting_slot', { p_slot_id: booked.id })
    loadSlots()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs bg-orange-50 hover:bg-orange-100 text-orange-600 px-3 py-1.5 rounded-lg font-medium transition-colors"
      >
        📅 Schedule a meet
      </button>
    )
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 w-full">
      {loading ? (
        <p className="text-sm text-gray-400">Loading times…</p>
      ) : booked ? (
        <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-700 flex items-center justify-between gap-2">
          <span>Meeting booked for {fmt(booked.start_time)}</span>
          <button onClick={cancel} className="text-xs text-red-500 hover:underline flex-shrink-0">Cancel</button>
        </div>
      ) : (
        <>
          {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
          {slots.length === 0 ? (
            <p className="text-sm text-gray-400">No open meeting times yet — check back soon.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {slots.map(slot => (
                <button
                  key={slot.id}
                  onClick={() => book(slot.id)}
                  disabled={booking === slot.id}
                  className="w-full text-left text-sm border border-gray-200 rounded-lg px-3 py-2 hover:border-orange-300 hover:bg-orange-50 transition-colors disabled:opacity-50"
                >
                  {booking === slot.id ? 'Booking…' : fmt(slot.start_time)}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
