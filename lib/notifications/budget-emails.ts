import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface BudgetAlertEmailData {
  planName: string;
  amount: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  alertType: "APPROACHING_LIMIT" | "EXCEEDED_LIMIT";
}

export async function sendBudgetAlertEmail(
  to: string,
  data: BudgetAlertEmailData
) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not configured. Skipping email send.");
    return;
  }

  const subject =
    data.alertType === "EXCEEDED_LIMIT"
      ? `🚨 Budget Exceeded: ${data.planName}`
      : `⚠️ Budget Alert: ${data.planName}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: ${
          data.alertType === "EXCEEDED_LIMIT" ? "#fee2e2" : "#fef3c7"
        }; border-left: 4px solid ${
    data.alertType === "EXCEEDED_LIMIT" ? "#dc2626" : "#f59e0b"
  }; padding: 20px; margin-bottom: 20px;">
          <h1 style="margin: 0; color: ${
            data.alertType === "EXCEEDED_LIMIT" ? "#dc2626" : "#f59e0b"
          };">
            ${data.alertType === "EXCEEDED_LIMIT" ? "🚨 Budget Exceeded" : "⚠️ Budget Alert"}
          </h1>
        </div>

        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="margin-top: 0;">${data.planName}</h2>
          
          <div style="margin: 20px 0;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span><strong>Budget Amount:</strong></span>
              <span>$${data.amount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span><strong>Amount Spent:</strong></span>
              <span style="color: ${
                data.alertType === "EXCEEDED_LIMIT" ? "#dc2626" : "#f59e0b"
              };">$${data.spent.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span><strong>Remaining:</strong></span>
              <span style="color: ${
                data.remaining >= 0 ? "#059669" : "#dc2626"
              };">$${data.remaining.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span><strong>Percent Used:</strong></span>
              <span style="color: ${
                data.percentUsed >= 100
                  ? "#dc2626"
                  : data.percentUsed >= 80
                  ? "#f59e0b"
                  : "#059669"
              };">${data.percentUsed.toFixed(1)}%</span>
            </div>
          </div>

          <div style="background-color: white; height: 20px; border-radius: 10px; overflow: hidden; margin: 20px 0;">
            <div style="background-color: ${
              data.percentUsed >= 100
                ? "#dc2626"
                : data.percentUsed >= 80
                ? "#f59e0b"
                : "#059669"
            }; height: 100%; width: ${Math.min(data.percentUsed, 100)}%; transition: width 0.3s;"></div>
          </div>

          ${
            data.alertType === "EXCEEDED_LIMIT"
              ? `<p style="color: #dc2626; font-weight: bold;">Your budget has been exceeded by $${(
                  data.spent - data.amount
                ).toFixed(2)}. Consider reviewing your spending and adjusting your budget if needed.</p>`
              : `<p style="color: #f59e0b; font-weight: bold;">You're approaching your budget limit. Only $${data.remaining.toFixed(
                  2
                )} remaining.</p>`
          }
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <a href="${
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
          }/budget" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Budget Dashboard
          </a>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>This is an automated alert from your Home Maintenance App.</p>
          <p>You can manage your budget alerts in your <a href="${
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
          }/settings">settings</a>.</p>
        </div>
      </body>
    </html>
  `;

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Home Maintenance App <noreply@example.com>",
      to,
      subject,
      html,
    });
    console.log(`Budget alert email sent to ${to}`);
  } catch (error) {
    console.error("Error sending budget alert email:", error);
    throw error;
  }
}

