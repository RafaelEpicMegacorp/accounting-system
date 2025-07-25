# Bug Report: Test Database Configuration Issue

**Bug ID**: 001  
**Severity**: High  
**Status**: Fixed  
**Date Reported**: 2025-07-24  
**Reporter**: Claude Code  
**Assignee**: Unassigned  

## Summary
Tests are currently using the main development database instead of a separate test database, which could lead to data corruption and unreliable test results.

## Steps to Reproduce
1. Run any test with `npm test`
2. Observe that the test setup connects to the main database (accounting_db)
3. Check that .env.test file specifies test database but it's not being used properly

## Expected Behavior
Tests should use a completely separate test database (accounting_test_db) to avoid interfering with development data.

## Actual Behavior
Tests are using the main development database, as evidenced by the console output showing "accounting_db" instead of "accounting_test_db".

## Environment Details
- **Frontend URL**: http://localhost:5174
- **Backend URL**: http://localhost:3001
- **Database**: PostgreSQL
- **Operating System**: macOS
- **Node Version**: Latest

## Technical Details
- **Configuration File**: .env.test specifies test database URL
- **Issue**: Environment variables not being loaded correctly in test environment
- **Database URL**: Should be "accounting_test_db" but shows "accounting_db"

## Impact Assessment
- **Users Affected**: Developers running tests
- **Functionality Impact**: Test data could contaminate development database
- **Business Impact**: Unreliable testing, potential data loss during test runs

## Additional Notes
This is a critical infrastructure issue that needs to be resolved before implementing comprehensive testing.

## Resolution Notes
- **Root Cause**: Global setup script was not properly loading .env.test environment variables and was defaulting to development database
- **Fix Applied**: 
  1. Created setup-test-db.sh script to create separate test database
  2. Updated globalSetup.ts to explicitly load .env.test configuration
  3. Fixed database user configuration to use correct PostgreSQL user
- **Testing**: Basic tests now properly use accounting_test_db instead of accounting_db
- **Date Fixed**: 2025-07-24