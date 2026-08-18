export const CATEGORIES = [
  { value: 'dog',    label: 'Dog',    emoji: '🐶' },
  { value: 'cat',    label: 'Cat',    emoji: '🐱' },
  { value: 'rabbit', label: 'Rabbit', emoji: '🐰' },
  { value: 'bird',   label: 'Bird',   emoji: '🐦' },
  { value: 'other',  label: 'Other',  emoji: '🐾' },
]

export const SIZES = [
  { value: 'small',  label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large',  label: 'Large' },
]

export const ENERGY_LEVELS = [
  { value: 'low',    label: 'Low energy' },
  { value: 'medium', label: 'Medium energy' },
  { value: 'high',   label: 'High energy' },
]

export const EXPERIENCE_LEVELS = [
  { value: 'first_time',      label: 'First-time owner' },
  { value: 'some_experience', label: 'Some experience' },
  { value: 'experienced',     label: 'Very experienced' },
]

export const HOME_TYPES = [
  { value: 'apartment',       label: 'Apartment' },
  { value: 'house_no_yard',   label: 'House, no yard' },
  { value: 'house_with_yard', label: 'House with a yard' },
]

export function labelFor(list, value) {
  return list.find(item => item.value === value)?.label ?? value
}
