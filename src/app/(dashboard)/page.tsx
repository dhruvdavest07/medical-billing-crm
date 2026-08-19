"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Bell,
  Calendar,
  Clock,
  HeartPulse,
  Users,
} from "lucide-react";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useMedical, Patient } from "@/context/MedicalContext";
import { PatientProfileSheet } from "@/components/patients/patient-profile-sheet";
import { AddPatientDialog } from "@/components/patients/add-patient-dialog";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { patients, appointments, refetchPatients } = useMedical();

  const [today] = React.useState(() => new Date().toISOString().split("T")[0]);
  const [now] = React.useState(() => Date.now());
  const cancelledStatus = (status: string) => status?.toLowerCase() === "cancelled";

  const appointmentsToday = appointments.filter(
    (appointment) => appointment.date === today && !cancelledStatus(appointment.status),
  );

  const activeEncounters = appointments.filter(
    (appointment) =>
      appointment.status?.toLowerCase() === "in waiting room" ||
      appointment.status?.toLowerCase() === "confirmed",
  ).length;

  const getAppointmentTime = (appointment: {
    startTime?: string;
    date: string;
    time: string;
  }) =>
    appointment.startTime
      ? new Date(appointment.startTime).getTime()
      : new Date(`${appointment.date}T${appointment.time}`).getTime();

  const upcomingAppointments = appointments
    .filter((appointment) => {
      if (cancelledStatus(appointment.status)) return false;
      return getAppointmentTime(appointment) >= now;
    })
    .sort((a, b) => getAppointmentTime(a) - getAppointmentTime(b))
    .slice(0, 5);

  const stats = [
    {
      name: "Total Patients",
      value: patients.length.toLocaleString(),
      change: "+12%",
      icon: Users,
      color: "cyan",
    },
    {
      name: "Appointments Today",
      value: appointmentsToday.length.toString(),
      change: "+4%",
      icon: Calendar,
      color: "emerald",
    },
    {
      name: "Active Encounters",
      value: activeEncounters.toString(),
      change: "+2%",
      icon: Activity,
      color: "violet",
    },
    {
      name: "Avg Wait Time",
      value: "14 min",
      change: "-2%",
      icon: Clock,
      color: "amber",
    },
  ];

  const quickStats = [
    { label: "Patient Retention", value: "92%", pct: 92, color: "cyan" },
    { label: "No-Show Rate", value: "4.2%", pct: 4.2, color: "amber" },
    { label: "Visit Frequency", value: "8.7/mo", pct: 87, color: "emerald" },
  ];

  const activityItems = React.useMemo(() => {
    const items: Array<{
      icon: typeof Users;
      title: string;
      desc: string;
      time: string;
      color: "cyan" | "emerald" | "violet" | "amber" | "red";
    }> = [];

    patients.slice(0, 3).forEach((patient, index) => {
      items.push({
        icon: Users,
        title: "New patient registered",
        desc: `${patient.firstName} ${patient.lastName}`,
        time: index === 0 ? "2 min ago" : index === 1 ? "15 min ago" : "1 hour ago",
        color: "cyan",
      });
    });

    appointments.slice(0, 2).forEach((appointment, index) => {
      const patient = patients.find((entry) => entry.id === appointment.patientId);
      const name = patient ? `${patient.firstName} ${patient.lastName}` : "Patient";
      items.push({
        icon: Calendar,
        title: "Appointment scheduled",
        desc: `${name} · ${appointment.date} ${appointment.time}`,
        time: index === 0 ? "5 min ago" : "30 min ago",
        color: "emerald",
      });
    });

    items.push(
      {
        icon: Activity,
        title: "System update",
        desc: "Scheduled backup completed",
        time: "1 hour ago",
        color: "amber",
      },
      {
        icon: Bell,
        title: "Care campaign",
        desc: "Follow-up reminders sent",
        time: "2 hours ago",
        color: "violet",
      },
    );

    return items.slice(0, 6);
  }, [appointments, patients]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 280, damping: 26 },
    },
  };

  const colorMap = {
    cyan: "bg-cyan-500/12 text-cyan-700 dark:text-cyan-300",
    emerald: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
    violet: "bg-violet-500/12 text-violet-700 dark:text-violet-300",
    amber: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
    red: "bg-red-500/12 text-red-700 dark:text-red-300",
  };

  return (
    <motion.div
      className="flex w-full flex-col gap-8 pb-6"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.section
        variants={itemVariants}
        className="hero-glow surface-panel relative overflow-hidden rounded-[34px] border border-white/60 px-6 py-7 dark:border-white/6 sm:px-8"
      >
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-primary dark:border-white/8 dark:bg-white/[0.04]">
              <HeartPulse className="h-3.5 w-3.5" />
              Daily Careboard
            </div>
            <h2 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.05em] text-foreground sm:text-5xl">
              Care operations look healthy, but the waiting room is your next pressure point.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              Today&apos;s schedule is active, patients are moving through intake, and your upcoming appointments are already clustering into the next few hours.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              {
                label: "Live queue",
                value: `${activeEncounters} active`,
                copy: "Patients currently in flow",
              },
              {
                label: "Today",
                value: `${appointmentsToday.length} visits`,
                copy: "Appointments not cancelled",
              },
              {
                label: "Momentum",
                value: "Low no-show risk",
                copy: "Schedule confidence is stable",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[24px] border border-white/60 bg-white/72 p-4 dark:border-white/8 dark:bg-white/[0.04]"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {item.label}
                </p>
                <p className="mt-2 text-lg font-semibold text-foreground">{item.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <motion.div
            variants={itemVariants}
            key={stat.name}
            className="surface-panel group relative overflow-hidden rounded-[28px] border border-white/60 p-6 dark:border-white/6"
          >
            <div
              className={cn(
                "pointer-events-none absolute inset-0 rounded-[28px] opacity-0 transition-opacity group-hover:opacity-100",
                stat.color === "cyan" && "bg-linear-to-br from-cyan-500/14 to-transparent",
                stat.color === "emerald" && "bg-linear-to-br from-emerald-500/14 to-transparent",
                stat.color === "violet" && "bg-linear-to-br from-violet-500/14 to-transparent",
                stat.color === "amber" && "bg-linear-to-br from-amber-500/14 to-transparent",
              )}
            />

            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
                <h3 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-foreground">
                  {stat.value}
                </h3>
              </div>
              <div
                className={cn(
                  "rounded-[18px] p-3 transition-transform duration-300 group-hover:rotate-3 group-hover:scale-110",
                  colorMap[stat.color as keyof typeof colorMap],
                )}
              >
                <stat.icon className="h-5 w-5" strokeWidth={2} />
              </div>
            </div>

            <div className="relative mt-4 flex items-center text-sm">
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 font-medium",
                  stat.change.startsWith("+")
                    ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
                    : "bg-red-500/12 text-red-700 dark:text-red-300",
                )}
              >
                {stat.change}
              </span>
              <span className="ml-2 text-muted-foreground">from last month</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <motion.div
            variants={itemVariants}
            className="surface-panel rounded-[30px] border border-white/60 p-6 dark:border-white/6"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-[-0.03em] text-foreground">
                Recent Activity
              </h2>
              <Button
                variant="link"
                className="h-auto p-0 text-sm font-medium text-primary no-underline hover:no-underline"
                asChild
              >
                <a href="#" className="inline-flex items-center gap-1">
                  View all
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </Button>
            </div>

            <div className="space-y-1.5">
              {activityItems.map((activity, index) => (
                <div
                  key={`${activity.title}-${index}`}
                  className="flex cursor-default items-center gap-4 rounded-[22px] p-3 transition-colors hover:bg-white/65 dark:hover:bg-white/[0.04]"
                >
                  <div className={cn("shrink-0 rounded-[16px] p-2.5", colorMap[activity.color])}>
                    <activity.icon className="h-4 w-4" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {activity.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{activity.desc}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{activity.time}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <div className="space-y-6">
          <motion.div
            variants={itemVariants}
            className="surface-panel rounded-[30px] border border-white/60 p-6 dark:border-white/6"
          >
            <h2 className="mb-4 text-lg font-semibold tracking-[-0.03em] text-foreground">
              Quick Stats
            </h2>
            <div className="space-y-4">
              {quickStats.map((quickStat, index) => (
                <div key={quickStat.label}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{quickStat.label}</span>
                    <span className="text-sm font-semibold text-foreground">
                      {quickStat.value}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(quickStat.pct, 100)}%` }}
                      transition={{ duration: 0.8, delay: 0.2 + index * 0.1 }}
                      className={cn(
                        "h-full rounded-full",
                        quickStat.color === "cyan" && "bg-cyan-500",
                        quickStat.color === "amber" && "bg-amber-500",
                        quickStat.color === "emerald" && "bg-emerald-500",
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="surface-panel rounded-[30px] border border-white/60 p-6 dark:border-white/6"
          >
            <h2 className="mb-4 text-lg font-semibold tracking-[-0.03em] text-foreground">
              Upcoming Appointments
            </h2>
            <div className="space-y-3">
              {upcomingAppointments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming appointments.</p>
              ) : (
                upcomingAppointments.map((appointment) => {
                  const patient = patients.find((entry) => entry.id === appointment.patientId);
                  const name = patient ? `${patient.firstName} ${patient.lastName}` : "—";

                  return (
                    <div
                      key={appointment.id}
                      className="flex items-center justify-between rounded-[22px] px-3 py-3 transition-colors hover:bg-white/65 dark:hover:bg-white/[0.04]"
                    >
                      <div>
                        <span className="text-sm font-medium text-foreground">{name}</span>
                        <p className="text-xs text-muted-foreground">
                          {appointment.date} · {appointment.time} · {appointment.type}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium capitalize",
                          appointment.status?.toLowerCase() === "confirmed" &&
                            "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
                          (appointment.status?.toLowerCase() === "scheduled" ||
                            appointment.status?.toLowerCase() === "in waiting room") &&
                            "bg-cyan-500/12 text-cyan-700 dark:text-cyan-300",
                          appointment.status?.toLowerCase() === "pending" &&
                            "bg-amber-500/12 text-amber-700 dark:text-amber-300",
                          !appointment.status && "bg-muted text-muted-foreground",
                        )}
                      >
                        {appointment.status || "—"}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <motion.div
        variants={itemVariants}
        className="surface-panel overflow-hidden rounded-[32px] border border-white/60 dark:border-white/6"
      >
        <div className="flex items-center justify-between border-b border-white/60 bg-white/40 p-6 dark:border-white/6 dark:bg-white/[0.02]">
          <h2 className="text-lg font-semibold tracking-[-0.03em] text-foreground">
            Recent Patients
          </h2>
          <AddPatientDialog onSuccess={refetchPatients} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/32 text-muted-foreground dark:bg-white/[0.015]">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">ID / MRN</th>
                <th className="px-6 py-4">Last Visit</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/60 text-foreground dark:divide-white/6">
              {patients.slice(0, 5).map((patient: Patient) => (
                <tr
                  key={patient.id}
                  className="group transition-colors hover:bg-white/45 dark:hover:bg-white/[0.03]"
                >
                  <td className="px-6 py-4 font-medium">
                    {patient.firstName} {patient.lastName}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{patient.mrn}</td>
                  <td className="px-6 py-4">
                    {new Date(patient.lastVisit).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/12 px-2.5 py-1 text-xs font-semibold tracking-wide text-emerald-700 dark:text-emerald-300">
                      {patient.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button
                          variant="link"
                          className="h-auto p-0 font-semibold text-primary transition-transform hover:no-underline group-hover:translate-x-1"
                        >
                          View Profile
                        </Button>
                      </SheetTrigger>
                      <PatientProfileSheet patient={patient} />
                    </Sheet>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}
