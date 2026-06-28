"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import DashboardGuard from "@/components/DashboardGuard";

export default function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardGuard>
      <DashboardLayout>{children}</DashboardLayout>
    </DashboardGuard>
  );
}
