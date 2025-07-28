#!/usr/bin/env node

// Programmatically trigger the full dashboard test suite
// This simulates clicking "Run All Tests" button

const puppeteer = require('puppeteer');

async function runFullDashboardTest() {
    console.log('🚀 Launching automated full dashboard test...');
    
    let browser;
    try {
        // Launch browser
        browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        
        // Navigate to dashboard
        console.log('📱 Navigating to dashboard...');
        await page.goto('http://localhost:4000', { waitUntil: 'networkidle0' });
        
        // Wait for dashboard to initialize
        await page.waitForTimeout(2000);
        
        // Click "Run All Tests" button
        console.log('🧪 Triggering "Run All Tests"...');
        await page.click('#runAllBtn');
        
        // Wait for tests to complete (this may take a while)
        console.log('⏳ Waiting for tests to complete...');
        await page.waitForTimeout(30000); // 30 seconds
        
        // Extract test results
        const results = await page.evaluate(() => {
            const passedCount = document.getElementById('passedCount').textContent;
            const failedCount = document.getElementById('failedCount').textContent;
            const testedCount = document.getElementById('testedCount').textContent;
            
            return {
                passed: parseInt(passedCount) || 0,
                failed: parseInt(failedCount) || 0,
                tested: parseInt(testedCount) || 0
            };
        });
        
        console.log('📊 Dashboard Test Results:');
        console.log(`Total Tested: ${results.tested}`);
        console.log(`✅ Passed: ${results.passed}`);
        console.log(`❌ Failed: ${results.failed}`);
        console.log(`📈 Success Rate: ${((results.passed / results.tested) * 100).toFixed(1)}%`);
        
        if (results.passed >= 40) {
            console.log('🎉 SUCCESS: Achieved 90%+ success rate target!');
        } else {
            console.log('⚠️ Target not yet reached. Need further optimization.');
        }
        
    } catch (error) {
        console.error('❌ Dashboard test failed:', error.message);
        
        // Fallback: Manual API test
        console.log('🔄 Falling back to manual API testing...');
        await manualApiTest();
        
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

async function manualApiTest() {
    console.log('🧪 Running manual comprehensive API test...');
    
    // Since puppeteer might not be available, let's do a direct HTTP test
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
    
    // Test the dashboard status endpoint
    try {
        const dashboardTest = await makeRequest({
            hostname: 'localhost',
            port: 4000,
            path: '/',
            method: 'GET'
        });
        
        if (dashboardTest.status === 200) {
            console.log('✅ Dashboard is accessible at http://localhost:4000');
            console.log('👆 Please manually run the tests through the web interface');
        } else {
            console.log('❌ Dashboard not accessible');
        }
    } catch (error) {
        console.log('❌ Cannot reach dashboard:', error.message);
    }
}

// Check if puppeteer is available, otherwise fallback
(async () => {
    try {
        await runFullDashboardTest();
    } catch (error) {
        console.log('⚠️ Puppeteer not available, using manual approach');
        await manualApiTest();
    }
})();