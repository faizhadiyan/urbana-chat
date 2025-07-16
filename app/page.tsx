"use client";

import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import ChatSidebar from "@/components/ChatSidebar";
import ChatView from "@/components/ChatView";

const API_BASE = '/api';

export default function Home() {
  const [userId, setUserId] = useState<string | null>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Generate or load user ID
  useEffect(() => {
    const storedUserId = localStorage.getItem("web_user_id") || uuidv4();
    localStorage.setItem("web_user_id", storedUserId);
    setUserId(storedUserId);
  }, []);

  // Fetch chats
  useEffect(() => {
    if (userId) {
      fetchChats(userId);
    }
  }, [userId]);

  const fetchChats = async (userId: string) => {
    try {
      const res = await fetch(`${API_BASE}/web/chats`, {
        headers: { 
          "x-user-id": userId,
          "Content-Type": "application/json"
        },
      });
      
      if (!res.ok) throw new Error('Failed to fetch chats');
      
      const data = await res.json();
      setChats(data.chats || []);
    } catch (err) {
      console.error('Error fetching chats:', err);
      setError('Failed to load chats');
    }
  };

  const createNewChat = async () => {
    const currentUserId = localStorage.getItem("web_user_id");
    if (!currentUserId) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/web/chats`, {
        method: "POST",
        headers: { 
          "x-user-id": currentUserId,
          "Content-Type": "application/json"
        },
      });
      
      if (!res.ok) throw new Error('Failed to create chat');
      
      const data = await res.json();
      setChats((prev) => [data.chat, ...prev]);
      setSelectedChatId(data.chat.id);
      setError(null);
    } catch (err) {
      console.error('Error creating chat:', err);
      setError('Failed to create new chat');
    } finally {
      setLoading(false);
    }
  };

  const selectChat = (chatId: string) => {
    setSelectedChatId(chatId);
  };

  if (!userId) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <ChatSidebar
        chats={chats}
        onCreateChat={createNewChat}
        onSelectChat={selectChat}
        selectedChatId={selectedChatId}
      />
      
      {/* Error notification */}
      {error && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg z-50">
          {error}
          <button 
            onClick={() => setError(null)}
            className="ml-2 text-white hover:text-gray-200"
          >
            ×
          </button>
        </div>
      )}
      
      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {selectedChatId ? (
          <ChatView chatId={selectedChatId} userId={userId} />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-white dark:bg-gray-900">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                Welcome to Urbana Chat
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Select a conversation from the sidebar or create a new one to start chatting.
              </p>
              <button
                onClick={createNewChat}
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Creating...' : 'Start New Chat'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}