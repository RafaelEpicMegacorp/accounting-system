const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testLogin() {
  try {
    // Get user by email
    const user = await prisma.user.findFirst({
      where: { email: 'rafael@creativecompany.com' }
    });

    if (!user) {
      console.log('User not found');
      return;
    }

    console.log(`Found user: ${user.name} (${user.email})`);
    console.log(`Stored password hash: ${user.password}`);

    // Test common passwords
    const testPasswords = ['admin123', 'password123', 'testpass123', '123456'];
    
    for (const password of testPasswords) {
      const isValid = await bcrypt.compare(password, user.password);
      console.log(`Password '${password}': ${isValid ? '✓ VALID' : '✗ Invalid'}`);
      
      if (isValid) {
        console.log(`\\nCorrect password is: ${password}`);
        break;
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin();