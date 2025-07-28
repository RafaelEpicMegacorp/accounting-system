const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupTippieSubscriptions() {
  try {
    // Get Tippie client
    const tippieClient = await prisma.client.findFirst({
      where: { email: 'elnur@tippie.de' }
    });

    if (!tippieClient) {
      console.log('Tippie client not found. Please run setup-tippie-client.js first.');
      return;
    }

    // Get Creative Company (the default one)
    const creativeCompany = await prisma.company.findFirst({
      where: { 
        name: 'Creative Company',
        isDefault: true 
      }
    });

    if (!creativeCompany) {
      console.log('Creative Company not found. Please run setup-initial-companies.js first.');
      return;
    }

    // Get the advertising services
    const facebookService = await prisma.serviceLibrary.findFirst({
      where: { name: 'Facebook Ads Management' }
    });

    const googleService = await prisma.serviceLibrary.findFirst({
      where: { name: 'Google Ads Management' }
    });

    if (!facebookService || !googleService) {
      console.log('Advertising services not found. Please run setup-advertising-services.js first.');
      return;
    }

    // Create subscriptions for Tippie's active services
    const subscriptions = [
      {
        clientId: tippieClient.id,
        serviceId: googleService.id,
        companyId: creativeCompany.id,
        price: 500.00,
        currency: 'EUR',
        billingDay: 10,
        startDate: new Date('2025-07-10T00:00:00.000Z'),
        nextBillingDate: new Date('2025-08-10T00:00:00.000Z'),
        status: 'PAID_IN_ADVANCE',
        isPaidInAdvance: true,
        advancePaidUntil: new Date('2025-08-10T00:00:00.000Z'),
        notes: 'Google Ads running since July 10th, 2025. Client paid in advance.'
      },
      {
        clientId: tippieClient.id,
        serviceId: facebookService.id,
        companyId: creativeCompany.id,
        price: 500.00,
        currency: 'EUR',
        billingDay: 10,
        startDate: new Date('2025-07-10T00:00:00.000Z'),
        nextBillingDate: new Date('2025-08-10T00:00:00.000Z'),
        status: 'PAID_IN_ADVANCE',
        isPaidInAdvance: true,
        advancePaidUntil: new Date('2025-08-10T00:00:00.000Z'),
        notes: 'Facebook Ads paid but not running due to technical issue on client side. Client paid in advance.'
      }
    ];

    console.log('Setting up Tippie subscriptions...');

    for (const subscriptionData of subscriptions) {
      // Check if subscription already exists
      const existingSubscription = await prisma.recurringSubscription.findFirst({
        where: { 
          clientId: subscriptionData.clientId,
          serviceId: subscriptionData.serviceId,
          companyId: subscriptionData.companyId
        }
      });

      if (existingSubscription) {
        console.log(`Subscription for service already exists, updating...`);
        
        const updatedSubscription = await prisma.recurringSubscription.update({
          where: { id: existingSubscription.id },
          data: subscriptionData,
          include: {
            service: true,
            client: true
          }
        });
        
        console.log(`✓ Updated: ${updatedSubscription.service.name} for ${updatedSubscription.client.name}`);
      } else {
        const newSubscription = await prisma.recurringSubscription.create({
          data: subscriptionData,
          include: {
            service: true,
            client: true
          }
        });
        
        console.log(`✓ Created: ${newSubscription.service.name} for ${newSubscription.client.name}`);
      }
    }

    // Display all subscriptions for Tippie
    const tippieSubscriptions = await prisma.recurringSubscription.findMany({
      where: { clientId: tippieClient.id },
      include: {
        service: true,
        client: true,
        company: true
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log('\\nTippie Active Subscriptions:');
    tippieSubscriptions.forEach(subscription => {
      console.log(`- ${subscription.service.name}`);
      console.log(`  Price: €${subscription.price}/${subscription.service.billingCycle?.toLowerCase()}`);
      console.log(`  Status: ${subscription.status}`);
      console.log(`  Billing Day: ${subscription.billingDay}th of each month`);
      console.log(`  Next Billing: ${subscription.nextBillingDate.toISOString().split('T')[0]}`);
      console.log(`  Paid in Advance: ${subscription.isPaidInAdvance ? 'Yes' : 'No'}`);
      if (subscription.advancePaidUntil) {
        console.log(`  Paid Until: ${subscription.advancePaidUntil.toISOString().split('T')[0]}`);
      }
      console.log(`  Notes: ${subscription.notes}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error setting up Tippie subscriptions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupTippieSubscriptions();