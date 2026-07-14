import { Sidebar } from "@/components/sidebar";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
};

export function DashboardLayout({ children }: Props) {
  return (
    <div className={cn(
      'min-h-screen flex',
      'bg-slate-50 dark:bg-slate-900'
    )}>
      <Sidebar />

      <main className={cn(
        'flex-1 overflow-y-auto p-4 md:p-6',
        'bg-slate-50 dark:bg-slate-900'
      )}>
        {children}
      </main>
    </div>
  );
}