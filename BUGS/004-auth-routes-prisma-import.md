# Bug Report: Auth Routes Prisma Import Issue

**Bug ID**: 004  
**Severity**: High  
**Status**: Resolved  
**Date Reported**: 2025-07-24  
**Reporter**: Claude Code  
**Assignee**: Unassigned  

## Summary
Authentication routes cannot be tested in isolation because they import `prisma` from the main server file, which causes circular dependency issues and prevents proper test setup.

## Steps to Reproduce
1. Run `npm test -- auth-api.test.ts`
2. Observe error: "Router.use() requires a middleware function but got a undefined"
3. Test fails to import auth routes properly

## Expected Behavior
Auth routes should be testable in isolation without requiring the full server setup.

## Actual Behavior
Auth routes fail to import due to dependency on server.ts, preventing unit testing.

## Environment Details
- **Backend Framework**: Node.js/Express with TypeScript
- **Test Framework**: Jest with Supertest
- **Database**: PostgreSQL with Prisma

## Technical Details
- **Error**: Router.use() requires a middleware function but got a undefined
- **Root Issue**: `import { prisma } from '../server'` in auth.ts
- **File**: src/routes/auth.ts line 2

## Impact Assessment
- **Users Affected**: Developers running authentication tests
- **Functionality Impact**: Cannot unit test authentication endpoints
- **Business Impact**: Authentication system cannot be properly validated

## Workaround
Use integration tests instead of unit tests for authentication, but this reduces testing efficiency.

## Additional Notes
This architectural issue affects all route files that import prisma from server. Need to refactor to use dependency injection or separate prisma instance.

## Resolution Notes
- **Root Cause**: Authentication routes imported prisma from server.ts, creating circular dependency
- **Fix Applied**: Updated auth.ts and auth middleware to create their own PrismaClient instances
- **Testing**: All 10 authentication API tests now pass (100% success rate)
- **Date Fixed**: 2025-07-24