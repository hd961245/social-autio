import type { ReactNode } from "react";

export const dynamic = "force-static";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen px-4 py-4 md:px-6 md:py-6">{children}</div>;
}
