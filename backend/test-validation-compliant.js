#!/usr/bin/env node

// Test Validation-Compliant System
// Verifies that all test data now passes API validation rules

const http = require('http');

async function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });
        
        req.on('error', (err) => reject(err));
        
        if (postData) {
            req.write(JSON.stringify(postData));
        }
        req.end();
    });
}

async function testValidationCompliantSystem() {
    console.log('🧪 TESTING VALIDATION-COMPLIANT SYSTEM');
    console.log('=' .repeat(60));
    
    let authToken = '';
    let testResults = [];
    let totalTests = 0;
    let passedTests = 0;
    
    function logTest(name, status, statusCode, expected = null) {
        totalTests++;
        const success = expected ? (statusCode === expected) : (statusCode >= 200 && statusCode < 300);
        if (success) {
            passedTests++;
            console.log(`✅ ${name} - ${statusCode}`);
        } else {
            console.log(`❌ ${name} - ${statusCode}${expected ? ` (expected ${expected})` : ''}`);
        }
        testResults.push({ name, status: success ? 'success' : 'failure', statusCode });
        return success;
    }
    
    // Test the critical validation fixes
    console.log('\n🔧 Testing Critical Validation Fixes');
    
    // Test 1: User Registration with Validation-Compliant Name
    try {
        const validNames = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Echo'];
        const randomName = validNames[Math.floor(Math.random() * validNames.length)];
        
        const registerRes = await makeRequest({
            hostname: 'localhost', port: 3001, path: '/api/auth/register', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            email: `test${Date.now()}@example.com`,
            password: 'Test123#$',
            name: `Test User ${randomName}`
        });
        
        const userRegistrationSuccess = logTest('POST /api/auth/register (validation-compliant)', 'validation', registerRes.status, 201);
        
        if (userRegistrationSuccess) {
            console.log(`   📝 Created user with compliant name: "Test User ${randomName}"`);
        } else {
            console.log(`   ⚠️ Registration failed, response:`, registerRes.data);
        }
        
    } catch (error) {
        logTest('POST /api/auth/register (validation-compliant)', 'error', 500);
    }
    
    // Test 2: Login to get token
    try {
        const loginRes = await makeRequest({
            hostname: 'localhost', port: 3001, path: '/api/auth/login', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            email: 'dashboard.test@example.com',
            password: 'Test123#$'
        });
        
        if (logTest('POST /api/auth/login', 'auth', loginRes.status, 200)) {
            authToken = loginRes.data.token;
        }
    } catch (error) {
        logTest('POST /api/auth/login', 'error', 500);
    }
    
    if (!authToken) {
        console.log('❌ Cannot proceed without authentication');
        return;
    }
    
    const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
    };
    
    // Test 3: Client Creation with Validation-Compliant Data
    try {
        const clientNames = ['Alpha Corp', 'Beta Systems', 'Gamma Industries'];
        const randomClientName = clientNames[Math.floor(Math.random() * clientNames.length)];
        
        const clientRes = await makeRequest({
            hostname: 'localhost', port: 3001, path: '/api/clients', method: 'POST',
            headers: authHeaders
        }, {
            name: randomClientName,
            email: `client${Date.now()}@test.com`,
            company: 'Test Corp',
            phone: '+1234567890',
            address: '123 Test Street'
        });
        
        const clientSuccess = logTest('POST /api/clients (validation-compliant)', 'validation', clientRes.status, 201);
        if (clientSuccess) {
            console.log(`   📝 Created client with compliant name: "${randomClientName}"`);
            
            // Test 4: Order Status Update with Valid Status
            const clientId = clientRes.data.data.client.id;
            
            // Create order first
            const orderRes = await makeRequest({
                hostname: 'localhost', port: 3001, path: '/api/orders', method: 'POST',
                headers: authHeaders
            }, {
                clientId: clientId,
                description: 'Monthly Content Marketing',
                amount: 1000,
                frequency: 'MONTHLY',
                startDate: new Date().toISOString()
            });
            
            if (orderRes.status === 201) {
                const orderId = orderRes.data.data.order.id;
                console.log(`   📦 Created order: ${orderId}`);
                
                // Test order status update with valid status
                const validStatuses = ['ACTIVE', 'PAUSED', 'CANCELLED'];
                const randomStatus = validStatuses[Math.floor(Math.random() * validStatuses.length)];
                
                const statusRes = await makeRequest({
                    hostname: 'localhost', port: 3001, 
                    path: `/api/orders/${orderId}/status`, method: 'POST',
                    headers: authHeaders
                }, { status: randomStatus });
                
                const statusSuccess = logTest('POST /api/orders/:id/status (valid status)', 'validation', statusRes.status, 200);
                if (statusSuccess) {
                    console.log(`   📊 Updated order status to: "${randomStatus}"`);
                } else {
                    console.log(`   ⚠️ Status update failed with status "${randomStatus}":`, statusRes.data);
                }
            }
        }
        
    } catch (error) {
        logTest('POST /api/clients (validation-compliant)', 'error', 500);
    }
    
    // Test 5: Service Creation with Validation-Compliant Data  
    try {
        const serviceNames = ['Content Marketing', 'SEO Optimization', 'Brand Strategy'];
        const randomServiceName = serviceNames[Math.floor(Math.random() * serviceNames.length)];
        
        const serviceRes = await makeRequest({
            hostname: 'localhost', port: 3001, path: '/api/services', method: 'POST',
            headers: authHeaders
        }, {
            name: randomServiceName,
            description: 'Professional service offering',
            category: 'CONTENT_MARKETING',
            defaultPrice: 500
        });
        
        const serviceSuccess = logTest('POST /api/services (validation-compliant)', 'validation', serviceRes.status, 201);
        if (serviceSuccess) {
            console.log(`   🛠️ Created service with compliant name: "${randomServiceName}"`);
        }
        
    } catch (error) {
        logTest('POST /api/services (validation-compliant)', 'error', 500);
    }
    
    // Test 6: Company Creation with Validation-Compliant Data
    try {
        const companyNames = ['Alpha Holdings', 'Beta Ventures', 'Gamma Labs'];
        const randomCompanyName = companyNames[Math.floor(Math.random() * companyNames.length)];
        
        const companyRes = await makeRequest({
            hostname: 'localhost', port: 3001, path: '/api/companies', method: 'POST',
            headers: authHeaders
        }, {
            name: randomCompanyName,
            email: `company${Date.now()}@test.com`,
            address: '123 Company St',
            phone: '+1234567890'
        });
        
        const companySuccess = logTest('POST /api/companies (validation-compliant)', 'validation', companyRes.status, 201);
        if (companySuccess) {
            console.log(`   🏢 Created company with compliant name: "${randomCompanyName}"`);
        }
        
    } catch (error) {
        logTest('POST /api/companies (validation-compliant)', 'error', 500);
    }
    
    // Results Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 VALIDATION-COMPLIANT TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`Tests Run: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${totalTests - passedTests}`);
    console.log(`📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    console.log('='.repeat(60));
    
    const successRate = (passedTests / totalTests) * 100;
    if (successRate === 100) {
        console.log('🎉 PERFECT: All validation issues fixed!');
    } else if (successRate >= 80) {
        console.log('✅ GOOD: Major validation issues resolved');
    } else {
        console.log('⚠️ Still has validation issues');
    }
    
    console.log('\n🔍 Failed Tests:');
    const failedTests = testResults.filter(t => t.status === 'failure');
    if (failedTests.length === 0) {
        console.log('   None! All validation tests passed.');
    } else {
        failedTests.forEach(test => {
            console.log(`   - ${test.name}: ${test.statusCode}`);
        });
    }
    
    console.log('\n🌐 Ready to test full dashboard at: http://localhost:4000');
}

// Run validation-compliant test
testValidationCompliantSystem().catch(console.error);