const { createServer } = require('http');
const { Server } = require('socket.io');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const port = process.env.PORT || 3000;
const wsPort = process.env.WS_PORT || 3001;

app.prepare().then(() => {
  // Create HTTP server for Next.js
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  // Create WebSocket server
  const wsServer = createServer();
  const io = new Server(wsServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.NEXT_PUBLIC_API_URL 
        : ['http://localhost:3000', 'http://localhost:3001'],
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Store active connections
  const activeConnections = new Map();
  const chatRooms = new Map();

  io.on('connection', (socket) => {
    console.log(`[WebSocket] User connected: ${socket.id}`);
    
    const userId = socket.handshake.query.userId;
    if (userId) {
      activeConnections.set(socket.id, { userId, socket });
      console.log(`[WebSocket] User ${userId} connected with socket ${socket.id}`);
    }

    // Handle joining a chat room
    socket.on('join-chat', ({ chatId, userId }) => {
      console.log(`[WebSocket] User ${userId} joining chat ${chatId}`);
      
      // Leave previous rooms
      const rooms = Array.from(socket.rooms).filter(room => room !== socket.id);
      rooms.forEach(room => {
        socket.leave(room);
        console.log(`[WebSocket] User ${userId} left room ${room}`);
      });
      
      // Join new room
      socket.join(chatId);
      
      // Update chat rooms tracking
      if (!chatRooms.has(chatId)) {
        chatRooms.set(chatId, new Set());
      }
      chatRooms.get(chatId).add(userId);
      
      // Notify others in the room
      socket.to(chatId).emit('user-joined', {
        userId,
        userName: `User ${userId.slice(0, 8)}`,
        timestamp: new Date().toISOString()
      });
      
      console.log(`[WebSocket] User ${userId} joined chat ${chatId}`);
    });

    // Handle leaving a chat room
    socket.on('leave-chat', ({ chatId, userId }) => {
      console.log(`[WebSocket] User ${userId} leaving chat ${chatId}`);
      
      socket.leave(chatId);
      
      // Update chat rooms tracking
      if (chatRooms.has(chatId)) {
        chatRooms.get(chatId).delete(userId);
        if (chatRooms.get(chatId).size === 0) {
          chatRooms.delete(chatId);
        }
      }
      
      // Notify others in the room
      socket.to(chatId).emit('user-left', {
        userId,
        timestamp: new Date().toISOString()
      });
      
      console.log(`[WebSocket] User ${userId} left chat ${chatId}`);
    });

    // Handle sending messages
    socket.on('send-message', (messageData) => {
      const { chatId, userId, content, type = 'text' } = messageData;
      console.log(`[WebSocket] Message from ${userId} in chat ${chatId}: ${content}`);
      
      const message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
        chatId,
        userId,
        content,
        type,
        timestamp: new Date().toISOString(),
        isFromAgent: false
      };
      
      // Broadcast to all users in the chat room
      io.to(chatId).emit('new-message', message);
    });

    // Handle typing indicators
    socket.on('user-typing', ({ chatId, userId }) => {
      console.log(`[WebSocket] User ${userId} is typing in chat ${chatId}`);
      socket.to(chatId).emit('user-typing', {
        userId,
        isTyping: true,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('user-stopped-typing', ({ chatId, userId }) => {
      console.log(`[WebSocket] User ${userId} stopped typing in chat ${chatId}`);
      socket.to(chatId).emit('user-stopped-typing', {
        userId,
        isTyping: false,
        timestamp: new Date().toISOString()
      });
    });

    // Handle getting online users
    socket.on('get-online-users', ({ chatId }) => {
      const onlineUsers = chatRooms.get(chatId) || new Set();
      socket.emit('online-users', {
        chatId,
        users: Array.from(onlineUsers),
        count: onlineUsers.size
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`[WebSocket] User disconnected: ${socket.id}`);
      
      const connection = activeConnections.get(socket.id);
      if (connection) {
        const { userId } = connection;
        
        // Remove from all chat rooms
        chatRooms.forEach((users, chatId) => {
          if (users.has(userId)) {
            users.delete(userId);
            socket.to(chatId).emit('user-left', {
              userId,
              timestamp: new Date().toISOString()
            });
            
            if (users.size === 0) {
              chatRooms.delete(chatId);
            }
          }
        });
        
        activeConnections.delete(socket.id);
        console.log(`[WebSocket] Cleaned up user ${userId}`);
      }
    });
  });

  // Start servers
  httpServer.listen(port, () => {
    console.log(`[Next.js] Server running on http://localhost:${port}`);
  });

  wsServer.listen(wsPort, () => {
    console.log(`[WebSocket] Server running on ws://localhost:${wsPort}`);
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\\n[Server] Shutting down gracefully...');
    httpServer.close(() => {
      console.log('[Next.js] Server closed');
    });
    wsServer.close(() => {
      console.log('[WebSocket] Server closed');
      process.exit(0);
    });
  });
}).catch((err) => {
  console.error('Error starting server:', err);
  process.exit(1);
});