"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Activity, CalendarClock, FileHeart, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getClientErrorMessage, logClientError } from "@/lib/client-logger";

export default function PatientLoginPage() {
  const [loading, setLoading] = React.useState(false);
  const [formData, setFormData] = React.useState({
    email: "",
    mrn: "",
    password: "",
  });
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.mrn || !formData.password) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/patient-auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Login failed");
      }

      await response.json();

      toast.success("Login successful!");
      router.push("/patient-portal");
    } catch (error) {
      toast.error(getClientErrorMessage(error, "Login failed"));
      logClientError("Patient login failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="hero-glow flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-[36px] border border-white/60 surface-panel lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden min-h-[640px] flex-col justify-between bg-[linear-gradient(155deg,rgba(10,68,92,0.96),rgba(15,123,120,0.9))] p-10 text-white lg:flex">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/82">
              <Activity className="h-3.5 w-3.5" />
              Patient Portal
            </div>
            <h1 className="mt-6 max-w-md text-5xl font-semibold leading-[1.03] tracking-[-0.05em]">
              Your care history, appointments, and updates in one place.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-white/74">
              Review upcoming visits, recent lab summaries, and your account details through a secure portal session.
            </p>
          </div>

          <div className="grid gap-3">
            {[
              {
                icon: ShieldCheck,
                title: "Secure session",
                copy: "Portal access is verified server-side and stored in an HttpOnly session cookie.",
              },
              {
                icon: CalendarClock,
                title: "Appointment visibility",
                copy: "See upcoming bookings and recent care activity without calling the front desk.",
              },
              {
                icon: FileHeart,
                title: "Clinical continuity",
                copy: "Lab result summaries and core profile details stay accessible in one patient view.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[24px] border border-white/12 bg-white/8 p-4 backdrop-blur-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="grid size-10 shrink-0 place-content-center rounded-[16px] bg-white/14">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-white/72">{item.copy}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="flex min-h-[640px] items-center bg-white/74 px-5 py-8 dark:bg-slate-950/30 sm:px-10">
          <Card className="w-full border-white/60 bg-white/70 shadow-none dark:border-white/8 dark:bg-white/[0.03]">
            <CardHeader className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
                Patient Sign In
              </p>
              <CardTitle className="text-4xl font-semibold tracking-[-0.05em]">
                Access your portal
              </CardTitle>
              <CardDescription className="text-sm leading-6">
                Sign in to review appointments, lab summaries, and account information tied to your record.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="gap-2 flex flex-col">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    className="h-12 rounded-[18px] bg-white/80 dark:bg-white/[0.04]"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="gap-2 flex flex-col">
                  <Label htmlFor="mrn">Medical Record Number (MRN)</Label>
                  <Input
                    id="mrn"
                    placeholder="Your MRN"
                    className="h-12 rounded-[18px] bg-white/80 dark:bg-white/[0.04]"
                    value={formData.mrn}
                    onChange={(e) =>
                      setFormData({ ...formData, mrn: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="gap-2 flex flex-col">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="h-12 rounded-[18px] bg-white/80 dark:bg-white/[0.04]"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="h-12 w-full rounded-[18px] bg-linear-to-r from-primary to-cyan-500 text-white shadow-lg shadow-cyan-500/20 hover:opacity-95"
                >
                  {loading ? "Signing in..." : "Open portal"}
                </Button>

                <p className="text-center text-xs leading-5 text-muted-foreground">
                  Don&apos;t have an account? Contact your healthcare provider to register.
                </p>
              </form>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
