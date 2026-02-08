/**
 * MSW (Mock Service Worker) Handlers
 * Mock API endpoints for component and page tests
 */

import { http, HttpResponse } from "msw";
import { testData } from "../test-helpers";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const handlers = [
  // Homes API
  http.get(`${baseUrl}/api/homes`, () => {
    return HttpResponse.json({
      homes: [testData.home],
    });
  }),

  http.post(`${baseUrl}/api/homes`, async ({ request }) => {
    const body = await request.json();
    const bodyObj = typeof body === "object" && body !== null ? body : {};
    return HttpResponse.json({
      home: {
        ...testData.home,
        ...bodyObj,
        id: `home_${Date.now()}`,
      },
    }, { status: 201 });
  }),

  http.get(`${baseUrl}/api/homes/:id`, ({ params }) => {
    return HttpResponse.json({
      home: {
        ...testData.home,
        id: params.id,
      },
    });
  }),

  // Tasks API
  http.get(`${baseUrl}/api/tasks`, () => {
    return HttpResponse.json({
      tasks: [testData.task],
    });
  }),

  http.post(`${baseUrl}/api/tasks`, async ({ request }) => {
    const body = await request.json();
    const bodyObj = typeof body === "object" && body !== null ? body : {};
    return HttpResponse.json({
      task: {
        ...testData.task,
        ...bodyObj,
        id: `task_${Date.now()}`,
      },
    }, { status: 201 });
  }),

  http.patch(`${baseUrl}/api/tasks`, async ({ request }) => {
    const body = await request.json();
    const bodyObj = typeof body === "object" && body !== null ? body : {};
    return HttpResponse.json({
      task: {
        ...testData.task,
        ...bodyObj,
      },
    });
  }),

  // Dashboard API
  http.get(`${baseUrl}/api/dashboard`, () => {
    return HttpResponse.json({
      metrics: {
        overdue: 2,
        dueToday: 1,
        upcoming: 5,
        totalSpending: 1000,
      },
      tasks: [testData.task],
    });
  }),

  // Maintenance History API
  http.get(`${baseUrl}/api/maintenance/history`, () => {
    return HttpResponse.json({
      history: [],
    });
  }),

  http.post(`${baseUrl}/api/maintenance/history`, async ({ request }) => {
    const body = await request.json();
    const bodyObj = typeof body === "object" && body !== null ? body : {};
    return HttpResponse.json({
      record: {
        id: `maint_${Date.now()}`,
        ...bodyObj,
      },
    }, { status: 201 });
  }),

  // Inventory API
  http.get(`${baseUrl}/api/inventory`, () => {
    return HttpResponse.json({
      appliances: [],
      exteriorFeatures: [],
      interiorFeatures: [],
    });
  }),

  // Budget API
  http.get(`${baseUrl}/api/budget`, () => {
    return HttpResponse.json({
      summary: {
        totalSpent: 500,
        budgetPlans: [testData.budgetPlan],
      },
    });
  }),

  http.get(`${baseUrl}/api/budget/plans`, () => {
    return HttpResponse.json({
      plans: [testData.budgetPlan],
    });
  }),

  http.post(`${baseUrl}/api/budget/plans`, async ({ request }) => {
    const body = await request.json();
    const bodyObj = typeof body === "object" && body !== null ? body : {};
    return HttpResponse.json({
      plan: {
        ...testData.budgetPlan,
        ...bodyObj,
        id: `budget_${Date.now()}`,
      },
    }, { status: 201 });
  }),

  // DIY Projects API
  http.get(`${baseUrl}/api/diy-projects`, () => {
    return HttpResponse.json({
      projects: [testData.diyProject],
    });
  }),

  http.post(`${baseUrl}/api/diy-projects`, async ({ request }) => {
    const body = await request.json();
    const bodyObj = typeof body === "object" && body !== null ? body : {};
    return HttpResponse.json({
      project: {
        ...testData.diyProject,
        ...bodyObj,
        id: `project_${Date.now()}`,
      },
    }, { status: 201 });
  }),

  // Property Lookup API
  http.post(`${baseUrl}/api/property/lookup`, () => {
    return HttpResponse.json({
      property: {
        address: testData.home.address,
        city: testData.home.city,
        state: testData.home.state,
        zipCode: testData.home.zipCode,
        yearBuilt: testData.home.yearBuilt,
      },
    });
  }),

  // Upload API
  http.post(`${baseUrl}/api/upload`, async () => {
    return HttpResponse.json({
      url: "https://example.com/uploaded-file.jpg",
    }, { status: 200 });
  }),
];
