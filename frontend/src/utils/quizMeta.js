/** Shared lifestyle quiz questions (scores are 1–3). */
export const QUIZ_QUESTIONS = [
  {
    key: 'sleep_schedule',
    label: 'Sleep Schedule',
    icon: 'fa-moon',
    prompt: 'When do you usually sleep and wake up?',
    options: [
      { value: 1, title: 'Early bird', desc: 'Early to bed, early to rise' },
      { value: 2, title: 'Flexible', desc: 'Depends on the day' },
      { value: 3, title: 'Night owl', desc: 'Stay up late, sleep in' },
    ],
  },
  {
    key: 'cleanliness',
    label: 'Cleanliness',
    icon: 'fa-broom',
    prompt: 'How tidy do you keep your living space?',
    options: [
      { value: 1, title: 'Messy', desc: 'I am relaxed about clutter' },
      { value: 2, title: 'Average', desc: 'Generally tidy, not strict' },
      { value: 3, title: 'Neat freak', desc: 'Everything has a place' },
    ],
  },
  {
    key: 'noise_tolerance',
    label: 'Noise Tolerance',
    icon: 'fa-volume-high',
    prompt: 'How much noise are you comfortable with at home?',
    options: [
      { value: 1, title: 'Quiet', desc: 'I prefer a quiet home' },
      { value: 2, title: 'Moderate', desc: 'Some noise is fine' },
      { value: 3, title: 'Lively', desc: 'Music, calls, and chatter OK' },
    ],
  },
  {
    key: 'guests_pref',
    label: 'Guests',
    icon: 'fa-user-group',
    prompt: 'How often are guests welcome?',
    options: [
      { value: 1, title: 'Rarely', desc: 'I prefer very few guests' },
      { value: 2, title: 'Sometimes', desc: 'Occasional visits are fine' },
      { value: 3, title: 'Often', desc: 'Friends over often is OK' },
    ],
  },
  {
    key: 'smoking_pref',
    label: 'Smoking',
    icon: 'fa-ban-smoking',
    prompt: 'What is your preference around smoking?',
    options: [
      { value: 1, title: 'Non-smoker', desc: 'No smoking around me' },
      { value: 2, title: "Don't mind", desc: 'I am flexible' },
      { value: 3, title: 'Smoker', desc: 'I smoke / OK with smoking' },
    ],
  },
  {
    key: 'study_habits',
    label: 'Study Habits',
    icon: 'fa-book-open',
    prompt: 'Where do you usually study?',
    options: [
      { value: 1, title: 'Study at home', desc: 'Mostly at the flat' },
      { value: 2, title: 'Mixed', desc: 'Home and outside' },
      { value: 3, title: 'Library', desc: 'Mostly campus / library' },
    ],
  },
]

export const QUIZ_KEYS = QUIZ_QUESTIONS.map((q) => q.key)
