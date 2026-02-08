import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

import { seedDiyTemplates } from "./seed-diy-templates";

async function main() {
  console.log("Seeding task templates...");

  const taskTemplates = [
    // HVAC Tasks
    {
      name: "Replace HVAC Filter",
      description: "Replace or clean your HVAC air filter to maintain air quality and system efficiency.",
      category: "HVAC",
      baseFrequency: "MONTHLY",
      frequencyRules: {
        petOwners: "MONTHLY",
        standard: "QUARTERLY",
      },
      climateRules: {
        highDust: "MONTHLY",
        standard: "QUARTERLY",
      },
      ageRules: {
        newHome: "QUARTERLY",
        oldHome: "MONTHLY",
      },
      educationalContent: {
        whyImportant:
          "Dirty filters reduce airflow, making your system work harder and increasing energy costs. They also reduce indoor air quality.",
        diyGuidance:
          "Turn off the system, locate the filter, note the size, and replace with a new one matching the arrow direction.",
      },
      diyDifficulty: "easy",
      costRangeMin: 10,
      costRangeMax: 50,
      importance: "high",
      season: "all",
    },
    {
      name: "HVAC System Inspection",
      description: "Professional inspection of heating and cooling systems to ensure optimal performance.",
      category: "HVAC",
      baseFrequency: "ANNUAL",
      ageRules: {
        newHome: "ANNUAL",
        oldHome: "BIANNUAL",
      },
      educationalContent: {
        whyImportant:
          "Regular inspections catch problems early, prevent breakdowns, and maintain efficiency.",
      },
      diyDifficulty: "hard",
      costRangeMin: 100,
      costRangeMax: 300,
      importance: "high",
      season: "all",
    },
    {
      name: "Clean HVAC Condenser Unit",
      description: "Clean the outdoor condenser unit to remove debris and ensure proper airflow.",
      category: "HVAC",
      baseFrequency: "QUARTERLY",
      climateRules: {
        highDust: "MONTHLY",
        standard: "QUARTERLY",
      },
      educationalContent: {
        whyImportant:
          "Debris blocks airflow, reducing efficiency and potentially causing system failure.",
        diyGuidance:
          "Turn off power, remove debris, clean fins with a soft brush, and ensure 2 feet of clearance around the unit.",
      },
      diyDifficulty: "easy",
      costRangeMin: 0,
      costRangeMax: 0,
      importance: "medium",
      season: "spring",
    },

    // Plumbing Tasks
    {
      name: "Check for Leaks",
      description: "Inspect all visible pipes, faucets, and fixtures for leaks or drips.",
      category: "PLUMBING",
      baseFrequency: "MONTHLY",
      educationalContent: {
        whyImportant:
          "Small leaks waste water and money, and can cause significant damage if left unchecked.",
      },
      diyDifficulty: "easy",
      costRangeMin: 0,
      costRangeMax: 0,
      importance: "high",
      season: "all",
    },
    {
      name: "Drain Water Heater",
      description: "Drain sediment from water heater tank to maintain efficiency and extend lifespan.",
      category: "PLUMBING",
      baseFrequency: "ANNUAL",
      ageRules: {
        newHome: "ANNUAL",
        oldHome: "BIANNUAL",
      },
      educationalContent: {
        whyImportant:
          "Sediment buildup reduces efficiency and can cause premature failure.",
        diyGuidance:
          "Turn off power/gas, attach hose to drain valve, drain until water runs clear.",
      },
      diyDifficulty: "medium",
      costRangeMin: 0,
      costRangeMax: 150,
      importance: "medium",
      season: "fall",
    },
    {
      name: "Test Water Pressure",
      description: "Check water pressure throughout the home to ensure proper flow.",
      category: "PLUMBING",
      baseFrequency: "QUARTERLY",
      educationalContent: {
        whyImportant:
          "Low pressure indicates potential problems; high pressure can damage fixtures.",
      },
      diyDifficulty: "easy",
      costRangeMin: 0,
      costRangeMax: 0,
      importance: "low",
      season: "all",
    },

    // Exterior Tasks
    {
      name: "Clean Gutters",
      description: "Remove leaves, debris, and check for proper drainage.",
      category: "EXTERIOR",
      baseFrequency: "QUARTERLY",
      climateRules: {
        highRainfall: "MONTHLY",
        standard: "QUARTERLY",
      },
      educationalContent: {
        whyImportant:
          "Clogged gutters cause water damage to roof, siding, and foundation.",
        diyGuidance:
          "Use ladder safely, wear gloves, remove debris, flush with water, check for leaks.",
      },
      diyDifficulty: "medium",
      costRangeMin: 100,
      costRangeMax: 300,
      importance: "high",
      season: "fall",
    },
    {
      name: "Inspect Roof",
      description: "Visual inspection of roof for damaged or missing shingles, leaks, or wear.",
      category: "EXTERIOR",
      baseFrequency: "ANNUAL",
      ageRules: {
        newHome: "ANNUAL",
        oldHome: "BIANNUAL",
      },
      educationalContent: {
        whyImportant:
          "Early detection of roof problems prevents costly water damage.",
      },
      diyDifficulty: "hard",
      costRangeMin: 200,
      costRangeMax: 500,
      importance: "critical",
      season: "spring",
    },
    {
      name: "Paint Touch-ups",
      description: "Touch up exterior paint to protect against weather damage.",
      category: "EXTERIOR",
      baseFrequency: "ANNUAL",
      educationalContent: {
        whyImportant: "Paint protects wood and prevents rot and damage.",
      },
      diyDifficulty: "easy",
      costRangeMin: 50,
      costRangeMax: 200,
      importance: "medium",
      season: "spring",
    },

    // Electrical Tasks
    {
      name: "Test Smoke Detectors",
      description: "Test all smoke and carbon monoxide detectors to ensure they're working.",
      category: "SAFETY",
      baseFrequency: "MONTHLY",
      educationalContent: {
        whyImportant:
          "Working detectors save lives. Test monthly, replace batteries annually.",
      },
      diyDifficulty: "easy",
      costRangeMin: 0,
      costRangeMax: 20,
      importance: "critical",
      season: "all",
    },
    {
      name: "Replace Smoke Detector Batteries",
      description: "Replace batteries in all smoke and CO detectors.",
      category: "SAFETY",
      baseFrequency: "ANNUAL",
      educationalContent: {
        whyImportant: "Fresh batteries ensure detectors work when needed.",
      },
      diyDifficulty: "easy",
      costRangeMin: 10,
      costRangeMax: 30,
      importance: "critical",
      season: "fall",
    },
    {
      name: "Electrical Panel Inspection",
      description: "Professional inspection of electrical panel for safety and capacity.",
      category: "ELECTRICAL",
      baseFrequency: "ANNUAL",
      ageRules: {
        newHome: "ANNUAL",
        oldHome: "ANNUAL",
      },
      educationalContent: {
        whyImportant:
          "Ensures electrical safety and identifies potential fire hazards.",
      },
      diyDifficulty: "hard",
      costRangeMin: 150,
      costRangeMax: 400,
      importance: "high",
      season: "all",
    },

    // Appliance Tasks
    {
      name: "Clean Refrigerator Coils",
      description: "Clean condenser coils on the back or bottom of refrigerator.",
      category: "APPLIANCE",
      baseFrequency: "QUARTERLY",
      educationalContent: {
        whyImportant:
          "Dirty coils make the fridge work harder, increasing energy costs.",
        diyGuidance:
          "Unplug, locate coils, vacuum or brush away dust and debris.",
      },
      diyDifficulty: "easy",
      costRangeMin: 0,
      costRangeMax: 0,
      importance: "medium",
      season: "all",
    },
    {
      name: "Clean Dryer Vent",
      description: "Remove lint from dryer vent and exhaust duct.",
      category: "APPLIANCE",
      baseFrequency: "QUARTERLY",
      educationalContent: {
        whyImportant:
          "Clogged vents are a fire hazard and reduce dryer efficiency.",
        diyGuidance:
          "Disconnect vent, remove lint, check exterior vent cap, reconnect securely.",
      },
      diyDifficulty: "medium",
      costRangeMin: 0,
      costRangeMax: 150,
      importance: "high",
      season: "all",
    },

    // Structural Tasks
    {
      name: "Foundation Inspection",
      description: "Inspect foundation for cracks, settling, or water damage.",
      category: "STRUCTURAL",
      baseFrequency: "ANNUAL",
      ageRules: {
        newHome: "ANNUAL",
        oldHome: "BIANNUAL",
      },
      educationalContent: {
        whyImportant:
          "Foundation problems can be costly and affect the entire home structure.",
      },
      diyDifficulty: "hard",
      costRangeMin: 300,
      costRangeMax: 800,
      importance: "critical",
      season: "spring",
    },
    {
      name: "Check for Water Intrusion",
      description: "Inspect basement, crawl space, and around windows for water.",
      category: "STRUCTURAL",
      baseFrequency: "QUARTERLY",
      climateRules: {
        highRainfall: "MONTHLY",
        standard: "QUARTERLY",
      },
      educationalContent: {
        whyImportant:
          "Water intrusion causes mold, rot, and structural damage.",
      },
      diyDifficulty: "easy",
      costRangeMin: 0,
      costRangeMax: 0,
      importance: "high",
      season: "all",
    },

    // Landscaping Tasks
    {
      name: "Trim Trees Near House",
      description: "Trim branches that are too close to the house or roof.",
      category: "LANDSCAPING",
      baseFrequency: "ANNUAL",
      educationalContent: {
        whyImportant:
          "Prevents damage to roof and siding, reduces pest access.",
      },
      diyDifficulty: "medium",
      costRangeMin: 100,
      costRangeMax: 500,
      importance: "medium",
      season: "fall",
    },
    {
      name: "Check Sprinkler System",
      description: "Inspect and test irrigation system for leaks and proper operation.",
      category: "LANDSCAPING",
      baseFrequency: "SEASONAL",
      educationalContent: {
        whyImportant: "Ensures efficient water use and prevents waste.",
      },
      diyDifficulty: "medium",
      costRangeMin: 0,
      costRangeMax: 200,
      importance: "low",
      season: "spring",
    },
  ];

  for (const template of taskTemplates) {
    // Check if template already exists
    const existing = await prisma.taskTemplate.findFirst({
      where: {
        name: template.name,
        category: template.category as any,
      },
    });

    if (!existing) {
      await prisma.taskTemplate.create({
        data: {
        name: template.name,
        description: template.description,
        category: template.category as any,
        baseFrequency: template.baseFrequency as any,
        frequencyRules: template.frequencyRules
          ? JSON.parse(JSON.stringify(template.frequencyRules))
          : null,
        climateRules: template.climateRules
          ? JSON.parse(JSON.stringify(template.climateRules))
          : null,
        ageRules: template.ageRules
          ? JSON.parse(JSON.stringify(template.ageRules))
          : undefined,
        systemRules: undefined,
        educationalContent: template.educationalContent
          ? JSON.parse(JSON.stringify(template.educationalContent))
          : undefined,
        diyDifficulty: template.diyDifficulty,
        costRangeMin: template.costRangeMin,
        costRangeMax: template.costRangeMax,
        importance: template.importance,
        season: template.season,
        isActive: true,
        },
      });
    }
  }

  console.log(`Seeded ${taskTemplates.length} task templates`);

  // Seed DIY project templates
  await seedDiyTemplates();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

