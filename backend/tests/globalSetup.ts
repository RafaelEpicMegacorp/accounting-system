import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

export default async () => {
  console.log('\n🧪 Setting up test environment...\n');
  
  // Load test environment variables first
  dotenv.config({ path: '.env.test' });
  
  // Ensure test database exists and is migrated
  try {
    // Run database migrations for test environment with explicit test DATABASE_URL
    const testDatabaseUrl = 'postgresql://rafael@localhost:5432/accounting_test_db';
    
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: testDatabaseUrl },
      stdio: 'inherit'
    });
    
    // Generate Prisma client
    execSync('npx prisma generate', { stdio: 'inherit' });
    
    console.log('✅ Test database setup complete\n');
  } catch (error) {
    console.error('❌ Failed to setup test database:', error);
    process.exit(1);
  }
};