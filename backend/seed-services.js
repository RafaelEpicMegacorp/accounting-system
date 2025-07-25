const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding service library...');

  const services = [
    // Content Marketing
    { name: 'Forbes Article Retainer', category: 'CONTENT_MARKETING', defaultPrice: 9950 },
    { name: 'Content Retainer', category: 'CONTENT_MARKETING', defaultPrice: 9950 },
    { name: 'Forbes retainer', category: 'CONTENT_MARKETING', defaultPrice: 4950 },
    { name: 'Investing.com Content', category: 'CONTENT_MARKETING', defaultPrice: null },
    { name: 'Yahoo Finance Content', category: 'CONTENT_MARKETING', defaultPrice: null },

    // Podcast Sponsorship
    { name: 'Boom! from The Economist', category: 'PODCAST_SPONSORSHIP', defaultPrice: null },
    { name: 'Behind the Money by Financial Times', category: 'PODCAST_SPONSORSHIP', defaultPrice: null },
    { name: 'Finance ABC Podcast', category: 'PODCAST_SPONSORSHIP', defaultPrice: null },
    { name: 'So Money with Farnoosh Torabi', category: 'PODCAST_SPONSORSHIP', defaultPrice: null },
    { name: 'Boom! by The Economist ad roll', category: 'PODCAST_SPONSORSHIP', defaultPrice: 1975 },
    { name: 'Behind the Money by Financial Times ad roll', category: 'PODCAST_SPONSORSHIP', defaultPrice: 1975 },

    // Social Media
    { name: 'X.com Promotion', category: 'SOCIAL_MEDIA', defaultPrice: 2450 },
    { name: 'Twitter Promotion Campaign', category: 'SOCIAL_MEDIA', defaultPrice: 4900 },

    // Advertising
    { name: 'Facebook Ads Setup', category: 'ADVERTISING', defaultPrice: 500 },
    { name: 'Google Ads Setup', category: 'ADVERTISING', defaultPrice: 500 },
    { name: 'TikTok Ads Setup', category: 'ADVERTISING', defaultPrice: 500 },
    { name: 'TikTok Ads Setup for Tippie Classic', category: 'ADVERTISING', defaultPrice: 500 },

    // Creative Services
    { name: 'Video Creative (Website)', category: 'CREATIVE_SERVICES', defaultPrice: 350 },
    { name: 'Landing Page Design', category: 'CREATIVE_SERVICES', defaultPrice: 500 },

    // Platform Management
    { name: 'Telegram Group Setup', category: 'PLATFORM_MANAGEMENT', defaultPrice: 950 },
  ];

  for (const service of services) {
    // Check if service exists, create if not
    const existing = await prisma.serviceLibrary.findFirst({
      where: { name: service.name }
    });
    
    if (!existing) {
      await prisma.serviceLibrary.create({
        data: service,
      });
    }
  }

  console.log(`Seeded ${services.length} services.`);

  // Now let's also seed the companies with the real data from invoices
  const companies = [
    {
      id: 'creative-company-llc',
      name: 'Creative Company LLC',
      legalName: 'Creative Company LLC',
      address: 'Poland, 01-237, Warsaw, ap. 24, 6 Bukowinska',
      city: 'Warsaw',
      country: 'Poland',
      postalCode: '01-237',
      taxCode: '41803620',
      email: 'rafael@creativecompany.com',
    },
    {
      id: 'epic-megacorp-llc',
      name: 'EPIC MEGACORP LLC',
      legalName: 'Epic Megacorp LLC',
      address: 'Ukraine, 01021, Kyiv, ap. 24, 7 Clovsky Uzviz str',
      city: 'Kyiv',
      country: 'Ukraine',
      postalCode: '01021',
      taxCode: '41803620',
      email: 'rafael@cryptocoin.news',
    }
  ];

  // Create Creative Company LLC first
  await prisma.company.upsert({
    where: { id: 'creative-company-llc' },
    update: {},
    create: companies[0],
  });

  // Create Epic Megacorp
  await prisma.company.upsert({
    where: { id: 'epic-megacorp-llc' },
    update: {},
    create: companies[1],
  });

  // Update existing invoices to use the correct company
  await prisma.invoice.updateMany({
    where: { companyId: 'cm3b4z5a6000000example' },
    data: { companyId: 'creative-company-llc' },
  });

  // Now delete the default company
  await prisma.company.deleteMany({
    where: { id: 'cm3b4z5a6000000example' }
  });

  // Add payment methods for Creative Company LLC
  await prisma.paymentMethod.upsert({
    where: { id: 'creative-crypto-wallet' },
    update: {},
    create: {
      id: 'creative-crypto-wallet',
      companyId: 'creative-company-llc',
      type: 'CRYPTO_WALLET',
      name: 'Crypto Wallet (USDC/USDT/ETH)',
      details: {
        address: '0xd2bA15BBd558543BB1310187d6e5e5A7e2429eB5',
        currencies: ['USDC', 'USDT', 'ETH']
      },
    },
  });

  // Add payment methods for Epic Megacorp LLC
  await prisma.paymentMethod.upsert({
    where: { id: 'epic-crypto-wallet' },
    update: {},
    create: {
      id: 'epic-crypto-wallet',
      companyId: 'epic-megacorp-llc',
      type: 'CRYPTO_WALLET',
      name: 'Crypto Wallet (ETH/USDT/USDC)',
      details: {
        address: '0x7ae98B97b9fc2bff241C256aB3156BD65D756dCc',
        currencies: ['ETH', 'USDT', 'USDC']
      },
    },
  });

  // Add bank account for personal invoicing
  await prisma.paymentMethod.upsert({
    where: { id: 'personal-bank-account' },
    update: {},
    create: {
      id: 'personal-bank-account',
      companyId: 'creative-company-llc',
      type: 'BANK_ACCOUNT',
      name: 'Personal Bank Account',
      details: {
        account: '29 1020 1169 0000 8002 0874 2654',
        iban: 'PL29102011690000800208742654',
        swift: 'BPKOPLPW',
        address: 'UL. WOLOSKA 58/62, WARSZAWA'
      },
    },
  });

  console.log('Seeded companies and payment methods.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });