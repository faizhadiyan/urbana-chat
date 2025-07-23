'use client';

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

// Use urbana-ai backend API
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

interface Chat {
  id: string;
  name?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
}

interface Message {
  id: string;
  content: string;
  isFromAgent: boolean;
  timestamp: string;
}

export default function Home() {
  const [userId, setUserId] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChats, setSelectedChats] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Generate or load user ID
  useEffect(() => {
    const storedUserId = localStorage.getItem('web_user_id') || uuidv4();
    localStorage.setItem('web_user_id', storedUserId);
    setUserId(storedUserId);
  }, []);

  // Fetch chats when user ID is available
  useEffect(() => {
    if (userId) {
      fetchChats();
    }
  }, [userId]);

  // Fetch messages when chat is selected
  useEffect(() => {
    if (selectedChatId && userId) {
      fetchMessages();
    }
  }, [selectedChatId, userId]);

  const fetchChats = async () => {
    if (!userId) return;
    
    try {
      const res = await fetch(`${API_BASE}/web/chats`, {
        headers: { 
          'x-user-id': userId,
          'Content-Type': 'application/json'
        }
      });
      
      if (!res.ok) throw new Error('Failed to fetch chats');
      
      const data = await res.json();
      if (data.success) {
        setChats(data.chats || []);
      }
    } catch (err) {
      console.error('Error fetching chats:', err);
      setError('Failed to load chats');
    }
  };

  const fetchMessages = async () => {
    if (!selectedChatId || !userId) return;
    
    try {
      const res = await fetch(`${API_BASE}/web/chats/${selectedChatId}/messages`, {
        headers: { 'x-user-id': userId }
      });
      
      if (!res.ok) throw new Error('Failed to load messages');
      
      const data = await res.json();
      if (data.success) {
        console.log('Fetched messages:', data.messages); // Debug log
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('Failed to load messages');
    }
  };

  const createNewChat = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/web/chats`, {
        method: 'POST',
        headers: { 
          'x-user-id': userId,
          'Content-Type': 'application/json'
        },
      });
      
      if (!res.ok) throw new Error('Failed to create chat');
      
      const data = await res.json();
      if (data.success) {
        setChats(prev => [data.chat, ...prev]);
        setSelectedChatId(data.chat.id);
        setIsSidebarOpen(false);
        setError(null);
      }
    } catch (err) {
      console.error('Error creating chat:', err);
      setError('Failed to create new chat');
    } finally {
      setLoading(false);
    }
  };

  const selectChat = (chatId: string) => {
    if (isSelectionMode) {
      toggleChatSelection(chatId);
    } else {
      setSelectedChatId(chatId);
      setIsSidebarOpen(false);
    }
  };

  const toggleChatSelection = (chatId: string) => {
    const newSelected = new Set(selectedChats);
    if (newSelected.has(chatId)) {
      newSelected.delete(chatId);
    } else {
      newSelected.add(chatId);
    }
    setSelectedChats(newSelected);
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedChats(new Set());
  };

  const selectAllChats = () => {
    if (selectedChats.size === filteredChats.length) {
      setSelectedChats(new Set());
    } else {
      setSelectedChats(new Set(filteredChats.map(chat => chat.id)));
    }
  };

  const deleteSelectedChats = async () => {
    if (selectedChats.size === 0) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/web/chats`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId!,
        },
        body: JSON.stringify({ chatIds: Array.from(selectedChats) }),
      });

      if (!res.ok) throw new Error('Failed to delete chats');
      
      const data = await res.json();
      if (data.success) {
        // Remove deleted chats from state
        setChats(prev => prev.filter(chat => !selectedChats.has(chat.id)));
        
        // If currently selected chat was deleted, clear selection
        if (selectedChatId && selectedChats.has(selectedChatId)) {
          setSelectedChatId(null);
          setMessages([]);
        }
        
        setSelectedChats(new Set());
        setIsSelectionMode(false);
        setShowDeleteConfirm(false);
        setError(null);
      }
    } catch (err) {
      console.error('Error deleting chats:', err);
      setError('Failed to delete chats');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedChatId || !userId || loading) return;
    
    setLoading(true);
    const currentInput = input;
    setInput('');
    
    try {
      const res = await fetch(`${API_BASE}/web/chats/${selectedChatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({ content: currentInput }),
      });

      if (!res.ok) throw new Error('Failed to send message');
      
      const data = await res.json();
      if (data.success) {
        setMessages(prev => [...prev, ...data.messages]);
        setError(null);
        
        // Smart polling for AI response
        const currentMessageCount = messages.length + data.messages.length;
        let pollCount = 0;
        const maxPolls = 15; // Poll for up to 15 seconds
        
        const pollForResponse = async () => {
          if (pollCount >= maxPolls) {
            console.log('Stopped polling - max attempts reached');
            return;
          }
          
          pollCount++;
          console.log(`Polling for AI response (attempt ${pollCount})...`);
          
          try {
            const res = await fetch(`${API_BASE}/web/chats/${selectedChatId}/messages`, {
              headers: { 'x-user-id': userId }
            });
            
            if (res.ok) {
              const pollData = await res.json();
              if (pollData.success && pollData.messages) {
                console.log('Poll result:', pollData.messages.length, 'messages');
                
                // If we got more messages than before, update and stop polling
                if (pollData.messages.length > currentMessageCount) {
                  console.log('New AI response detected! Updating messages...');
                  setMessages(pollData.messages);
                  return; // Stop polling
                }
              }
            }
          } catch (error) {
            console.error('Polling error:', error);
          }
          
          // Continue polling after 1 second
          setTimeout(pollForResponse, 1000);
        };
        
        // Start polling after 2 seconds
        setTimeout(pollForResponse, 2000);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
      setInput(currentInput);
    } finally {
      setLoading(false);
    }
  };

  const filteredChats = chats.filter(chat => {
    const name = chat.name || `Chat ${chat.id.slice(0, 8)}`;
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!userId) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading Urbana Chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      {/* Sidebar */}
      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h1 className="sidebar-title">Urbana Chat</h1>
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-box"
          />
          <div className="header-buttons">
            <button
              onClick={createNewChat}
              disabled={loading}
              className="new-chat-button"
            >
              {loading ? 'Creating...' : '+ New Chat'}
            </button>
            <button
              onClick={toggleSelectionMode}
              className={`select-button ${isSelectionMode ? 'active' : ''}`}
            >
              {isSelectionMode ? 'Cancel' : 'Select'}
            </button>
          </div>
          
          {isSelectionMode && (
            <div className="selection-controls">
              <button
                onClick={selectAllChats}
                className="select-all-button"
              >
                {selectedChats.size === filteredChats.length ? 'Deselect All' : 'Select All'}
              </button>
              {selectedChats.size > 0 && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="delete-button"
                  disabled={loading}
                >
                  Delete ({selectedChats.size})
                </button>
              )}
            </div>
          )}
        </div>
        
        <div className="chat-list">
          {filteredChats.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p>{searchQuery ? 'No chats found' : 'No conversations yet'}</p>
            </div>
          ) : (
            filteredChats.map((chat) => (
              <div
                key={chat.id}
                className={`chat-item-wrapper ${isSelectionMode ? 'selection-mode' : ''}`}
              >
                {isSelectionMode && (
                  <input
                    type="checkbox"
                    checked={selectedChats.has(chat.id)}
                    onChange={() => toggleChatSelection(chat.id)}
                    className="chat-checkbox"
                  />
                )}
                <button
                  onClick={() => selectChat(chat.id)}
                  className={`chat-item ${selectedChatId === chat.id && !isSelectionMode ? 'active' : ''} ${selectedChats.has(chat.id) && isSelectionMode ? 'selected' : ''}`}
                >
                  <div className="chat-avatar">
                    {(chat.name || chat.id.slice(0, 1)).charAt(0).toUpperCase()}
                  </div>
                  <div className="chat-info">
                    <p className="chat-name">
                      {chat.name || `Chat ${chat.id.slice(0, 8)}`}
                    </p>
                    <p className="chat-preview">
                      {chat.lastMessage || 'No messages yet'}
                    </p>
                  </div>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="chat-area">
        {selectedChatId ? (
          <>
            {/* Chat Header */}
            <div className="chat-header">
              <div className="mobile-header">
                <button 
                  className="menu-button"
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                >
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <h1 className="chat-title">
                  Chat {selectedChatId.slice(0, 8)}
                  <span className="online-indicator"></span>
                </h1>
              </div>
            </div>

            {/* Messages */}
            <div className="messages-container">
              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}
              
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`message ${!message.isFromAgent ? 'own' : ''}`}
                >
                  <div className={`message-avatar ${message.isFromAgent ? 'ai' : 'user'}`}>
                    {message.isFromAgent ? 'AI' : 'U'}
                  </div>
                  <div className="message-content">
                    <div className="message-header">
                      <span className="message-author">
                        {message.isFromAgent ? 'AI Assistant' : 'You'}
                      </span>
                      <span className="message-time">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                    <p className="message-text">{message.content}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Input Area */}
            <div className="input-area">
              <form onSubmit={sendMessage}>
                <div className="input-container">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage(e);
                      }
                    }}
                    placeholder="Type a message..."
                    disabled={loading}
                    className="message-input"
                    rows={1}
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="send-button"
                  >
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="welcome-screen">
            <div className="welcome-content">
              <div className="welcome-icon">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h1 className="welcome-title">Welcome to Urbana Chat</h1>
              <p className="welcome-subtitle">
                Start a conversation with our AI assistant. Select a chat from the sidebar or create a new one to begin.
              </p>
              <button onClick={createNewChat} className="start-button">
                Start New Chat
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Delete Chats</h3>
            <p>
              Are you sure you want to delete {selectedChats.size} chat{selectedChats.size > 1 ? 's' : ''}? 
              This action cannot be undone.
            </p>
            <div className="modal-buttons">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="cancel-button"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={deleteSelectedChats}
                className="confirm-delete-button"
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}