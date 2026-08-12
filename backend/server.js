const express = require('express')
const cors = require('cors')
const path = require('path')
require('dotenv').config()

const app = express()

// allow all origins (dev only)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
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
app.use('/api/listings',  listingsRoute)
app.use('/api/bookmarks', bookmarksRoute)


app.get('/', (req, res) => {
  res.send('Flatfolks API is running')
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
