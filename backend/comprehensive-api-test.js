#!/usr/bin/env node

// Comprehensive API Test - Tests all 46 endpoints systematically
// Simulates the full dashboard test suite with proper entity management

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

async function comprehensiveAPITest() {
    console.log('🚀 COMPREHENSIVE API TEST - REWRITTEN SYSTEM');
    console.log('=' .repeat(70));
    
    let authToken = '';
    let testEntities = {};
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
    
    // Phase 1: Authentication (5 endpoints)
    console.log('\n🔐 Authentication Endpoints (5 tests)');
    
    // Register new user
    try {
        const registerRes = await makeRequest({
            hostname: 'localhost', port: 3001, path: '/api/auth/register', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            email: `test${Date.now()}@example.com`,
            password: 'Test123#$', 
            name: 'Test User'
        });
        logTest('POST /api/auth/register', 'auth', registerRes.status, 201);
    } catch (error) {
        logTest('POST /api/auth/register', 'error', 500);
    }
    
    // Login
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
        console.log('❌ Cannot proceed without authentication token');
        return;
    }
    
    const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
    };
    
    // Other auth endpoints
    try {
        const logoutRes = await makeRequest({
            hostname: 'localhost', port: 3001, path: '/api/auth/logout', method: 'POST',
            headers: authHeaders
        });
        logTest('POST /api/auth/logout', 'auth', logoutRes.status, 200);
    } catch (error) {
        logTest('POST /api/auth/logout', 'error', 500);
    }
    
    try {
        const meRes = await makeRequest({
            hostname: 'localhost', port: 3001, path: '/api/auth/me', method: 'GET',
            headers: authHeaders
        });
        logTest('GET /api/auth/me', 'auth', meRes.status, 200);
    } catch (error) {
        logTest('GET /api/auth/me', 'error', 500);
    }
    
    try {
        const refreshRes = await makeRequest({
            hostname: 'localhost', port: 3001, path: '/api/auth/refresh', method: 'POST',
            headers: authHeaders
        });
        logTest('POST /api/auth/refresh', 'auth', refreshRes.status, 200);
    } catch (error) {
        logTest('POST /api/auth/refresh', 'error', 500);
    }
    
    // Phase 2: Entity Creation & Management
    console.log('\n🏗️ Entity Creation Phase');
    
    // Create Client
    try {
        const clientRes = await makeRequest({
            hostname: 'localhost', port: 3001, path: '/api/clients', method: 'POST',
            headers: authHeaders
        }, {
            name: `Test Client ${Date.now()}`,
            email: `client${Date.now()}@test.com`,
            company: 'Test Corp',
            phone: '+1234567890',
            address: '123 Test Street'
        });
        
        if (logTest('POST /api/clients', 'entity', clientRes.status, 201)) {
            testEntities.clientId = clientRes.data.data.client.id;
        }
    } catch (error) {
        logTest('POST /api/clients', 'error', 500);
    }
    
    // Create Company
    try {
        const companyRes = await makeRequest({
            hostname: 'localhost', port: 3001, path: '/api/companies', method: 'POST',
            headers: authHeaders
        }, {
            name: `Test Company ${Date.now()}`,
            email: `company${Date.now()}@test.com`,
            address: '123 Company St',
            phone: '+1234567890'
        });
        
        if (logTest('POST /api/companies', 'entity', companyRes.status, 201)) {
            testEntities.companyId = companyRes.data.data.company.id;
        }
    } catch (error) {
        logTest('POST /api/companies', 'error', 500);
    }
    
    // Create Service
    try {
        const serviceRes = await makeRequest({
            hostname: 'localhost', port: 3001, path: '/api/services', method: 'POST',
            headers: authHeaders
        }, {
            name: `Test Service ${Date.now()}`,
            description: 'Test service description',
            category: 'CONTENT_MARKETING',
            defaultPrice: 500
        });
        
        if (logTest('POST /api/services', 'entity', serviceRes.status, 201)) {
            testEntities.serviceId = serviceRes.data.data.service.id;
        }
    } catch (error) {
        logTest('POST /api/services', 'error', 500);
    }
    
    // Create Order
    if (testEntities.clientId) {
        try {
            const orderRes = await makeRequest({
                hostname: 'localhost', port: 3001, path: '/api/orders', method: 'POST',
                headers: authHeaders
            }, {
                clientId: testEntities.clientId,
                description: `Test order ${Date.now()}`,
                amount: 1000,
                frequency: 'MONTHLY',
                startDate: new Date().toISOString()
            });
            
            if (logTest('POST /api/orders', 'entity', orderRes.status, 201)) {
                testEntities.orderId = orderRes.data.data.order.id;
            }
        } catch (error) {
            logTest('POST /api/orders', 'error', 500);
        }
    }
    
    // Create Invoice
    if (testEntities.clientId && testEntities.companyId) {
        try {
            const invoiceRes = await makeRequest({
                hostname: 'localhost', port: 3001, path: '/api/invoices', method: 'POST',
                headers: authHeaders
            }, {
                clientId: testEntities.clientId,
                companyId: testEntities.companyId,
                amount: 100.00,
                currency: 'USD',
                issueDate: new Date().toISOString(),
                dueDate: '2025-08-15'
            });
            
            if (logTest('POST /api/invoices', 'entity', invoiceRes.status, 201)) {
                testEntities.invoiceId = invoiceRes.data.data.invoice.id;
            }
        } catch (error) {
            logTest('POST /api/invoices', 'error', 500);
        }
    }
    
    // Create Payment
    if (testEntities.invoiceId) {
        try {
            const paymentRes = await makeRequest({
                hostname: 'localhost', port: 3001, path: '/api/payments', method: 'POST',
                headers: authHeaders
            }, {
                invoiceId: testEntities.invoiceId,
                amount: 25.00,
                method: 'BANK_TRANSFER',
                paidDate: new Date().toISOString()
            });
            
            if (logTest('POST /api/payments', 'entity', paymentRes.status, 201)) {
                testEntities.paymentId = paymentRes.data.data.payment.id;
            }
        } catch (error) {
            logTest('POST /api/payments', 'error', 500);
        }
    }
    
    console.log('\\n📊 Created Entities:', testEntities);
    
    // Phase 3: GET Endpoints (Lists)
    console.log('\\n📋 List Endpoints');
    
    const listEndpoints = [
        { name: 'GET /api/users', path: '/api/users' },
        { name: 'GET /api/clients', path: '/api/clients' },
        { name: 'GET /api/orders', path: '/api/orders' },
        { name: 'GET /api/invoices', path: '/api/invoices' },
        { name: 'GET /api/payments', path: '/api/payments' },
        { name: 'GET /api/services', path: '/api/services' },
        { name: 'GET /api/companies', path: '/api/companies' },
        { name: 'GET /api/reports/overview', path: '/api/reports/overview' },
        { name: 'GET /api/reports/revenue', path: '/api/reports/revenue' },
        { name: 'GET /api/reports/clients', path: '/api/reports/clients' },
        { name: 'GET /health', path: '/health' }
    ];
    
    for (const endpoint of listEndpoints) {
        try {
            const res = await makeRequest({
                hostname: 'localhost', port: 3001, path: endpoint.path, method: 'GET',
                headers: endpoint.path === '/health' ? {} : authHeaders
            });
            logTest(endpoint.name, 'list', res.status, 200);
        } catch (error) {
            logTest(endpoint.name, 'error', 500);
        }
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Phase 4: GET Endpoints (By ID) - Using Dynamic IDs
    console.log('\\n🎯 Individual Entity Endpoints (Dynamic IDs)');
    
    const idEndpoints = [
        { name: 'GET /api/clients/:id', path: `/api/clients/${testEntities.clientId}` },
        { name: 'GET /api/orders/:id', path: `/api/orders/${testEntities.orderId}` },
        { name: 'GET /api/invoices/:id', path: `/api/invoices/${testEntities.invoiceId}` },
        { name: 'GET /api/payments/:id', path: `/api/payments/${testEntities.paymentId}` },
        { name: 'GET /api/services/:id', path: `/api/services/${testEntities.serviceId}` },
        { name: 'GET /api/companies/:id', path: `/api/companies/${testEntities.companyId}` }
    ];
    
    for (const endpoint of idEndpoints) {
        if (endpoint.path.includes('undefined')) {
            logTest(endpoint.name, 'skipped', 404, 'Entity not created');
            continue;
        }
        
        try {
            const res = await makeRequest({
                hostname: 'localhost', port: 3001, path: endpoint.path, method: 'GET',
                headers: authHeaders
            });
            logTest(endpoint.name, 'individual', res.status, 200);
        } catch (error) {
            logTest(endpoint.name, 'error', 500);
        }
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Phase 5: Special Endpoints
    console.log('\\n🔧 Special Operation Endpoints');
    
    // Order status update
    if (testEntities.orderId) {
        try {
            const statusRes = await makeRequest({
                hostname: 'localhost', port: 3001, path: `/api/orders/${testEntities.orderId}/status`,
                method: 'POST', headers: authHeaders
            }, { status: 'PAUSED' });
            logTest('POST /api/orders/:id/status', 'operation', statusRes.status, 200);
        } catch (error) {
            logTest('POST /api/orders/:id/status', 'error', 500);
        }
    }
    
    // Invoice send
    if (testEntities.invoiceId) {
        try {
            const sendRes = await makeRequest({
                hostname: 'localhost', port: 3001, path: `/api/invoices/${testEntities.invoiceId}/send`,
                method: 'POST', headers: authHeaders
            });
            logTest('POST /api/invoices/:id/send', 'operation', sendRes.status);
        } catch (error) {
            logTest('POST /api/invoices/:id/send', 'error', 500);
        }
    }
    
    // Invoice PDF
    if (testEntities.invoiceId) {
        try {
            const pdfRes = await makeRequest({
                hostname: 'localhost', port: 3001, path: `/api/invoices/${testEntities.invoiceId}/pdf`,
                method: 'GET', headers: authHeaders
            });
            logTest('GET /api/invoices/:id/pdf', 'operation', pdfRes.status);
        } catch (error) {
            logTest('GET /api/invoices/:id/pdf', 'error', 500);
        }
    }
    
    // Final Results
    console.log('\\n' + '='.repeat(70));
    console.log('📊 COMPREHENSIVE API TEST RESULTS');
    console.log('='.repeat(70));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${totalTests - passedTests}`);
    console.log(`📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    console.log('='.repeat(70));
    
    const successRate = (passedTests / totalTests) * 100;
    if (successRate >= 90) {
        console.log('🎉 EXCELLENT: 90%+ success rate achieved!');
    } else if (successRate >= 80) {
        console.log('✅ GOOD: 80%+ success rate achieved!');
    } else {
        console.log('⚠️ NEEDS IMPROVEMENT: Below 80% success rate');
    }
    
    console.log('\\n🔍 Failed Tests Analysis:');
    const failedTests = testResults.filter(t => t.status === 'failure');
    failedTests.forEach(test => {
        console.log(`- ${test.name}: ${test.statusCode}`);
    });
}

// Run the comprehensive test
comprehensiveAPITest().catch(console.error);