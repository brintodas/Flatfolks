const express = require('express')
const router  = express.Router()
const db      = require('../config/db')

// Helper function to safely get or create a conversation
function getOrCreateConversation(user1_id, user2_id, callback) {
  // Ensure user1_id is always the smaller one to avoid duplicate rows (1,2) vs (2,1)
  const u1 = Math.min(user1_id, user2_id)
  const u2 = Math.max(user1_id, user2_id)

  db.query(`SELECT id FROM conversations WHERE user1_id = ? AND user2_id = ?`, [u1, u2], (err, rows) => {
    if (err) return callback(err)
    if (rows.length > 0) return callback(null, rows[0].id) // exists
    
    // create new
    db.query(`INSERT INTO conversations (user1_id, user2_id) VALUES (?, ?)`, [u1, u2], (err2, result) => {
      if (err2) return callback(err2)
      callback(null, result.insertId)
    })
  })
}

// 1. Fetch all conversations for a user
router.get('/conversations/:userId', (req, res) => {
  const { userId } = req.params

  const sql = `
    SELECT 
      c.id as conversation_id,
      c.updated_at,
      u.id as other_user_id,
      u.full_name,
      u.role,
      sp.profile_photo as student_photo,
      (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
      (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_id != ? AND is_read = FALSE) as unread_count
    FROM conversations c
    JOIN users u ON u.id = CASE WHEN c.user1_id = ? THEN c.user2_id ELSE c.user1_id END
    LEFT JOIN student_profiles sp ON sp.user_id = u.id
    WHERE c.user1_id = ? OR c.user2_id = ?
    ORDER BY c.updated_at DESC
  `
  
  db.query(sql, [userId, userId, userId, userId, userId], (err, rows) => {
    if (err) { console.error(err); return res.status(500).json({ error: 'Server error' }) }
    res.json({ success: true, data: rows })
  })
})

// 2. Fetch messages for a specific conversation (or start a new one if it doesn't exist yet by passing targetUserId)
router.get('/:conversationId', (req, res) => {
  const { conversationId } = req.params
  const { userId, targetUserId } = req.query

  // If conversationId is 'new', we need to find or create the conversation based on targetUserId
  if (conversationId === 'new') {
    if (!userId || !targetUserId) return res.status(400).json({ error: 'userId and targetUserId required' })
    
    getOrCreateConversation(parseInt(userId), parseInt(targetUserId), (err, convId) => {
      if (err) { console.error(err); return res.status(500).json({ error: 'Server error' }) }
      
      // Return empty messages array with the new conversation ID
      res.json({ success: true, conversation_id: convId, messages: [] })
    })
    return
  }

  // Otherwise fetch standard messages
  const sql = `
    SELECT m.id, m.sender_id, m.content, m.created_at
    FROM messages m
    WHERE m.conversation_id = ?
    ORDER BY m.created_at ASC
  `
  db.query(sql, [conversationId], (err, rows) => {
    if (err) { console.error(err); return res.status(500).json({ error: 'Server error' }) }
    
    // Mark as read
    if (userId) {
      db.query(`UPDATE messages SET is_read = TRUE WHERE conversation_id = ? AND sender_id != ? AND is_read = FALSE`, [conversationId, userId], () => {})
    }

    res.json({ success: true, messages: rows })
  })
})

// 3. Send a message
router.post('/', (req, res) => {
  const { conversation_id, sender_id, receiver_id, content } = req.body
  
  if (!content || !content.trim()) return res.status(400).json({ error: 'Message cannot be empty' })

  // If we have a conversation_id, insert directly
  if (conversation_id) {
    insertMessage(conversation_id, sender_id, content, res)
  } else if (sender_id && receiver_id) {
    // If we only have sender and receiver (first message), get/create conversation first
    getOrCreateConversation(sender_id, receiver_id, (err, convId) => {
      if (err) { console.error(err); return res.status(500).json({ error: 'Server error' }) }
      insertMessage(convId, sender_id, content, res)
    })
  } else {
    res.status(400).json({ error: 'Missing conversation parameters' })
  }
})

function insertMessage(conversationId, senderId, content, res) {
  db.query(`INSERT INTO messages (conversation_id, sender_id, content) VALUES (?, ?, ?)`, [conversationId, senderId, content.trim()], (err, result) => {
    if (err) { console.error(err); return res.status(500).json({ error: 'Server error' }) }
    
    // Update conversation timestamp
    db.query(`UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [conversationId], () => {})
    
    res.json({ 
      success: true, 
      message: {
        id: result.insertId,
        conversation_id: conversationId,
        sender_id: senderId,
        content: content.trim(),
        created_at: new Date().toISOString()
      }
    })
  })
}

module.exports = router
