"use client";

import { useEffect, useRef, useState } from "react";

const USER_ID = "65f123456789abcdef123456";

type ChatType = {
  _id: string;
  senderRole: "user" | "admin";
  message: string;
  createdAt: string;
};

export default function ChatPage() {
  const [message, setMessage] = useState("");
  const [chats, setChats] = useState<ChatType[]>([]);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // โหลดแชท
  const loadChats = async () => {
    const res = await fetch(`/api/chat/${USER_ID}`, {
      cache: "no-store",
    });
    const data = await res.json();
    setChats(data);
  };

  // ส่งข้อความ
  const sendMessage = async () => {
    if (!message.trim()) return;

    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: USER_ID,
        senderRole: "user",
        message,
      }),
    });

    setMessage("");
    setShouldAutoScroll(true); // บังคับ scroll ตอนเราส่งเอง
    loadChats();
  };

  // ตรวจว่า user อยู่ล่างสุดไหม
  const handleScroll = () => {
    const container = chatContainerRef.current;
    if (!container) return;

    const isAtBottom =
      container.scrollTop + container.clientHeight >=
      container.scrollHeight - 50;

    setShouldAutoScroll(isAtBottom);
  };

  // เลื่อนลงเฉพาะเมื่อควรเลื่อน
  useEffect(() => {
    if (shouldAutoScroll) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chats]);

  // โหลดครั้งแรก + polling
  useEffect(() => {
    loadChats();
    const interval = setInterval(loadChats, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="p-4 bg-blue-600 text-white font-bold">
        💬 Smart Chat
      </div>

      {/* Chat Area */}
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-2"
      >
        {chats.map((chat) => (
          <div
            key={chat._id}
            className={`flex ${
              chat.senderRole === "user"
                ? "justify-end"
                : "justify-start"
            }`}
          >
            <div
              className={`px-4 py-2 rounded-lg max-w-xs break-words ${
                chat.senderRole === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-white border"
              }`}
            >
              {chat.message}
              <div className="text-xs mt-1 opacity-60">
                {new Date(chat.createdAt).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t flex gap-2">
        <input
          className="flex-1 border rounded px-3 py-2"
          value={message}
          placeholder="พิมพ์ข้อความ..."
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
        />
        <button
          onClick={sendMessage}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          ส่ง
        </button>
      </div>
    </div>
  );
}