"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import React, { useMemo, useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import {
  Activity,
  Bell,
  Calendar,
  ChevronRight,
  ClipboardList,
  DollarSign,
  FileText,
  FlaskConical,
  HelpCircle,
  Home,
  Building2,
  LayoutDashboard,
  Microscope,
  Menu,
  Moon,
  Package,
  Search,
  Settings,
  Stethoscope,
  Sun,
  User,
  Users,
  Wallet,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useMedical } from "@/context/MedicalContext";
import { getLocalNavigationTarget } from "@/lib/redirects";
import { logClientError } from "@/lib/client-logger";
import { toast } from "sonner";

const navGroups = [
  {
    label: "Overview",
    items: [
      { icon: Home, label: "Dashboard", href: "/" },
      { icon: Users, label: "Patients", href: "/patients" },
      { icon: Calendar, label: "Appointments", href: "/appointments" },
      { icon: ClipboardList, label: "Encounters", href: "/encounters" },
      { icon: Activity, label: "Analytics", href: "/analytics" },
    ],
  },
  {
    label: "Operations",
    items: [
      { icon: FileText, label: "Billing Orders", href: "/orders" },
      { icon: Building2, label: "Facilities", href: "/facilities" },
      { icon: DollarSign, label: "Billing", href: "/billing" },
      { icon: Wallet, label: "Payments", href: "/payments" },
      { icon: FlaskConical, label: "Labs", href: "/labs" },
      { icon: Package, label: "Inventory", href: "/inventory" },
      { icon: Stethoscope, label: "Tasks", href: "/tasks" },
    ],
  },
  {
    label: "Management",
    items: [
      { icon: LayoutDashboard, label: "Admin Dashboard", href: "/admin" },
    ],
  },
  {
    label: "System",
    items: [
      { icon: Settings, label: "Settings", href: "/settings" },
      { icon: HelpCircle, label: "Help", href: "/help" },
    ],
  },
];

const routeTitles: Record<string, string> = {
  "/": "Dashboard",
  "/patients": "Patients",
  "/appointments": "Appointments",
  "/encounters": "Encounters",
  "/analytics": "Analytics",
  "/orders": "Billing Orders",
  "/facilities": "Facilities",
  "/billing": "Billing",
  "/payments": "Payments",
  "/labs": "Labs",
  "/inventory": "Inventory",
  "/tasks": "Tasks",
  "/admin": "Admin Dashboard",
  "/settings": "Settings",
  "/help": "Help",
  "/documents": "Documents",
  "/communications": "Communications",
  "/campaigns": "Campaigns",
  "/audit": "Audit Trail",
  "/consents": "Consents",
  "/waitlist": "Waitlist",
};

interface DashboardWithCollapsibleSidebarProps {
  children: React.ReactNode;
}

export function DashboardWithCollapsibleSidebar({
  children,
}: DashboardWithCollapsibleSidebarProps) {
  const [open, setOpen] = useState(true);

  return (
    <div className="app-shell flex min-h-screen w-full text-foreground">
      <CollapsibleSidebar open={open} setOpen={setOpen} />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader open={open} setOpen={setOpen} />
        <main className="flex-1 overflow-auto px-4 pb-6 pt-4 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1440px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

function CollapsibleSidebar({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (value: boolean) => void;
}) {
  return (
    <aside
      className={cn(
        "surface-panel sticky top-0 hidden h-screen shrink-0 border-r border-sidebar-border/80 px-3 py-4 md:flex md:flex-col",
        open ? "w-76" : "w-24",
      )}
    >
      <Link
        href="/"
        className={cn(
          "hero-glow flex items-center rounded-[28px] border border-white/50 px-3 py-3 transition-colors",
          "bg-white/70 dark:bg-white/5",
        )}
      >
        <div className="grid size-12 place-content-center rounded-[20px] bg-linear-to-br from-cyan-500 via-team-500 to-emerald-500 text-white shadow-lg shadow-cyan-500/20">
          <Activity className="h-5 w-5" />
        </div>
        {open ? (
          <div className="ml-3 min-w-0">
            <p className="truncate text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Care Desk
            </p>
            <p className="truncate text-lg font-semibod text-foreground">
              HealthCRM
            </p>
          </div>
        ) : null}
      </Link>

      <div className="mt-6 rounded-[28px] border border-white/50 bg-white/55 p-3 text-sm shadow-sm dark:border-white/5 dark:bg-white/[0.03]">
        {open ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Clinic Pulse
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">94%</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Schedule confidence across today&apos;s care flow
            </p>
          </>
        ) : (
          <div className="flex justify-center py-2">
            <span className="rounded-full bg-primary/15 px-2 py-1 text-xs font-semibold text-primary">
              94
            </span>
          </div>
        )}
      </div>

      <div className="mt-6 flex-1 space-y-5 overflow-y-auto pb-4">
        {navGroups.map((group) => (
         <div key={group.label}>
           {open ? (
            <p className="mb-2 px-3 text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              {group.label}
            </p>
          ) : null}
          <div className="space-y-1">
            {group.items.map((item) => (
              <NavLink key={item.href} item={item} open={open} />
            ))}
          </div>
         </div>
        ))}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(!open)}
        className="mt-auto h-12 justify-start rounded-[18px] border border-white/55 bg-white/50 px-2.5 hover:bg-white/80 dark:border-white/5 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
      >
        <div className="grid size-8 place-content-center rounded-[12px] bg-primary/10 text-primary">
          <ChevronRight className={cn("h-4 w-4 transition-transform", open ? "rotate-180" : "")} />
        </div>
        {open ? <span className="ml-2 text-sm font-medium">Collapse</span> : null}
      </Button>
    </aside>
  );
}

function NavLink({
  item,
  open,
}: {
  item: { icon: React.ElementType; label: string; href: string };
  open: boolean;
}) {
  const pathname = usePathname();
  const isSelected =
    item.href === "/"
      ? pathname === "/"
      : pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center rounded-[18px] px-2 py-2.5 transition-all",
        isSelected
          ? "bg-linear-to-r from-primary to-cyan-500 text-primary-foreground shadow-lg shadow-cyan-500/20"
          : "text-muted-foreground hover:bg-white/75 hover:text-foreground dark:hover:bg-white/[0.05]",
      )}
    >
      <div
        className={cn(
          "grid size-10 shrink-0 place-content-center rounded-[14px] transition-colors",
          isSelected
            ? "bg-white/18 text-primary-foreground"
            : "bg-white/70 text-foreground/80 group-hover:bg-white dark:bg-white/[0.04] dark:group-hover:bg-white/[0.08]",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      {open ? (
        <div className="ml-3 min-w-0">
          <p className="truncate text-sm font-medium">{item.label}</p>
          <p
            className={cn(
              "truncate text-xs",
              isSelected ? "text-black/90" : "text-muted-foreground",
            )}
          >
            {item.label === "Dashboard" ? "Practice snapshot" : "Open workspace"}
          </p>
        </div>
      ) : null}
    </Link>
  );
}
