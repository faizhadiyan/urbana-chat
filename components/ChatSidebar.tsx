"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  UserIcon,
  EllipsisVerticalIcon,
  SunIcon,
  MoonIcon,
  BellIcon,
  ArchiveBoxIcon,
  TrashIcon,
  PencilIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  SparklesIcon,
  CheckIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";
import { 
  HeartIcon, 
  StarIcon,
  FireIcon,
  LightBulbIcon 
} from "@heroicons/react/24/solid";
import { formatDistanceToNow } from "date-fns";
import { cn, formatTime, generateGradient, getInitials } from "../lib/utils";

interface Chat {
  id: string;
  name?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  isOnline?: boolean;
  isPinned?: boolean;
  isArchived?: boolean;
  avatar?: string;
  participants?: string[];
  lastActivity?: string;
  type?: 'individual' | 'group' | 'ai';
  mood?: 'happy' | 'work' | 'urgent' | 'casual';
}

interface ChatSidebarProps {
  chats: Chat[];
  onCreateChat: () => void;
  onSelectChat: (chatId: string) => void;
  selectedChatId?: string;
  currentUser?: {
    name: string;
    avatar?: string;
    status?: 'online' | 'away' | 'busy' | 'offline';
  };
  onToggleDarkMode?: () => void;
  isDarkMode?: boolean;
}

const SIDEBAR_VARIANTS = {
  open: {
    width: "320px",
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
      staggerChildren: 0.1
    }
  },
  closed: {
    width: "80px",
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
      staggerChildren: 0.05,
      staggerDirection: -1
    }
  }
};

const ITEM_VARIANTS = {
  open: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30
    }
  },
  closed: {
    opacity: 0,
    x: -20,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30
    }
  }
};

