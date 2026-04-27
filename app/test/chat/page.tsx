"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

type ChatType = {
  _id: string;
  senderRole: "user" | "admin";
  message: string;
  createdAt: string;
};

export default function ChatPage() {
  const { data: session, status } = useSession();
  const USER_ID = (session?.user as any)?.id || session?.user?.email; // ✅ ดึงจาก session จริงๆ

  const [message, setMessage] = useState("");
  const [chats, setChats] = useState<ChatType[]>([]);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [showNewButton, setShowNewButton] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  const loadChats = async () => {
    if (!USER_ID) return; // ✅ รอให้มี session ก่อน
    const res = await fetch(`/api/chat/${USER_ID}`, { cache: "no-store" });
    const data = await res.json();
    if (data.length > chats.length && !shouldAutoScroll) {
      setShowNewButton(true);
    }
    setChats(data);
  };

  const sendMessage = async () => {
    if (!message.trim() || !USER_ID) return;
    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: USER_ID, senderRole: "user", message }),
    });
    setMessage("");
    setShouldAutoScroll(true);
    setShowNewButton(false);
    loadChats();
  };

  const handleScroll = () => {
    const container = chatContainerRef.current;
    if (!container) return;
    const isAtBottom =
      container.scrollTop + container.clientHeight >= container.scrollHeight - 50;
    setShouldAutoScroll(isAtBottom);
    if (isAtBottom) setShowNewButton(false);
  };

  useEffect(() => {
    if (shouldAutoScroll) {
      chatContainerRef.current?.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [chats, shouldAutoScroll]);

  useEffect(() => {
    if (!USER_ID) return; // ✅ รอ session
    loadChats();
    const interval = setInterval(loadChats, 1000);
    return () => clearInterval(interval);
  }, [USER_ID]); // ✅ re-run เมื่อ USER_ID พร้อม

  const scrollToBottom = () => {
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: "smooth",
    });
    setShowNewButton(false);
    setShouldAutoScroll(true);
  };

  // ✅ Loading state
  if (status === "loading") return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!session) return <div className="flex items-center justify-center h-screen">Please login</div>;

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="p-4 bg-blue-600 text-white font-bold">💬 User Chat</div>

      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-2 relative"
      >
        {chats.map((chat) => (
          <div key={chat._id} className={`flex ${chat.senderRole === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`px-4 py-2 rounded-lg max-w-xs ${chat.senderRole === "user" ? "bg-blue-500 text-white" : "bg-white border"}`}>
              {chat.message}
              <div className="text-xs opacity-60">{new Date(chat.createdAt).toLocaleTimeString()}</div>
            </div>
          </div>
        ))}

        {showNewButton && (
          <button
            onClick={scrollToBottom}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg"
          >
            ข้อความใหม่ ↓
          </button>
        )}
      </div>

      <div className="p-4 bg-white border-t flex gap-2">
        <input
          className="flex-1 border rounded px-3 py-2"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
        />
        <button onClick={sendMessage} className="bg-blue-600 text-white px-4 py-2 rounded">ส่ง</button>
      </div>
    </div>
  );
}