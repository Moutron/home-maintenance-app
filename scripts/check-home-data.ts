import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkHomeData() {
  try {
    const homes = await prisma.home.findMany({
      select: {
        id: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        yearBuilt: true,
        homeType: true,
      },
    });

    console.log(`Found ${homes.length} homes:\n`);

    for (const home of homes) {
      console.log(`Home ID: ${home.id}`);
      console.log(`  Address: ${home.address}`);
      console.log(`  City: ${home.city || "(missing)"}`);
      console.log(`  State: "${home.state}" (length: ${home.state?.length || 0})`);
      console.log(`  ZIP Code: "${home.zipCode}"`);
      
      // Validate ZIP code format
      const zipCodeRegex = /^\d{5}(-\d{4})?$/;
      const normalizedZipCode = home.zipCode?.trim().replace(/\s+/g, '') || '';
      const zipValid = zipCodeRegex.test(normalizedZipCode);
      console.log(`  ZIP Valid: ${zipValid}`);
      
      // Validate state format
      const normalizedState = home.state?.trim().toUpperCase() || '';
      const stateValid = normalizedState.length === 2;
      console.log(`  State Valid: ${stateValid}`);
      
      console.log(`  Year Built: ${home.yearBuilt}`);
      console.log(`  Home Type: ${home.homeType}`);
      console.log('');
    }
  } catch (error) {
    console.error("Error checking home data:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkHomeData();

