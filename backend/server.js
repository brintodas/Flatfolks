const express = require('express')
const cors = require('cors')
const path = require('path')
require('dotenv').config()

const app = express()

// allow all origins (dev only)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key']
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// serve uploaded photos as static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// instant health check - no DB needed
app.get('/api/ping', (req, res) => {
  res.json({ ok: true })
})

// routes
const listingsRoute  = require('./routes/listings')
const bookmarksRoute = require('./routes/bookmarks')
const authRoute      = require('./routes/auth')
const profileRoute   = require('./routes/profile')
const messagesRoute  = require('./routes/messages')
const adminRoute     = require('./routes/admin')
const landlordRoute  = require('./routes/landlord')
const reportsRoute   = require('./routes/reports')
const roommatesRoute = require('./routes/roommates')
const quizRoute      = require('./routes/quiz')
const reviewsRoute = require('./routes/reviews')
app.use('/api/listings',  listingsRoute)
app.use('/api/bookmarks', bookmarksRoute)
app.use('/api/auth',      authRoute)
app.use('/api/profile',   profileRoute)
app.use('/api/messages',  messagesRoute)
app.use('/api/admin',     adminRoute)
app.use('/api/landlord',  landlordRoute)
app.use('/api/reports',   reportsRoute)
app.use('/api/roommates', roommatesRoute)
app.use('/api/quiz',      quizRoute)
app.use('/api/reviews', reviewsRoute)


app.get('/', (req, res) => {
  res.send('Flatfolks API is running')
})

const PORT = process.env.PORT || 8000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})