import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import { CATEGORIES, SIZES, ENERGY_LEVELS, EXPERIENCE_LEVELS, labelFor } from '../lib/constants'

const EMPTY_FORM = {
  name: '', category: 'dog', breed: '', age_years: '', bio: '', photo_url: '',
  size: '', energy_level: '', experience_level: '',
  good_with_kids: '', good_with_other_pets: '',
}

const NAV_LINKS = [
  { to: '/shelter', label: 'Listings' },
  { to: '/shelter/meetings', label: '📅 Meeting times' },
  { to: '/matches', label: '❤️ Interested adopters' },
]

function toTriState(v) {
  return v === 'true' ? true : v === 'false' ? false : null
}
function fromTriState(v) {
  return v === true ? 'true' : v === false ? 'false' : ''
}

export default function ShelterDashboard() {
  const { user } = useAuth()
  const [pets, setPets]           = useState([])
  const [form, setForm]           = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [showForm, setShowForm]   = useState(false)
  const [error, setError]         = useState('')

  useEffect(() => { loadPets() }, [])

  async function loadPets() {
    const { data } = await supabase
      .from('pets')
      .select('*')
      .eq('shelter_id', user.id)
      .order('created_at', { ascending: false })
    setPets(data ?? [])
  }

  function handle(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function uploadPhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const ext  = file.name.split('.').pop()
    const path = `${user.id}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('pet-photos').upload(path, file)
    if (error) { setError(error.message); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('pet-photos').getPublicUrl(path)
    setForm(f => ({ ...f, photo_url: publicUrl }))
    setUploading(false)
  }

  async function savePet(e) {
    e.preventDefault()
    setError('')
    setSaving(true)

    const payload = {
      ...form,
      age_years: form.age_years ? parseFloat(form.age_years) : null,
      size: form.size || null,
      energy_level: form.energy_level || null,
      experience_level: form.experience_level || null,
      good_with_kids: toTriState(form.good_with_kids),
      good_with_other_pets: toTriState(form.good_with_other_pets),
      shelter_id: user.id,
    }

    if (editingId) {
      const { error } = await supabase.from('pets').update(payload).eq('id', editingId)
      if (error) { setError(error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from('pets').insert(payload)
      if (error) { setError(error.message); setSaving(false); return }
    }

    setSaving(false)
    setForm(EMPTY_FORM)
    setEditingId(null)
    setShowForm(false)
    loadPets()
  }

  function startEdit(pet) {
    setForm({
      name:      pet.name,
      category:  pet.category  ?? 'dog',
      breed:     pet.breed     ?? '',
      age_years: pet.age_years ?? '',
      bio:       pet.bio       ?? '',
      photo_url: pet.photo_url ?? '',
      size: pet.size ?? '',
      energy_level: pet.energy_level ?? '',
      experience_level: pet.experience_level ?? '',
      good_with_kids: fromTriState(pet.good_with_kids),
      good_with_other_pets: fromTriState(pet.good_with_other_pets),
    })
    setEditingId(pet.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function deletePet(id) {
    if (!confirm('Remove this pet listing?')) return
    await supabase.from('pets').delete().eq('id', id)
    loadPets()
  }

  async function markAdopted(id) {
    await supabase.from('pets').update({ status: 'adopted' }).eq('id', id)
    loadPets()
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar accent="shelter" links={NAV_LINKS} />

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Your Listings</h1>
          <button
            onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(s => !s) }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-xl transition-colors"
          >
            {showForm ? 'Cancel' : '+ Add pet'}
          </button>
        </div>

        {/* Add / Edit form */}
        {showForm && (
          <form onSubmit={savePet} className="bg-white rounded-2xl shadow p-6 mb-8 space-y-4 border border-slate-100">
            <h2 className="font-semibold text-slate-700">{editingId ? 'Edit pet' : 'New pet'}</h2>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-2">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input name="name" value={form.name} onChange={handle} required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                <select name="category" value={form.category} onChange={handle} required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Breed</label>
                <input name="breed" value={form.breed} onChange={handle}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Age (years)</label>
                <input name="age_years" type="number" step="0.5" min="0" value={form.age_years} onChange={handle}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea name="bio" value={form.bio} onChange={handle} rows={3}
                placeholder="Tell adopters about this pet's personality…"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Photo</label>
              <input type="file" accept="image/*" onChange={uploadPhoto}
                className="text-sm text-slate-500 file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100" />
              {uploading && <p className="text-xs text-slate-400 mt-1">Uploading…</p>}
              {form.photo_url && (
                <img src={form.photo_url} alt="preview" className="mt-2 h-24 rounded-lg object-cover" />
              )}
            </div>

            <div className="border-t border-slate-100 pt-4">
              <h3 className="text-sm font-semibold text-slate-600 mb-3">Match attributes <span className="font-normal text-slate-400">(help adopters find the right fit)</span></h3>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Size</label>
                  <select name="size" value={form.size} onChange={handle}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    <option value="">Unspecified</option>
                    {SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Energy</label>
                  <select name="energy_level" value={form.energy_level} onChange={handle}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    <option value="">Unspecified</option>
                    {ENERGY_LEVELS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ideal owner</label>
                  <select name="experience_level" value={form.experience_level} onChange={handle}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    <option value="">Unspecified</option>
                    {EXPERIENCE_LEVELS.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Good with kids?</label>
                  <select name="good_with_kids" value={form.good_with_kids} onChange={handle}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    <option value="">Unknown</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Good with other pets?</label>
                  <select name="good_with_other_pets" value={form.good_with_other_pets} onChange={handle}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    <option value="">Unknown</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
              </div>
            </div>

            <button type="submit" disabled={saving || uploading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50">
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add pet'}
            </button>
          </form>
        )}

        {/* Pet list */}
        {pets.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-4xl mb-3">🐾</p>
            <p>No pets listed yet. Add your first one!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pets.map(pet => (
              <div key={pet.id} className="bg-white rounded-2xl shadow p-4 flex gap-4 items-center border border-slate-100">
                <img
                  src={pet.photo_url || 'https://placedog.net/80/80'}
                  alt={pet.name}
                  className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <h3 className="font-semibold text-slate-800">{pet.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      pet.status === 'adopted'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-indigo-100 text-indigo-700'
                    }`}>
                      {pet.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">
                    {[labelFor(CATEGORIES, pet.category), pet.breed, pet.age_years && `${pet.age_years} yrs`].filter(Boolean).join(' · ')}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {pet.size && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{labelFor(SIZES, pet.size)}</span>}
                    {pet.energy_level && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{labelFor(ENERGY_LEVELS, pet.energy_level)}</span>}
                    {pet.good_with_kids === true && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Kid-friendly</span>}
                    {pet.good_with_other_pets === true && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Pet-friendly</span>}
                  </div>
                  <p className="text-sm text-slate-400 truncate mt-1">{pet.bio}</p>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button onClick={() => startEdit(pet)}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg transition-colors">
                    Edit
                  </button>
                  <Link to="/shelter/meetings" state={{ petId: pet.id }}
                    className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-3 py-1.5 rounded-lg transition-colors text-center">
                    📅 Meetings
                  </Link>
                  {pet.status === 'available' && (
                    <button onClick={() => markAdopted(pet.id)}
                      className="text-xs bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1.5 rounded-lg transition-colors">
                      Adopted ✓
                    </button>
                  )}
                  <button onClick={() => deletePet(pet.id)}
                    className="text-xs bg-red-50 hover:bg-red-100 text-red-500 px-3 py-1.5 rounded-lg transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
