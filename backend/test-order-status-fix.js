#!/usr/bin/env node

// Test Order Status Fix - Verify the dashboard logic works correctly
// This test simulates the dashboard getSampleData function

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

// Simulate the dashboard getSampleData function for status endpoint
function getDashboardStatusData() {
    const validStatuses = ['ACTIVE', 'PAUSED', 'CANCELLED'];
    const randomStatus = validStatuses[Math.floor(Math.random() * validStatuses.length)];
    
    console.log(`🎲 Dashboard would select status: ${randomStatus}`);
    
    return {
        status: randomStatus
    };
}

async function testOrderStatusFix() {
    console.log('🧪 TESTING ORDER STATUS FIX');
    console.log('=' .repeat(50));
    
    let authToken = '';
    let testOrderId = '';
    
    // Step 1: Login
    try {
        const loginRes = await makeRequest({
            hostname: 'localhost', port: 3001, path: '/api/auth/login', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            email: 'dashboard.test@example.com',
            password: 'Test123#$'
        });
        
        if (loginRes.status === 200) {
            authToken = loginRes.data.token;
            console.log('✅ Authentication successful');
        } else {
            console.log('❌ Authentication failed');
            return;
        }
    } catch (error) {
        console.log('❌ Authentication error:', error);
        return;
    }
    
    const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
    };
    
    // Step 2: Create a test client and order for status testing
    try {
        // Create client
        const clientRes = await makeRequest({
            hostname: 'localhost', port: 3001, path: '/api/clients', method: 'POST',
            headers: authHeaders
        }, {
            name: 'Status Test Client',
            email: `status-test${Date.now()}@test.com`,
            company: 'Status Corp',
            phone: '+1234567890',
            address: '123 Status St'
        });
        
        if (clientRes.status === 201) {
            const clientId = clientRes.data.data.client.id;
            console.log('✅ Test client created');
            
            // Create order
            const orderRes = await makeRequest({
                hostname: 'localhost', port: 3001, path: '/api/orders', method: 'POST',
                headers: authHeaders
            }, {
                clientId: clientId,
                description: 'Status Test Order',
                amount: 100,
                frequency: 'MONTHLY',
                startDate: new Date().toISOString()
            });
            
            if (orderRes.status === 201) {
                testOrderId = orderRes.data.data.order.id;
                console.log('✅ Test order created:', testOrderId);
            } else {
                console.log('❌ Order creation failed');
                return;
            }
        } else {
            console.log('❌ Client creation failed');
            return;
        }
    } catch (error) {
        console.log('❌ Setup error:', error);
        return;
    }
    
    // Step 3: Test order status update 5 times with different statuses
    console.log('\n🎯 Testing order status updates:');
    
    let successCount = 0;
    let totalTests = 5;
    
    for (let i = 1; i <= totalTests; i++) {
        const statusData = getDashboardStatusData();
        
        try {
            const statusRes = await makeRequest({
                hostname: 'localhost', port: 3001, 
                path: `/api/orders/${testOrderId}/status`, 
                method: 'POST',
                headers: authHeaders
            }, statusData);
            
            if (statusRes.status === 200) {
                successCount++;
                console.log(`✅ Test ${i}: Status '${statusData.status}' accepted - ${statusRes.status}`);
            } else {
                console.log(`❌ Test ${i}: Status '${statusData.status}' rejected - ${statusRes.status}`);
                console.log(`   Error:`, statusRes.data);
            }
        } catch (error) {
            console.log(`❌ Test ${i}: Request error:`, error);
        }
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Results
    console.log('\n' + '='.repeat(50));
    console.log('📊 ORDER STATUS FIX TEST RESULTS');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${successCount}`);
    console.log(`❌ Failed: ${totalTests - successCount}`);
    console.log(`📈 Success Rate: ${((successCount / totalTests) * 100).toFixed(1)}%`);
    console.log('='.repeat(50));
    
    if (successCount === totalTests) {
        console.log('🎉 PERFECT: Order status fix is working correctly!');
    } else if (successCount >= totalTests * 0.8) {
        console.log('✅ GOOD: Most status updates are working');
    } else {
        console.log('⚠️ ISSUES: Status validation still has problems');
    }
}

// Run the test
testOrderStatusFix().catch(console.error);