import "server-only";
import { sendDeadlineReminderEmail } from "./email";

interface EmailJob {
  id: string;
  data: Parameters<typeof sendDeadlineReminderEmail>[0];
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

  async add(data: Parameters<typeof sendDeadlineReminderEmail>[0]): Promise<string> {
    const job: EmailJob = {
      id: `email_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      data,
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date(),
      status: "pending",
    };

    this.queue.push(job);
    console.log(`[EMAIL-QUEUE] Added job ${job.id} to queue. Queue size: ${this.queue.length}`);

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
              const success = await sendDeadlineReminderEmail(job.data);
              if (success) {
                job.status = "completed";
                console.log(`[EMAIL-QUEUE] Job ${job.id} completed successfully`);
              } else {
                throw new Error("Email send returned false");
              }
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : "Unknown error";
              console.error(`[EMAIL-QUEUE] Job ${job.id} failed (attempt ${job.attempts}/${job.maxAttempts}):`, errorMessage);

              if (job.attempts < job.maxAttempts) {
                job.status = "pending";
                job.error = errorMessage;
                // Wait before retry
                await new Promise((resolve) => setTimeout(resolve, this.retryDelayMs));
              } else {
                job.status = "failed";
                job.error = errorMessage;
                console.error(`[EMAIL-QUEUE] Job ${job.id} permanently failed after ${job.maxAttempts} attempts`);
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
  return emailQueue.add(data);
}
