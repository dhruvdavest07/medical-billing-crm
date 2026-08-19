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
        <div className="grid size-12 place-content-center rounded-[20px] bg-linear-to-br from-cyan-500 via-teal-500 to-emerald-500 text-white shadow-lg shadow-cyan-500/20">
          <Activity className="h-5 w-5" />
        </div>
        {open ? (
          <div className="ml-3 min-w-0">
            <p className="truncate text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Care Desk
            </p>
            <p className="truncate text-lg font-semibold text-foreground">
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

function DashboardHeader({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (value: boolean) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { patients, appointments } = useMedical();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const title = useMemo(() => {
    if (routeTitles[pathname]) return routeTitles[pathname];
    const rootPath = `/${pathname.split("/").filter(Boolean)[0] ?? ""}`;
    return routeTitles[rootPath] ?? "Workspace";
  }, [pathname]);

  const searchResults = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) {
      return [];
    }

    const patientMatches = patients
      .filter((patient) => {
        return [
          patient.firstName,
          patient.lastName,
          patient.mrn,
          patient.phone,
          patient.email,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      })
      .slice(0, 4)
      .map((patient) => ({
        id: `patient-${patient.id}`,
        href: `/patients?q=${encodeURIComponent(`${patient.firstName} ${patient.lastName}`)}`,
        title: `${patient.firstName} ${patient.lastName}`,
        subtitle: `Patient · ${patient.mrn}`,
        icon: Users,
      }));

    const appointmentMatches = appointments
      .filter((appointment) => {
        return [appointment.patientId, appointment.provider, appointment.type, appointment.date]
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      })
      .slice(0, 4)
      .map((appointment) => ({
        id: `appointment-${appointment.id}`,
        href: `/appointments?q=${encodeURIComponent(appointment.type)}`,
        title: `${appointment.type} · ${appointment.date}`,
        subtitle: `Appointment · ${appointment.provider}`,
        icon: Calendar,
      }));

    const workspaceMatches = Object.entries(routeTitles)
      .filter(([href, value]) => href !== pathname && value.toLowerCase().includes(normalized))
      .slice(0, 4)
      .map(([href, value]) => ({
        id: `route-${href}`,
        href,
        title: value,
        subtitle: "Workspace",
        icon: Home,
      }));

    return [...patientMatches, ...appointmentMatches, ...workspaceMatches].slice(0, 6);
  }, [appointments, pathname, patients, searchQuery]);

  const notifications = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const items: Array<{
      id: string;
      title: string;
      description: string;
      href: string;
      icon: React.ElementType;
    }> = [];

    const todaysAppointments = appointments.filter((appointment) => appointment.date === today);
    if (todaysAppointments.length > 0) {
      items.push({
        id: "appointments-today",
        title: `${todaysAppointments.length} appointments today`,
        description: "Review today's live schedule and patient flow.",
        href: "/appointments",
        icon: Calendar,
      });
    }

    const confirmedAppointments = appointments.filter(
      (appointment) => appointment.status?.toLowerCase() === "confirmed",
    );
    if (confirmedAppointments.length > 0) {
      items.push({
        id: "confirmed-appointments",
        title: `${confirmedAppointments.length} confirmed visits`,
        description: "Patients are ready for intake or provider review.",
        href: "/appointments",
        icon: Bell,
      });
    }

    if (patients.length > 0) {
      items.push({
        id: "patients-directory",
        title: `${patients.length} patients in directory`,
        description: "Open the patient workspace to review records.",
        href: "/patients",
        icon: Users,
      });
    }

    items.push({
      id: "labs-review",
      title: "Lab review queue available",
      description: "Check recent abnormal and pending results.",
      href: "/labs",
      icon: Microscope,
    });

    return items.slice(0, 4);
  }, [appointments, patients]);

  const unreadNotifications = notifications.length;

  const openSearchResult = (href: string) => {
    setSearchQuery("");
    setIsSearchFocused(false);
    router.push(href);
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (searchResults[0]) {
      openSearchResult(searchResults[0].href);
      return;
    }

    router.push("/patients");
  };

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    try {
      setIsLoggingOut(true);

      const result = await signOut({
        callbackUrl: "/login",
        redirect: false,
      });

      router.push(getLocalNavigationTarget(result?.url, "/login"));
      router.refresh();
    } catch (error) {
      logClientError("Staff logout failed", error);
      toast.error("Unable to log out. Please try again.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-20 px-4 pt-4 sm:px-6 lg:px-8">
      <div className="surface-panel flex h-20 items-center justify-between rounded-[30px] border border-white/55 px-4 sm:px-6 dark:border-white/6">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setOpen(!open)}
            className="rounded-[14px] md:hidden"
            aria-label="Toggle navigation"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Operational Workspace
            </p>
            <h1 className="truncate text-2xl font-semibold text-foreground">
              {title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative hidden md:block">
            <form onSubmit={handleSearchSubmit}>
              <label className="flex w-[30rem] items-center gap-3 rounded-[18px] border border-white/55 bg-white/60 px-4 py-2.5 text-sm text-muted-foreground shadow-sm dark:border-white/6 dark:bg-white/[0.03]">
                <Search className="h-4 w-4" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => {
                    window.setTimeout(() => setIsSearchFocused(false), 120);
                  }}
                  placeholder="Search patients, visits, claims"
                  className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
                  aria-label="Search patients, visits, claims"
                />
              </label>
            </form>

            {isSearchFocused && searchResults.length > 0 ? (
              <div className="surface-panel absolute left-0 top-[calc(100%+0.75rem)] z-30 w-full rounded-[24px] border border-white/60 p-2 dark:border-white/6">
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => openSearchResult(result.href)}
                    className="flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left transition-colors hover:bg-white/65 dark:hover:bg-white/[0.05]"
                  >
                    <div className="grid size-10 shrink-0 place-content-center rounded-[14px] bg-primary/10 text-primary">
                      <result.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {result.title}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {result.subtitle}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative rounded-[16px] border border-white/55 bg-white/60 dark:border-white/6 dark:bg-white/[0.03]"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadNotifications > 0 ? (
                  <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-content-center rounded-full border-2 border-background bg-amber-500 px-1 text-[10px] font-semibold text-white">
                    {unreadNotifications}
                  </span>
                ) : null}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 rounded-[18px] p-2">
              <DropdownMenuLabel className="px-3 py-2">Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <div className="px-3 py-4 text-sm text-muted-foreground">
                  No new notifications.
                </div>
              ) : (
                notifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    asChild
                    className="rounded-[14px] px-3 py-3 focus:bg-accent/60"
                  >
                    <Link href={notification.href} className="flex items-start gap-3">
                      <div className="grid size-9 shrink-0 place-content-center rounded-[12px] bg-primary/10 text-primary">
                        <notification.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {notification.title}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {notification.description}
                        </p>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {mounted ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-[16px] border border-white/55 bg-white/60 dark:border-white/6 dark:bg-white/[0.03]"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-11 rounded-[18px] border border-white/55 bg-white/60 px-2 dark:border-white/6 dark:bg-white/[0.03]"
              >
                <div className="grid size-8 place-content-center rounded-[12px] bg-linear-to-br from-primary to-cyan-500 text-primary-foreground">
                  <User className="h-4 w-4" />
                </div>
                <div className="hidden text-left sm:block">
                  <p className="text-sm font-medium text-foreground">Admin Doctor</p>
                  <p className="text-xs text-muted-foreground">Acme Clinic</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-[18px]">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/help">Help</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600"
                disabled={isLoggingOut}
                onSelect={() => {
                  void handleLogout();
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {isLoggingOut ? "Logging out..." : "Log out"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

export default DashboardWithCollapsibleSidebar;
