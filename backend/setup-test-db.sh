#!/bin/bash

# Setup Test Database Script
# This script creates a separate test database for running tests

set -e

echo "🔧 Setting up test database..."

# Database configuration
DB_NAME="accounting_test_db"
DB_USER="rafael"
DB_HOST="localhost"
DB_PORT="5432"

# Check if PostgreSQL is running
if ! pg_isready -h $DB_HOST -p $DB_PORT >/dev/null 2>&1; then
    echo "❌ PostgreSQL is not running on $DB_HOST:$DB_PORT"
    echo "Please start PostgreSQL and try again"
    exit 1
fi

# Drop test database if it exists
echo "🗑️  Dropping existing test database (if exists)..."
dropdb --if-exists -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME || true

# Create new test database
echo "📦 Creating test database: $DB_NAME"
createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME

# Update .env.test with correct database URL
echo "📝 Updating .env.test configuration..."
cat > .env.test << EOL
# Test Environment Configuration
NODE_ENV=test
PORT=3002

# Test Database (separate from development)
DATABASE_URL="postgresql://$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"

# JWT Configuration
JWT_SECRET=test-jwt-secret-for-testing-only
JWT_EXPIRES_IN=1h

# Email Configuration (use test/mock settings)
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=test@example.com
SMTP_PASS=testpassword
EMAIL_FROM_NAME=Test Invoice System

# Test-specific settings
DISABLE_EMAIL_SENDING=true
DISABLE_PDF_GENERATION=false
LOG_LEVEL=error

# Rate limiting (more lenient for testing)
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=1000
EOL

# Run database migrations on test database
echo "🚀 Running database migrations on test database..."
export DATABASE_URL="postgresql://$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
npx prisma migrate deploy

echo "✅ Test database setup complete!"
echo "📊 Database: $DB_NAME"
echo "🔗 URL: postgresql://$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
echo ""
echo "You can now run tests with: npm test"