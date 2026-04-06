import type { ReactNode } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";

export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto grid max-w-[1500px] gap-6 lg:grid-cols-[300px_1fr]">
        <Sidebar />
        <main className="space-y-6">
          <Topbar />
          {children}
        </main>
      </div>
    </div>
  );
}
