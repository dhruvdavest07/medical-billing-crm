import { Queue, Worker } from "bullmq";

const connection = {
  host: process.env.REDIS_HOST ?? "localhost",
  port: parseInt(process.env.REDIS_PORT ?? "6379", 10),
  password: process.env.REDIS_PASSWORD ?? undefined,
};

export const reminderQueue = new Queue("appointment-reminders", { connection });
export const campaignQueue = new Queue("communication-campaigns", { connection });

export type ReminderJobData = {
  appointmentId: string;
  patientId: string;
  patientPhone?: string;
  patientEmail?: string;
  reminderType: "24h" | "1h";
  scheduledFor: string;
};

export type CampaignJobData = {
  campaignId: string;
  patientIds: string[];
  message: string;
  channel: "sms" | "email" | "whatsapp";
};

export async function scheduleReminder(data: ReminderJobData) {
  return reminderQueue.add("send-reminder", data, {
    delay: Math.max(0, new Date(data.scheduledFor).getTime() - Date.now()),
    jobId: `reminder-${data.appointmentId}-${data.reminderType}`,
  });
}

export async function scheduleCampaign(data: CampaignJobData) {
  return campaignQueue.add("send-campaign", data);
}

/**
 * Start reminder worker (call from a separate process or API route).
 * In production, run as a dedicated worker process.
 */
export function createReminderWorker(
  processor: (job: { data: ReminderJobData }) => Promise<void>
) {
  return new Worker<ReminderJobData>("appointment-reminders", processor, {
    connection,
  });
}
