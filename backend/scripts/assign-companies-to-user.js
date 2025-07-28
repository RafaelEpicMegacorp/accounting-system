const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function assignCompaniesToUser() {
  try {
    // Get the first user
    const firstUser = await prisma.user.findFirst();
    
    if (!firstUser) {
      console.log('No users found. Please create a user first.');
      return;
    }

    console.log(`Found user: ${firstUser.name} (${firstUser.email})`);

    // Get all companies without a userId
    const companiesWithoutUser = await prisma.company.findMany({
      where: { userId: null }
    });

    if (companiesWithoutUser.length === 0) {
      console.log('All companies already have a user assigned.');
      return;
    }

    // Assign all companies to the first user
    const updateResult = await prisma.company.updateMany({
      where: { userId: null },
      data: { userId: firstUser.id }
    });

    console.log(`Assigned ${updateResult.count} companies to user ${firstUser.name}`);

    // Set the first company as default for this user
    const firstCompany = await prisma.company.findFirst({
      where: { userId: firstUser.id },
      orderBy: { createdAt: 'asc' }
    });

    if (firstCompany) {
      await prisma.company.update({
        where: { id: firstCompany.id },
        data: { isDefault: true }
      });
      console.log(`Set company "${firstCompany.name}" as default for user ${firstUser.name}`);
    }

  } catch (error) {
    console.error('Error assigning companies to user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

assignCompaniesToUser();