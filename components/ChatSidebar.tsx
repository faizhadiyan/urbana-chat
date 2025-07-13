interface ChatSidebarProps {
  chats: any[];
  onCreateChat: () => void;
  onSelectChat: (chatId: string) => void;
}

export default function ChatSidebar({
  chats,
  onCreateChat,
  onSelectChat,
}: ChatSidebarProps) {
  return (
    <div className="w-64 bg-gray-100 p-4">
      <button
        onClick={onCreateChat}
        className="mb-4 bg-blue-500 text-white px-4 py-2 rounded"
      >
        New Chat
      </button>
      <ul>
        {chats.map((chat) => (
          <li
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            className="cursor-pointer py-2 hover:bg-gray-200"
          >
            {chat.name || `Chat ${chat.id.slice(0, 8)}`}
          </li>
        ))}
      </ul>
    </div>
  );
} 