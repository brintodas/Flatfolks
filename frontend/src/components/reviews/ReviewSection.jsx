import { useCallback, useEffect, useState } from 'react'
import './ReviewSection.css'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function Stars({ value = 0, onChange, interactive = false }) {
  return (
    <div className="review-stars" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map(star => (
        <button
          type="button"
          key={star}
          className={star <= value ? 'review-star active' : 'review-star'}
          onClick={() => interactive && onChange?.(star)}
          disabled={!interactive}
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

export default function ReviewSection({ targetType, targetId, reviewerId }) {
  const [reviews, setReviews] = useState([])
  const [average, setAverage] = useState(0)
  const [count, setCount] = useState(0)
  const [rating, setRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  const loadReviews = useCallback(async () => {
    if (!targetType || !targetId) return
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/api/reviews/${targetType}/${targetId}`)
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.message || 'Could not load reviews.')
      setReviews(result.data || [])
      setAverage(result.average_rating || 0)
      setCount(result.review_count || 0)
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }, [targetType, targetId])

  useEffect(() => {
    loadReviews()
  }, [loadReviews])

  async function submitReview(event) {
    event.preventDefault()
    setMessage('')

    if (!reviewerId) return setMessage('Please sign in to leave a review.')
    if (!rating) return setMessage('Choose a rating from 1 to 5.')
    if (!reviewText.trim()) return setMessage('Write a short review.')

    try {
      const response = await fetch(`${API_BASE}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewer_id: reviewerId,
          target_type: targetType,
          target_id: targetId,
          rating,
          review_text: reviewText.trim()
        })
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.message || 'Could not submit review.')

      setRating(0)
      setReviewText('')
      setMessage('Review submitted successfully.')
      loadReviews()
    } catch (error) {
      setMessage(error.message)
    }
  }

  return (
    <section className="review-section">
      <div className="review-summary">
        <h2>Reviews & Ratings</h2>
        <div className="review-average">
          <span className="review-average-number">{Number(average).toFixed(1)}</span>
          <Stars value={Math.round(average)} />
          <span className="review-count">{count} review{count === 1 ? '' : 's'}</span>
        </div>
      </div>

      {reviewerId && (
        <form className="review-form" onSubmit={submitReview}>
          <label>Your rating</label>
          <Stars value={rating} onChange={setRating} interactive />
          <label htmlFor="review-text">Your review</label>
          <textarea
            id="review-text"
            maxLength={2000}
            value={reviewText}
            onChange={event => setReviewText(event.target.value)}
            placeholder="Share your experience..."
            rows={4}
          />
          <button className="review-submit" type="submit">Submit review</button>
        </form>
      )}

      {message && <p className="review-message">{message}</p>}

      <div className="review-list">
        {loading ? (
          <p>Loading reviews...</p>
        ) : reviews.length === 0 ? (
          <p>No reviews yet.</p>
        ) : (
          reviews.map(review => (
            <article className="review-card" key={review.id}>
              <div className="review-card-header">
                <strong>{review.reviewer_name}</strong>
                <Stars value={Number(review.rating)} />
              </div>
              <p>{review.review_text}</p>
              <small>{new Date(review.created_at).toLocaleDateString()}</small>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
