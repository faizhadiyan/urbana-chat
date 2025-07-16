import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

// In-memory storage for messages (replace with database in production)
let messages: any[] = [];

export async function GET(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  const userId = request.headers.get('x-user-id');
  const { chatId } = params;

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  if (!chatId) {
    return NextResponse.json({ error: 'Chat ID is required' }, { status: 400 });
  }

  // Filter messages for this chat
  const chatMessages = messages.filter((message) => message.chatId === chatId);

  return NextResponse.json({ 
    success: true, 
    messages: chatMessages.map(msg => ({
      ...msg,
      timestamp: msg.timestamp || msg.createdAt || new Date().toISOString(),
      status: msg.status || 'delivered'
    }))
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  const userId = request.headers.get('x-user-id');
  const { chatId } = params;

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  if (!chatId) {
    return NextResponse.json({ error: 'Chat ID is required' }, { status: 400 });
  }

  try {
    // Check if it's a FormData request (file upload)
    const contentType = request.headers.get('content-type');
    let content = '';
    let fileName = '';
    let fileUrl = '';
    let messageType = 'text';

    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData();
      content = formData.get('content') as string || '';
      const file = formData.get('file') as File;
      
      if (file) {
        fileName = file.name;
        // In production, you'd upload to a file storage service
        // For now, we'll just create a mock URL
        fileUrl = `/uploads/${Date.now()}-${fileName}`;
        messageType = file.type.startsWith('image/') ? 'image' : 'file';
      }
    } else {
      const body = await request.json();
      content = body.content || '';
    }

    // Create new message
    const newMessage = {
      id: Math.random().toString(36).substring(7),
      chatId,
      content,
      isFromAgent: false,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      status: 'sent',
      type: messageType,
      fileName,
      fileUrl,
      userId
    };

    messages.push(newMessage);

    // Simulate AI response after a delay
    setTimeout(() => {
      const aiResponse = {
        id: Math.random().toString(36).substring(7),
        chatId,
        content: generateAIResponse(content),
        isFromAgent: true,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        status: 'delivered',
        type: 'text',
        userId: 'ai'
      };
      
      messages.push(aiResponse);
    }, 1000 + Math.random() * 2000); // Random delay between 1-3 seconds

    return NextResponse.json({ success: true, message: newMessage });
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create message' 
    }, { status: 500 });
  }
}

// Simple AI response generator
function generateAIResponse(userMessage: string): string {
  const responses = [
    "That's interesting! Tell me more about that.",
    "I understand what you're saying. How can I help you with that?",
    "Great question! Let me think about that for a moment.",
    "I appreciate you sharing that with me. What would you like to know?",
    "That's a good point. I'd be happy to help you explore that further.",
    "I see what you mean. Let's work on that together.",
    "Thanks for bringing that up. What specific aspect would you like to discuss?",
    "I'm here to help! What would you like to focus on next?",
    "That's a thoughtful question. Let me provide some insights on that.",
    "I'm glad you asked! Here's what I think about that..."
  ];
  
  // Simple keyword-based responses
  const lowerMessage = userMessage.toLowerCase();
  
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    return "Hello! Welcome to Urbana Chat. How can I assist you today?";
  }
  
  if (lowerMessage.includes('help')) {
    return "I'm here to help! What can I do for you?";
  }
  
  if (lowerMessage.includes('name')) {
    return "I'm Andy, your friendly chat assistant. What's your name?";
  }
  
  if (lowerMessage.includes('thank')) {
    return "You're very welcome! Is there anything else I can help you with?";
  }
  
  if (lowerMessage.includes('bye') || lowerMessage.includes('goodbye')) {
    return "Goodbye! Feel free to come back anytime you need assistance.";
  }
  
  // Return a random response
  return responses[Math.floor(Math.random() * responses.length)];
}