import { NextResponse } from 'next/server';

// In-memory storage for chats (replace with database in production)
let chats: any[] = [];

export async function GET(request: Request) {
  const userId = request.headers.get('x-user-id');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  // Filter chats for this user
  const userChats = chats.filter((chat) => chat.userId === userId);

  return NextResponse.json({ chats: userChats });
}

export async function POST(request: Request) {
  const userId = request.headers.get('x-user-id');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  // Create a new chat
  const newChat = {
    id: Math.random().toString(36).substring(7),
    userId,
    title: 'New Chat',
    createdAt: new Date().toISOString(),
    messages: [],
  };

  chats.push(newChat);

  return NextResponse.json({ chat: newChat });
}
