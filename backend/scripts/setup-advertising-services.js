const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupAdvertisingServices() {
  try {
    const services = [
      {
        name: 'Facebook Ads Management',
        description: 'Monthly Facebook advertising campaign management and optimization',
        category: 'ADVERTISING',
        defaultPrice: 500.00,
        isRecurring: true,
        billingCycle: 'MONTHLY',
        billingDay: 10 // Tippie's billing day
      },
      {
        name: 'Google Ads Management',
        description: 'Monthly Google advertising campaign management and optimization',
        category: 'ADVERTISING',
        defaultPrice: 500.00,
        isRecurring: true,
        billingCycle: 'MONTHLY',
        billingDay: 10 // Tippie's billing day
      },
      {
        name: 'TikTok Ads Management',
        description: 'Monthly TikTok advertising campaign management and optimization',
        category: 'ADVERTISING',
        defaultPrice: 500.00,
        isRecurring: true,
        billingCycle: 'MONTHLY',
        billingDay: 10 // Default billing day, can be customized per client
      }
    ];

    console.log('Setting up advertising services...');

    for (const serviceData of services) {
      // Check if service already exists
      const existingService = await prisma.serviceLibrary.findFirst({
        where: { name: serviceData.name }
      });

      if (existingService) {
        console.log(`Service '${serviceData.name}' already exists, updating...`);
        
        const updatedService = await prisma.serviceLibrary.update({
          where: { id: existingService.id },
          data: serviceData
        });
        
        console.log(`✓ Updated: ${updatedService.name} - €${updatedService.defaultPrice}/month`);
      } else {
        const newService = await prisma.serviceLibrary.create({
          data: serviceData
        });
        
        console.log(`✓ Created: ${newService.name} - €${newService.defaultPrice}/month`);
      }
    }

    // Display all advertising services
    const advertisingServices = await prisma.serviceLibrary.findMany({
      where: { 
        category: 'ADVERTISING',
        isActive: true 
      },
      orderBy: { name: 'asc' }
    });

    console.log('\\nAdvertising Services Summary:');
    advertisingServices.forEach(service => {
      console.log(`- ${service.name}`);
      console.log(`  Price: €${service.defaultPrice}/${service.billingCycle?.toLowerCase()}`);
      console.log(`  Recurring: ${service.isRecurring ? 'Yes' : 'No'}`);
      console.log(`  Billing Day: ${service.billingDay || 'Not set'}`);
      console.log(`  Description: ${service.description}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error setting up advertising services:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupAdvertisingServices();