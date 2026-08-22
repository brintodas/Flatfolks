import { useState, useEffect, useRef } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'

function Messages() {
  const { conversationId } = useParams()
  const navigate = useNavigate()
  
  const [conversations, setConversations] = useState([])
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [chatLoading, setChatLoading] = useState(false)
  const [targetUserId, setTargetUserId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  const messagesEndRef = useRef(null)
  const currentUser = JSON.parse(localStorage.getItem('ff_user') || 'null')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const to = params.get('to')
    const msg = params.get('msg')
    if (to) setTargetUserId(to)
    if (msg) setNewMessage(msg)
  }, [window.location.search])

  useEffect(() => {
    if (!currentUser) { setLoading(false); return }
    
    fetch(`http://localhost:8000/api/messages/conversations/${currentUser.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setConversations(data.data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [currentUser?.id])

  useEffect(() => {
    if (!currentUser || !conversationId) { setMessages([]); return }

    setChatLoading(true)
    let url = `http://localhost:8000/api/messages/${conversationId}?userId=${currentUser.id}`
    if (targetUserId) url += `&targetUserId=${targetUserId}`

    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
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

    const payload = { content: newMessage, sender_id: currentUser.id }
    if (conversationId && conversationId !== 'new') payload.conversation_id = conversationId
    else if (targetUserId) payload.receiver_id = targetUserId

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
          fetch(`http://localhost:8000/api/messages/conversations/${currentUser.id}`)
            .then(r => r.json())
            .then(d => { if (d.success) setConversations(d.data) })
        }
      })
      .catch(console.error)
  }

  if (!currentUser) return (
    <div className="min-h-screen bg-slate-50 pt-24 flex items-center justify-center">
      <p className="text-slate-500">Please sign in to view messages.</p>
    </div>
  )

  const activeChat = conversations.find(c => String(c.conversation_id) === String(conversationId))
  const activePhotoSrc = activeChat?.student_photo ? `http://localhost:8000${activeChat.student_photo}` : null
  const activeInitials = activeChat?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  const filteredConversations = conversations.filter(conv => 
    conv.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="h-screen pt-16 flex flex-col overflow-hidden">
      <div className="flex-1 w-full h-full flex overflow-hidden bg-white">
          
          {/* ── Left Sidebar (Conversations) ────────────────────────────────── */}
          <div className={`w-full md:w-[340px] bg-white border-r border-slate-100 flex-col z-10 ${conversationId ? 'hidden md:flex' : 'flex'}`}>
            {/* Sidebar Header */}
            <div className="p-6 pb-4 flex items-center justify-between shrink-0">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Messages</h2>
              <button className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-colors">
                <i className="fa-solid fa-pen-to-square text-sm"></i>
              </button>
            </div>

            {/* Search Box */}
            <div className="px-5 pb-4 shrink-0">
              <div className="relative">
                <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                <input 
                  type="text" 
                  placeholder="Search chats..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white focus:ring-2 focus:ring-blue-100 border border-transparent focus:border-blue-200 rounded-full pl-10 pr-4 py-2.5 text-sm transition-all outline-none"
                />
              </div>
            </div>
            
            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
              {loading && <p className="text-center text-sm text-slate-400 mt-6">Loading chats...</p>}
              
              {!loading && conversations.length === 0 && (
                <div className="text-center mt-12 px-6">
                  <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fa-regular fa-comments text-2xl"></i>
                  </div>
                  <h3 className="text-slate-700 font-semibold mb-1">No messages yet</h3>
                  <p className="text-xs text-slate-500">When you connect with flatmates, your chats will appear here.</p>
                </div>
              )}

              {!loading && conversations.length > 0 && filteredConversations.length === 0 && (
                <div className="text-center mt-8 px-6 text-slate-500 text-sm">
                  No matches for "{searchQuery}"
                </div>
              )}

              {!loading && filteredConversations.map(conv => {
                const isActive = String(conv.conversation_id) === String(conversationId)
                const photoSrc = conv.student_photo ? `http://localhost:8000${conv.student_photo}` : null
                const initials = conv.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

                return (
                  <Link 
                    key={conv.conversation_id}
                    to={`/messages/${conv.conversation_id}`}
                    onClick={() => setConversations(prev => prev.map(c => c.conversation_id === conv.conversation_id ? { ...c, unread_count: 0 } : c))}
                    className={`block p-3 rounded-2xl transition-all relative group ${isActive ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'hover:bg-slate-50 text-slate-800'}`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className={`w-12 h-12 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center border-2 ${isActive ? 'border-blue-500/30 bg-blue-500/20 text-white' : 'border-transparent bg-blue-50 text-blue-700'}`}>
                        {photoSrc 
                          ? <img src={photoSrc} alt={conv.full_name} className="w-full h-full object-cover" />
                          : <span className="text-sm font-bold">{initials}</span>
                        }
                      </div>
                      
                      {/* Text */}
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center justify-between mb-0.5">
                          <h3 className={`text-sm truncate font-semibold flex items-center gap-1.5 ${isActive ? 'text-white' : 'text-slate-800'}`}>
                            {conv.full_name}
                            {conv.role === 'landlord' && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded flex-shrink-0 font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                L
                              </span>
                            )}
                          </h3>
                          {/* Fake timestamp for mockup looks */}
                          <span className={`text-[10px] shrink-0 ${isActive ? 'text-blue-200' : 'text-slate-400 group-hover:text-slate-500'}`}>
                            12:30 PM
                          </span>
                        </div>
                        <p className={`text-xs truncate ${isActive ? 'text-blue-100' : (conv.unread_count > 0 ? 'font-bold text-slate-800' : 'text-slate-500')}`}>
                          {conv.last_message || 'Started a conversation'}
                        </p>
                      </div>

                      {/* Unread dot */}
                      {conv.unread_count > 0 && !isActive && (
                        <div className="w-2.5 h-2.5 bg-blue-600 rounded-full shrink-0 shadow-sm"></div>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* ── Right Area (Active Chat) ────────────────────────────────────── */}
          <div className={`flex-1 flex-col bg-[#f8fafc] ${!conversationId ? 'hidden md:flex' : 'flex'}`}>
            
            {/* Empty State */}
            {!conversationId && (
              <div className="flex-1 flex flex-col items-center justify-center bg-white/50 p-8 text-center">
                <div className="w-20 h-20 bg-white shadow-sm border border-slate-100 rounded-full flex items-center justify-center mb-6">
                  <i className="fa-regular fa-paper-plane text-3xl text-blue-500 ml-[-2px]"></i>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2 tracking-tight">Your Messages</h3>
                <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
                  Select a conversation from the sidebar or go to a user's profile to start chatting.
                </p>
              </div>
            )}

            {/* Active Chat View */}
            {conversationId && (
              <>
                {/* Chat Header */}
                <div className="h-[76px] px-6 bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between shrink-0 sticky top-0 z-10">
                  <div className="flex items-center gap-3">
                    <Link to="/messages" className="md:hidden w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-colors mr-1">
                      <i className="fa-solid fa-arrow-left"></i>
                    </Link>
                    
                    {activeChat && (
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-blue-50 border border-slate-200 shrink-0 flex items-center justify-center">
                        {activePhotoSrc 
                          ? <img src={activePhotoSrc} alt={activeChat.full_name} className="w-full h-full object-cover" />
                          : <span className="text-xs font-bold text-blue-700">{activeInitials}</span>
                        }
                      </div>
                    )}
                    
                    <Link to={activeChat ? (activeChat.role === 'landlord' ? `/landlord/${activeChat.other_user_id}` : `/roommate/${activeChat.other_user_id}`) : '#'} className="hover:underline">
                      <div className="font-bold text-slate-900 leading-tight flex items-center gap-1.5">
                        {activeChat ? activeChat.full_name : 'Chat'}
                        {activeChat?.role === 'landlord' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-bold">
                            L
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-medium text-green-600 flex items-center gap-1.5 mt-0.5">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Active now
                      </div>
                    </Link>
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50" 
                     style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'#94a3b8\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}>
                  
                  {chatLoading && (
                    <div className="flex justify-center my-6">
                      <div className="bg-white/80 backdrop-blur shadow-sm rounded-full px-4 py-1.5 text-xs font-medium text-slate-500 flex items-center gap-2">
                        <i className="fa-solid fa-circle-notch fa-spin text-blue-500"></i> Syncing...
                      </div>
                    </div>
                  )}
                  
                  {!chatLoading && messages.length === 0 && (
                    <div className="text-center text-sm text-slate-400 my-10">
                      This is the beginning of your conversation.
                    </div>
                  )}

                  {!chatLoading && messages.length > 0 && (
                    <div className="flex justify-center mb-6 mt-2">
                      <span className="bg-slate-200/50 text-slate-500 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider">
                        Today
                      </span>
                    </div>
                  )}

                  {!chatLoading && messages.map((msg, idx) => {
                    const isMine = String(msg.sender_id) === String(currentUser.id)
                    // Check if previous message was from same sender to group bubbles
                    const prevMsg = idx > 0 ? messages[idx - 1] : null
                    const isGrouped = prevMsg && String(prevMsg.sender_id) === String(msg.sender_id)

                    return (
                      <div key={msg.id || idx} className={`flex mb-2 ${isMine ? 'justify-end' : 'justify-start'} ${!isGrouped ? 'mt-4' : ''}`}>
                        
                        {!isMine && !isGrouped && activeChat && (
                          <div className="w-6 h-6 rounded-full overflow-hidden bg-blue-50 shrink-0 mr-2 self-end mb-1 border border-slate-200">
                             {activePhotoSrc ? <img src={activePhotoSrc} className="w-full h-full object-cover" /> : null}
                          </div>
                        )}
                        {!isMine && isGrouped && <div className="w-8 shrink-0"></div>}

                        <div className={`relative max-w-[75%] px-4 py-2.5 text-sm shadow-sm ${
                          isMine 
                            ? `bg-blue-600 text-white ${isGrouped ? 'rounded-2xl rounded-tr-sm' : 'rounded-2xl rounded-br-sm'}`
                            : `bg-white text-slate-700 border border-slate-100 ${isGrouped ? 'rounded-2xl rounded-tl-sm' : 'rounded-2xl rounded-bl-sm'}`
                        }`}>
                          <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                          <div className={`text-[9px] font-medium flex items-center gap-1 mt-1.5 ${isMine ? 'text-blue-200 justify-end' : 'text-slate-400'}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {isMine && <i className="fa-solid fa-check-double text-[10px]"></i>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} className="h-4" />
                </div>

                {/* Message Input Area */}
                <div className="p-4 md:px-6 md:py-5 bg-white border-t border-slate-200/60 shrink-0">
                  <form onSubmit={handleSendMessage} className="flex items-end gap-3 max-w-4xl mx-auto">
                    <div className="flex-1 relative bg-slate-50 border border-slate-200 rounded-[20px] focus-within:bg-white focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-50 transition-all shadow-sm">
                      <textarea 
                        rows="1"
                        placeholder="Message..."
                        className="w-full bg-transparent px-4 py-3 text-sm focus:outline-none resize-none min-h-[44px] max-h-32"
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
                    </div>

                    <button 
                      type="submit" 
                      disabled={!newMessage.trim()}
                      className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center shadow-sm transition-all mb-0.5 ${
                        newMessage.trim() 
                          ? 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-105 active:scale-95 shadow-blue-600/20' 
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      <i className={`fa-solid fa-paper-plane ${newMessage.trim() ? 'ml-[-2px]' : ''}`}></i>
                    </button>
                  </form>
                </div>
              </>
            )}

          </div>
      </div>
    </div>
  )
}

export default Messages
