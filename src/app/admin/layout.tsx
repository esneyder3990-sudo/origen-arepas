import type { Metadata } from "next"

import { AdminGate } from "@/components/tienda/admin"

export const metadata: Metadata = {
  title: "Panel — Origen",
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminGate>{children}</AdminGate>
}
