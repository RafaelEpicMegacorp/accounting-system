import { PrismaClient } from '@prisma/client';

export default async () => {
  console.log('\n🧹 Cleaning up test environment...\n');
  
  const prisma = new PrismaClient();
  
  try {
    // Clean up all test data
    await prisma.payment.deleteMany({});
    await prisma.paymentReminder.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.client.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.emailTemplate.deleteMany({});
    await prisma.settings.deleteMany({});
    await prisma.auditLog.deleteMany({});
    
    console.log('✅ Test cleanup complete\n');
  } catch (error) {
    console.error('❌ Failed to cleanup test database:', error);
  } finally {
    await prisma.$disconnect();
  }
};