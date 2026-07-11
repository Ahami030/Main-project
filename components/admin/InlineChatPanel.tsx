'use client';

import { useRef, useState } from 'react';
import ChatFileAttachment, { FileIcon } from '@/components/chat/ChatFileAttachment';
import ChatRfqSidebar from '@/components/admin/ChatRfqSidebar';
import { useAdminChat, type UserWithChat } from '@/components/admin/useAdminChat';

interface Props {
  onRfqCount?: (count: number) => void;
}

export default function InlineChatPanel({ onRfqCount }: Props) {
  const {
    activeTab, setActiveTab,
    users, displayedUsers, unreadCount, isUnread,
    activeUser, openUser,
    messages, activeRfq,
    draft, setDraft, sendMessage, uploadAndSend, uploading, deleteMessage,
    msgContainerRef, handleScroll, scrollToBottom, showNewMsgButton, pinBottomAfterImage,
    fmtTime, userInitial, userName,
  } = useAdminChat({ onRfqCount });

  const chatDialogRef = useRef<HTMLDialogElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pasted image (Win+Shift+S) kept with its object URL so cleanup is local
  const [pasted, setPasted] = useState<{ file: File; url: string } | null>(null);
  const clearPasted = () => setPasted((p) => { if (p) URL.revokeObjectURL(p.url); return null; });

  const handleSend = async () => {
    if (pasted) {
      const file = pasted.file;
      clearPasted();
      await uploadAndSend(file);
      return;
    }
    await sendMessage();
  };

  const openChatModal = (u: UserWithChat) => {
    openUser(u);
    chatDialogRef.current?.showModal();
  };
  const closeChatModal = () => chatDialogRef.current?.close();

  return (
    <>
      {/* ── Panel (list view only) ── */}
      <div className="bg-base-100 border border-base-300 rounded-2xl flex flex-col overflow-hidden shadow-sm h-full">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-base-200 shrink-0">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-4 4-1-4z" />
            </svg>
            <span className="text-sm font-bold text-base-content">ข้อความลูกค้า</span>
            {unreadCount > 0 && (
              <span className="badge badge-primary badge-sm text-[10px] font-semibold animate-pulse">
                {unreadCount} ใหม่
              </span>
            )}
          </div>
          <span className="text-[11px] text-base-content/35 font-medium">{users.length} การสนทนา</span>
        </div>

        {/* Tabs */}
        <div className="px-4 py-2.5 border-b border-base-200 shrink-0">
          <div role="tablist" className="tabs tabs-boxed bg-base-200/70 w-full p-0.5 gap-0.5">
            <button
              role="tab"
              className={`tab flex-1 text-xs font-semibold h-7 min-h-0 rounded-lg transition-all ${activeTab === 'all' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              ทั้งหมด
              <span className="ml-1 opacity-50 text-[10px] font-normal">({users.length})</span>
            </button>
            <button
              role="tab"
              className={`tab flex-1 text-xs font-semibold h-7 min-h-0 rounded-lg transition-all ${activeTab === 'unread' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('unread')}
            >
              ยังไม่ได้อ่าน
              {unreadCount > 0 && (
                <span className="ml-1.5 badge badge-primary badge-xs text-[9px] px-1">{unreadCount}</span>
              )}
            </button>
          </div>
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto">
          {displayedUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-base-content/25 px-6 py-10 text-center">
              <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-4 4-1-4z" />
              </svg>
              <p className="text-xs">
                {activeTab === 'unread' ? 'ไม่มีข้อความที่ยังไม่ได้อ่าน' : 'ยังไม่มีการสนทนา'}
              </p>
            </div>
          ) : (
            displayedUsers.map((u) => {
              const unread = isUnread(u);
              return (
                <button
                  key={u.userId}
                  onClick={() => openChatModal(u)}
                  className="w-full flex items-center gap-3 px-4 py-3 border-b border-base-200 last:border-0 hover:bg-base-200/50 active:bg-base-200 transition-colors text-left group"
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold transition-colors ${
                    unread ? 'bg-primary text-primary-content' : 'bg-base-200 text-base-content/50 group-hover:bg-base-300'
                  }`}>
                    {userInitial(u)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className={`text-sm truncate ${unread ? 'font-bold text-base-content' : 'font-medium text-base-content/65'}`}>
                        {userName(u)}
                      </span>
                      {unread && <span className="w-2 h-2 rounded-full bg-primary shrink-0 animate-pulse" />}
                    </div>
                    <p className={`text-xs truncate mt-0.5 flex items-center gap-1 ${unread ? 'text-base-content/65 font-medium' : 'text-base-content/35'}`}>
                      {u.latestFileType && <FileIcon type={u.latestFileType} />}
                      <span className="truncate">{u.latestMessage || 'ยังไม่มีข้อความ'}</span>
                    </p>
                  </div>
                  <svg className="w-3.5 h-3.5 text-base-content/20 shrink-0 group-hover:text-base-content/40 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Chat Modal ── */}
      <dialog ref={chatDialogRef} className="modal modal-middle">
        <div
          className="modal-box p-0 overflow-hidden w-full max-w-3xl flex flex-col"
          style={{ height: '600px' }}
        >
          {/* Modal header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-base-200 shrink-0 bg-base-100">
            <div className="flex items-center gap-3">
              {activeUser && (
                <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                  {userInitial(activeUser)}
                </div>
              )}
              <div>
                <p className="text-sm font-bold text-base-content leading-tight">
                  {activeUser ? userName(activeUser) : ''}
                </p>
                <p className="text-[11px] text-base-content/40">
                  {activeUser?.user?.email || ''}
                </p>
              </div>
            </div>
            <button onClick={closeChatModal} className="btn btn-ghost btn-sm btn-square rounded-lg">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Modal body: two columns */}
          <div className="flex flex-1 overflow-hidden">

            {/* ── LEFT: Chat ── */}
            <div className="flex-1 flex flex-col min-w-0 border-r border-base-200">

              {/* Messages */}
              <div
                ref={msgContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2.5 min-h-0 bg-base-200/20"
              >
                {messages.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-base-content/25 text-xs">
                    ยังไม่มีข้อความ
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isAdmin = msg.senderRole === 'admin';
                    if (msg.isDeleted) {
                      return (
                        <div key={msg._id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                          <span className="text-xs italic text-base-content/30 px-2 py-1">ข้อความถูกลบแล้ว</span>
                        </div>
                      );
                    }
                    return (
                      <div key={msg._id} className={`flex group ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                        {/* hover ⋮ delete — admin can remove any message */}
                        <button
                          onClick={() => deleteMessage(msg._id)}
                          className={`opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 rounded-full bg-base-200 hover:bg-error/15 flex items-center justify-center self-center mx-1 shrink-0 ${isAdmin ? '' : 'order-last'}`}
                          title="ลบ"
                        >
                          <svg className="w-2.5 h-2.5 text-base-content/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                        <div className={`max-w-[78%] flex flex-col gap-0.5 ${isAdmin ? 'items-end' : 'items-start'}`}>
                          <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed wrap-break-word ${
                            isAdmin
                              ? 'bg-primary text-primary-content rounded-tr-sm'
                              : 'bg-base-100 text-base-content/80 rounded-tl-sm shadow-sm border border-base-200'
                          }`}>
                            {msg.fileUrl
                              ? <ChatFileAttachment fileUrl={msg.fileUrl} fileType={msg.fileType!} fileName={msg.fileName ?? 'ไฟล์'} isAdmin={isAdmin} onImageLoad={pinBottomAfterImage} />
                              : msg.message}
                          </div>
                          <span className="text-[10px] text-base-content/30 px-1">{fmtTime(msg.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })
                )}

                {showNewMsgButton && (
                  <div className="sticky bottom-2 flex justify-center">
                    <button
                      onClick={scrollToBottom}
                      className="btn btn-primary btn-xs h-7 min-h-0 rounded-full shadow-lg gap-1 text-xs px-3"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      ข้อความใหม่
                    </button>
                  </div>
                )}
              </div>

              {/* Paste preview bar */}
              {pasted && (
                <div className="px-4 py-2 border-t border-base-200 bg-base-200/40 shrink-0 flex items-center gap-2">
                  <img src={pasted.url} alt="paste preview" className="w-12 h-12 object-cover rounded-lg shrink-0" />
                  <span className="text-xs text-base-content/60 flex-1 truncate">{pasted.file.name}</span>
                  <button onClick={clearPasted} className="btn btn-ghost btn-xs btn-square rounded-lg">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <span className="text-[10px] text-base-content/40">Enter เพื่อส่ง</span>
                </div>
              )}

              {/* Input */}
              <div className="flex items-center gap-2 px-4 py-3 border-t border-base-200 shrink-0 bg-base-100">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadAndSend(file);
                    e.target.value = '';
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-ghost btn-xs btn-square rounded-lg text-base-content/40 hover:text-base-content"
                  disabled={uploading}
                  aria-label="แนบไฟล์"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>
                <input
                  type="text"
                  placeholder={pasted ? 'Enter เพื่อส่งรูป' : 'พิมพ์ข้อความ... (Enter)'}
                  className="input input-bordered input-sm h-9 flex-1 rounded-xl text-sm bg-base-200/60 border-transparent focus:border-primary focus:bg-base-100 transition-colors"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                  }}
                  onPaste={(e) => {
                    const file = e.clipboardData?.files?.[0];
                    if (file?.type.startsWith('image/')) {
                      e.preventDefault();
                      setPasted((p) => { if (p) URL.revokeObjectURL(p.url); return { file, url: URL.createObjectURL(file) }; });
                    }
                  }}
                />
                <button
                  className="btn btn-primary btn-sm h-9 min-h-0 rounded-xl px-3.5"
                  onClick={handleSend}
                  disabled={(!draft.trim() && !pasted) || uploading}
                >
                  {uploading ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* ── RIGHT: RFQ info ── */}
            <ChatRfqSidebar rfq={activeRfq} onNavigate={closeChatModal} />
          </div>
        </div>

        {/* Backdrop */}
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </>
  );
}
