import { NextResponse } from 'next/server';

// In-memory storage for chats
let chats: any[] = [];

export async function GET(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');

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

    // Filter chats for this user
    const userChats = chats
      .filter((chat) => chat.userId === userId)
      .map((chat) => ({
        ...chat,
        lastMessage: null,
        lastMessageTime: chat.createdAt,
        unreadCount: 0,
        participants: 2,
        isActive: true,
      }));

    return NextResponse.json({
      success: true,
      chats: userChats,
    });
  } catch (error) {
    console.error('Error fetching chats:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch chats',
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');

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

    // Create a new chat
    const newChat = {
      id: Math.random().toString(36).substring(7),
      userId,
      name: `Chat ${chats.length + 1}`,
      createdAt: new Date().toISOString(),
    };

    // Add to chats array
    chats.push(newChat);

    // Log for debugging
    console.log('Created new chat:', newChat);
    console.log('Total chats:', chats.length);

    return NextResponse.json({
      success: true,
      chat: {
        ...newChat,
        lastMessage: null,
        lastMessageTime: newChat.createdAt,
        unreadCount: 0,
        participants: 2,
        isActive: true,
      },
    });
  } catch (error) {
    console.error('Error creating chat:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create chat',
      },
      {
        status: 500,
      }
    );
  }
}
