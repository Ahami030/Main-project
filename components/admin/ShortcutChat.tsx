'use client';

import { useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import ChatFileAttachment from '@/components/chat/ChatFileAttachment';
import ChatRfqSidebar from '@/components/admin/ChatRfqSidebar';
import { useAdminChat, type UserWithChat } from '@/components/admin/useAdminChat';

export default function ShortcutChat() {
  const pathname = usePathname();

  // Suppress on pages that have inline chat
  const hidden =
    pathname === '/Admin/chat' ||
    pathname?.startsWith('/Admin/edit/') ||
    pathname === '/Admin/rfq/edit';

  const {
    activeTab, setActiveTab,
    users, displayedUsers, unreadCount, isUnread,
    activeUserId, openUser, closeUser,
    messages, activeRfq,
    draft, setDraft, sendMessage, uploadAndSend, uploading,
    msgContainerRef, handleScroll, scrollToBottom, showNewMsgButton, pinBottomAfterImage,
    fmtTime, userInitial, userName,
  } = useAdminChat({ enabled: !hidden });

  const [view, setView] = useState<'list' | 'chat'>('list');
  // Pasted image kept with its object URL so cleanup is local — no effect needed.
  const [pasted, setPasted] = useState<{ file: File; url: string } | null>(null);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearPasted = () => setPasted((p) => { if (p) URL.revokeObjectURL(p.url); return null; });

  if (hidden) return null;

  const openModal = () => { setView('list'); dialogRef.current?.showModal(); };
  const closeModal = () => dialogRef.current?.close();

  const openChat = (u: UserWithChat) => { openUser(u); setView('chat'); };
  const goToList = () => { closeUser(); setView('list'); };

  const handleSend = async () => {
    if (pasted) {
      const file = pasted.file;
      clearPasted();
      await uploadAndSend(file);
      return;
    }
    await sendMessage();
  };

  return (
    <>
      {/* ── Floating trigger button ── */}
      <button
        onClick={() => (dialogRef.current?.open ? closeModal() : openModal())}
        className="fixed bottom-6 right-6 z-50 btn btn-primary btn-circle shadow-xl w-14 h-14"
        aria-label="Open messages"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-4 4-1-4z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 badge badge-error badge-sm min-w-5 h-5 text-[10px] font-bold px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Modal ── */}
      <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
        <div
          className="modal-box p-0 flex flex-col overflow-hidden w-full sm:max-w-3xl"
          style={{ height: '640px', maxHeight: '90vh' }}
        >
          {/* ── Modal Header ── */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-base-200 shrink-0">
            {view === 'chat' ? (
              <button
                onClick={goToList}
                className="btn btn-ghost btn-xs gap-1.5 rounded-lg -ml-1 font-medium"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                กลับ
              </button>
            ) : (
              <div className="flex items-center gap-2.5">
                <span className="text-base font-bold text-base-content">ข้อความ</span>
                {unreadCount > 0 && (
                  <span className="badge badge-primary badge-sm text-[10px] font-semibold">
                    {unreadCount} ใหม่
                  </span>
                )}
              </div>
            )}
            <button
              onClick={closeModal}
              className="btn btn-ghost btn-xs btn-square rounded-lg"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* ── LIST VIEW ── */}
          {view === 'list' && (
            <>
              {/* Tabs */}
              <div className="px-5 py-3 border-b border-base-200 shrink-0">
                <div role="tablist" className="tabs tabs-boxed bg-base-200/80 w-full p-1 gap-1">
                  <button
                    role="tab"
                    className={`tab flex-1 text-xs font-semibold transition-all ${activeTab === 'all' ? 'tab-active' : ''}`}
                    onClick={() => setActiveTab('all')}
                  >
                    ทั้งหมด
                    <span className="ml-1.5 badge badge-sm badge-ghost text-[10px] font-normal">
                      {users.length}
                    </span>
                  </button>
                  <button
                    role="tab"
                    className={`tab flex-1 text-xs font-semibold transition-all ${activeTab === 'unread' ? 'tab-active' : ''}`}
                    onClick={() => setActiveTab('unread')}
                  >
                    ยังไม่ได้อ่าน
                    {unreadCount > 0 && (
                      <span className="ml-1.5 badge badge-primary badge-sm text-[10px]">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* User list */}
              <div className="flex-1 overflow-y-auto">
                {displayedUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-base-content/25 px-6 text-center">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2}
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-4 4-1-4z" />
                    </svg>
                    <p className="text-sm">
                      {activeTab === 'unread' ? 'ไม่มีข้อความที่ยังไม่ได้อ่าน' : 'ยังไม่มีการสนทนา'}
                    </p>
                  </div>
                ) : (
                  displayedUsers.map((u) => {
                    const unread = isUnread(u);
                    return (
                      <button
                        key={u.userId}
                        onClick={() => openChat(u)}
                        className="w-full flex items-center gap-3 px-5 py-3.5 border-b border-base-200 last:border-0 hover:bg-base-200/40 active:bg-base-200/70 transition-colors text-left"
                      >
                        {/* Avatar */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
                          unread ? 'bg-primary text-primary-content' : 'bg-base-300 text-base-content/60'
                        }`}>
                          {userInitial(u)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-sm truncate ${unread ? 'font-bold text-base-content' : 'font-medium text-base-content/70'}`}>
                              {userName(u)}
                            </span>
                            {unread && (
                              <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 animate-pulse" />
                            )}
                          </div>
                          <p className={`text-xs truncate mt-0.5 ${unread ? 'text-base-content/70 font-medium' : 'text-base-content/40'}`}>
                            {u.latestMessage || 'ยังไม่มีข้อความ'}
                          </p>
                        </div>

                        <svg className="w-4 h-4 text-base-content/20 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* ── CHAT VIEW ── */}
          {view === 'chat' && activeUserId && (
            <div className="flex-1 flex min-h-0">

            {/* LEFT: chat column */}
            <div className="flex-1 flex flex-col min-w-0 md:border-r border-base-200">

              {/* Compact RFQ chip — mobile only (desktop shows the full sidebar on the right) */}
              <div className="md:hidden px-5 py-3 border-b border-base-200 shrink-0">
                {activeRfq === undefined ? (
                  <div className="skeleton h-12 w-full rounded-xl" />
                ) : activeRfq === null ? (
                  <div className="px-3 py-2.5 bg-base-200 rounded-xl text-xs text-base-content/40 text-center">
                    ไม่พบ RFQ ที่เชื่อมกับผู้ใช้นี้
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-primary/8 border border-primary/15 rounded-xl">
                    <span className="text-xs font-bold text-primary truncate">
                      {activeRfq.rfq_number || 'RFQ'}
                    </span>
                    <a
                      href={`/Admin/edit/${activeRfq._id}`}
                      className="btn btn-primary btn-xs h-8 min-h-0 rounded-lg shrink-0 gap-1.5 text-[11px] font-semibold"
                      onClick={closeModal}
                    >
                      Go to Edit
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                )}
              </div>

              {/* Messages area */}
              <div
                ref={msgContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2.5 min-h-0 bg-base-200/20"
              >
                {messages.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-base-content/30 text-xs">
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
                      <div key={msg._id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[78%] flex flex-col gap-0.5 ${isAdmin ? 'items-end' : 'items-start'}`}>
                          {msg.fileUrl ? (
                            <ChatFileAttachment
                              fileUrl={msg.fileUrl}
                              fileType={msg.fileType!}
                              fileName={msg.fileName!}
                              isAdmin={isAdmin}
                              onImageLoad={pinBottomAfterImage}
                            />
                          ) : (
                            <div className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed wrap-break-word ${
                              isAdmin
                                ? 'bg-primary text-primary-content rounded-tr-sm'
                                : 'bg-base-200 text-base-content/85 rounded-tl-sm'
                            }`}>
                              {msg.message}
                            </div>
                          )}
                          <span className="text-[10px] text-base-content/30 px-1">
                            {fmtTime(msg.createdAt)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* New message button */}
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
                <div className="px-5 py-2 border-t border-base-200 bg-base-200/40 shrink-0 flex items-center gap-2">
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

              {/* Input area */}
              <div className="flex items-center gap-2 px-5 py-3.5 border-t border-base-200 shrink-0">
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
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
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
                  className="btn btn-primary btn-sm h-9 min-h-0 rounded-xl px-3"
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

            {/* RIGHT: full RFQ sidebar — desktop only (mobile uses the compact chip above) */}
            <ChatRfqSidebar rfq={activeRfq} onNavigate={closeModal} className="hidden md:flex" />
            </div>
          )}
        </div>

        {/* Backdrop — click outside to close */}
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </>
  );
}
