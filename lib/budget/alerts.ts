import { ProjectCategory, TaskCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendPushNotificationToUser } from "@/lib/notifications/push";
import { sendBudgetAlertEmail } from "@/lib/notifications/budget-emails";

/**
 * Check all active budget plans and create alerts if thresholds are met
 */
export async function checkBudgetAlerts() {
  const now = new Date();
  let alertsChecked = 0;
  let alertsCreated = 0;
  let alertsSent = 0;

  // Get all active budget plans
  const budgetPlans = await prisma.budgetPlan.findMany({
    where: {
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
    },
    include: {
      user: {
        include: {
          pushSubscriptions: {
            where: { isActive: true },
            select: { playerId: true },
          },
        },
      },
    },
  });

  for (const plan of budgetPlans) {
    alertsChecked++;

    // Calculate current spending
    const startDate = new Date(plan.startDate);
    const endDate = new Date(plan.endDate);

    // Get spending from completed tasks
    const homes = await prisma.home.findMany({
      where: {
        userId: plan.userId,
        ...(plan.homeId ? { id: plan.homeId } : {}),
      },
      select: { id: true },
    });

    const homeIds = homes.map((h: { id: string }) => h.id);

    const completedTasks = await prisma.completedTask.findMany({
      where: {
        userId: plan.userId,
        task: {
          homeId: { in: homeIds },
          ...(plan.category ? { category: plan.category as TaskCategory } : {}),
        },
        completedDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Get spending from DIY projects
    const diyProjects = await prisma.diyProject.findMany({
      where: {
        userId: plan.userId,
        ...(plan.homeId ? { homeId: plan.homeId } : {}),
        ...(plan.category
          ? { category: plan.category as ProjectCategory }
          : {}),
        OR: [
          {
            actualStartDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          {
            actualEndDate: {
              gte: startDate,
              lte: endDate,
            },
          },
        ],
      },
    });

    const taskSpending = completedTasks.reduce(
      (sum, task) => sum + (task.actualCost || 0),
      0
    );

    const projectSpending = diyProjects.reduce(
      (sum, project) => sum + (project.actualCost || 0),
      0
    );

    const totalSpent = taskSpending + projectSpending;
    const percentUsed = (totalSpent / plan.amount) * 100;

    // Check for 80% threshold (approaching limit)
    if (percentUsed >= 80 && percentUsed < 100) {
      // Check if alert already exists
      const existingAlert = await prisma.budgetAlert.findFirst({
        where: {
          userId: plan.userId,
          budgetPlanId: plan.id,
          alertType: "APPROACHING_LIMIT",
          status: { in: ["PENDING", "SENT"] },
        },
      });

      if (!existingAlert) {
        const alert = await prisma.budgetAlert.create({
          data: {
            userId: plan.userId,
            budgetPlanId: plan.id,
            alertType: "APPROACHING_LIMIT",
            thresholdPercent: 80,
            message: `Budget "${plan.name}" is ${percentUsed.toFixed(1)}% used. Only $${(plan.amount - totalSpent).toFixed(2)} remaining.`,
          },
        });

        alertsCreated++;

        // Send notifications
        try {
          if (plan.user.pushSubscriptions.length > 0) {
            await sendPushNotificationToUser(
              plan.user.pushSubscriptions[0].playerId,
              {
                heading: `⚠️ Budget Alert: ${plan.name}`,
                content: alert.message,
                url: `/budget`,
                data: { type: "budget_alert", budgetPlanId: plan.id },
              }
            );
            alertsSent++;
          }

          // Send email
          await sendBudgetAlertEmail(plan.user.email, {
            planName: plan.name,
            amount: plan.amount,
            spent: totalSpent,
            remaining: plan.amount - totalSpent,
            percentUsed,
            alertType: "APPROACHING_LIMIT",
          });
        } catch (error) {
          console.error(`Error sending alert for plan ${plan.id}:`, error);
        }
      }
    }

    // Check for exceeded limit (100%+)
    if (percentUsed >= 100) {
      // Check if alert already exists
      const existingAlert = await prisma.budgetAlert.findFirst({
        where: {
          userId: plan.userId,
          budgetPlanId: plan.id,
          alertType: "EXCEEDED_LIMIT",
          status: { in: ["PENDING", "SENT"] },
        },
      });

      if (!existingAlert) {
        const overage = totalSpent - plan.amount;
        const alert = await prisma.budgetAlert.create({
          data: {
            userId: plan.userId,
            budgetPlanId: plan.id,
            alertType: "EXCEEDED_LIMIT",
            thresholdPercent: 100,
            message: `Budget "${plan.name}" has been exceeded by $${overage.toFixed(2)}.`,
          },
        });

        alertsCreated++;

        // Send notifications
        try {
          if (plan.user.pushSubscriptions.length > 0) {
            await sendPushNotificationToUser(
              plan.user.pushSubscriptions[0].playerId,
              {
                heading: `🚨 Budget Exceeded: ${plan.name}`,
                content: alert.message,
                url: `/budget`,
                data: { type: "budget_alert", budgetPlanId: plan.id },
              }
            );
            alertsSent++;
          }

          // Send email
          await sendBudgetAlertEmail(plan.user.email, {
            planName: plan.name,
            amount: plan.amount,
            spent: totalSpent,
            remaining: plan.amount - totalSpent,
            percentUsed,
            alertType: "EXCEEDED_LIMIT",
          });
        } catch (error) {
          console.error(`Error sending alert for plan ${plan.id}:`, error);
        }
      }
    }
  }

  // Check for projects over budget
  const projects = await prisma.diyProject.findMany({
    where: {
      budget: { not: null },
      status: { in: ["PLANNING", "IN_PROGRESS"] },
    },
    include: {
      user: {
        include: {
          pushSubscriptions: {
            where: { isActive: true },
            select: { playerId: true },
          },
        },
      },
      materials: {
        where: { purchased: true },
        select: { totalPrice: true },
      },
      tools: {
        where: { purchased: true },
        select: {
          owned: true,
          rentalCost: true,
          rentalDays: true,
          purchaseCost: true,
        },
      },
    },
  });

  for (const project of projects) {
    if (!project.budget) continue;

    const materialCost = project.materials.reduce(
      (sum: number, m: { totalPrice: number | null }) => sum + (m.totalPrice || 0),
      0
    );

    const toolCost = project.tools
      .filter((t: { owned: boolean }) => !t.owned)
      .reduce((sum: number, t: { rentalCost: number | null; rentalDays: number | null; purchaseCost: number | null }) => {
        if (t.rentalCost && t.rentalDays) {
          return sum + t.rentalCost * t.rentalDays;
        }
        if (t.purchaseCost) {
          return sum + t.purchaseCost;
        }
        return sum;
      }, 0);

    const actualCost = project.actualCost || materialCost + toolCost;

    if (actualCost > project.budget) {
      // Check if alert already exists
      const existingAlert = await prisma.budgetAlert.findFirst({
        where: {
          userId: project.userId,
          projectId: project.id,
          alertType: "PROJECT_OVER_BUDGET",
          status: { in: ["PENDING", "SENT"] },
        },
      });

      if (!existingAlert) {
        const overage = actualCost - project.budget;
        const alert = await prisma.budgetAlert.create({
          data: {
            userId: project.userId,
            projectId: project.id,
            alertType: "PROJECT_OVER_BUDGET",
            message: `Project "${project.name}" has exceeded its budget by $${overage.toFixed(2)}.`,
          },
        });

        alertsCreated++;

        // Send notifications
        try {
          if (project.user.pushSubscriptions.length > 0) {
            await sendPushNotificationToUser(
              project.user.pushSubscriptions[0].playerId,
              {
                heading: `🚨 Project Over Budget: ${project.name}`,
                content: alert.message,
                url: `/diy-projects/${project.id}`,
                data: { type: "budget_alert", projectId: project.id },
              }
            );
            alertsSent++;
          }
        } catch (error) {
          console.error(`Error sending alert for project ${project.id}:`, error);
        }
      }
    }
  }

  return {
    alertsChecked,
    alertsCreated,
    alertsSent,
  };
}