export default function ChatSidebar({
  chats,
  onCreateChat,
  onSelectChat,
  selectedChatId,
  currentUser = { name: "You", status: "online" },
  onToggleDarkMode,
  isDarkMode = false
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoveredChat, setHoveredChat] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ chatId: string; x: number; y: number } | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'pinned' | 'archived'>('all');
  const [sortBy, setSortBy] = useState<'time' | 'name' | 'unread'>('time');
  const [showNewChatAnimation, setShowNewChatAnimation] = useState(false);

  const filteredAndSortedChats = useMemo(() => {
    let filtered = chats.filter(chat => {
      // Filter by search query
      const matchesSearch = !searchQuery.trim() || 
        (chat.name || `Chat ${chat.id.slice(0, 8)}`)
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (chat.lastMessage || '')
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      // Filter by category
      const matchesFilter = (() => {
        switch (filter) {
          case 'unread':
            return (chat.unreadCount || 0) > 0;
          case 'pinned':
            return chat.isPinned;
          case 'archived':
            return chat.isArchived;
          default:
            return !chat.isArchived;
        }
      })();

      return matchesSearch && matchesFilter;
    });

    // Sort chats
    filtered.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'unread':
          return (b.unreadCount || 0) - (a.unreadCount || 0);
        case 'time':
        default:
          return new Date(b.lastMessageTime || 0).getTime() - new Date(a.lastMessageTime || 0).getTime();
      }
    });

    return filtered;
  }, [chats, searchQuery, filter, sortBy]);

  const formatChatName = (chat: Chat) => {
    return chat.name || `Chat ${chat.id.slice(0, 8)}`;
  };

  const formatLastMessageTime = (timestamp?: string) => {
    if (!timestamp) return "";
    return formatTime(new Date(timestamp));
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      case 'busy':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getMoodEmoji = (mood?: string) => {
    switch (mood) {
      case 'happy':
        return '😊';
      case 'work':
        return '💼';
      case 'urgent':
        return '🚨';
      case 'casual':
        return '😎';
      default:
        return '💬';
    }
  };

  const handleNewChat = () => {
    setShowNewChatAnimation(true);
    setTimeout(() => {
      onCreateChat();
      setShowNewChatAnimation(false);
    }, 300);
  };

  const handleContextMenu = (e: React.MouseEvent, chatId: string) => {
    e.preventDefault();
    setContextMenu({ chatId, x: e.clientX, y: e.clientY });
  };

  const unreadCount = chats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);

  return (
    <>
      <motion.div
        variants={SIDEBAR_VARIANTS}
        animate={isCollapsed ? "closed" : "open"}
        className="relative flex flex-col h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-r border-white/10 overflow-hidden"
      >
        {/* Gradient Background */}
        <div className="absolute inset-0 gradient-mesh opacity-5" />
        
        {/* Glass Overlay */}
        <div className="absolute inset-0 glass-dark" />

        {/* Header */}
        <motion.div
          className="relative z-10 p-4 border-b border-white/10"
          variants={ITEM_VARIANTS}
        >
          <div className="flex items-center justify-between">
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center space-x-2"
                >
                  <motion.div
                    className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <SparklesIcon className="w-4 h-4 text-white" />
                  </motion.div>
                  <div>
                    <h1 className="text-lg font-bold text-white">Urbana Chat</h1>
                    <p className="text-xs text-gray-400">
                      {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="flex items-center space-x-2">
              <motion.button
                onClick={handleNewChat}
                className="p-2 text-blue-400 hover:text-blue-300 rounded-full hover:bg-white/10 transition-colors relative"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title="New Chat"
              >
                <PlusIcon className="w-5 h-5" />
                <AnimatePresence>
                  {showNewChatAnimation && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1.2, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      className="absolute inset-0 bg-blue-500 rounded-full -z-10"
                    />
                  )}
                </AnimatePresence>
              </motion.button>
              
              <motion.button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <motion.div
                  animate={{ rotate: isCollapsed ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChevronDownIcon className="w-5 h-5" />
                </motion.div>
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Search and Filters */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="relative z-10 p-4 space-y-3"
            >
              {/* Search Bar */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <motion.input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 glass rounded-full border border-white/20 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-white placeholder-gray-400 text-sm transition-all duration-300"
                  whileFocus={{ scale: 1.02 }}
                />
              </div>

              {/* Filters */}
              <div className="flex items-center space-x-1 overflow-x-auto">
                {[
                  { key: 'all', label: 'All', icon: ChatBubbleLeftRightIcon },
                  { key: 'unread', label: 'Unread', icon: BellIcon },
                  { key: 'pinned', label: 'Pinned', icon: StarIcon },
                  { key: 'archived', label: 'Archived', icon: ArchiveBoxIcon }
                ].map((filterOption) => (
                  <motion.button
                    key={filterOption.key}
                    onClick={() => setFilter(filterOption.key as any)}
                    className={cn(
                      "flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300",
                      filter === filterOption.key
                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                        : "text-gray-400 hover:text-white hover:bg-white/10"
                    )}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <filterOption.icon className="w-3 h-3" />
                    <span>{filterOption.label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* User Profile */}
        <motion.div
          variants={ITEM_VARIANTS}
          className="relative z-10 p-4 border-b border-white/10"
        >
          <div className="flex items-center space-x-3">
            <div className="relative">
              <motion.div
                className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-medium"
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                {currentUser.avatar ? (
                  <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full rounded-full" />
                ) : (
                  <span className="text-sm">{getInitials(currentUser.name)}</span>
                )}
              </motion.div>
              <motion.div
                className={cn(
                  "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-800",
                  getStatusColor(currentUser.status)
                )}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex-1 min-w-0"
                >
                  <p className="font-medium text-white truncate">{currentUser.name}</p>
                  <p className="text-sm text-gray-400 capitalize">{currentUser.status || 'online'}</p>
                </motion.div>
              )}
            </AnimatePresence>
            
            <motion.button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Cog6ToothIcon className="w-4 h-4" />
            </motion.button>
          </div>
        </motion.div>

        {/* Chat List */}
        <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="popLayout">
            {filteredAndSortedChats.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="p-8 text-center"
              >
                <ChatBubbleLeftRightIcon className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400 mb-2">
                  {searchQuery ? "No conversations found" : "No conversations yet"}
                </p>
                <p className="text-sm text-gray-500">
                  {searchQuery ? "Try a different search term" : "Start a new chat to begin"}
                </p>
              </motion.div>
            ) : (
              <div className="space-y-1 p-2">
                {filteredAndSortedChats.map((chat, index) => (
                  <motion.div
                    key={chat.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ 
                      opacity: 1, 
                      y: 0,
                      transition: { delay: index * 0.05 }
                    }}
                    exit={{ opacity: 0, y: -20 }}
                    whileHover={{ scale: 1.02 }}
                    className={cn(
                      "group relative p-3 rounded-xl cursor-pointer transition-all duration-300",
                      selectedChatId === chat.id
                        ? "bg-blue-500/20 border border-blue-500/30 shadow-glass"
                        : "hover:bg-white/5 border border-transparent"
                    )}
                    onClick={() => onSelectChat(chat.id)}
                    onContextMenu={(e) => handleContextMenu(e, chat.id)}
                    onMouseEnter={() => setHoveredChat(chat.id)}
                    onMouseLeave={() => setHoveredChat(null)}
                  >
                    {/* Shimmer effect on hover */}
                    <AnimatePresence>
                      {hoveredChat === chat.id && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 shimmer rounded-xl"
                        />
                      )}
                    </AnimatePresence>

                    <div className="relative z-10 flex items-center space-x-3">
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <motion.div
                          className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center text-white font-medium",
                            generateGradient(chat.id)
                          )}
                          whileHover={{ scale: 1.1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        >
                          {chat.avatar ? (
                            <img src={chat.avatar} alt={formatChatName(chat)} className="w-full h-full rounded-full" />
                          ) : (
                            <span className="text-sm">{getInitials(formatChatName(chat))}</span>
                          )}
                        </motion.div>
                        
                        {/* Online Status */}
                        {chat.isOnline && (
                          <motion.div
                            className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-800"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                        )}
                        
                        {/* Chat Type Indicator */}
                        <div className="absolute -top-1 -right-1 text-xs">
                          {getMoodEmoji(chat.mood)}
                        </div>
                      </div>

                      <AnimatePresence mode="wait">
                        {!isCollapsed && (
                          <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex-1 min-w-0"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center space-x-2">
                                <h3 className="font-medium text-white truncate text-sm">
                                  {formatChatName(chat)}
                                </h3>
                                {chat.isPinned && (
                                  <StarIcon className="w-3 h-3 text-yellow-400" />
                                )}
                              </div>
                              {chat.lastMessageTime && (
                                <span className="text-xs text-gray-500 flex-shrink-0">
                                  {formatLastMessageTime(chat.lastMessageTime)}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-gray-400 truncate">
                                {chat.lastMessage || "No messages yet"}
                              </p>
                              <div className="flex items-center space-x-1">
                                {chat.unreadCount && chat.unreadCount > 0 && (
                                  <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="bg-blue-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center"
                                  >
                                    {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                                  </motion.span>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="fixed top-20 left-4 w-64 glass border border-white/20 rounded-lg shadow-glass-lg z-50"
          >
            <div className="p-4 space-y-2">
              <h3 className="font-medium text-white mb-3">Settings</h3>
              
              <motion.button
                onClick={onToggleDarkMode}
                className="w-full flex items-center justify-between p-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center space-x-2">
                  {isDarkMode ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
                  <span>Dark Mode</span>
                </div>
                <motion.div
                  className={cn(
                    "w-10 h-6 rounded-full p-1 transition-colors",
                    isDarkMode ? "bg-blue-500" : "bg-gray-600"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleDarkMode?.();
                  }}
                >
                  <motion.div
                    className="w-4 h-4 bg-white rounded-full"
                    animate={{ x: isDarkMode ? 16 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </motion.div>
              </motion.button>

              <motion.button
                className="w-full flex items-center space-x-2 p-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <BellIcon className="w-4 h-4" />
                <span>Notifications</span>
              </motion.button>

              <motion.button
                className="w-full flex items-center space-x-2 p-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <UserIcon className="w-4 h-4" />
                <span>Profile</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed z-50 glass border border-white/20 rounded-lg shadow-glass-lg p-2 min-w-[160px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {[
              { icon: PencilIcon, label: "Rename", action: () => {} },
              { icon: StarIcon, label: "Pin", action: () => {} },
              { icon: ArchiveBoxIcon, label: "Archive", action: () => {} },
              { icon: TrashIcon, label: "Delete", action: () => {} }
            ].map((item, index) => (
              <motion.button
                key={index}
                onClick={() => {
                  item.action();
                  setContextMenu(null);
                }}
                className="w-full flex items-center space-x-2 p-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close */}
      {(showSettings || contextMenu) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowSettings(false);
            setContextMenu(null);
          }}
        />
      )}
    </>
  );
}