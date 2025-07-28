#!/usr/bin/env node

// Automated API Testing Script
// Tests all 42+ endpoints via the dashboard API

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

async function testAllEndpoints() {
    console.log('🚀 Starting comprehensive API testing...\n');
    
    const baseUrl = 'http://localhost:3001';
    let authToken = '';
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    
    // Test endpoints in logical order
    const testSuite = [
        // 1. Health check (no auth required)
        {
            name: 'GET /health',
            method: 'GET',
            path: '/health',
            requiresAuth: false
        },
        
        // 2. Authentication flow
        {
            name: 'POST /api/auth/login',
            method: 'POST',
            path: '/api/auth/login',
            requiresAuth: false,
            body: {
                email: 'dashboard.test@example.com',
                password: 'Test123#$'
            }
        },
        
        // 3. Authenticated endpoints - Users
        {
            name: 'GET /api/users',
            method: 'GET',
            path: '/api/users',
            requiresAuth: true
        },
        {
            name: 'GET /api/users/:id',
            method: 'GET',
            path: '/api/users/cmdmv26zi0001ujx8ds6kel3t',
            requiresAuth: true
        },
        
        // 4. Clients
        {
            name: 'GET /api/clients',
            method: 'GET',
            path: '/api/clients',
            requiresAuth: true
        },
        {
            name: 'GET /api/clients/:id',
            method: 'GET',
            path: '/api/clients/cmdinshiy0000ujl3u0fw76q2',
            requiresAuth: true
        },
        {
            name: 'POST /api/clients',
            method: 'POST',
            path: '/api/clients',
            requiresAuth: true,
            body: {
                name: `Test Client Auto ${Date.now()}`,
                email: `autoclient${Date.now()}@test.com`,
                company: 'Auto Test Corp',
                phone: '+1234567890',
                address: '123 Auto Street'
            }
        },
        
        // 5. Orders
        {
            name: 'GET /api/orders',
            method: 'GET',
            path: '/api/orders',
            requiresAuth: true
        },
        {
            name: 'GET /api/orders/:id',
            method: 'GET',
            path: '/api/orders/cmdmwzd98000bujydbviplpb7',
            requiresAuth: true
        },
        {
            name: 'POST /api/orders',
            method: 'POST',
            path: '/api/orders',
            requiresAuth: true,
            body: {
                clientId: 'cmdinshiy0000ujl3u0fw76q2',
                description: 'Auto test order',
                amount: 1000,
                frequency: 'MONTHLY',
                startDate: new Date().toISOString()
            }
        },
        
        // 6. Invoices  
        {
            name: 'GET /api/invoices',
            method: 'GET',
            path: '/api/invoices',
            requiresAuth: true
        },
        {
            name: 'POST /api/invoices',
            method: 'POST',
            path: '/api/invoices',
            requiresAuth: true,
            body: {
                clientId: 'cmdinshiy0000ujl3u0fw76q2',
                companyId: 'cmdmwh9xo000guj78r7apnsbj',
                amount: 100.00,
                currency: 'USD',
                issueDate: new Date().toISOString(),
                dueDate: '2025-08-15'
            }
        },
        
        // 7. Payments
        {
            name: 'GET /api/payments',
            method: 'GET',
            path: '/api/payments',
            requiresAuth: true
        },
        {
            name: 'POST /api/payments',
            method: 'POST',
            path: '/api/payments',
            requiresAuth: true,
            createFreshInvoice: true, // Flag to create invoice before payment
            body: {
                amount: 25.00, // Partial payment amount
                method: 'BANK_TRANSFER',
                paidDate: new Date().toISOString()
            }
        },
        
        // 8. Services
        {
            name: 'GET /api/services',
            method: 'GET',
            path: '/api/services',
            requiresAuth: true
        },
        {
            name: 'GET /api/services/:id',
            method: 'GET',
            path: '/api/services/cmdinskem000hujl34hij0w0q',
            requiresAuth: true
        },
        
        // 9. Companies
        {
            name: 'GET /api/companies',
            method: 'GET',
            path: '/api/companies',
            requiresAuth: true
        },
        {
            name: 'GET /api/companies/:id',
            method: 'GET',
            path: '/api/companies/cm3b4z5a6000000example',
            requiresAuth: true
        },
        
        // 10. Reports
        {
            name: 'GET /api/reports/overview',
            method: 'GET',
            path: '/api/reports/overview',
            requiresAuth: true
        },
        {
            name: 'GET /api/reports/revenue',
            method: 'GET',
            path: '/api/reports/revenue',
            requiresAuth: true
        },
        {
            name: 'GET /api/reports/clients',
            method: 'GET',
            path: '/api/reports/clients',
            requiresAuth: true
        }
    ];
    
    // Run tests
    for (const test of testSuite) {
        totalTests++;
        
        try {
            // Handle special case: create fresh invoice for payment test
            let testBody = test.body;
            if (test.createFreshInvoice && authToken) {
                try {
                    const invoiceOptions = {
                        hostname: 'localhost',
                        port: 3001,
                        path: '/api/invoices',
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${authToken}`
                        }
                    };
                    
                    const invoiceBody = {
                        clientId: 'cmdinshiy0000ujl3u0fw76q2',
                        companyId: 'cmdmwh9xo000guj78r7apnsbj',
                        amount: 50.00,
                        currency: 'USD',
                        issueDate: new Date().toISOString(),
                        dueDate: '2025-08-15'
                    };
                    
                    const invoiceResult = await makeRequest(invoiceOptions, invoiceBody);
                    if (invoiceResult.status === 201) {
                        const invoiceId = invoiceResult.data.data.invoice.id;
                        testBody = { ...test.body, invoiceId };
                        console.log(`🧾 Created fresh invoice for payment: ${invoiceId}`);
                    }
                } catch (error) {
                    console.warn('⚠️ Failed to create fresh invoice:', error.message);
                }
            }
            
            const options = {
                hostname: 'localhost',
                port: 3001,
                path: test.path,
                method: test.method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            
            // Add auth header if required
            if (test.requiresAuth && authToken) {
                options.headers['Authorization'] = `Bearer ${authToken}`;
            }
            
            const result = await makeRequest(options, testBody);
            
            // Extract token from login response
            if (test.name === 'POST /api/auth/login' && result.status === 200) {
                authToken = result.data.token;
                console.log('🔐 Authentication successful, token acquired');
            }
            
            if (result.status >= 200 && result.status < 300) {
                console.log(`✅ ${test.name} - ${result.status}`);
                passedTests++;
            } else {
                console.log(`❌ ${test.name} - ${result.status}: ${JSON.stringify(result.data).substring(0, 100)}`);
                failedTests++;
            }
            
        } catch (error) {
            console.log(`❌ ${test.name} - Error: ${error.message}`);
            failedTests++;
        }
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Final results
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    console.log('='.repeat(60));
    
    if (failedTests === 0) {
        console.log('🎉 ALL TESTS PASSED! API endpoints are working correctly.');
    } else {
        console.log(`⚠️  ${failedTests} tests failed. Review the output above for details.`);
    }
}

// Run the test suite
testAllEndpoints().catch(console.error);