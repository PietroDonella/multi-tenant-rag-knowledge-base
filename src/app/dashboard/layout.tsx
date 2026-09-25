import { Sidebar } from "@/components/sidebar";

export const dynamic = "force-dynamic";
import { getCurrentOrg } from "@/lib/tenant";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const current = await getCurrentOrg();

  return (
    <div className="flex min-h-screen">
      <Sidebar current={current} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
