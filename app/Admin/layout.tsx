import ShortcutChat from '@/components/admin/ShortcutChat';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <div className="lg:hidden">
        <ShortcutChat />
      </div>
    </>
  );
}
