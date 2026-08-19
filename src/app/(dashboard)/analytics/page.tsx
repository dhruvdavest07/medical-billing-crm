"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { BarChart3, Users, Calendar, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AnalyticsPage() {
  const [stats, setStats] = React.useState<{
    patients: number;
    appointments: number;
    encounters: number;
    avgWait?: number;
  } | null>(null);

  React.useEffect(() => {
    Promise.all([
      fetch("/api/patients").then((r) => r.json()),
      fetch("/api/appointments").then((r) => r.json()),
      fetch("/api/encounters").then((r) => r.json()),
    ])
      .then(([patients, appointments, encounters]) => {
        setStats({
          patients: Array.isArray(patients) ? patients.length : 0,
          appointments: Array.isArray(appointments) ? appointments.length : 0,
          encounters: Array.isArray(encounters) ? encounters.length : 0,
          avgWait: 14,
        });
      })
      .catch(() => setStats({ patients: 0, appointments: 0, encounters: 0 }));
  }, []);

  const cards = [
    { label: "Total Patients", value: stats?.patients ?? "—", icon: Users },
    { label: "Appointments (All)", value: stats?.appointments ?? "—", icon: Calendar },
    { label: "Encounters", value: stats?.encounters ?? "—", icon: BarChart3 },
    { label: "Avg Wait Time", value: stats?.avgWait != null ? `${stats.avgWait} min` : "—", icon: Clock },
  ];

  return (
    <motion.div
      className="flex flex-col gap-8 w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <h1 className="text-2xl font-bold tracking-tight">Analytics & Insights</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-neutral-500 flex items-center gap-2">
                  <c.icon className="w-4 h-4" />
                  {c.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-bold">{c.value}</span>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Operational Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-neutral-500">
            Revenue streams, resource utilization, and AI-driven insights will be displayed here.
            Connect your data to see real-time dashboards.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
