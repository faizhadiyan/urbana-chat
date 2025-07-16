"use client";

import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { motion, AnimatePresence } from "framer-motion";
import ChatSidebar from "@/components/ChatSidebar";
import ChatView from "@/components/ChatView";
import { ChatBubbleLeftRightIcon, ExclamationTriangleIcon, WifiIcon } from "@heroicons/react/24/outline";
import { SparklesIcon } from "@heroicons/react/24/solid";

const API_BASE = '/api';

export default function Home() {
  const [userId, setUserId] = useState<string | null>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Generate or load user ID
  useEffect(() => {
    const storedUserId = localStorage.getItem("web_user_id") || uuidv4();
    const storedDarkMode = localStorage.getItem("dark_mode") === "true";
    
    localStorage.setItem("web_user_id", storedUserId);
    localStorage.setItem("dark_mode", storedDarkMode.toString());
    
    console.log('User ID:', storedUserId);
    setUserId(storedUserId);
    setIsDarkMode(storedDarkMode);
    
    // Add a small delay to show loading state
    setTimeout(() => {
      setIsInitialized(true);
    }, 1000);
  }, []);

  // Apply dark mode class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Fetch chats
  useEffect(() => {
    if (userId && isInitialized) {
      fetchChats(userId).catch(err => {
        console.error('Failed to fetch chats:', err);
        setError('Failed to load chats. Please check your connection.');
      });
    }
  }, [userId, isInitialized]);

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
      
      // Enhanced chat data with additional properties
      const enhancedChats = (data.chats || []).map((chat: any) => ({
        ...chat,
        lastMessage: "Start chatting...",
        lastMessageTime: chat.created_at || new Date().toISOString(),
        unreadCount: Math.floor(Math.random() * 3), // Random unread count for demo
        isOnline: true,
        isPinned: Math.random() > 0.8, // 20% chance of being pinned
        isArchived: false,
        mood: ['happy', 'work', 'casual', 'urgent'][Math.floor(Math.random() * 4)],
        type: 'ai' as const
      }));
      
      setChats(enhancedChats);
      setError(null);
      return enhancedChats;
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
      
      // Enhanced new chat data
      const enhancedChat = {
        ...data.chat,
        lastMessage: "Start chatting...",
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0,
        isOnline: true,
        isPinned: false,
        isArchived: false,
        mood: 'casual',
        type: 'ai' as const
      };
      
      setChats((prev) => [enhancedChat, ...prev]);
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

  const handleTyping = (isTyping: boolean) => {
    setTypingUsers(prev => ({
      ...prev,
      [userId || 'unknown']: isTyping
    }));
  };

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem("dark_mode", newDarkMode.toString());
  };

  // Loading screen
  if (!isInitialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center space-y-6">
          <motion.div
            className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center mx-auto"
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 180, 360]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <SparklesIcon className="w-10 h-10 text-white" />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-2"
          >
            <h1 className="text-2xl font-bold text-white">Urbana Chat</h1>
            <p className="text-gray-400">Initializing your experience...</p>
          </motion.div>
          
          <motion.div
            className="w-32 h-1 bg-gray-700 rounded-full mx-auto overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
              animate={{ x: [-128, 128] }}
              transition={{ 
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 gradient-mesh opacity-10" />
      
      {/* Sidebar */}
      <ChatSidebar
        chats={chats}
        onCreateChat={createNewChat}
        onSelectChat={selectChat}
        selectedChatId={selectedChatId}
        currentUser={{
          name: "You",
          status: "online"
        }}
        onToggleDarkMode={toggleDarkMode}
        isDarkMode={isDarkMode}
      />
      
      {/* Error Toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className="fixed top-4 right-4 max-w-md z-50"
          >
            <div className="glass border border-red-500/50 rounded-lg p-4 shadow-glass-lg">
              <div className="flex items-center space-x-3">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-red-400 font-medium">Connection Error</p>
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Loading Toast */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
          >
            <div className="glass border border-blue-500/50 rounded-lg p-4 shadow-glass-lg">
              <div className="flex items-center space-x-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <WifiIcon className="w-6 h-6 text-blue-400" />
                </motion.div>
                <div>
                  <p className="text-blue-400 font-medium">Connecting...</p>
                  <p className="text-blue-300 text-sm">Setting up your chat experience</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <AnimatePresence mode="wait">
          {selectedChatId ? (
            <motion.div
              key={selectedChatId}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex-1"
            >
              <ChatView 
                chatId={selectedChatId} 
                userId={userId!}
                onTyping={handleTyping}
                isUserTyping={typingUsers[selectedChatId] || false}
              />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5 }}
              className="flex-1 flex flex-col items-center justify-center relative"
            >
              {/* Welcome Screen */}
              <div className="text-center max-w-md space-y-8">
                <motion.div
                  className="relative"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ 
                    delay: 0.2,
                    type: "spring",
                    stiffness: 200,
                    damping: 20
                  }}
                >
                  <div className="w-32 h-32 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-6 relative">
                    <ChatBubbleLeftRightIcon className="w-16 h-16 text-white" />
                    
                    {/* Floating particles */}
                    {[...Array(6)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-2 h-2 bg-white rounded-full"
                        style={{
                          top: `${20 + (i * 10)}%`,
                          left: `${20 + (i * 10)}%`,
                        }}
                        animate={{
                          y: [0, -10, 0],
                          opacity: [0.3, 1, 0.3],
                          scale: [1, 1.2, 1],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: i * 0.2,
                        }}
                      />
                    ))}
                  </div>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-4"
                >
                  <h2 className="text-4xl font-bold text-white">
                    Welcome to{" "}
                    <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                      Urbana Chat
                    </span>
                  </h2>
                  <p className="text-gray-400 text-lg leading-relaxed">
                    Experience the future of communication with our AI-powered chat platform. 
                    Start a conversation and discover intelligent responses tailored just for you.
                  </p>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="space-y-4"
                >
                  <motion.button
                    onClick={createNewChat}
                    className="group relative px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium shadow-glass hover:shadow-glass-lg transition-all duration-300 overflow-hidden"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={loading}
                  >
                    <span className="relative z-10 flex items-center space-x-2">
                      <SparklesIcon className="w-5 h-5" />
                      <span>Start New Chat</span>
                    </span>
                    
                    {/* Hover effect */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      initial={{ scale: 0 }}
                      whileHover={{ scale: 1 }}
                    />
                    
                    {/* Shimmer effect */}
                    <div className="absolute inset-0 shimmer" />
                  </motion.button>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>✨ AI-Powered</span>
                    <span>🚀 Real-time</span>
                    <span>🔒 Secure</span>
                  </div>
                </motion.div>
              </div>
              
              {/* Background decoration */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-blue-500 rounded-full opacity-20"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                    }}
                    animate={{
                      y: [0, -100, 0],
                      opacity: [0, 1, 0],
                    }}
                    transition={{
                      duration: 3 + Math.random() * 2,
                      repeat: Infinity,
                      delay: Math.random() * 2,
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}