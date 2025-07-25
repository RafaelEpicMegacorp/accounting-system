# Bug Report Template

Use this template for all bug reports. Copy this template and rename the file with a descriptive name like `BUGS/001-login-form-validation-error.md`

---

# Bug Report: [Brief Description]

**Bug ID**: [Sequential number, e.g., 001]  
**Severity**: Critical | High | Medium | Low  
**Status**: Open | In Progress | Fixed | Verified  
**Date Reported**: YYYY-MM-DD  
**Reporter**: [Name]  
**Assignee**: [Name or Unassigned]  

## Summary
[Brief description of the issue in 1-2 sentences]

## Steps to Reproduce
1. [First step]
2. [Second step]  
3. [Third step]
4. [Continue as needed]

## Expected Behavior
[Describe what should happen]

## Actual Behavior
[Describe what actually happens]

## Environment Details
- **Frontend URL**: http://localhost:5174
- **Backend URL**: http://localhost:3001
- **Browser**: [Chrome/Firefox/Safari/Edge] 
- **Browser Version**: [Version number]
- **Device**: [Desktop/Mobile/Tablet]
- **Operating System**: [macOS/Windows/Linux]
- **Screen Resolution**: [If relevant]

## Technical Details
- **API Endpoint**: [If backend issue]
- **Database**: [If data-related]
- **Error Messages**: [Exact error text]
- **Console Logs**: [Browser console errors]
- **Server Logs**: [Backend error logs]

## Screenshots/Videos
[Attach screenshots or describe where they can be found]

## Workaround
[If a temporary workaround exists, describe it]

## Impact Assessment
- **Users Affected**: [All users/Specific user types/Admin only]
- **Functionality Impact**: [What features are broken]
- **Business Impact**: [How this affects business operations]

## Additional Notes
[Any other relevant information, related bugs, or context]

## Resolution Notes
[To be filled when bug is fixed]
- **Root Cause**: [What caused the issue]
- **Fix Applied**: [What was changed to fix it]
- **Testing**: [How the fix was verified]
- **Date Fixed**: [YYYY-MM-DD]

---

## Bug Severity Guidelines

### Critical
- System crashes or becomes unusable
- Data loss or corruption
- Security vulnerabilities
- Authentication system failure
- Payment system failure

### High  
- Core functionality broken
- Major workflow disruption
- Users cannot complete primary tasks
- API endpoints returning errors
- Database connection issues

### Medium
- Feature partially working
- Workaround available
- UI issues that affect usability
- Performance issues
- Minor data inconsistencies

### Low
- Cosmetic UI issues
- Minor text/spelling errors
- Non-critical feature enhancements
- Logging/monitoring issues
- Documentation errors

## Bug Status Definitions

### Open
- Bug has been reported and needs investigation
- Assigned for analysis and reproduction

### In Progress  
- Bug has been reproduced and assigned for fixing
- Developer is actively working on resolution

### Fixed
- Code changes have been made to address the bug
- Ready for testing and verification

### Verified
- Fix has been tested and confirmed working
- Bug is resolved and can be closed