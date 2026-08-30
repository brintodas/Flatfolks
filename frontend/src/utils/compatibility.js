import { QUIZ_KEYS } from './quizMeta'

const WEIGHT_KEY = (trait) => `w_${trait}`

/**
 * Pairwise lifestyle compatibility using viewer's personal weights.
 *
 * @param {object} viewer   - The current user's profile (must have quiz answers + w_* weight fields)
 * @param {object} candidate - Another student's profile
 * @returns {{ total: number, breakdown: object }} or null if either hasn't completed quiz
 */
export function calcCompatibility(viewer, candidate) {
  if (!viewer || !candidate) return null
  if (!viewer.quiz_completed || !candidate.quiz_completed) return null

  let weightedSum = 0
  let totalWeight = 0
  const breakdown = {}

  for (const trait of QUIZ_KEYS) {
    const av = Number(viewer[trait])
    const bv = Number(candidate[trait])
    const w  = Number(viewer[WEIGHT_KEY(trait)] || 3)  // default to 3 if weight not set

    if (!av || !bv) return null  // incomplete answers → can't score

    const diff  = Math.abs(av - bv)
    const score = diff === 0 ? 100 : diff === 1 ? 50 : 0

    breakdown[trait] = score
    weightedSum     += score * w
    totalWeight     += w
  }

  const total = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : null
  return { total, breakdown }
}

/**
 * Convenience: just return the numeric total score (or null).
 */
export function matchScore(viewer, candidate) {
  const result = calcCompatibility(viewer, candidate)
  return result ? result.total : null
}
