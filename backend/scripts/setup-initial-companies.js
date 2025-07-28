const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupInitialCompanies() {
  try {
    // Get Rafael's user account
    const user = await prisma.user.findFirst({
      where: { 
        email: { contains: 'rafael' }
      }
    });

    if (!user) {
      console.log('Rafael user not found. Please create user account first.');
      return;
    }

    console.log(`Found user: ${user.name} (${user.email})`);

    // Check if Creative Company already exists
    const existingCreativeCompany = await prisma.company.findFirst({
      where: { 
        userId: user.id,
        name: 'Creative Company'
      }
    });

    if (existingCreativeCompany) {
      console.log('Creative Company already exists, updating...');
      
      // Update Creative Company with complete information
      const updatedCreativeCompany = await prisma.company.update({
        where: { id: existingCreativeCompany.id },
        data: {
          legalName: 'Creative Company LLC',
          email: 'rafael@creativecompany.com',
          phone: '+48 510733518',
          // Banking information from the Tippie invoice
          bankAccount: '29 1020 1169 0000 8002 0874 2654',
          iban: 'PL29102011690000800208742654',
          bicSwift: 'BPKOPLPW',
          address: 'UL. WOLOSKA 58/62',
          city: 'WARSZAWA',
          country: 'Poland',
          defaultCurrency: 'EUR',
          isDefault: true,
          isActive: true
        }
      });

      console.log(`Updated Creative Company: ${updatedCreativeCompany.name}`);
    } else {
      // Create Creative Company
      const creativeCompany = await prisma.company.create({
        data: {
          userId: user.id,
          name: 'Creative Company',
          legalName: 'Creative Company LLC',
          email: 'rafael@creativecompany.com',
          phone: '+48 510733518',
          // Banking information from the Tippie invoice
          bankAccount: '29 1020 1169 0000 8002 0874 2654',
          iban: 'PL29102011690000800208742654',
          bicSwift: 'BPKOPLPW',
          address: 'UL. WOLOSKA 58/62',
          city: 'WARSZAWA',
          country: 'Poland',
          defaultCurrency: 'EUR',
          isDefault: true,
          isActive: true
        }
      });

      console.log(`Created Creative Company: ${creativeCompany.name}`);
    }

    // Check if Deploy Staff already exists
    const existingDeployStaff = await prisma.company.findFirst({
      where: { 
        userId: user.id,
        name: 'Deploy Staff'
      }
    });

    if (!existingDeployStaff) {
      // Create Deploy Staff company
      const deployStaff = await prisma.company.create({
        data: {
          userId: user.id,
          name: 'Deploy Staff',
          legalName: 'Deploy Staff LLC',
          email: 'rafael@deploystaff.com',
          phone: '+48 510733518',
          // Placeholder banking information - to be updated later
          defaultCurrency: 'USD',
          isDefault: false,
          isActive: true
        }
      });

      console.log(`Created Deploy Staff: ${deployStaff.name}`);
    } else {
      console.log('Deploy Staff already exists');
    }

    // List all companies for the user
    const allCompanies = await prisma.company.findMany({
      where: { userId: user.id },
      orderBy: { isDefault: 'desc' }
    });

    console.log('\\nUser companies:');
    allCompanies.forEach(company => {
      console.log(`- ${company.name} ${company.isDefault ? '(DEFAULT)' : ''}`);
      console.log(`  Email: ${company.email}`);
      console.log(`  Currency: ${company.defaultCurrency}`);
      if (company.iban) {
        console.log(`  IBAN: ${company.iban}`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('Error setting up companies:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupInitialCompanies();