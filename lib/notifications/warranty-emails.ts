import { Resend } from "resend";

// Lazy-load Resend client to avoid build-time errors
function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return new Resend(process.env.RESEND_API_KEY);
}

export interface ExpiringWarranty {
  name: string;
  type: string;
  expiryDate: Date;
  daysUntilExpiry: number;
  home: string;
}

/**
 * Send warranty expiration email notification
 */
export async function sendWarrantyExpirationEmail(
  to: string,
  warranties: ExpiringWarranty[]
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not configured. Skipping email send.");
    return;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@example.com";

  // Group warranties by urgency
  const critical = warranties.filter((w) => w.daysUntilExpiry <= 7);
  const urgent = warranties.filter(
    (w) => w.daysUntilExpiry > 7 && w.daysUntilExpiry <= 30
  );
  const upcoming = warranties.filter(
    (w) => w.daysUntilExpiry > 30 && w.daysUntilExpiry <= 90
  );

  const subject =
    warranties.length === 1
      ? `⚠️ Warranty Expiring: ${warranties[0].name}`
      : `⚠️ ${warranties.length} Warranties Expiring Soon`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Warranty Expiration Alert</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Warranty Expiration Alert</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; margin-bottom: 20px;">
            Hello,
          </p>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            You have <strong>${warranties.length} warranty(ies)</strong> expiring in the next 90 days. 
            Review them below and take action before they expire.
          </p>

          ${critical.length > 0 ? `
            <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <h2 style="color: #dc2626; margin-top: 0; font-size: 18px;">🔴 Critical: Expiring in 7 Days or Less</h2>
              <ul style="margin: 10px 0; padding-left: 20px;">
                ${critical
                  .map(
                    (w) => `
                  <li style="margin: 8px 0;">
                    <strong>${w.name}</strong> (${w.type})<br>
                    <span style="color: #666; font-size: 14px;">
                      Expires: ${w.expiryDate.toLocaleDateString()} 
                      (${w.daysUntilExpiry} ${w.daysUntilExpiry === 1 ? "day" : "days"})
                    </span><br>
                    <span style="color: #666; font-size: 14px;">📍 ${w.home}</span>
                  </li>
                `
                  )
                  .join("")}
              </ul>
            </div>
          ` : ""}

          ${urgent.length > 0 ? `
            <div style="background: #fef3c7; border-left: 4px solid #d97706; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <h2 style="color: #d97706; margin-top: 0; font-size: 18px;">🟡 Urgent: Expiring in 30 Days</h2>
              <ul style="margin: 10px 0; padding-left: 20px;">
                ${urgent
                  .map(
                    (w) => `
                  <li style="margin: 8px 0;">
                    <strong>${w.name}</strong> (${w.type})<br>
                    <span style="color: #666; font-size: 14px;">
                      Expires: ${w.expiryDate.toLocaleDateString()} 
                      (${w.daysUntilExpiry} days)
                    </span><br>
                    <span style="color: #666; font-size: 14px;">📍 ${w.home}</span>
                  </li>
                `
                  )
                  .join("")}
              </ul>
            </div>
          ` : ""}

          ${upcoming.length > 0 ? `
            <div style="background: #dbeafe; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <h2 style="color: #2563eb; margin-top: 0; font-size: 18px;">🔵 Upcoming: Expiring in 90 Days</h2>
              <ul style="margin: 10px 0; padding-left: 20px;">
                ${upcoming
                  .map(
                    (w) => `
                  <li style="margin: 8px 0;">
                    <strong>${w.name}</strong> (${w.type})<br>
                    <span style="color: #666; font-size: 14px;">
                      Expires: ${w.expiryDate.toLocaleDateString()} 
                      (${w.daysUntilExpiry} days)
                    </span><br>
                    <span style="color: #666; font-size: 14px;">📍 ${w.home}</span>
                  </li>
                `
                  )
                  .join("")}
              </ul>
            </div>
          ` : ""}

          <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
            <h3 style="font-size: 16px; margin-bottom: 10px;">Recommended Actions:</h3>
            <ul style="margin: 10px 0; padding-left: 20px; color: #666;">
              <li>Review warranty terms and coverage</li>
              <li>File any pending warranty claims</li>
              <li>Schedule inspections or repairs if needed</li>
              <li>Consider extended warranty options</li>
            </ul>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${appUrl}/warranties" 
               style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              View All Warranties
            </a>
          </div>

          <p style="font-size: 14px; color: #666; margin-top: 30px; text-align: center;">
            This is an automated notification from Home Maintenance Pro.<br>
            You're receiving this because you have warranties tracked in your account.
          </p>
        </div>
      </body>
    </html>
  `;

  const text = `
Warranty Expiration Alert

You have ${warranties.length} warranty(ies) expiring in the next 90 days.

${critical.length > 0 ? `CRITICAL - Expiring in 7 days or less:\n${critical.map(w => `- ${w.name} (${w.type}) - Expires: ${w.expiryDate.toLocaleDateString()} (${w.daysUntilExpiry} days) - ${w.home}`).join("\n")}\n` : ""}
${urgent.length > 0 ? `URGENT - Expiring in 30 days:\n${urgent.map(w => `- ${w.name} (${w.type}) - Expires: ${w.expiryDate.toLocaleDateString()} (${w.daysUntilExpiry} days) - ${w.home}`).join("\n")}\n` : ""}
${upcoming.length > 0 ? `UPCOMING - Expiring in 90 days:\n${upcoming.map(w => `- ${w.name} (${w.type}) - Expires: ${w.expiryDate.toLocaleDateString()} (${w.daysUntilExpiry} days) - ${w.home}`).join("\n")}\n` : ""}

View all warranties: ${appUrl}/warranties
  `;

  try {
    const resend = getResend();
    await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
      text,
    });
  } catch (error) {
    console.error("Failed to send warranty expiration email:", error);
    throw error;
  }
}

