import type { ReactNode } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { WorkspaceNav } from "@/components/dashboard/workspace-nav";

export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto grid max-w-[1520px] gap-6 lg:grid-cols-[248px_1fr]">
        <Sidebar />
        <main className="space-y-6">
          <Topbar />
          <WorkspaceNav />
          {children}
        </main>
      </div>
    </div>
  );
}
