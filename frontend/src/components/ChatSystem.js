import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './ChatSystem.css';

const ChatSystem = ({ currentUser }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch conversations on mount
  useEffect(() => {
    console.log('ChatSystem currentUser:', currentUser);
    if (currentUser && (currentUser.id || currentUser._id) && currentUser.role) {
      fetchConversations();
      // Poll for new messages every 3 seconds
      pollIntervalRef.current = setInterval(() => {
        fetchConversations();
        if (selectedConversation) {
          fetchMessages(selectedConversation.conversationId);
        }
      }, 3000);

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, currentUser?.role]);

  // Fetch messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.conversationId);
      markAsRead(selectedConversation.conversationId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation]);

  const fetchConversations = async () => {
    try {
      if (!currentUser) return;
      const userId = currentUser.id || currentUser._id;
      const token = localStorage.getItem('authToken');
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/api/chat/conversations/${userId}/${currentUser.role}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      console.log('Fetched conversations:', response.data.length);
      if (response.data.length > 0) {
        console.log('Unread counts:', response.data.map(c => ({
          id: c.conversationId,
          unread: c.unreadCount
        })));
      }
      
      setConversations(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/api/chat/messages/${conversationId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedConversation || !currentUser) return;

    setSending(true);
    try {
      const userId = currentUser.id || currentUser._id;
      const userName = currentUser.username || currentUser.workerDetails?.fullName || currentUser.fullName || 'User';
      const token = localStorage.getItem('authToken');
      // Determine receiver based on role
      let receiverId, receiverRole;
      if (currentUser.role === 'worker') {
        // Worker sends to the reporter (user/admin/management)
        receiverId = selectedConversation.userId;
        receiverRole = selectedConversation.userRole || 'user';
      } else {
        // Reporter (user/admin/management) sends to worker
        receiverId = selectedConversation.workerId;
        receiverRole = 'worker';
      }
      
      const payload = {
        conversationId: selectedConversation.conversationId,
        senderId: userId,
        senderRole: currentUser.role,
        senderName: userName,
        receiverId: receiverId,
        receiverRole: receiverRole,
        messageText: messageText.trim()
      };

      await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/api/chat/message`,
        payload,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      setMessageText('');
      fetchMessages(selectedConversation.conversationId);
      fetchConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const markAsRead = async (conversationId) => {
    try {
      if (!currentUser) return;
      const userId = currentUser.id || currentUser._id;
      const token = localStorage.getItem('authToken');
      
      console.log('Marking messages as read:', { conversationId, userId, role: currentUser.role });
      
      const response = await axios.put(
        `${process.env.REACT_APP_API_BASE_URL}/api/chat/messages/read`,
        {
          conversationId,
          userId: userId,
          userRole: currentUser.role
        },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      console.log('Mark as read response:', response.data);
      
      // Immediately refresh conversations to update unread count
      await fetchConversations();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const updateVisibility = async (visibility) => {
    if (!selectedConversation) return;

    try {
      const token = localStorage.getItem('authToken');
      await axios.put(
        `${process.env.REACT_APP_API_BASE_URL}/api/chat/conversation/visibility`,
        {
          conversationId: selectedConversation.conversationId,
          visibility
        },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      // Update local state
      setSelectedConversation({ ...selectedConversation, visibility });
      fetchConversations();
      alert('Privacy settings updated successfully');
    } catch (error) {
      console.error('Error updating visibility:', error);
      alert('Failed to update privacy settings');
    }
  };

  const getUnreadCount = (conversation) => {
    if (!conversation || !conversation.unreadCount) return 0;
    if (currentUser.role === 'user') return conversation.unreadCount.user || 0;
    if (currentUser.role === 'worker') return conversation.unreadCount.worker || 0;
    if (currentUser.role === 'admin') return conversation.unreadCount.admin || 0;
    if (currentUser.role === 'management') return conversation.unreadCount.management || 0;
    return 0;
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!currentUser) {
    return (
      <div className="chat-system-loading">
        <p>Please log in to access chat</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="chat-system-loading">
        <div className="loading-spinner"></div>
        <p>Loading conversations...</p>
      </div>
    );
  }

  // Calculate total unread messages
  const totalUnreadMessages = conversations.reduce((total, conv) => {
    return total + getUnreadCount(conv);
  }, 0);

  console.log('💬 Total unread messages:', totalUnreadMessages);

  return (
    <div className="chat-system">
      {/* Conversations List */}
      <div className="chat-conversations">
        <div className="chat-conversations-header">
          <h3>💬 Messages</h3>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span className="chat-count-badge">{conversations.length}</span>
            {totalUnreadMessages > 0 && (
              <span className="chat-unread-total" title={`${totalUnreadMessages} unread message${totalUnreadMessages > 1 ? 's' : ''}`}>
                {totalUnreadMessages} unread
              </span>
            )}
          </div>
        </div>

        {conversations.length === 0 ? (
          <div className="chat-empty-state">
            <span className="chat-empty-icon">💭</span>
            <p>No conversations yet</p>
            <small>
              {currentUser.role === 'admin' || currentUser.role === 'management' 
                ? 'Create a report and assign a worker to start chatting, or view shared conversations here'
                : 'Messages will appear here when you start chatting'}
            </small>
          </div>
        ) : (
          <div className="chat-conversations-list">
            {conversations.map((conv) => {
              const unreadCount = getUnreadCount(conv);
              const isSelected = selectedConversation?.conversationId === conv.conversationId;
              
              // Determine who to show: worker or user
              let otherPersonName;
              if (currentUser.role === 'worker') {
                otherPersonName = conv.userName; // Worker sees user name
              } else {
                otherPersonName = conv.workerName; // User/Admin/Management see worker name
              }
              
              // Calculate days remaining if completed
              let daysRemaining = null;
              if (conv.completedAt) {
                const completedDate = new Date(conv.completedAt);
                const expiryDate = new Date(completedDate);
                expiryDate.setDate(expiryDate.getDate() + 7);
                const now = new Date();
                const diffMs = expiryDate - now;
                daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
              }

              return (
                <div
                  key={conv.conversationId}
                  className={`chat-conversation-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedConversation(conv)}
                >
                  <div className="chat-conversation-avatar">
                    {otherPersonName.charAt(0).toUpperCase()}
                  </div>
                  <div className="chat-conversation-info">
                    <div className="chat-conversation-name">
                      {currentUser.role === 'worker' && '👤 '}
                      {(currentUser.role === 'user' || currentUser.role === 'admin' || currentUser.role === 'management') && '👷 '}
                      {otherPersonName}
                      {conv.completedAt && daysRemaining > 0 && (
                        <span className="chat-completion-badge">
                          ✅ {daysRemaining}d left
                        </span>
                      )}
                      {conv.visibility !== 'private' && (
                        <span className="chat-visibility-badge">
                          {conv.visibility === 'sharedWithAdmin' && '👁️ Admin'}
                          {conv.visibility === 'sharedWithManagement' && '👁️ Mgmt'}
                          {conv.visibility === 'sharedWithBoth' && '👁️ Both'}
                        </span>
                      )}
                    </div>
                    <div className="chat-conversation-preview">
                      {conv.lastMessageText || 'No messages yet'}
                    </div>
                    <div className="chat-conversation-time">
                      {formatTime(conv.lastMessageTime)}
                    </div>
                  </div>
                  {unreadCount > 0 && (
                    <div className="chat-unread-badge" title={`${unreadCount} unread message${unreadCount > 1 ? 's' : ''}`}>
                      {unreadCount}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Chat Window */}
      <div className="chat-window">
        {!selectedConversation ? (
          <div className="chat-no-selection">
            <span className="chat-no-selection-icon">💬</span>
            <h3>Select a conversation</h3>
            <p>Choose a conversation from the list to start messaging</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="chat-header">
              <div className="chat-header-info">
                <div className="chat-header-avatar">
                  {(currentUser.role === 'worker' ? selectedConversation.userName : selectedConversation.workerName).charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="chat-header-name">
                    {currentUser.role === 'worker' && '👤 '}
                    {(currentUser.role === 'user' || currentUser.role === 'admin' || currentUser.role === 'management') && '👷 '}
                    {currentUser.role === 'worker' ? selectedConversation.userName : selectedConversation.workerName}
                  </div>
                  <div className="chat-header-role">
                    {currentUser.role === 'worker' ? 'Report User' : 'Assigned Worker'}
                    {selectedConversation.completedAt && ' • ✅ Work Completed'}
                  </div>
                </div>
              </div>

              {/* Privacy Controls - Only for reporter (user/admin/management who created the report) */}
              {(currentUser.role === 'user' || currentUser.role === 'admin' || currentUser.role === 'management') && (
                <div className="chat-privacy-controls">
                  <select
                    value={selectedConversation.visibility}
                    onChange={(e) => updateVisibility(e.target.value)}
                    className="chat-visibility-select"
                  >
                    <option value="private">🔒 Private</option>
                    <option value="sharedWithAdmin">👁️ Share with Admin</option>
                    <option value="sharedWithManagement">👁️ Share with Management</option>
                    <option value="sharedWithBoth">👁️ Share with Both</option>
                  </select>
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="chat-messages">
              {messages.length === 0 ? (
                <div className="chat-no-messages">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                <>
                  {messages.map((msg) => {
                    const isOwnMessage = msg.senderId === (currentUser.id || currentUser._id);
                    return (
                      <div
                        key={msg._id}
                        className={`chat-message ${isOwnMessage ? 'own' : 'other'}`}
                      >
                        <div className="chat-message-bubble">
                          <div className="chat-message-text">{msg.messageText}</div>
                          <div className="chat-message-time">
                            {formatTime(msg.timestamp)}
                            {isOwnMessage && (
                              <span className="chat-message-status">
                                {msg.isRead ? ' ✓✓' : ' ✓'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Instagram-style "Seen" indicator */}
                  {messages.length > 0 && (() => {
                    const lastMessage = messages[messages.length - 1];
                    const isOwnLastMessage = lastMessage.senderId === (currentUser.id || currentUser._id);
                    const otherPersonName = currentUser.role === 'worker' 
                      ? selectedConversation.userName 
                      : selectedConversation.workerName;
                    
                    if (isOwnLastMessage && lastMessage.isRead) {
                      return (
                        <div className="chat-seen-indicator">
                          Seen by {otherPersonName}
                        </div>
                      );
                    }
                    return null;
                  })()}
                  
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Message Input */}
            <div className="chat-input-container">
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message... (Press Enter to send)"
                className="chat-input"
                rows="2"
                disabled={sending}
              />
              <button
                onClick={sendMessage}
                disabled={!messageText.trim() || sending}
                className="chat-send-button"
              >
                {sending ? '...' : '📤 Send'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatSystem;
