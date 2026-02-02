import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASSWORD!,
  },
});

export async function sendPasswordResetEmail(
  to: string,
  token: string,
  url: string,
) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM!,
    to,
    subject: "Reset Account Password",
    text: `Reset your password by visiting: ${url} `,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Account Password</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <!-- Header with Logo -->
                <tr>
                  <td style="background-color: #09090b; padding: 30px 40px; text-align: center;">
                    <img src="${process.env.APP_URL || "http://localhost:3000"}/logo.png" alt="Dworsky Law Firm" style="height: 60px; width: auto;" />
                  </td>
                </tr>

                <!-- Main Content -->
                <tr>
                  <td style="padding: 40px 40px 30px 40px; text-align: center;">
                    <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 600; color: #000000; line-height: 1.3;">Reset Your Password</h1>
                    <p style="margin: 0 auto 20px auto; font-size: 16px; line-height: 1.6; color: #333333; max-width: 70%;">Click below to verify your email and reset password. This link will expire in 1 hour.</p>

                    <!-- CTA Button -->
                    <table role="presentation" style="margin: 30px auto;">
                      <tr>
                        <td>
                          <a href="${url}" style="display: inline-block; padding: 14px 32px; background-color: #000000; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; letter-spacing: 0.3px;">Reset Password</a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 30px auto 0 auto; font-size: 14px; line-height: 1.6; color: #666666; max-width: 70%;">If the button doesn't work, copy and paste this URL into your browser:</p>
                    <p style="margin: 10px auto 0 auto; padding: 12px; background-color: #f5f5f5; border-radius: 4px; font-size: 13px; word-break: break-all; color: #666666; text-align: center; max-width: 70%;">${url}</p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 30px 40px; background-color: #f9f9f9; border-top: 1px solid #e5e5e5; text-align: center;">
                    <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #999999;">If you didn't request this, you can safely ignore this email.</p>
                    <p style="margin: 15px 0 0 0; font-size: 13px; line-height: 1.6; color: #999999;">&copy; ${new Date().getFullYear()} Dworsky Law Firm. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  });
}
