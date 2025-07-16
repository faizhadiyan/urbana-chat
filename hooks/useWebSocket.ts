import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseWebSocketProps {
  userId: string;
  chatId?: string;
  onMessage?: (message: any) => void;
  onTyping?: (data: { userId: string; isTyping: boolean }) => void;
  onUserJoined?: (data: { userId: string; userName: string }) => void;
  onUserLeft?: (data: { userId: string }) => void;
}

export const useWebSocket = ({
  userId,
  chatId,
  onMessage,
  onTyping,
  onUserJoined,
  onUserLeft
}: UseWebSocketProps) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Connect to WebSocket server
    const newSocket = io(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001', {
      query: { userId },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setConnectionError(null);
      
      // Join chat room if chatId is provided
      if (chatId) {
        newSocket.emit('join-chat', { chatId, userId });
      }
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setConnectionError('Failed to connect to chat server');
      setIsConnected(false);
    });

    // Message handlers
    newSocket.on('new-message', (message) => {
      console.log('Received new message:', message);
      onMessage?.(message);
    });

    newSocket.on('user-typing', (data) => {
      console.log('User typing:', data);
      onTyping?.(data);
    });

    newSocket.on('user-stopped-typing', (data) => {
      console.log('User stopped typing:', data);
      onTyping?.({ ...data, isTyping: false });
    });

    newSocket.on('user-joined', (data) => {
      console.log('User joined:', data);
      onUserJoined?.(data);
    });

    newSocket.on('user-left', (data) => {
      console.log('User left:', data);
      onUserLeft?.(data);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      newSocket.close();
    };
  }, [userId, chatId, onMessage, onTyping, onUserJoined, onUserLeft]);

  // Join a chat room
  const joinChat = (newChatId: string) => {
    if (socket && isConnected) {
      socket.emit('join-chat', { chatId: newChatId, userId });
    }
  };

  // Leave a chat room
  const leaveChat = (chatIdToLeave: string) => {
    if (socket && isConnected) {
      socket.emit('leave-chat', { chatId: chatIdToLeave, userId });
    }
  };

  // Send a message
  const sendMessage = (message: any) => {
    if (socket && isConnected && chatId) {
      socket.emit('send-message', {
        chatId,
        userId,
        ...message
      });
    }
  };

  // Send typing indicator
  const sendTypingIndicator = (isTyping: boolean) => {
    if (socket && isConnected && chatId) {
      socket.emit(isTyping ? 'user-typing' : 'user-stopped-typing', {
        chatId,
        userId
      });
    }
  };

  // Get online users in current chat
  const getOnlineUsers = () => {
    if (socket && isConnected && chatId) {
      socket.emit('get-online-users', { chatId });
    }
  };

  return {
    socket,
    isConnected,
    connectionError,
    joinChat,
    leaveChat,
    sendMessage,
    sendTypingIndicator,
    getOnlineUsers
  };
};