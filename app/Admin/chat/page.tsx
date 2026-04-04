"use client";

import { useEffect, useRef, useState } from "react";

type ChatType = {
  _id: string;
  senderRole: "user" | "admin";
  message: string;
  createdAt: string;
};

type UserWithChat = {
  userId: string;
  user: { name: string; email: string } | null;
  latestMessage: string;
  latestMessageTime: string;
};

export default function AdminPage() {
  const [message, setMessage] = useState("");
  const [chats, setChats] = useState<ChatType[]>([]);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [showNewButton, setShowNewButton] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserWithChat[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadUsers = async () => {
    try {
      const res = await fetch("/api/chat/users", {
        cache: "no-store",
      });
      const data = await res.json();
      setUsers(data);
      if (data.length > 0 && !selectedUserId) {
        setSelectedUserId(data[0].userId);
      }
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadChats = async () => {
    if (!selectedUserId) return;

    try {
      const res = await fetch(`/api/chat/${selectedUserId}`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (data.length > chats.length) {
        if (!shouldAutoScroll) {
          setShowNewButton(true);
        }
      }

      setChats(data);
    } catch (error) {
      console.error("Error loading chats:", error);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !selectedUserId) return;

    try {
      await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: selectedUserId,
          senderRole: "admin",
          message,
        }),
      });

      setMessage("");
      setShouldAutoScroll(true);
      setShowNewButton(false);
      loadChats();
      loadUsers();
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleScroll = () => {
    const container = chatContainerRef.current;
    if (!container) return;

    const isAtBottom =
      container.scrollTop + container.clientHeight >=
      container.scrollHeight - 50;

    setShouldAutoScroll(isAtBottom);

    if (isAtBottom) {
      setShowNewButton(false);
    }
  };

  useEffect(() => {
  if (shouldAutoScroll) {
    const container = chatContainerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }
  }
}, [chats, shouldAutoScroll]);

  useEffect(() => {
    loadUsers();
    const interval = setInterval(loadUsers, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadChats();
    const interval = setInterval(loadChats, 1000);
    return () => clearInterval(interval);
  }, [selectedUserId]);

 const scrollToBottom = () => {
  const container = chatContainerRef.current;
  if (container) {
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }
  setShowNewButton(false);
  setShouldAutoScroll(true);
};

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Users List */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-blue-600 to-green-600 text-white font-bold">
          💬 Messages
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto">
          {loadingUsers ? (
            <div className="p-4 text-center text-gray-400">Loading...</div>
          ) : users.length === 0 ? (
            <div className="p-4 text-center text-gray-400">
              No messages yet
            </div>
          ) : (
            users.map((user) => (
              <button
                key={user.userId}
                onClick={() => setSelectedUserId(user.userId)}
                className={`w-full px-4 py-3 border-b border-gray-100 text-left transition-colors ${
                  selectedUserId === user.userId
                    ? "bg-blue-50 border-l-4 border-l-blue-600"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="font-semibold text-gray-900 text-sm truncate">
                  {user.user?.name || user.user?.email || "Unknown User"}
                </div>
                <div className="text-xs text-gray-500 truncate mt-1">
                  {user.latestMessage || "No messages"}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(user.latestMessageTime).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedUserId ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-gray-900">
                  {users.find((u) => u.userId === selectedUserId)?.user?.name ||
                    users.find((u) => u.userId === selectedUserId)?.user?.email ||
                    "Chat"}
                </div>
                <div className="text-sm text-gray-500">
                  {users.find((u) => u.userId === selectedUserId)?.user?.email}
                </div>
              </div>
              <div className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                Active
              </div>
            </div>

            {/* Messages Area */}
            <div
              ref={chatContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-4 space-y-3"
            >
              {chats.map((chat) => (
                <div
                  key={chat._id}
                  className={`flex ${
                    chat.senderRole === "admin" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`px-4 py-2 rounded-lg max-w-xs ${
                      chat.senderRole === "admin"
                        ? "bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-br-none"
                        : "bg-white border border-gray-200 text-gray-900 rounded-bl-none"
                    }`}
                  >
                    <div>{chat.message}</div>
                    <div
                      className={`text-xs mt-1 ${
                        chat.senderRole === "admin"
                          ? "opacity-80 text-white"
                          : "text-gray-400"
                      }`}
                    >
                      {new Date(chat.createdAt).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              ))}

              <div ref={chatEndRef} />

              {showNewButton && (
                <button
                  onClick={scrollToBottom}
                  className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-green-600 text-white px-4 py-2 rounded-full shadow-lg hover:shadow-xl transition-shadow"
                >
                  ↓ New Message
                </button>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-200 flex gap-2">
              <input
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Type a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <button
                onClick={sendMessage}
                className="bg-gradient-to-r from-blue-600 to-green-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-green-700 transition-all font-semibold"
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-4xl mb-4">💬</div>
              <div>Select a conversation to start</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}