import { Resend } from "resend";

// Lazy-load Resend client to avoid build-time errors
function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return new Resend(process.env.RESEND_API_KEY);
}

export interface TaskReminderData {
  taskName: string;
  taskDescription: string;
  dueDate: string;
  homeAddress: string;
  category: string;
  priority?: string;
  daysUntilDue: number;
}

export async function sendTaskReminderEmail(
  to: string,
  data: TaskReminderData
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not configured, skipping email");
    return;
  }

  const priorityBadge =
    data.priority === "critical"
      ? "🔴 Critical"
      : data.priority === "high"
      ? "🟠 High"
      : data.priority === "medium"
      ? "🟡 Medium"
      : "🟢 Low";

  try {
    const resend = getResend();
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Home Maintenance Pro <noreply@example.com>",
      to,
      subject: `Reminder: ${data.taskName} due in ${data.daysUntilDue} day${data.daysUntilDue !== 1 ? "s" : ""}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">Home Maintenance Pro</h1>
            </div>
            
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-top: 0;">Maintenance Task Reminder</h2>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                <h3 style="margin-top: 0; color: #667eea;">${data.taskName}</h3>
                <p style="margin: 10px 0;">${data.taskDescription}</p>
                
                <div style="margin: 20px 0;">
                  <p style="margin: 5px 0;"><strong>Due Date:</strong> ${new Date(data.dueDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                  <p style="margin: 5px 0;"><strong>Days Until Due:</strong> <span style="color: ${data.daysUntilDue <= 7 ? "#dc2626" : data.daysUntilDue <= 14 ? "#ea580c" : "#333"}">${data.daysUntilDue}</span></p>
                  <p style="margin: 5px 0;"><strong>Category:</strong> ${data.category}</p>
                  ${data.priority ? `<p style="margin: 5px 0;"><strong>Priority:</strong> ${priorityBadge}</p>` : ""}
                  <p style="margin: 5px 0;"><strong>Home:</strong> ${data.homeAddress}</p>
                </div>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/tasks" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">View Task</a>
              </div>
              
              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                This is an automated reminder from Home Maintenance Pro. 
                You're receiving this because you have tasks due soon.
              </p>
            </div>
          </body>
        </html>
      `,
      text: `
Home Maintenance Pro - Task Reminder

Task: ${data.taskName}
Description: ${data.taskDescription}
Due Date: ${new Date(data.dueDate).toLocaleDateString()}
Days Until Due: ${data.daysUntilDue}
Category: ${data.category}
${data.priority ? `Priority: ${data.priority}` : ""}
Home: ${data.homeAddress}

View your tasks: ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/tasks
      `,
    });
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}

export async function sendBulkTaskReminders(
  to: string,
  tasks: TaskReminderData[]
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not configured, skipping email");
    return;
  }

  if (tasks.length === 0) return;

  const criticalTasks = tasks.filter((t: { priority?: string }) => t.priority === "critical");
  const highPriorityTasks = tasks.filter((t: { priority?: string }) => t.priority === "high");
  const otherTasks = tasks.filter(
    (t: { priority?: string }) => t.priority !== "critical" && t.priority !== "high"
  );

  try {
    const resend = getResend();
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Home Maintenance Pro <noreply@example.com>",
      to,
      subject: `You have ${tasks.length} maintenance task${tasks.length !== 1 ? "s" : ""} due soon`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">Home Maintenance Pro</h1>
            </div>
            
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-top: 0;">You have ${tasks.length} task${tasks.length !== 1 ? "s" : ""} due soon</h2>
              
              ${criticalTasks.length > 0 ? `
                <div style="margin: 20px 0;">
                  <h3 style="color: #dc2626;">🔴 Critical Priority (${criticalTasks.length})</h3>
                  ${criticalTasks.map((task: { taskName: string; dueDate: string; daysUntilDue: number }) => `
                    <div style="background: white; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #dc2626;">
                      <strong>${task.taskName}</strong><br>
                      Due: ${new Date(task.dueDate).toLocaleDateString()} (${task.daysUntilDue} days)
                    </div>
                  `).join("")}
                </div>
              ` : ""}
              
              ${highPriorityTasks.length > 0 ? `
                <div style="margin: 20px 0;">
                  <h3 style="color: #ea580c;">🟠 High Priority (${highPriorityTasks.length})</h3>
                  ${highPriorityTasks.map((task: { taskName: string; dueDate: string; daysUntilDue: number }) => `
                    <div style="background: white; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #ea580c;">
                      <strong>${task.taskName}</strong><br>
                      Due: ${new Date(task.dueDate).toLocaleDateString()} (${task.daysUntilDue} days)
                    </div>
                  `).join("")}
                </div>
              ` : ""}
              
              ${otherTasks.length > 0 ? `
                <div style="margin: 20px 0;">
                  <h3>Other Tasks (${otherTasks.length})</h3>
                  ${otherTasks.map((task: { taskName: string; dueDate: string; daysUntilDue: number }) => `
                    <div style="background: white; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #667eea;">
                      <strong>${task.taskName}</strong><br>
                      Due: ${new Date(task.dueDate).toLocaleDateString()} (${task.daysUntilDue} days)
                    </div>
                  `).join("")}
                </div>
              ` : ""}
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/tasks" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">View All Tasks</a>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  } catch (error) {
    console.error("Error sending bulk email:", error);
    throw error;
  }
}

