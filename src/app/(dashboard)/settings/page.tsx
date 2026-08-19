"use client"

import * as React from "react"
import { Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type Section = "general" | "billing" | "team" | "notifications"

export default function SettingsPage() {
  const [activeSection, setActiveSection] = React.useState<Section>("general")

  const handleSave = () => {
    toast.success("Settings saved successfully!")
  }

  const navItems: { id: Section; label: string }[] = [
    { id: "general", label: "General" },
    { id: "billing", label: "Billing & Invoices" },
    { id: "team", label: "Team Members" },
    { id: "notifications", label: "Notifications" },
  ]

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto h-full">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 mb-1">Settings</h2>
          <p className="text-sm text-neutral-500">Manage clinic preferences, billing structures, and practitioner records.</p>
        </div>
        <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm rounded-[5px]">
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <div className="bg-white dark:bg-neutral-900 border rounded-[5px] shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[500px]">
         <div className="w-full md:w-64 border-r bg-neutral-50/50 dark:bg-neutral-950 p-4">
             <nav className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveSection(item.id)}
                    className={cn(
                      "text-left px-3 py-2 rounded-[5px] text-sm font-medium transition-colors",
                      activeSection === item.id
                        ? "bg-white dark:bg-neutral-800 shadow-sm border text-indigo-600 dark:text-indigo-400"
                        : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
             </nav>
         </div>
         <div className="p-6 flex-1 flex flex-col gap-6">
            {activeSection === "general" && (
             <>
             <div>
                <h3 className="text-lg font-medium border-b dark:border-neutral-800 pb-2 mb-4">Clinic Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="clinicName">Clinic Name</Label>
                        <Input id="clinicName" defaultValue="HealthFirst Associates" />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="regNumber">Registration Number</Label>
                        <Input id="regNumber" defaultValue="CLI-98234-XYZ" />
                    </div>
                    <div className="grid gap-2 sm:col-span-2">
                        <Label htmlFor="address">Address</Label>
                        <Input id="address" defaultValue="123 Medical Parkway, Suite 100, Cityville, ST 12345" />
                    </div>
                </div>
             </div>

             <div>
                <h3 className="text-lg font-medium border-b dark:border-neutral-800 pb-2 mb-4">Appointment Preferences</h3>
                <div className="flex items-center justify-between py-2">
                    <div>
                        <p className="font-medium text-sm">Require Patient Confirmation</p>
                        <p className="text-xs text-neutral-500">Send an SMS 24 hours prior requesting confirmation</p>
                    </div>
                    <Checkbox defaultChecked />
                </div>
                <div className="flex items-center justify-between py-2">
                    <div>
                        <p className="font-medium text-sm">Allow Online Booking</p>
                        <p className="text-xs text-neutral-500">Let patients schedule their own encounters</p>
                    </div>
                    <Checkbox defaultChecked />
                </div>
             </div>
             </>
            )}

            {activeSection === "billing" && (
              <div>
                <h3 className="text-lg font-medium border-b dark:border-neutral-800 pb-2 mb-4">Billing & Invoices</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Input id="currency" defaultValue="USD" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="taxRate">Default Tax Rate (%)</Label>
                    <Input id="taxRate" type="number" defaultValue="0" />
                  </div>
                  <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor="invoicePrefix">Invoice Number Prefix</Label>
                    <Input id="invoicePrefix" defaultValue="INV-" />
                  </div>
                </div>
                <p className="text-sm text-neutral-500 mt-4">Configure billing cycles, payment terms, and invoice templates.</p>
              </div>
            )}

            {activeSection === "team" && (
              <div>
                <h3 className="text-lg font-medium border-b dark:border-neutral-800 pb-2 mb-4">Team Members</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b dark:border-neutral-800">
                    <div>
                      <p className="font-medium">Dr. Jane Smith</p>
                      <p className="text-sm text-neutral-500">Doctor · jane.smith@clinic.com</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-[5px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Active</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b dark:border-neutral-800">
                    <div>
                      <p className="font-medium">Dr. Robert Chen</p>
                      <p className="text-sm text-neutral-500">Doctor · robert.chen@clinic.com</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-[5px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Active</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="mt-4 rounded-[5px]">Add Team Member</Button>
              </div>
            )}

            {activeSection === "notifications" && (
              <div>
                <h3 className="text-lg font-medium border-b dark:border-neutral-800 pb-2 mb-4">Notifications</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium text-sm">Appointment Reminders</p>
                      <p className="text-xs text-neutral-500">Send reminders to patients before appointments</p>
                    </div>
                    <Checkbox defaultChecked />
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium text-sm">New Patient Alerts</p>
                      <p className="text-xs text-neutral-500">Notify staff when a new patient is registered</p>
                    </div>
                    <Checkbox defaultChecked />
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium text-sm">Billing Notifications</p>
                      <p className="text-xs text-neutral-500">Alert when invoices are due or overdue</p>
                    </div>
                    <Checkbox defaultChecked />
                  </div>
                </div>
              </div>
            )}
         </div>
      </div>
    </div>
  )
}
