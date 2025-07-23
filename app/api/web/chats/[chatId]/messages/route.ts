import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// In-memory storage for messages
const messages: Record<string, any[]> = {};

export async function GET(request: Request, { params }: { params: { chatId: string } }) {
  try {
    const userId = request.headers.get('x-user-id');
    const { chatId } = await params;

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'User ID is required',
        },
        {
          status: 400,
        }
      );
    }

    console.log('Fetching messages for chat:', chatId, 'user:', userId);
    
    // Return messages for this chat
    return NextResponse.json({
      success: true,
      messages: messages[chatId] || [],
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch messages',
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(request: Request, { params }: { params: { chatId: string } }) {
  try {
    const userId = request.headers.get('x-user-id');
    const { chatId } = await params;

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'User ID is required',
        },
        {
          status: 400,
        }
      );
    }

    const body = await request.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json(
        {
          success: false,
          error: 'Message content is required',
        },
        {
          status: 400,
        }
      );
    }

    // Initialize messages array for this chat if it doesn't exist
    if (!messages[chatId]) {
      messages[chatId] = [];
    }

    // Create new message
    const newMessage = {
      id: uuidv4(),
      content,
      isFromAgent: false,
      timestamp: new Date().toISOString(),
    };

    // Add message to chat
    messages[chatId].push(newMessage);

    // Create agent response immediately
    const agentMessage = {
      id: uuidv4(),
      content: generateAgentResponse(content),
      isFromAgent: true,
      timestamp: new Date().toISOString(),
    };
    messages[chatId].push(agentMessage);

    // Log for debugging
    console.log('Messages after update:', messages[chatId]);

    return NextResponse.json({
      success: true,
      messages: [newMessage, agentMessage],
    });
  } catch (error) {
    console.error('Error processing message:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process message',
      },
      {
        status: 500,
      }
    );
  }
}

function generateAgentResponse(userMessage: string): string {
  const greetings = ['hello', 'hi', 'hey', 'halo', 'hai'];
  const lowerMessage = userMessage.toLowerCase();

  // Check for greetings
  if (greetings.some((greeting) => lowerMessage.includes(greeting))) {
    return 'Hi there! How can I help you today? 👋';
  }

  // Check for questions
  if (lowerMessage.includes('?')) {
    return "That's an interesting question. Let me help you with that.";
  }

  // Check for gratitude
  if (lowerMessage.includes('thank')) {
    return "You're welcome! Is there anything else you'd like to know? 😊";
  }

  // Check for goodbyes
  if (lowerMessage.includes('bye') || lowerMessage.includes('goodbye')) {
    return 'Goodbye! Feel free to come back if you have more questions! 👋';
  }

  // Default responses for other messages
  const responses = [
    'I understand. Tell me more about that.',
    "That's interesting! What are your thoughts on this?",
    'I see. How can I help you further with this?',
    'Thanks for sharing. Would you like to explore this topic more?',
    "I appreciate your perspective. Let's discuss this further.",
  ];

  return responses[Math.floor(Math.random() * responses.length)];
}
