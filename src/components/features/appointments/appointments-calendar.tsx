"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Stethoscope,
  Calendar as CalendarIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AppointmentForCalendar = {
  id: string;
  patientId: string;
  patient?: string | null;
  provider: string;
  date: string;
  time: string;
  startTime?: string;
  endTime?: string;
  duration: string;
  type: string;
  status: string;
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parseAppointmentTime(apt: AppointmentForCalendar): { start: Date; end: Date } {
  if (apt.startTime && apt.endTime) {
    return { start: new Date(apt.startTime), end: new Date(apt.endTime) };
  }
  const [y, m, d] = apt.date.split("-").map(Number);
  const timeStr = apt.time;
  let hours = 9;
  let mins = 0;
  if (timeStr) {
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (match) {
      hours = parseInt(match[1], 10);
      mins = parseInt(match[2], 10);
      if (match[3]?.toUpperCase() === "PM" && hours < 12) hours += 12;
      if (match[3]?.toUpperCase() === "AM" && hours === 12) hours = 0;
    }
  }
  const start = new Date(y, m - 1, d, hours, mins);
  const durationMins = parseInt(apt.duration, 10) || 30;
  const end = new Date(start.getTime() + durationMins * 60 * 1000);
  return { start, end };
}

function getWeekDays(centerDate: Date): Date[] {
  const d = new Date(centerDate);
  const day = d.getDay();
  const diff = d.getDate() - day;
  const sunday = new Date(d);
  sunday.setDate(diff);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(sunday);
    x.setDate(sunday.getDate() + i);
    return x;
  });
}

function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

interface AppointmentsCalendarProps {
  appointments: AppointmentForCalendar[];
  onEdit?: (apt: AppointmentForCalendar) => void;
}

export function AppointmentsCalendar({
  appointments,
  onEdit,
}: AppointmentsCalendarProps) {
  const [viewDate, setViewDate] = React.useState(() => new Date());
  const weekDays = React.useMemo(() => getWeekDays(viewDate), [viewDate]);

  const goPrev = () => {
    setViewDate((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() - 7);
      return next;
    });
  };

  const goNext = () => {
    setViewDate((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() + 7);
      return next;
    });
  };

  const goToday = () => setViewDate(new Date());

  const todayYMD = toYMD(new Date());

  const appointmentsByDay = React.useMemo(() => {
    const byDay: Record<string, AppointmentForCalendar[]> = {};
    const daySet = new Set(weekDays.map(toYMD));
    for (const apt of appointments) {
      const d = apt.date.slice(0, 10);
      if (daySet.has(d)) {
        if (!byDay[d]) byDay[d] = [];
        byDay[d].push(apt);
      }
    }
    for (const key of Object.keys(byDay)) {
      byDay[key].sort((a, b) => {
        const { start: sa } = parseAppointmentTime(a);
        const { start: sb } = parseAppointmentTime(b);
        return sa.getTime() - sb.getTime();
      });
    }
    return byDay;
  }, [appointments, weekDays]);

  const statusStyles: Record<string, string> = {
    Confirmed:
      "bg-blue-500/10 border-l-blue-500 dark:border-l-blue-400 text-blue-800 dark:text-blue-200",
    "In Waiting Room":
      "bg-amber-500/10 border-l-amber-500 dark:border-l-amber-400 text-amber-800 dark:text-amber-200",
    Scheduled:
      "bg-violet-500/10 border-l-violet-500 dark:border-l-violet-400 text-violet-800 dark:text-violet-200",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col h-full min-h-[400px]"
    >
      {/* Navigation header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={goPrev}
            className="h-8 w-8 rounded-[5px] shrink-0 hover:bg-violet-50 dark:hover:bg-violet-950/30 hover:border-violet-300 dark:hover:border-violet-800 transition-colors"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={goNext}
            className="h-8 w-8 rounded-[5px] shrink-0 hover:bg-violet-50 dark:hover:bg-violet-950/30 hover:border-violet-300 dark:hover:border-violet-800 transition-colors"
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-50 min-w-[220px]">
            {weekDays[0].toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}{" "}
            –{" "}
            {weekDays[6].toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={goToday}
          className="rounded-[5px] self-start sm:self-center border-violet-200 dark:border-violet-800 hover:bg-violet-50 dark:hover:bg-violet-950/30 hover:border-violet-300"
        >
          <CalendarIcon className="h-4 w-4 mr-2" />
          Today
        </Button>
      </div>

      {/* Week grid - 7 day columns */}
      <div className="flex-1 overflow-x-auto overflow-y-auto p-4">
        <div className="grid grid-cols-7 gap-3 min-w-[700px]">
          {weekDays.map((d) => {
            const ymd = toYMD(d);
            const isToday = ymd === todayYMD;
            const dayAppointments = appointmentsByDay[ymd] ?? [];

            return (
              <motion.div
                key={ymd}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex flex-col rounded-[5px] border min-h-[280px] overflow-hidden",
                  isToday
                    ? "border-violet-300 dark:border-violet-700 bg-violet-50/30 dark:bg-violet-950/20 shadow-sm shadow-violet-200/30 dark:shadow-violet-900/20"
                    : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50"
                )}
              >
                <div
                  className={cn(
                    "px-3 py-2.5 text-center font-medium text-sm border-b shrink-0",
                    isToday
                      ? "bg-violet-100 dark:bg-violet-900/40 text-violet-800 dark:text-violet-200 border-violet-200/50 dark:border-violet-800/50"
                      : "bg-neutral-50 dark:bg-neutral-800/50 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800"
                  )}
                >
                  <div className="text-[10px] uppercase tracking-wider text-neutral-500 dark:text-neutral-500">
                    {DAY_NAMES[d.getDay()]}
                  </div>
                  <div className="text-lg font-semibold mt-0.5">{d.getDate()}</div>
                </div>

                <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                  <AnimatePresence mode="popLayout">
                    {dayAppointments.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center h-24 text-neutral-400 dark:text-neutral-500 text-xs"
                      >
                        <CalendarIcon className="h-8 w-8 mb-2 opacity-50" strokeWidth={1.5} />
                        <span>No appointments</span>
                      </motion.div>
                    ) : (
                      dayAppointments.map((apt) => {
                        const patientName = apt.patient ?? "Unknown Patient";
                        const style =
                          statusStyles[apt.status] ??
                          "bg-neutral-100 dark:bg-neutral-800 border-l-neutral-400 text-neutral-800 dark:text-neutral-200";

                        return (
                          <motion.div
                            key={apt.id}
                            layout
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            className={cn(
                              "rounded-[5px] border-l-[3px] p-2.5 cursor-pointer transition-all",
                              "hover:shadow-md hover:ring-2 hover:ring-violet-400/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                              style
                            )}
                            onClick={() => onEdit?.(apt)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                onEdit?.(apt);
                              }
                            }}
                          >
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                              <Clock className="h-3 w-3 shrink-0" strokeWidth={2.5} />
                              {apt.time}
                              <span className="text-[10px] font-normal opacity-75">
                                · {apt.duration}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-medium truncate mt-1">
                              <User className="h-3 w-3 shrink-0" strokeWidth={2.5} />
                              {patientName}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-neutral-600 dark:text-neutral-400 truncate mt-0.5">
                              <Stethoscope className="h-3 w-3 shrink-0" strokeWidth={2.5} />
                              {apt.provider}
                            </div>
                            <span className="inline-block mt-2 text-[10px] font-medium opacity-80">
                              {apt.type}
                            </span>
                          </motion.div>
                        );
                      })
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
