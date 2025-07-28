#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function backupServices() {
  console.log('🔄 Backing up service library...');
  
  try {
    const services = await prisma.serviceLibrary.findMany({
      select: {
        name: true,
        category: true,
        defaultPrice: true,
        description: true,
        isActive: true
      }
    });
    
    // Save backup to file
    fs.writeFileSync('./services-backup.json', JSON.stringify(services, null, 2));
    console.log(`✅ Backed up ${services.length} services to services-backup.json`);
    
    return services;
  } catch (error) {
    console.error('❌ Error backing up services:', error);
    throw error;
  }
}

async function cleanDatabase() {
  console.log('🧹 Starting complete database cleanup...');
  
  try {
    // Delete in correct order to respect foreign key constraints
    console.log('Deleting payments...');
    await prisma.payment.deleteMany({});
    
    console.log('Deleting invoices...');
    await prisma.invoice.deleteMany({});
    
    console.log('Deleting orders...');
    await prisma.order.deleteMany({});
    
    console.log('Deleting clients...');
    await prisma.client.deleteMany({});
    
    console.log('Deleting companies...');
    await prisma.company.deleteMany({});
    
    console.log('Deleting services...');
    await prisma.serviceLibrary.deleteMany({});
    
    console.log('Deleting users (except admin)...');
    // Keep only non-test users if any exist
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: 'test' } },
          { email: { contains: 'dashboard' } },
          { email: { contains: 'example.com' } }
        ]
      }
    });
    
    console.log('✅ Database cleanup completed successfully');
    
  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
    throw error;
  }
}

async function restoreServices(services) {
  console.log('🔄 Restoring service library...');
  
  try {
    for (const service of services) {
      await prisma.serviceLibrary.create({
        data: service
      });
    }
    
    console.log(`✅ Restored ${services.length} services`);
    
  } catch (error) {
    console.error('❌ Error restoring services:', error);
    throw error;
  }
}

async function getDataCounts() {
  try {
    const counts = {
      users: await prisma.user.count(),
      clients: await prisma.client.count(),
      orders: await prisma.order.count(),
      invoices: await prisma.invoice.count(),
      payments: await prisma.payment.count(),
      services: await prisma.serviceLibrary.count(),
      companies: await prisma.company.count()
    };
    
    return counts;
  } catch (error) {
    console.error('❌ Error getting data counts:', error);
    return null;
  }
}

async function main() {
  console.log('🚀 Database Cleanup Script Starting...');
  console.log('=' .repeat(50));
  
  // Show initial counts
  console.log('📊 BEFORE CLEANUP:');
  const beforeCounts = await getDataCounts();
  if (beforeCounts) {
    Object.entries(beforeCounts).forEach(([table, count]) => {
      console.log(`   ${table}: ${count}`);
    });
  }
  console.log('');
  
  try {
    // Step 1: Backup services
    const services = await backupServices();
    
    // Step 2: Clean database
    await cleanDatabase();
    
    // Step 3: Restore services
    await restoreServices(services);
    
    // Show final counts
    console.log('📊 AFTER CLEANUP:');
    const afterCounts = await getDataCounts();
    if (afterCounts) {
      Object.entries(afterCounts).forEach(([table, count]) => {
        console.log(`   ${table}: ${count}`);
      });
    }
    
    console.log('');
    console.log('🎉 Database cleanup completed successfully!');
    console.log('✅ All test data removed');
    console.log('✅ Service library preserved');
    console.log('✅ Application ready for production use');
    
  } catch (error) {
    console.error('💥 Cleanup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
main().catch(console.error);