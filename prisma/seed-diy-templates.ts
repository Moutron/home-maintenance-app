import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const projectTemplates = [
  {
    name: "Replace HVAC Filter",
    description: "Replace the air filter in your HVAC system to maintain air quality and system efficiency",
    category: "HVAC",
    difficulty: "EASY",
    estimatedHours: 0.25,
    estimatedCostMin: 10,
    estimatedCostMax: 30,
    skillLevel: "beginner",
    permitRequired: false,
    safetyNotes: "Turn off HVAC system before replacing filter. Check filter size before purchasing.",
    videoUrl: "https://www.youtube.com/results?search_query=replace+hvac+filter",
    guideUrl: "https://www.homedepot.com/c/ab/how-to-change-an-air-filter/9ba683603be9fa5395fab90d",
    commonMistakes: [
      "Installing filter backwards (check arrow direction)",
      "Using wrong filter size",
      "Forgetting to turn system back on",
    ],
    steps: [
      {
        stepNumber: 1,
        name: "Turn off HVAC system",
        description: "Locate thermostat and turn off heating/cooling system",
        estimatedHours: 0.05,
        instructions: "Find your thermostat and set it to 'Off' or turn off the circuit breaker for the HVAC unit.",
      },
      {
        stepNumber: 2,
        name: "Locate filter",
        description: "Find the air filter location (usually in return air duct or air handler)",
        estimatedHours: 0.05,
        instructions: "Common locations: in the return air grille on wall/ceiling, in the air handler unit, or in a filter slot near the furnace.",
      },
      {
        stepNumber: 3,
        name: "Remove old filter",
        description: "Take out the old filter and note the size",
        estimatedHours: 0.05,
        instructions: "Slide out the old filter. Check the size printed on the filter frame (e.g., 16x25x1). Note the direction of airflow arrow.",
      },
      {
        stepNumber: 4,
        name: "Install new filter",
        description: "Insert new filter with arrow pointing toward the unit",
        estimatedHours: 0.1,
        instructions: "Insert the new filter with the arrow pointing toward the HVAC unit/blower. Make sure it fits snugly.",
      },
    ],
    defaultMaterials: [
      {
        name: "HVAC Air Filter",
        description: "Standard 1-inch pleated air filter",
        quantity: 1,
        unit: "filter",
        unitPrice: 15,
        vendor: "Home Depot",
      },
    ],
    defaultTools: [
      {
        name: "None required",
        description: "No special tools needed",
        owned: true,
      },
    ],
  },
  {
    name: "Paint a Room",
    description: "Paint the interior walls of a room with a fresh coat of paint",
    category: "INTERIOR",
    difficulty: "EASY",
    estimatedHours: 8,
    estimatedCostMin: 50,
    estimatedCostMax: 200,
    skillLevel: "beginner",
    permitRequired: false,
    safetyNotes: "Ensure good ventilation. Use drop cloths to protect floors. Wear safety glasses and mask when sanding.",
    videoUrl: "https://www.youtube.com/results?search_query=how+to+paint+a+room",
    guideUrl: "https://www.homedepot.com/c/ab/how-to-paint-a-room/9ba683603be9fa5395fab90d",
    commonMistakes: [
      "Not preparing walls properly (cleaning, patching, sanding)",
      "Skipping primer on dark colors",
      "Using wrong paint type for room (bathroom/kitchen need moisture-resistant)",
      "Not using painter's tape properly",
    ],
    steps: [
      {
        stepNumber: 1,
        name: "Prepare room",
        description: "Move furniture, cover floors and fixtures",
        estimatedHours: 1,
        instructions: "Move furniture to center or remove from room. Cover floors with drop cloths. Remove switch plates and outlet covers. Use painter's tape on trim, windows, and doors.",
      },
      {
        stepNumber: 2,
        name: "Prepare walls",
        description: "Clean, patch holes, and sand walls",
        estimatedHours: 2,
        instructions: "Wash walls with TSP cleaner. Fill holes and cracks with spackle. Sand smooth. Wipe down with damp cloth to remove dust.",
      },
      {
        stepNumber: 3,
        name: "Prime walls",
        description: "Apply primer if needed (especially for dark colors or new drywall)",
        estimatedHours: 1,
        instructions: "Apply primer with roller and brush. Let dry completely (usually 2-4 hours).",
      },
      {
        stepNumber: 4,
        name: "Paint walls",
        description: "Apply paint in sections",
        estimatedHours: 3,
        instructions: "Start with edges using brush (cutting in). Then use roller for main areas. Apply 2 coats for best coverage. Let first coat dry completely before second coat.",
      },
      {
        stepNumber: 5,
        name: "Clean up",
        description: "Remove tape, clean brushes, put room back together",
        estimatedHours: 1,
        instructions: "Remove painter's tape while paint is still slightly wet. Clean brushes and rollers. Reinstall switch plates. Move furniture back.",
      },
    ],
    defaultMaterials: [
      {
        name: "Interior Paint",
        description: "1 gallon covers ~350 sq ft",
        quantity: 1,
        unit: "gallon",
        unitPrice: 35,
        vendor: "Home Depot",
      },
      {
        name: "Primer",
        description: "If needed for dark colors or new drywall",
        quantity: 1,
        unit: "gallon",
        unitPrice: 25,
        vendor: "Home Depot",
      },
      {
        name: "Paint Roller",
        description: "9-inch roller with cover",
        quantity: 1,
        unit: "set",
        unitPrice: 8,
        vendor: "Home Depot",
      },
      {
        name: "Paint Brushes",
        description: "2-3 inch angled brush for cutting in",
        quantity: 2,
        unit: "brush",
        unitPrice: 5,
        vendor: "Home Depot",
      },
      {
        name: "Painter's Tape",
        description: "Blue painter's tape",
        quantity: 1,
        unit: "roll",
        unitPrice: 5,
        vendor: "Home Depot",
      },
      {
        name: "Drop Cloths",
        description: "Canvas or plastic drop cloths",
        quantity: 2,
        unit: "cloth",
        unitPrice: 8,
        vendor: "Home Depot",
      },
      {
        name: "Paint Tray",
        description: "Roller tray",
        quantity: 1,
        unit: "tray",
        unitPrice: 3,
        vendor: "Home Depot",
      },
    ],
    defaultTools: [
      {
        name: "Paint Roller",
        description: "9-inch roller frame",
        owned: false,
        rentalCost: 0,
        purchaseCost: 5,
      },
      {
        name: "Paint Brushes",
        description: "Angled brushes for edges",
        owned: false,
        purchaseCost: 10,
      },
      {
        name: "Paint Tray",
        description: "Roller tray",
        owned: false,
        purchaseCost: 3,
      },
      {
        name: "Ladder",
        description: "Step ladder for reaching high areas",
        owned: false,
        rentalCost: 15,
        rentalDays: 1,
      },
      {
        name: "Sandpaper",
        description: "120-220 grit for wall prep",
        owned: false,
        purchaseCost: 5,
      },
    ],
  },
  {
    name: "Install Ceiling Fan",
    description: "Install a new ceiling fan or replace an existing light fixture with a ceiling fan",
    category: "ELECTRICAL",
    difficulty: "MEDIUM",
    estimatedHours: 3,
    estimatedCostMin: 100,
    estimatedCostMax: 300,
    skillLevel: "intermediate",
    permitRequired: false,
    safetyNotes: "Turn off power at circuit breaker. Use proper electrical safety. Ensure ceiling box is rated for fan weight. Have someone help hold fan during installation.",
    videoUrl: "https://www.youtube.com/results?search_query=install+ceiling+fan",
    guideUrl: "https://www.homedepot.com/c/ab/how-to-install-a-ceiling-fan/9ba683603be9fa5395fab90d",
    commonMistakes: [
      "Not turning off power",
      "Using wrong electrical box (must be fan-rated)",
      "Not balancing fan blades after installation",
      "Installing fan blades upside down",
    ],
    steps: [
      {
        stepNumber: 1,
        name: "Turn off power",
        description: "Turn off circuit breaker for the room",
        estimatedHours: 0.25,
        instructions: "Locate circuit breaker and turn off power to the room. Test with voltage tester to confirm power is off.",
      },
      {
        stepNumber: 2,
        name: "Remove old fixture",
        description: "Remove existing light fixture or old fan",
        estimatedHours: 0.5,
        instructions: "Remove light bulbs/glass. Unscrew fixture from ceiling box. Disconnect wires (note wire colors). Remove old mounting bracket.",
      },
      {
        stepNumber: 3,
        name: "Install mounting bracket",
        description: "Attach fan-rated mounting bracket to electrical box",
        estimatedHours: 0.5,
        instructions: "Ensure electrical box is fan-rated. Install mounting bracket according to fan instructions. Use proper screws.",
      },
      {
        stepNumber: 4,
        name: "Wire fan",
        description: "Connect fan wires to house wiring",
        estimatedHours: 1,
        instructions: "Connect black to black (hot), white to white (neutral), green/bare to ground. Use wire nuts. Tuck wires into box.",
      },
      {
        stepNumber: 5,
        name: "Mount fan",
        description: "Attach fan motor to mounting bracket",
        estimatedHours: 0.5,
        instructions: "Lift fan motor and attach to mounting bracket. Secure with screws. Have helper hold fan during this step.",
      },
      {
        stepNumber: 6,
        name: "Install blades and light",
        description: "Attach fan blades and light kit",
        estimatedHours: 0.5,
        instructions: "Attach blades to motor (check for correct orientation). Install light kit if included. Install light bulbs.",
      },
    ],
    defaultMaterials: [
      {
        name: "Ceiling Fan",
        description: "Standard 52-inch ceiling fan with light",
        quantity: 1,
        unit: "fan",
        unitPrice: 150,
        vendor: "Home Depot",
      },
      {
        name: "Wire Nuts",
        description: "Electrical wire connectors",
        quantity: 3,
        unit: "nuts",
        unitPrice: 0.5,
        vendor: "Home Depot",
      },
    ],
    defaultTools: [
      {
        name: "Voltage Tester",
        description: "Non-contact voltage tester",
        owned: false,
        purchaseCost: 15,
      },
      {
        name: "Wire Strippers",
        description: "Electrical wire strippers",
        owned: false,
        purchaseCost: 10,
      },
      {
        name: "Screwdriver Set",
        description: "Phillips and flathead screwdrivers",
        owned: true,
      },
      {
        name: "Ladder",
        description: "Step ladder",
        owned: false,
        rentalCost: 15,
        rentalDays: 1,
      },
    ],
  },
  {
    name: "Replace Faucet",
    description: "Replace an old or leaking faucet with a new one",
    category: "PLUMBING",
    difficulty: "MEDIUM",
    estimatedHours: 2,
    estimatedCostMin: 50,
    estimatedCostMax: 200,
    skillLevel: "intermediate",
    permitRequired: false,
    safetyNotes: "Turn off water supply before starting. Have towels ready for water spills. Check for leaks after installation.",
    videoUrl: "https://www.youtube.com/results?search_query=replace+faucet",
    guideUrl: "https://www.homedepot.com/c/ab/how-to-replace-a-faucet/9ba683603be9fa5395fab90d",
    commonMistakes: [
      "Not turning off water supply",
      "Overtightening connections (can crack fittings)",
      "Not using plumber's putty or silicone sealant",
      "Installing wrong size faucet",
    ],
    steps: [
      {
        stepNumber: 1,
        name: "Turn off water",
        description: "Turn off water supply valves under sink",
        estimatedHours: 0.25,
        instructions: "Locate shut-off valves under sink (hot and cold). Turn clockwise to close. Turn on faucet to drain remaining water.",
      },
      {
        stepNumber: 2,
        name: "Disconnect supply lines",
        description: "Disconnect hot and cold water lines",
        estimatedHours: 0.25,
        instructions: "Use adjustable wrench to disconnect supply lines from faucet. Have bucket ready for any remaining water.",
      },
      {
        stepNumber: 3,
        name: "Remove old faucet",
        description: "Remove mounting nuts and old faucet",
        estimatedHours: 0.5,
        instructions: "Remove mounting nuts from under sink (may need basin wrench). Lift old faucet out. Clean mounting surface.",
      },
      {
        stepNumber: 4,
        name: "Install new faucet",
        description: "Place new faucet and connect",
        estimatedHours: 0.75,
        instructions: "Apply plumber's putty or silicone sealant to base. Insert faucet through mounting holes. Tighten mounting nuts from below. Connect supply lines.",
      },
      {
        stepNumber: 5,
        name: "Test for leaks",
        description: "Turn on water and check for leaks",
        estimatedHours: 0.25,
        instructions: "Turn on water supply. Check all connections for leaks. Tighten if needed. Test faucet operation.",
      },
    ],
    defaultMaterials: [
      {
        name: "New Faucet",
        description: "Standard kitchen or bathroom faucet",
        quantity: 1,
        unit: "faucet",
        unitPrice: 100,
        vendor: "Home Depot",
      },
      {
        name: "Plumber's Putty",
        description: "Waterproof sealant",
        quantity: 1,
        unit: "container",
        unitPrice: 3,
        vendor: "Home Depot",
      },
      {
        name: "Teflon Tape",
        description: "Thread seal tape",
        quantity: 1,
        unit: "roll",
        unitPrice: 2,
        vendor: "Home Depot",
      },
    ],
    defaultTools: [
      {
        name: "Adjustable Wrench",
        description: "For supply line connections",
        owned: false,
        purchaseCost: 15,
      },
      {
        name: "Basin Wrench",
        description: "For hard-to-reach mounting nuts",
        owned: false,
        purchaseCost: 20,
      },
      {
        name: "Plumber's Putty",
        description: "Sealant for faucet base",
        owned: false,
        purchaseCost: 3,
      },
    ],
  },
  {
    name: "Install Smart Thermostat",
    description: "Replace old thermostat with a smart, programmable thermostat",
    category: "HVAC",
    difficulty: "EASY",
    estimatedHours: 1,
    estimatedCostMin: 100,
    estimatedCostMax: 300,
    skillLevel: "beginner",
    permitRequired: false,
    safetyNotes: "Turn off HVAC power at circuit breaker. Label wires before disconnecting. Check compatibility with your HVAC system.",
    videoUrl: "https://www.youtube.com/results?search_query=install+smart+thermostat",
    guideUrl: "https://www.homedepot.com/c/ab/how-to-install-a-thermostat/9ba683603be9fa5395fab90d",
    commonMistakes: [
      "Not checking HVAC compatibility",
      "Not labeling wires before disconnecting",
      "Installing wrong voltage thermostat",
      "Not programming thermostat after installation",
    ],
    steps: [
      {
        stepNumber: 1,
        name: "Turn off power",
        description: "Turn off HVAC system at circuit breaker",
        estimatedHours: 0.25,
        instructions: "Locate circuit breaker for HVAC system and turn it off. Verify power is off.",
      },
      {
        stepNumber: 2,
        name: "Remove old thermostat",
        description: "Take off cover and disconnect wires",
        estimatedHours: 0.25,
        instructions: "Remove cover. Take photo of wire connections. Label each wire with its terminal letter. Disconnect wires. Remove mounting plate.",
      },
      {
        stepNumber: 3,
        name: "Install new thermostat",
        description: "Mount new thermostat and connect wires",
        estimatedHours: 0.25,
        instructions: "Mount new thermostat base to wall. Connect wires to matching terminals. Level thermostat. Attach faceplate.",
      },
      {
        stepNumber: 4,
        name: "Program and test",
        description: "Turn on power and program thermostat",
        estimatedHours: 0.25,
        instructions: "Turn on circuit breaker. Follow setup wizard on thermostat. Test heating and cooling. Set schedule.",
      },
    ],
    defaultMaterials: [
      {
        name: "Smart Thermostat",
        description: "WiFi-enabled programmable thermostat",
        quantity: 1,
        unit: "thermostat",
        unitPrice: 200,
        vendor: "Home Depot",
      },
      {
        name: "Wire Labels",
        description: "For labeling wires",
        quantity: 1,
        unit: "set",
        unitPrice: 2,
        vendor: "Home Depot",
      },
    ],
    defaultTools: [
      {
        name: "Screwdriver",
        description: "Phillips and flathead",
        owned: true,
      },
      {
        name: "Level",
        description: "Small level for mounting",
        owned: false,
        purchaseCost: 5,
      },
      {
        name: "Voltage Tester",
        description: "To verify power is off",
        owned: false,
        purchaseCost: 15,
      },
    ],
  },
];

