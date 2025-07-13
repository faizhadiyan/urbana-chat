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
    console.log('User ID:', storedUserId);
    setUserId(storedUserId);
  }, []);

  // Fetch chats
  useEffect(() => {
    if (userId) {
      fetchChats(userId).catch(err => {
        console.error('Failed to fetch chats:', err);
        setError('Failed to load chats. Please check your connection.');
      });
    }
  }, [userId]);

  const fetchChats = async (userId: string) => {
    setLoading(true);
    try {
      console.log('Fetching chats...');
      const res = await fetch(`${API_BASE}/web/chats`, {
        headers: { 
          "x-user-id": userId,
          "Content-Type": "application/json"
        },
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      console.log('Received chats:', data);
      setChats(data.chats || []);
      setError(null);
      return data.chats || [];
    } catch (err) {
      console.error('Error fetching chats:', err);
      setError('Failed to fetch chats. Please try again.');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const createNewChat = async () => {
    const currentUserId = localStorage.getItem("web_user_id");
    console.log('Creating new chat with userId:', currentUserId);
    
    if (!currentUserId) {
      console.error('No user ID available in localStorage');
      return;
    }
    
    setLoading(true);
    try {
      console.log('Making API request to create chat...');
      const res = await fetch(`${API_BASE}/web/chats`, {
        method: "POST",
        headers: { 
          "x-user-id": currentUserId,
          "Content-Type": "application/json"
        },
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('API error response:', errorText);
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      console.log('New chat created:', data);
      setChats((prev) => [...prev, data.chat]);
      setSelectedChatId(data.chat.id);
      setError(null);
    } catch (err) {
      console.error('Error creating chat:', err);
      setError('Failed to create new chat. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectChat = (chatId: string) => {
    setSelectedChatId(chatId);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <ChatSidebar
        chats={chats}
        onCreateChat={createNewChat}
        onSelectChat={selectChat}
      />
      {error && (
        <div className="absolute top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      {loading && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
          Loading...
        </div>
      )}
      <div className="flex-1">
        {selectedChatId ? (
          <ChatView chatId={selectedChatId} userId={userId!} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select or create a chat to begin
          </div>
        )}
      </div>
    </div>
  );
} 