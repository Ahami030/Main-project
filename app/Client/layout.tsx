import ChatNotificationBubble from '@/components/client/ChatNotificationBubble';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ChatNotificationBubble />
    </>
  );
}
