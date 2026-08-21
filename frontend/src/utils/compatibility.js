import { QUIZ_KEYS } from './quizMeta'

/**
 * Pairwise lifestyle compatibility (0–100).
 * Returns null if either profile is missing quiz answers.
 */
export function calcCompatibility(a, b) {
  if (!a || !b) return null
  if (!a.quiz_completed || !b.quiz_completed) return null

  let diff = 0
  for (const key of QUIZ_KEYS) {
    const av = Number(a[key])
    const bv = Number(b[key])
    if (!av || !bv) return null
    diff += Math.abs(av - bv)
  }

  // max |diff| per axis = 2 → max total = 12
  return Math.round(100 - (diff / 12) * 100)
}
