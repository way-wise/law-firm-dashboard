import "server-only";
import nodemailer from "nodemailer";

// Email service for sending deadline notifications
// Using Nodemailer with Gmail SMTP

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
