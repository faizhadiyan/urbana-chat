"use client";

import { useState, useEffect } from "react";

const API_BASE = '/api';

interface ChatViewProps {
  chatId: string;
  userId: string;
}

export default function ChatView({ chatId, userId }: ChatViewProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Poll messages every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchMessages(), 2000);
    fetchMessages(); // Initial fetch
    return () => clearInterval(interval);
  }, [chatId]);

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
        setMessages(data.messages || []);
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
    if (!input.trim()) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/web/chats/${chatId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({ content: input }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      if (data.success) {
        setInput("");
        await fetchMessages(); // Refresh messages
        setError(null);
      } else {
        throw new Error(data.error || 'Failed to send message');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-lg ${
              !msg.isFromAgent
                ? "bg-blue-100 ml-auto"
                : "bg-gray-100"
            } max-w-[70%]`}
          >
            {msg.content}
          </div>
        ))}
      </div>
      <form onSubmit={sendMessage} className="p-4 border-t">
        <div className="flex space-x-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 p-2 border rounded"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className={`px-4 py-2 rounded ${
              loading
                ? "bg-gray-300"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
          >
            {loading ? "Sending..." : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
} 