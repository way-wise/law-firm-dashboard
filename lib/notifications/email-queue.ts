import "server-only";
import { sendDeadlineReminderEmail, sendNotificationEmail } from "./email";

type EmailJobData = 
  | { type: "deadline"; data: Parameters<typeof sendDeadlineReminderEmail>[0] }
  | { type: "notification"; data: Parameters<typeof sendNotificationEmail>[0] };

interface EmailJob {
  id: string;
  jobData: EmailJobData;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  status: "pending" | "processing" | "completed" | "failed";
  error?: string;
}

/**
 * Simple in-memory email queue
 * 
 * NOTE: This is suitable for single-server deployments only.
 * For production with multiple instances, consider using:
 * - BullMQ with Redis: https://bullmq.io/
 * - Quirrel: https://quirrel.dev/
 * - Trigger.dev: https://trigger.dev/
 */
class EmailQueue {
  private queue: EmailJob[] = [];
  private processing = false;
  private readonly maxConcurrent = 3;
  private readonly retryDelayMs = 5000;

  async add(jobData: EmailJobData): Promise<string> {
    const job: EmailJob = {
      id: `email_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      jobData,
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date(),
      status: "pending",
    };

    this.queue.push(job);
    console.log(`[EMAIL-QUEUE] Added ${jobData.type} email job ${job.id} to queue. Queue size: ${this.queue.length}`);

    // Start processing if not already running
    this.processQueue();

    return job.id;
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      while (this.queue.some((j) => j.status === "pending")) {
        const pendingJobs = this.queue.filter((j) => j.status === "pending").slice(0, this.maxConcurrent);

        if (pendingJobs.length === 0) break;

        await Promise.all(
          pendingJobs.map(async (job) => {
            job.status = "processing";
            job.attempts++;

            try {
              let success = false;
              
              // Handle different email types
              if (job.jobData.type === "deadline") {
                success = await sendDeadlineReminderEmail(job.jobData.data);
              } else if (job.jobData.type === "notification") {
                success = await sendNotificationEmail(job.jobData.data);
              }
              
              if (success) {
                job.status = "completed";
                console.log(`[EMAIL-QUEUE] Job ${job.id} (${job.jobData.type}) completed successfully`);
              } else {
                throw new Error("Email send returned false");
              }
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : "Unknown error";
              console.error(`[EMAIL-QUEUE] Job ${job.id} (${job.jobData.type}) failed (attempt ${job.attempts}/${job.maxAttempts}):`, errorMessage);

              if (job.attempts < job.maxAttempts) {
                job.status = "pending";
                job.error = errorMessage;
                // Wait before retry
                await new Promise((resolve) => setTimeout(resolve, this.retryDelayMs));
              } else {
                job.status = "failed";
                job.error = errorMessage;
                console.error(`[EMAIL-QUEUE] Job ${job.id} (${job.jobData.type}) permanently failed after ${job.maxAttempts} attempts`);
              }
            }
          })
        );
      }
    } finally {
      this.processing = false;
    }

    // Clean up completed/failed jobs older than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    this.queue = this.queue.filter(
      (j) => j.status === "pending" || j.status === "processing" || j.createdAt > oneHourAgo
    );
  }

  getStats() {
    return {
      total: this.queue.length,
      pending: this.queue.filter((j) => j.status === "pending").length,
      processing: this.queue.filter((j) => j.status === "processing").length,
      completed: this.queue.filter((j) => j.status === "completed").length,
      failed: this.queue.filter((j) => j.status === "failed").length,
    };
  }
}

// Singleton instance
export const emailQueue = new EmailQueue();

// Helper function to queue a deadline reminder email
export async function queueDeadlineReminderEmail(
  data: Parameters<typeof sendDeadlineReminderEmail>[0]
): Promise<string> {
  return emailQueue.add({ type: "deadline", data });
}

// Helper function to queue a notification email
export async function queueNotificationEmail(
  data: Parameters<typeof sendNotificationEmail>[0]
): Promise<string> {
  return emailQueue.add({ type: "notification", data });
}
