import * as React from "react"
import { Toaster } from "@/components/ui/sonner"
import { MedicalProvider } from "@/context/MedicalContext"
import { DashboardWithCollapsibleSidebar } from "@/components/ui/dashboard-with-collapsible-sidebar"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <MedicalProvider>
      <DashboardWithCollapsibleSidebar>
        {children}
      </DashboardWithCollapsibleSidebar>
      <Toaster position="top-right" richColors />
    </MedicalProvider>
  )
}
