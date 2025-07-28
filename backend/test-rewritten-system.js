#!/usr/bin/env node

// Comprehensive Test of Rewritten API Testing System
// Tests the new dynamic entity management and validation

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

async function testRewrittenSystem() {
    console.log('🚀 Testing Rewritten API Dashboard System');
    console.log('=' .repeat(60));
    
    const baseUrl = 'http://localhost:3001';
    let authToken = '';
    let testEntities = {
        users: new Map(),
        clients: new Map(),
        orders: new Map(),
        invoices: new Map(),
        payments: new Map(),
        services: new Map(),
        companies: new Map()
    };
    
    // Phase 1: Authentication
    console.log('🔐 Phase 1: Authentication...');
    try {
        const loginResponse = await makeRequest({
            hostname: 'localhost',
            port: 3001,
            path: '/api/auth/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            email: 'dashboard.test@example.com',
            password: 'Test123#$'
        });
        
        if (loginResponse.status === 200) {
            authToken = loginResponse.data.token;
            console.log('✅ Authentication successful');
        } else {
            throw new Error('Authentication failed');
        }
    } catch (error) {
        console.error('❌ Authentication failed:', error.message);
        return;
    }
    
    // Phase 2: Entity Creation
    console.log('\n🏗️ Phase 2: Creating Test Entity Ecosystem...');
    
    // Create test user
    try {
        const userResponse = await makeRequest({
            hostname: 'localhost',
            port: 3001,
            path: '/api/auth/register',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            email: `testuser${Date.now()}@example.com`,
            password: 'Test123#$',
            name: `Test User ${Date.now()}`
        });
        
        if (userResponse.status === 201) {
            const userId = userResponse.data.user.id;
            testEntities.users.set('primary', userId);
            console.log('✅ Created test user:', userId);
        }
    } catch (error) {
        console.warn('⚠️ User creation failed:', error.message);
    }
    
    // Create test client
    try {
        const clientResponse = await makeRequest({
            hostname: 'localhost',
            port: 3001,
            path: '/api/clients',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            }
        }, {
            name: `Test Client ${Date.now()}`,
            email: `client${Date.now()}@test.com`,
            company: 'Test Corp',
            phone: '+1234567890',
            address: '123 Test Street'
        });
        
        if (clientResponse.status === 201) {
            const clientId = clientResponse.data.data.client.id;
            testEntities.clients.set('primary', clientId);
            console.log('✅ Created test client:', clientId);
        }
    } catch (error) {
        console.warn('⚠️ Client creation failed:', error.message);
    }
    
    // Create test company
    try {
        const companyResponse = await makeRequest({
            hostname: 'localhost',
            port: 3001,
            path: '/api/companies',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            }
        }, {
            name: `Test Company ${Date.now()}`,
            email: `company${Date.now()}@test.com`,
            address: '123 Company St',
            phone: '+1234567890'
        });
        
        if (companyResponse.status === 201) {
            const companyId = companyResponse.data.data.company.id;
            testEntities.companies.set('primary', companyId);
            console.log('✅ Created test company:', companyId);
        }
    } catch (error) {
        console.warn('⚠️ Company creation failed:', error.message);
    }
    
    // Create test service
    try {
        const serviceResponse = await makeRequest({
            hostname: 'localhost',
            port: 3001,
            path: '/api/services',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            }
        }, {
            name: `Test Service ${Date.now()}`,
            description: 'Test service description',
            category: 'CONTENT_MARKETING',
            defaultPrice: 500
        });
        
        if (serviceResponse.status === 201) {
            const serviceId = serviceResponse.data.data.service.id;
            testEntities.services.set('primary', serviceId);
            console.log('✅ Created test service:', serviceId);
        }
    } catch (error) {
        console.warn('⚠️ Service creation failed:', error.message);
    }
    
    // Create test order
    const clientId = testEntities.clients.get('primary');
    if (clientId) {
        try {
            const orderResponse = await makeRequest({
                hostname: 'localhost',
                port: 3001,
                path: '/api/orders',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                }
            }, {
                clientId: clientId,
                description: `Test order ${Date.now()}`,
                amount: 1000,
                frequency: 'MONTHLY',
                startDate: new Date().toISOString()
            });
            
            if (orderResponse.status === 201) {
                const orderId = orderResponse.data.data.order.id;
                testEntities.orders.set('primary', orderId);
                console.log('✅ Created test order:', orderId);
            }
        } catch (error) {
            console.warn('⚠️ Order creation failed:', error.message);
        }
    }
    
    // Create test invoice
    const companyId = testEntities.companies.get('primary');
    if (clientId && companyId) {
        try {
            const invoiceResponse = await makeRequest({
                hostname: 'localhost',
                port: 3001,
                path: '/api/invoices',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                }
            }, {
                clientId: clientId,
                companyId: companyId,
                amount: 100.00,
                currency: 'USD',
                issueDate: new Date().toISOString(),
                dueDate: '2025-08-15'
            });
            
            if (invoiceResponse.status === 201) {
                const invoiceId = invoiceResponse.data.data.invoice.id;
                testEntities.invoices.set('primary', invoiceId);
                console.log('✅ Created test invoice:', invoiceId);
            }
        } catch (error) {
            console.warn('⚠️ Invoice creation failed:', error.message);
        }
    }
    
    // Create test payment
    const invoiceId = testEntities.invoices.get('primary');
    if (invoiceId) {
        try {
            const paymentResponse = await makeRequest({
                hostname: 'localhost',
                port: 3001,
                path: '/api/payments',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                }
            }, {
                invoiceId: invoiceId,
                amount: 25.00,
                method: 'BANK_TRANSFER',
                paidDate: new Date().toISOString()
            });
            
            if (paymentResponse.status === 201) {
                const paymentId = paymentResponse.data.data.payment.id;
                testEntities.payments.set('primary', paymentId);
                console.log('✅ Created test payment:', paymentId);
            }
        } catch (error) {
            console.warn('⚠️ Payment creation failed:', error.message);
        }
    }
    
    console.log('\n📊 Entity Creation Summary:');
    console.log(`- Users: ${testEntities.users.size}`);
    console.log(`- Clients: ${testEntities.clients.size}`);
    console.log(`- Companies: ${testEntities.companies.size}`);
    console.log(`- Services: ${testEntities.services.size}`);
    console.log(`- Orders: ${testEntities.orders.size}`);
    console.log(`- Invoices: ${testEntities.invoices.size}`);
    console.log(`- Payments: ${testEntities.payments.size}`);
    
    // Phase 3: Test Key Endpoints with Dynamic IDs
    console.log('\n🧪 Phase 3: Testing Endpoints with Dynamic IDs...');
    
    const testCases = [
        // Previously failing endpoints
        {
            name: 'GET /api/users/:id',
            method: 'GET',
            path: `/api/users/${testEntities.users.get('primary')}`,
            expectedStatus: 200
        },
        {
            name: 'GET /api/clients/:id',
            method: 'GET', 
            path: `/api/clients/${testEntities.clients.get('primary')}`,
            expectedStatus: 200
        },
        {
            name: 'GET /api/orders/:id',
            method: 'GET',
            path: `/api/orders/${testEntities.orders.get('primary')}`,
            expectedStatus: 200
        },
        {
            name: 'GET /api/invoices/:id',
            method: 'GET',
            path: `/api/invoices/${testEntities.invoices.get('primary')}`,
            expectedStatus: 200
        },
        {
            name: 'GET /api/payments/:id',
            method: 'GET',
            path: `/api/payments/${testEntities.payments.get('primary')}`,
            expectedStatus: 200
        },
        {
            name: 'POST /api/orders/:id/status',
            method: 'POST',
            path: `/api/orders/${testEntities.orders.get('primary')}/status`,
            body: { status: 'PAUSED' },
            expectedStatus: 200
        }
    ];
    
    let passedTests = 0;
    let totalTests = testCases.length;
    
    for (const testCase of testCases) {
        try {
            const options = {
                hostname: 'localhost',
                port: 3001,
                path: testCase.path,
                method: testCase.method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                }
            };
            
            const result = await makeRequest(options, testCase.body);
            
            if (result.status === testCase.expectedStatus) {
                console.log(`✅ ${testCase.name} - ${result.status}`);
                passedTests++;
            } else {
                console.log(`❌ ${testCase.name} - ${result.status} (expected ${testCase.expectedStatus})`);
            }
        } catch (error) {
            console.log(`❌ ${testCase.name} - Error: ${error.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Final Results
    console.log('\n' + '='.repeat(60));
    console.log('📊 REWRITTEN SYSTEM TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${totalTests - passedTests}`);
    console.log(`📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    console.log('='.repeat(60));
    
    if (passedTests === totalTests) {
        console.log('🎉 ALL CRITICAL TESTS PASSED! Dynamic ID system working correctly.');
    } else {
        console.log(`⚠️ ${totalTests - passedTests} tests still failing. Need further investigation.`);
    }
    
    console.log('\n🔗 Dashboard URL: http://localhost:4000');
    console.log('👆 Use the dashboard to run the full 46-endpoint test suite!');
}

// Run the test
testRewrittenSystem().catch(console.error);