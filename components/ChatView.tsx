"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  PaperAirplaneIcon, 
  FaceSmileIcon, 
  PaperClipIcon, 
  CheckIcon, 
  CheckCircleIcon, 
  ClockIcon, 
  XMarkIcon,
  WifiIcon,
  SignalIcon,
  SignalSlashIcon
} from "@heroicons/react/24/outline";
import { HeartIcon } from "@heroicons/react/24/solid";
import EmojiPicker from "emoji-picker-react";
import { formatDistanceToNow } from "date-fns";
import { useWebSocket } from "../hooks/useWebSocket";
import { cn, formatTime, generateGradient } from "../lib/utils";

const API_BASE = '/api';

interface Message {
  id: string;
  content: string;
  isFromAgent: boolean;
  timestamp: string;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  type: 'text' | 'image' | 'file';
  fileName?: string;
  fileUrl?: string;
  reactions?: { emoji: string; count: number; users: string[] }[];
}

interface ChatViewProps {
  chatId: string;
  userId: string;
  onTyping?: (isTyping: boolean) => void;
  isUserTyping?: boolean;
}

export default function ChatView({ chatId, userId, onTyping, isUserTyping }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [hoveredMessage, setHoveredMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Initialize WebSocket connection
  const {
    isConnected,
    connectionError,
    sendMessage: sendWSMessage,
    sendTypingIndicator,
    joinChat,
    leaveChat
  } = useWebSocket({
    userId,
    chatId,
    onMessage: (newMessage) => {
      setMessages(prev => {
        const exists = prev.some(msg => msg.id === newMessage.id);
        if (!exists) {
          return [...prev, newMessage];
        }
        return prev;
      });
    },
    onTyping: (data) => {
      if (data.userId !== userId) {
        onTyping?.(data.isTyping);
      }
    },
    onUserJoined: (data) => {
      setOnlineUsers(prev => [...prev.filter(u => u !== data.userId), data.userId]);
    },
    onUserLeft: (data) => {
      setOnlineUsers(prev => prev.filter(u => u !== data.userId));
    }
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Poll messages every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchMessages(), 2000);
    fetchMessages();
    return () => clearInterval(interval);
  }, [chatId]);

  // Handle typing indicator with WebSocket
  useEffect(() => {
    if (input.trim() && !isTyping) {
      setIsTyping(true);
      sendTypingIndicator(true);
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTypingIndicator(false);
    }, 1000);
    
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [input, isTyping, sendTypingIndicator]);

  // Join chat room when chatId changes
  useEffect(() => {
    if (chatId) {
      joinChat(chatId);
    }
    return () => {
      if (chatId) {
        leaveChat(chatId);
      }
    };
  }, [chatId, joinChat, leaveChat]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`${API_BASE}/web/chats/${chatId}/messages`, {
        headers: { "x-user-id": userId },
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      if (data.success) {
        const formattedMessages = (data.messages || []).map((msg: any) => ({
          ...msg,
          status: msg.status || 'delivered',
          type: msg.type || 'text',
          timestamp: msg.timestamp || msg.created_at || new Date().toISOString(),
          reactions: msg.reactions || []
        }));
        setMessages(formattedMessages);
        setError(null);
      } else {
        throw new Error(data.error || 'Failed to fetch messages');
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('Failed to load messages');
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !selectedFile) return;
    
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const newMessage: Message = {
      id: messageId,
      content: input,
      isFromAgent: false,
      timestamp: new Date().toISOString(),
      status: 'sending',
      type: selectedFile ? (selectedFile.type.startsWith('image/') ? 'image' : 'file') : 'text',
      fileName: selectedFile?.name,
      fileUrl: selectedFile ? URL.createObjectURL(selectedFile) : undefined,
      reactions: []
    };
    
    // Add optimistic message with animation
    setMessages(prev => [...prev, newMessage]);
    const currentInput = input;
    setInput("");
    setSelectedFile(null);
    setLoading(true);
    
    try {
      if (isConnected) {
        sendWSMessage({
          content: currentInput,
          type: newMessage.type,
          fileName: newMessage.fileName,
          fileUrl: newMessage.fileUrl
        });
        
        setMessages(prev => prev.map(msg => 
          msg.id === messageId ? { ...msg, status: 'sent' } : msg
        ));
      } else {
        // Fallback to HTTP API
        const formData = new FormData();
        formData.append('content', currentInput);
        if (selectedFile) {
          formData.append('file', selectedFile);
        }
        
        const res = await fetch(`${API_BASE}/web/chats/${chatId}/messages`, {
          method: "POST",
          headers: {
            "x-user-id": userId,
          },
          body: formData,
        });

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        if (data.success) {
          setMessages(prev => prev.map(msg => 
            msg.id === messageId ? { ...msg, status: 'sent' } : msg
          ));
          await fetchMessages();
        } else {
          throw new Error(data.error || 'Failed to send message');
        }
      }
      
      setError(null);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      setInput(currentInput);
    } finally {
      setLoading(false);
    }
  };

  const handleEmojiClick = (emojiObject: any) => {
    setInput(prev => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const addReaction = (messageId: string, emoji: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        const reactions = msg.reactions || [];
        const existingReaction = reactions.find(r => r.emoji === emoji);
        
        if (existingReaction) {
          const userIndex = existingReaction.users.indexOf(userId);
          if (userIndex > -1) {
            // Remove user's reaction
            existingReaction.users.splice(userIndex, 1);
            existingReaction.count--;
            if (existingReaction.count === 0) {
              return { ...msg, reactions: reactions.filter(r => r.emoji !== emoji) };
            }
          } else {
            // Add user's reaction
            existingReaction.users.push(userId);
            existingReaction.count++;
          }
        } else {
          // Add new reaction
          reactions.push({ emoji, count: 1, users: [userId] });
        }
        
        return { ...msg, reactions };
      }
      return msg;
    }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sending':
        return <ClockIcon className="w-4 h-4 text-gray-400 animate-spin" />;
      case 'sent':
        return <CheckIcon className="w-4 h-4 text-gray-400" />;
      case 'delivered':
        return <CheckCircleIcon className="w-4 h-4 text-gray-400" />;
      case 'read':
        return <CheckCircleIcon className="w-4 h-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const renderMessage = (msg: Message, index: number) => {
    const isFromUser = !msg.isFromAgent;
    const showAvatar = !isFromUser && (index === 0 || messages[index - 1].isFromAgent !== msg.isFromAgent);
    
    return (
      <motion.div
        key={msg.id}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={cn(
          "group flex items-end space-x-2 mb-4",
          isFromUser ? "justify-end" : "justify-start"
        )}
        onMouseEnter={() => setHoveredMessage(msg.id)}
        onMouseLeave={() => setHoveredMessage(null)}
      >
        {/* Avatar for agent messages */}
        {!isFromUser && (
          <motion.div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium",
              showAvatar ? "opacity-100" : "opacity-0",
              generateGradient(msg.id)
            )}
            initial={{ scale: 0 }}
            animate={{ scale: showAvatar ? 1 : 0 }}
            transition={{ delay: 0.1 }}
          >
            AI
          </motion.div>
        )}

        {/* Message Content */}
        <div className="flex flex-col max-w-[70%]">
          <motion.div
            className={cn(
              "relative px-4 py-3 rounded-2xl shadow-glass backdrop-blur-md border",
              isFromUser
                ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white border-white/20 rounded-br-md"
                : "glass border-white/20 text-gray-800 rounded-bl-md",
              "transition-all duration-300 hover:shadow-glass-lg"
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* File Preview */}
            {msg.type === 'image' && msg.fileUrl && (
              <motion.img
                src={msg.fileUrl}
                alt={msg.fileName || 'Image'}
                className="max-w-full h-auto rounded-lg mb-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              />
            )}

            {msg.type === 'file' && msg.fileName && (
              <motion.div
                className="flex items-center space-x-2 mb-2 p-2 bg-black/10 rounded-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <PaperClipIcon className="w-4 h-4" />
                <span className="text-sm">{msg.fileName}</span>
              </motion.div>
            )}

            {/* Message Text */}
            {msg.content && (
              <p className="text-sm leading-relaxed break-words">
                {msg.content}
              </p>
            )}

            {/* Reactions */}
            {msg.reactions && msg.reactions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {msg.reactions.map((reaction, idx) => (
                  <motion.button
                    key={idx}
                    className="flex items-center space-x-1 px-2 py-1 bg-white/20 rounded-full text-xs"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => addReaction(msg.id, reaction.emoji)}
                  >
                    <span>{reaction.emoji}</span>
                    <span>{reaction.count}</span>
                  </motion.button>
                ))}
              </div>
            )}

            {/* Message Info */}
            <div className={cn(
              "flex items-center justify-between mt-2 text-xs",
              isFromUser ? "text-blue-100" : "text-gray-500"
            )}>
              <span>{formatTime(msg.timestamp)}</span>
              {isFromUser && (
                <motion.div
                  className="ml-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {getStatusIcon(msg.status)}
                </motion.div>
              )}
            </div>

            {/* Shimmer effect for sending messages */}
            {msg.status === 'sending' && (
              <div className="absolute inset-0 shimmer rounded-2xl" />
            )}
          </motion.div>

          {/* Quick Reactions */}
          <AnimatePresence>
            {hoveredMessage === msg.id && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.8 }}
                className="flex space-x-1 mt-2"
              >
                {['❤️', '👍', '😂', '😮', '😢', '😡'].map((emoji) => (
                  <motion.button
                    key={emoji}
                    className="p-1 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white/90 transition-colors"
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => addReaction(msg.id, emoji)}
                  >
                    <span className="text-sm">{emoji}</span>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex-1 flex flex-col relative">
      {/* Gradient Background */}
      <div className="absolute inset-0 gradient-mesh opacity-20" />
      
      {/* Glass Overlay */}
      <div className="absolute inset-0 glass-dark" />

      {/* Chat Header */}
      <motion.div
        className="relative z-10 glass border-b border-white/10 px-6 py-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <motion.div
              className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium"
              whileHover={{ scale: 1.1 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              AI
            </motion.div>
            <div>
              <h2 className="text-lg font-semibold text-white">Urbana Assistant</h2>
              <p className="text-sm text-gray-300">
                {isUserTyping ? "Typing..." : "Online"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Connection Status */}
            <motion.div
              className="flex items-center space-x-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {isConnected ? (
                <>
                  <WifiIcon className="w-5 h-5 text-green-400" />
                  <span className="text-sm text-green-400">Connected</span>
                </>
              ) : (
                <>
                  <SignalSlashIcon className="w-5 h-5 text-red-400" />
                  <span className="text-sm text-red-400">Disconnected</span>
                </>
              )}
            </motion.div>
            
            {/* Online Users */}
            <motion.div
              className="flex items-center space-x-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm text-gray-300">
                {onlineUsers.length + 1} online
              </span>
            </motion.div>
          </div>
        </div>
        
        {/* Connection Error */}
        <AnimatePresence>
          {connectionError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 text-sm text-red-400 flex items-center"
            >
              <XMarkIcon className="w-4 h-4 mr-1" />
              {connectionError}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className="relative z-10 flex-1 overflow-y-auto p-6 custom-scrollbar"
      >
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="mb-4 p-4 glass border border-red-500/50 rounded-lg"
            >
              <div className="flex items-center text-red-400">
                <XMarkIcon className="w-5 h-5 mr-2" />
                {error}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <AnimatePresence mode="popLayout">
          {messages.map((msg, index) => renderMessage(msg, index))}
        </AnimatePresence>
        
        {/* Typing Indicator */}
        <AnimatePresence>
          {isUserTyping && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex justify-start mb-4"
            >
              <div className="glass rounded-2xl px-4 py-3 rounded-bl-md border border-white/20">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full typing-indicator" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full typing-indicator" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full typing-indicator" />
                  </div>
                  <span className="text-xs text-gray-500">AI is typing...</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <motion.div
        className="relative z-10 glass border-t border-white/10 p-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        {/* File Preview */}
        <AnimatePresence>
          {selectedFile && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3 p-3 glass rounded-lg flex items-center justify-between"
            >
              <div className="flex items-center space-x-2">
                <PaperClipIcon className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-300">{selectedFile.name}</span>
              </div>
              <motion.button
                onClick={removeSelectedFile}
                className="text-red-400 hover:text-red-300 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <XMarkIcon className="w-5 h-5" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Emoji Picker */}
        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="absolute bottom-20 left-4 z-50"
            >
              <div className="glass rounded-lg p-2">
                <EmojiPicker onEmojiClick={handleEmojiClick} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <form onSubmit={sendMessage} className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <motion.input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              className="w-full px-4 py-3 pr-20 glass rounded-full border border-white/20 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-white placeholder-gray-400 transition-all duration-300"
              disabled={loading}
              whileFocus={{ scale: 1.02 }}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
              <motion.button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-1 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <FaceSmileIcon className="w-5 h-5" />
              </motion.button>
              <motion.button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-1 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <PaperClipIcon className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
          <motion.button
            type="submit"
            disabled={loading || (!input.trim() && !selectedFile)}
            className={cn(
              "p-3 rounded-full transition-all duration-300 shadow-glass",
              loading || (!input.trim() && !selectedFile)
                ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 animate-glow"
            )}
            whileHover={{ scale: loading ? 1 : 1.05 }}
            whileTap={{ scale: loading ? 1 : 0.95 }}
          >
            {loading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <ClockIcon className="w-5 h-5" />
              </motion.div>
            ) : (
              <PaperAirplaneIcon className="w-5 h-5" />
            )}
          </motion.button>
        </form>
        
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.txt"
        />
      </motion.div>
    </div>
  );
}