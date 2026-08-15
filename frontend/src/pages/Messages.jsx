import { useState, useEffect, useRef } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'

function Messages() {
  const { conversationId } = useParams() // can be a number, 'new', or undefined
  const navigate = useNavigate()
  
  const [conversations, setConversations] = useState([])
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [chatLoading, setChatLoading] = useState(false)
  const [targetUserId, setTargetUserId] = useState(null) // used when starting a new chat
  
  const messagesEndRef = useRef(null)
  const currentUser = JSON.parse(localStorage.getItem('ff_user') || 'null')

  // Extract targetUserId from query params if we're starting a new chat
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const to = params.get('to')
    if (to) setTargetUserId(to)
  }, [window.location.search])

  // Fetch all conversations
  useEffect(() => {
    if (!currentUser) { setLoading(false); return }
    
    fetch(`http://localhost:8000/api/messages/conversations/${currentUser.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setConversations(data.data)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [currentUser?.id])

  // Fetch messages for active conversation
  useEffect(() => {
    if (!currentUser || !conversationId) {
      setMessages([])
      return
    }

    setChatLoading(true)
    let url = `http://localhost:8000/api/messages/${conversationId}?userId=${currentUser.id}`
    if (targetUserId) url += `&targetUserId=${targetUserId}`

    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          // If we requested 'new' but the backend found an existing conversation, update URL silently
          if (conversationId === 'new' && data.conversation_id) {
            navigate(`/messages/${data.conversation_id}`, { replace: true })
          }
          setMessages(data.messages || [])
        }
        setChatLoading(false)
        scrollToBottom()
      })
      .catch(() => setChatLoading(false))
  }, [conversationId, targetUserId, currentUser?.id, navigate])

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !currentUser) return

    const payload = {
      content: newMessage,
      sender_id: currentUser.id
    }

    if (conversationId && conversationId !== 'new') {
      payload.conversation_id = conversationId
    } else if (targetUserId) {
      payload.receiver_id = targetUserId
    }

    fetch('http://localhost:8000/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setMessages(prev => [...prev, data.message])
          setNewMessage('')
          scrollToBottom()
          
          // Refresh conversation list to bump it to top
          fetch(`http://localhost:8000/api/messages/conversations/${currentUser.id}`)
            .then(r => r.json())
            .then(d => { if (d.success) setConversations(d.data) })
        }
      })
      .catch(console.error)
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 pt-24 flex items-center justify-center">
        <p className="text-slate-500">Please sign in to view messages.</p>
      </div>
    )
  }

  // Find active chat partner details from the conversations list (if it exists)
  const activeChat = conversations.find(c => String(c.conversation_id) === String(conversationId))

  return (
    <div className="h-screen bg-slate-50 pt-16 flex flex-col overflow-hidden">
      <div className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 overflow-hidden">
        
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm h-full flex overflow-hidden">
          
          {/* Left Sidebar - Conversations List */}
          <div className={`w-full md:w-80 border-r border-slate-100 flex-col ${conversationId ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Messages</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {loading && <p className="p-4 text-sm text-slate-500">Loading chats...</p>}
              
              {!loading && conversations.length === 0 && (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <i className="fa-regular fa-comments text-slate-300 text-xl"></i>
                  </div>
                  <p className="text-sm text-slate-500">No conversations yet.</p>
                </div>
              )}

              {!loading && conversations.map(conv => {
                const isActive = String(conv.conversation_id) === String(conversationId)
                const photoSrc = conv.student_photo ? `http://localhost:8000${conv.student_photo}` : null
                const initials = conv.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

                return (
                  <Link 
                    key={conv.conversation_id}
                    to={`/messages/${conv.conversation_id}`}
                    className={`block p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors relative ${isActive ? 'bg-blue-50/50 hover:bg-blue-50/80 border-blue-100/50' : ''}`}
                    onClick={() => {
                      // Optimistically clear unread count when clicked
                      setConversations(prev => prev.map(c => 
                        c.conversation_id === conv.conversation_id ? { ...c, unread_count: 0 } : c
                      ))
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-blue-100 border border-slate-200 flex-shrink-0 flex items-center justify-center relative">
                        {photoSrc 
                          ? <img src={photoSrc} alt={conv.full_name} className="w-full h-full object-cover" />
                          : <span className="text-sm font-bold text-blue-700">{initials}</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0 pr-4">
                        <h3 className={`text-sm truncate ${isActive ? 'font-bold text-blue-900' : (conv.unread_count > 0 ? 'font-extrabold text-slate-900' : 'font-semibold text-slate-800')}`}>
                          {conv.full_name}
                        </h3>
                        <p className={`text-xs truncate mt-0.5 ${conv.unread_count > 0 && !isActive ? 'font-bold text-slate-800' : 'text-slate-500'}`}>
                          {conv.last_message || 'Started a conversation'}
                        </p>
                      </div>
                      {conv.unread_count > 0 && !isActive && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-blue-600 rounded-full shadow-sm"></div>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Right Area - Active Chat */}
          <div className={`flex-1 flex-col ${!conversationId ? 'hidden md:flex' : 'flex'}`}>
            
            {/* Empty State */}
            {!conversationId && (
              <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50 p-8">
                <div className="w-16 h-16 bg-white border border-slate-200 rounded-full flex items-center justify-center mb-4 shadow-sm">
                  <i className="fa-regular fa-paper-plane text-2xl text-slate-300"></i>
                </div>
                <h3 className="text-lg font-bold text-slate-700 mb-2">Your Messages</h3>
                <p className="text-sm text-slate-500 text-center max-w-sm">
                  Select a conversation from the sidebar or go to a user's profile to start chatting.
                </p>
              </div>
            )}

            {/* Chat View */}
            {conversationId && (
              <>
                {/* Chat Header */}
                <div className="h-16 border-b border-slate-100 flex items-center px-4 md:px-6 bg-white shrink-0">
                  <Link to="/messages" className="md:hidden mr-3 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                    <i className="fa-solid fa-arrow-left"></i>
                  </Link>
                  <div className="font-semibold text-slate-800">
                    {activeChat ? activeChat.full_name : 'Chat'}
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/30">
                  {chatLoading && <p className="text-center text-sm text-slate-400 my-4">Loading messages...</p>}
                  
                  {!chatLoading && messages.length === 0 && (
                    <div className="text-center text-sm text-slate-400 my-10">
                      This is the beginning of your conversation.
                    </div>
                  )}

                  {!chatLoading && messages.map((msg, idx) => {
                    const isMine = String(msg.sender_id) === String(currentUser.id)
                    return (
                      <div key={msg.id || idx} className={`flex mb-4 ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                          isMine 
                            ? 'bg-blue-600 text-white rounded-br-sm shadow-sm shadow-blue-600/10' 
                            : 'bg-white text-slate-700 border border-slate-200 rounded-bl-sm shadow-sm'
                        }`}>
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          <span className={`text-[10px] block mt-1 ${isMine ? 'text-blue-200' : 'text-slate-400'}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 bg-white border-t border-slate-100 shrink-0">
                  <form onSubmit={handleSendMessage} className="flex items-end gap-2 relative">
                    <textarea 
                      rows="1"
                      placeholder="Write a message..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none min-h-[44px] max-h-32"
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value)
                        e.target.style.height = 'auto'
                        e.target.style.height = e.target.scrollHeight + 'px'
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSendMessage(e)
                        }
                      }}
                    />
                    <button 
                      type="submit" 
                      disabled={!newMessage.trim()}
                      className="shrink-0 w-11 h-11 bg-blue-700 text-white rounded-xl hover:bg-blue-800 disabled:opacity-50 disabled:hover:bg-blue-700 transition-colors flex items-center justify-center shadow-sm"
                    >
                      <i className="fa-solid fa-paper-plane"></i>
                    </button>
                  </form>
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}

export default Messages
