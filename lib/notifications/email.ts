import "server-only";
import nodemailer from "nodemailer";

// Email service for sending notifications
// Using Nodemailer with SMTP

// Notification types
export type EmailNotificationType = "rfe" | "approval" | "denial" | "statusChange" | "deadline" | "test" | "workflowChange" | "billingChange" | "pastDeadline";

// Generic notification email data
interface NotificationEmailData {
  to: string;
  type: EmailNotificationType;
  subject: string;
  message: string;
  greeting?: string;
  closing?: string;
  matterTitle: string;
  clientName?: string | null;
  matterType?: string | null;
  workflowStage?: string | null;
  deadlineDate?: Date | null;
  paralegalAssigned?: string | null;
  billingStatus?: string | null;
  matterUrl?: string;
  isTest?: boolean;
}

interface DeadlineEmailData {
  to: string;
  matterTitle: string;
  clientName: string | null;
  matterType: string | null;
  deadlineDate: Date;
  daysRemaining: number;
  workflowStage: string | null;
  paralegalName: string | null;
  matterUrl: string;
}

// Create reusable transporter
function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
    auth: { user, pass },
  });
}

export async function sendDeadlineReminderEmail(data: DeadlineEmailData): Promise<boolean> {
  const transporter = createTransporter();
  if (!transporter) {
    console.warn("[EMAIL] SMTP not configured, skipping email send");
    return false;
  }

  try {

    const urgencyLevel = data.daysRemaining <= 1 ? "URGENT" : data.daysRemaining <= 3 ? "Important" : "Reminder";
    const subject = `${urgencyLevel}: Deadline in ${data.daysRemaining} day${data.daysRemaining !== 1 ? "s" : ""} - ${data.matterTitle}`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .alert { background: ${data.daysRemaining <= 1 ? "#fee2e2" : data.daysRemaining <= 3 ? "#fef3c7" : "#dbeafe"}; 
             border-left: 4px solid ${data.daysRemaining <= 1 ? "#ef4444" : data.daysRemaining <= 3 ? "#f59e0b" : "#3b82f6"}; 
             padding: 16px; margin: 20px 0; border-radius: 4px; }
    .detail-row { display: flex; padding: 12px 0; border-bottom: 1px solid #f3f4f6; }
    .detail-label { font-weight: 600; width: 150px; color: #6b7280; }
    .detail-value { flex: 1; color: #111827; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Deadline Reminder</h1>
    </div>
    <div class="content">
      <div class="alert">
        <strong>${urgencyLevel}:</strong> This matter's deadline is approaching in <strong>${data.daysRemaining} day${data.daysRemaining !== 1 ? "s" : ""}</strong>.
      </div>
      
      <h2 style="color: #111827; margin-top: 24px;">Matter Details</h2>
      
      <div class="detail-row">
        <div class="detail-label">Matter:</div>
        <div class="detail-value"><strong>${data.matterTitle}</strong></div>
      </div>
      
      ${data.clientName ? `
      <div class="detail-row">
        <div class="detail-label">Client:</div>
        <div class="detail-value">${data.clientName}</div>
      </div>
      ` : ""}
      
      ${data.matterType ? `
      <div class="detail-row">
        <div class="detail-label">Matter Type:</div>
        <div class="detail-value">${data.matterType}</div>
      </div>
      ` : ""}
      
      <div class="detail-row">
        <div class="detail-label">Deadline:</div>
        <div class="detail-value"><strong>${data.deadlineDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</strong></div>
      </div>
      
      ${data.workflowStage ? `
      <div class="detail-row">
        <div class="detail-label">Workflow Stage:</div>
        <div class="detail-value">${data.workflowStage}</div>
      </div>
      ` : ""}
      
      ${data.paralegalName ? `
      <div class="detail-row">
        <div class="detail-label">Assigned To:</div>
        <div class="detail-value">${data.paralegalName}</div>
      </div>
      ` : ""}
      
      <p style="margin-top: 24px;">Please ensure all necessary actions are completed before the deadline.</p>
      
      <a href="${data.matterUrl}" class="button">View Matter Details →</a>
    </div>
    <div class="footer">
      <p>Law Firm Dashboard - Automated Deadline Notification</p>
      <p style="font-size: 12px; color: #9ca3af;">You received this email because you are assigned to this matter.</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    const textContent = `
${urgencyLevel}: Deadline Reminder

This matter's deadline is approaching in ${data.daysRemaining} day${data.daysRemaining !== 1 ? "s" : ""}.

Matter Details:
- Matter: ${data.matterTitle}
${data.clientName ? `- Client: ${data.clientName}` : ""}
${data.matterType ? `- Matter Type: ${data.matterType}` : ""}
- Deadline: ${data.deadlineDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
${data.workflowStage ? `- Workflow Stage: ${data.workflowStage}` : ""}
${data.paralegalName ? `- Assigned To: ${data.paralegalName}` : ""}

Please ensure all necessary actions are completed before the deadline.

View Matter Details: ${data.matterUrl}

---
Law Firm Dashboard - Automated Deadline Notification
    `.trim();

    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to: data.to,
      subject,
      html: htmlContent,
      text: textContent,
    });

    console.log(`[EMAIL] Sent deadline reminder to ${data.to} for matter: ${data.matterTitle}`, result.messageId);
    return true;
  } catch (error) {
    console.error("[EMAIL] Failed to send deadline reminder:", error);
    return false;
  }
}

// Get notification type styling
function getNotificationTypeStyle(type: EmailNotificationType): { 
  icon: string; 
  color: string; 
  bgColor: string; 
  title: string;
} {
  switch (type) {
    case "rfe":
      return { icon: "📋", color: "#f59e0b", bgColor: "#fef3c7", title: "Request for Evidence (RFE)" };
    case "approval":
      return { icon: "✅", color: "#10b981", bgColor: "#d1fae5", title: "Case Approved" };
    case "denial":
      return { icon: "❌", color: "#ef4444", bgColor: "#fee2e2", title: "Case Denied" };
    case "statusChange":
      return { icon: "🔄", color: "#3b82f6", bgColor: "#dbeafe", title: "Status Update" };
    case "deadline":
      return { icon: "⏰", color: "#8b5cf6", bgColor: "#ede9fe", title: "Deadline Reminder" };
    case "test":
      return { icon: "🧪", color: "#6366f1", bgColor: "#e0e7ff", title: "Test Notification" };
    default:
      return { icon: "📢", color: "#6b7280", bgColor: "#f3f4f6", title: "Notification" };
  }
}

// Send a generic notification email (works for all notification types)
export async function sendNotificationEmail(data: NotificationEmailData): Promise<boolean> {
  const transporter = createTransporter();
  if (!transporter) {
    console.warn("[EMAIL] SMTP not configured, skipping email send");
    return false;
  }

  try {
    const style = getNotificationTypeStyle(data.type);
    const greeting = data.greeting || "Hello,";
    const closing = data.closing || "Thank you.";

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; border-bottom: 1px solid #e5e7eb;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 600; color: #111827;">
                ${style.icon} ${data.subject}
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              ${data.isTest ? `
              <div style="background-color: #fef3c7; border: 1px solid #fcd34d; padding: 12px 16px; border-radius: 6px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 14px; color: #92400e; font-weight: 500;">🧪 This is a test notification to verify your settings are working correctly.</p>
              </div>
              ` : ""}
              
              <!-- Greeting -->
              <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151;">${greeting}</p>
              
              <!-- Main Message -->
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #374151;">${data.message}</p>
              
              <!-- Matter Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 6px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 12px 0; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Matter Details</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 120px;">Matter</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">${data.matterTitle}</td>
                      </tr>
                      ${data.clientName ? `
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Client</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px;">${data.clientName}</td>
                      </tr>
                      ` : ""}
                      ${data.matterType ? `
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Type</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px;">${data.matterType}</td>
                      </tr>
                      ` : ""}
                      ${data.workflowStage ? `
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Workflow</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px;">${data.workflowStage}</td>
                      </tr>
                      ` : ""}
                      ${data.deadlineDate ? `
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Deadline</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px;">${data.deadlineDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</td>
                      </tr>
                      ` : ""}
                      ${data.paralegalAssigned ? `
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Assignee</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px;">${data.paralegalAssigned}</td>
                      </tr>
                      ` : ""}
                      ${data.billingStatus ? `
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Billing Status</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px;">${data.billingStatus.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}</td>
                      </tr>
                      ` : ""}
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Closing -->
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #374151;">${closing}</p>
              
              ${data.matterUrl ? `
              <a href="${data.matterUrl}" style="display: inline-block; background-color: #111827; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">View Matter Details</a>
              ` : ""}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #e5e7eb; background-color: #f9fafb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; font-size: 13px; color: #6b7280; text-align: center;">Law Firm Dashboard</p>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #9ca3af; text-align: center;">You received this email because you are subscribed to notifications.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    const textContent = `
${data.subject}
${data.isTest ? "\n🧪 TEST NOTIFICATION - This is a test email to verify your notification settings.\n" : ""}

${greeting}

${data.message}

Matter Details:
- Matter: ${data.matterTitle}
${data.clientName ? `- Client: ${data.clientName}` : ""}
${data.matterType ? `- Matter Type: ${data.matterType}` : ""}
${data.workflowStage ? `- Workflow Stage: ${data.workflowStage}` : ""}
${data.deadlineDate ? `- Deadline: ${data.deadlineDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}` : ""}
${data.matterUrl ? `\nView Matter Details: ${data.matterUrl}` : ""}

${closing}

---
Law Firm Dashboard - Automated Notification
    `.trim();

    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to: data.to,
      subject: data.isTest ? `[TEST] ${data.subject}` : data.subject,
      html: htmlContent,
      text: textContent,
    });

    console.log(`[EMAIL] Sent ${data.type} notification to ${data.to}`, result.messageId);
    return true;
  } catch (error) {
    console.error(`[EMAIL] Failed to send ${data.type} notification:`, error);
    return false;
  }
}
