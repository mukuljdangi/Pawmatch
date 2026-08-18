const ENERGY_RANK     = { low: 0, medium: 1, high: 2 }
const EXPERIENCE_RANK = { first_time: 0, some_experience: 1, experienced: 2 }

// Hard filter: only applied when the adopter picked specific species.
// An empty/missing selection means "open to anything".
export function matchesSpecies(pet, prefs) {
  if (!prefs?.species?.length) return true
  return prefs.species.includes(pet.category)
}

// Soft 0-100 score used to sort the feed once the hard filter has run.
export function scoreMatch(pet, prefs) {
  if (!prefs) return 50

  let score = 0

  // Size (15 pts) — neutral if either side is unset
  if (!prefs.size?.length || !pet.size) {
    score += 15 * 0.6
  } else {
    score += prefs.size.includes(pet.size) ? 15 : 0
  }

  // Energy level (25 pts) — full for exact match, partial for adjacent, none for opposite
  if (!prefs.energy_level || prefs.energy_level === 'any' || !pet.energy_level) {
    score += 25 * 0.6
  } else {
    const diff = Math.abs(ENERGY_RANK[pet.energy_level] - ENERGY_RANK[prefs.energy_level])
    score += diff === 0 ? 25 : diff === 1 ? 12 : 0
  }

  // Experience required by the pet vs. experience the adopter has (25 pts)
  if (!prefs.experience_level || !pet.experience_level) {
    score += 25 * 0.6
  } else {
    const need = EXPERIENCE_RANK[pet.experience_level]
    const have = EXPERIENCE_RANK[prefs.experience_level]
    score += have >= need ? 25 : have === need - 1 ? 10 : 0
  }

  // Good with kids (20 pts)
  if (prefs.has_kids == null || pet.good_with_kids == null) {
    score += 20 * 0.6
  } else if (prefs.has_kids) {
    score += pet.good_with_kids ? 20 : 0
  } else {
    score += 20
  }

  // Good with other pets (15 pts)
  if (prefs.has_other_pets == null || pet.good_with_other_pets == null) {
    score += 15 * 0.6
  } else if (prefs.has_other_pets) {
    score += pet.good_with_other_pets ? 15 : 0
  } else {
    score += 15
  }

  return Math.round(Math.min(100, Math.max(0, score)))
}