export async function seedDiyTemplates() {
  console.log("Seeding DIY project templates...");

  for (const template of projectTemplates) {
    const existing = await prisma.projectTemplate.findFirst({
      where: {
        name: template.name,
        category: template.category as any,
      },
    });

    if (existing) {
      await prisma.projectTemplate.update({
        where: { id: existing.id },
        data: {
          description: template.description,
          difficulty: template.difficulty as any,
          estimatedHours: template.estimatedHours,
          estimatedCostMin: template.estimatedCostMin,
          estimatedCostMax: template.estimatedCostMax,
          skillLevel: template.skillLevel,
          permitRequired: template.permitRequired,
          safetyNotes: template.safetyNotes,
          videoUrl: template.videoUrl,
          guideUrl: template.guideUrl,
          commonMistakes: template.commonMistakes,
          steps: template.steps as any,
          defaultMaterials: template.defaultMaterials as any,
          defaultTools: template.defaultTools as any,
          isActive: true,
        },
      });
    } else {
      await prisma.projectTemplate.create({
        data: {
        name: template.name,
        description: template.description,
        category: template.category as any,
        difficulty: template.difficulty as any,
        estimatedHours: template.estimatedHours,
        estimatedCostMin: template.estimatedCostMin,
        estimatedCostMax: template.estimatedCostMax,
        skillLevel: template.skillLevel,
        permitRequired: template.permitRequired,
        safetyNotes: template.safetyNotes,
        videoUrl: template.videoUrl,
        guideUrl: template.guideUrl,
        commonMistakes: template.commonMistakes,
        steps: template.steps as any,
        defaultMaterials: template.defaultMaterials as any,
        defaultTools: template.defaultTools as any,
        isActive: true,
        },
      });
    }
  }

  console.log(`Seeded ${projectTemplates.length} DIY project templates`);
}

// Run if called directly
if (require.main === module) {
  seedDiyTemplates()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

