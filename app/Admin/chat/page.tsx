"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import ChatFileAttachment, { FileIcon } from "@/components/chat/ChatFileAttachment";

type ChatType = {
  _id: string;
  senderRole: "user" | "admin";
  message: string;
  fileUrl?: string;
  fileType?: string;
  fileName?: string;
  isEdited?: boolean;
  isDeleted?: boolean;
  createdAt: string;
};

const canEdit = (chat: ChatType) =>
  !chat.fileUrl && !chat.isDeleted &&
  Date.now() - new Date(chat.createdAt).getTime() < 2 * 60 * 1000;

type UserWithChat = {
  userId: string;
  user: { name: string; email: string } | null;
  latestMessage: string;
  latestFileType: string | null;
  latestMessageTime: string;
};

export default function AdminPage() {
  const { status } = useSession();
  const [message, setMessage] = useState("");
  const [chats, setChats] = useState<ChatType[]>([]);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [showNewButton, setShowNewButton] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserWithChat[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [editText, setEditText]       = useState("");
  const [pastedImage, setPastedImage] = useState<File | null>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const justSwitchedUser = useRef(false);
  const switchTimeRef = useRef<number>(0);

  // แยก initial load กับ polling
  useEffect(() => {
    if (status !== 'authenticated') return;

    const initLoad = async () => {
      try {
        const res = await fetch("/api/chat/users", { cache: "no-store" });
        const data = await res.json();
        const users = data.users ?? data;
        setUsers(users);
        if (users.length > 0) {
          setSelectedUserId(users[0].userId);
        }
      } catch (error) {
        console.error("Error loading users:", error);
      } finally {
        setLoadingUsers(false);
      }
    };

    initLoad();

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/chat/users", { cache: "no-store" });
        const data = await res.json();
        setUsers(data.users ?? data);
      } catch (error) {
        console.error("Error loading users:", error);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [status]);

  // Reset state + mark justSwitchedUser เมื่อเปลี่ยน user
  useEffect(() => {
    setShouldAutoScroll(true);
    setShowNewButton(false);
    setChats([]);
    justSwitchedUser.current = true;
    switchTimeRef.current = Date.now();
  }, [selectedUserId]);

  const loadChats = async () => {
    if (!selectedUserId) return;

    try {
      const res = await fetch(`/api/chat/${selectedUserId}`, {
        cache: "no-store",
      });
      const data = await res.json();

      setChats((prev) => {
        if (data.length > prev.length && !shouldAutoScroll) {
          setShowNewButton(true);
        }
        return data;
      });
    } catch (error) {
      console.error("Error loading chats:", error);
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (!editText.trim()) return;
    await fetch(`/api/chat/message/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: editText }),
    });
    setEditingId(null);
    loadChats();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ลบข้อความนี้?")) return;
    await fetch(`/api/chat/message/${id}`, { method: "DELETE" });
    loadChats();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    for (const item of e.clipboardData.items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) setPastedImage(new File([file], `screenshot-${Date.now()}.png`, { type: file.type }));
        break;
      }
    }
  };

  const sendMessage = async () => {
    if ((!message.trim() && !pastedImage) || !selectedUserId) return;

    if (pastedImage) {
      try {
        const fd = new FormData();
        fd.append("file", pastedImage);
        const res = await fetch("/api/chat/upload", { method: "POST", body: fd });
        if (res.ok) {
          const { fileUrl, fileType, fileName } = await res.json();
          await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: selectedUserId, senderRole: "admin", message: "", fileUrl, fileType, fileName }),
          });
          setShouldAutoScroll(true);
          loadChats();
        }
      } finally { setPastedImage(null); }
      return;
    }

    try {
      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleScroll = () => {
    const container = chatContainerRef.current;
    if (!container) return;

    const isAtBottom =
      container.scrollTop + container.clientHeight >= container.scrollHeight - 50;

    setShouldAutoScroll(isAtBottom);
    if (isAtBottom) setShowNewButton(false);
  };

  // Scroll เมื่อ chats เปลี่ยน
  useEffect(() => {
    if (shouldAutoScroll) {
      const container = chatContainerRef.current;
      if (container) {
        // Use instant scroll for 500ms after switching users, then switch to smooth
        const timeSinceSwitched = Date.now() - switchTimeRef.current;
        const useInstant = justSwitchedUser.current || timeSinceSwitched < 500;

        if (useInstant) {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: "instant",
          });
          justSwitchedUser.current = false;
        } else {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: "smooth",
          });
        }
      }
    }
  }, [chats, shouldAutoScroll]);

  useEffect(() => {
    if (!selectedUserId || status !== 'authenticated') return;
    loadChats();
    const interval = setInterval(loadChats, 3000);
    return () => clearInterval(interval);
  }, [selectedUserId, status]);

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
        <div className="p-4 bg-linear-to-r from-blue-600 to-green-600 text-white font-bold">
          💬 Messages
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingUsers ? (
            <div className="p-4 text-center text-gray-400">Loading...</div>
          ) : users.length === 0 ? (
            <div className="p-4 text-center text-gray-400">No messages yet</div>
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
                <div className="text-xs text-gray-500 truncate mt-1 flex items-center gap-1">
                  {user.latestFileType && <FileIcon type={user.latestFileType} />}
                  <span className="truncate">{user.latestMessage || "No messages"}</span>
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
              {chats.map((chat) => {
                const isAdmin = chat.senderRole === "admin";
                return (
                <div key={chat._id} className={`flex group ${isAdmin ? "justify-end" : "justify-start"}`}>

                  {/* ⋮ actions — admin แก้/ลบของตัวเอง, ลบของ user ได้ */}
                  {!chat.isDeleted && editingId !== chat._id && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 self-center mx-1">
                      {isAdmin && canEdit(chat) && (
                        <button
                          onClick={() => { setEditingId(chat._id); setEditText(chat.message); }}
                          className="w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                          title="แก้ไข"
                        >
                          <svg className="w-2.5 h-2.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(chat._id)}
                        className="w-5 h-5 rounded-full bg-gray-200 hover:bg-red-100 flex items-center justify-center transition-colors"
                        title="ลบ"
                      >
                        <svg className="w-2.5 h-2.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}

                  <div className={`px-4 py-2 rounded-lg max-w-xs ${
                    isAdmin
                      ? "bg-linear-to-r from-blue-500 to-green-500 text-white rounded-br-none"
                      : "bg-white border border-gray-200 text-gray-900 rounded-bl-none"
                  }`}>
                    {chat.isDeleted ? (
                      <span className="italic opacity-50 text-sm">ข้อความถูกลบแล้ว</span>
                    ) : chat.fileUrl ? (
                      <ChatFileAttachment fileUrl={chat.fileUrl} fileType={chat.fileType!} fileName={chat.fileName ?? "ไฟล์"} isAdmin={isAdmin} />
                    ) : (
                      <div>
                        {chat.message}
                        {chat.isEdited && <span className="ml-1 opacity-50 text-[10px]">(แก้ไขแล้ว)</span>}
                      </div>
                    )}
                    <div className={`text-xs mt-1 ${isAdmin ? "opacity-80 text-white" : "text-gray-400"}`}>
                      {new Date(chat.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
                );
              })}

              <div ref={chatEndRef} />

              {showNewButton && (
                <button
                  onClick={scrollToBottom}
                  className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-linear-to-r from-blue-600 to-green-600 text-white px-4 py-2 rounded-full shadow-lg hover:shadow-xl transition-shadow"
                >
                  ↓ New Message
                </button>
              )}
            </div>

            {/* Edit modal (Facebook-style) */}
            {editingId && (
              <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-200">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">แก้ไขข้อความ</span>
                  <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    autoFocus
                    className="flex-1 border border-gray-300 rounded-full px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") handleSaveEdit(editingId);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                  />
                  <button
                    onClick={() => handleSaveEdit(editingId)}
                    disabled={!editText.trim()}
                    className="w-8 h-8 rounded-full bg-linear-to-r from-blue-500 to-green-500 text-white flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition-opacity shrink-0"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Paste image preview */}
            {pastedImage && (
              <div className="px-4 pt-3 bg-white border-t border-gray-100 flex items-center gap-3">
                <div className="relative shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={URL.createObjectURL(pastedImage)} alt="preview" className="w-14 h-14 object-cover rounded-lg border border-gray-200" />
                  <button
                    onClick={() => setPastedImage(null)}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-gray-700 text-white flex items-center justify-center"
                  >
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div>
                  <p className="text-xs text-gray-600 truncate">{pastedImage.name}</p>
                  <p className="text-[10px] text-gray-400">{(pastedImage.size / 1024).toFixed(0)} KB · กด Enter เพื่อส่ง</p>
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-200 flex gap-2">
              <input
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Type a message..."
                value={message}
                onPaste={handlePaste}
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
                className="bg-linear-to-r from-blue-600 to-green-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-green-700 transition-all font-semibold"
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