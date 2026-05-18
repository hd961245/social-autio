import type { ReactNode } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { WorkspaceNav } from "@/components/dashboard/workspace-nav";

export const revalidate = 120;

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto grid max-w-[1480px] gap-5 lg:grid-cols-[220px_minmax(0,1fr)] xl:gap-6">
        <Sidebar />
        <main className="min-w-0 space-y-6">
          <Topbar />
          <WorkspaceNav />
          {children}
        </main>
      </div>
    </div>
  );
}
