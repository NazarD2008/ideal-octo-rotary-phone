#!/usr/bin/env node
/**
 * Complete verification test for APK download fix
 * Tests: Authentication → Authorization → APK Download
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const DOWNLOAD_PATH = './test-download.apk';

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  validateStatus: () => true, // Don't throw on any status
});

console.log('🧪 APK Download Fix Verification\n');
console.log('═'.repeat(80));

let testsPassed = 0;
let testsFailed = 0;

function logTest(status, message, details = '') {
  if (status === '✅') {
    testsPassed++;
    console.log(`${status} ${message}`);
  } else {
    testsFailed++;
    console.log(`${status} ${message}`);
  }
  if (details) console.log(`   ${details}`);
}

async function runTests() {
  try {
    // Test 1: Server connectivity
    console.log('\n📍 Test 1: Server Connectivity');
    console.log('-'.repeat(80));
    try {
      const health = await api.get('/api/auth/me');
      if (health.status === 401) {
        logTest('✅', 'Server is running and responding', `Status: ${health.status} (expected - no auth)`);
      } else {
        logTest('✅', 'Server is running', `Status: ${health.status}`);
      }
    } catch (err) {
      logTest('❌', 'Server is not responding', (err as any).message);
      return;
    }

    // Test 2: Authentication
    console.log('\n📍 Test 2: Authentication');
    console.log('-'.repeat(80));
    const loginRes = await api.post('/api/auth/login', {
      username: 'admin',
      password: 'password',
    });

    if (loginRes.status !== 200) {
      logTest('❌', `Login failed with status ${loginRes.status}`, JSON.stringify(loginRes.data, null, 2));
      return;
    }

    if (!loginRes.data?.data?.token) {
      logTest('❌', 'Login response missing token', JSON.stringify(loginRes.data, null, 2));
      return;
    }

    const token = loginRes.data.data.token;
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    logTest('✅', 'Login successful', `Token: ${token.substring(0, 20)}...`);

    // Test 3: User info verification
    console.log('\n📍 Test 3: User Authorization');
    console.log('-'.repeat(80));
    const meRes = await api.get('/api/auth/me');
    if (meRes.status === 200 && meRes.data?.data?.username) {
      logTest('✅', `User authenticated as: ${meRes.data.data.username}`, `Role: ${meRes.data.data.role}`);
      
      const hasBuilderAccess = meRes.data.data.permissions?.includes('builder:access');
      if (hasBuilderAccess) {
        logTest('✅', 'User has builder:access permission', '');
      } else {
        logTest('⚠️', 'User may not have builder:access permission', 'This might cause download to fail');
      }
    } else {
      logTest('❌', `Failed to get user info`, `Status: ${meRes.status}`);
      return;
    }

    // Test 4: Build records availability
    console.log('\n📍 Test 4: Build Records Check');
    console.log('-'.repeat(80));
    const logsRes = await api.get('/api/logs?limit=5');
    if (logsRes.status === 200) {
      logTest('✅', 'Database is accessible', '');
    } else {
      logTest('⚠️', 'Could not fetch logs', `Status: ${logsRes.status}`);
    }

    // Test 5: APK Download Endpoint
    console.log('\n📍 Test 5: APK Download Endpoint');
    console.log('-'.repeat(80));

    const downloadRes = await api.get('/api/builder/download', {
      responseType: 'arraybuffer',
      validateStatus: () => true,
    });

    console.log(`   Status Code: ${downloadRes.status}`);
    console.log(`   Content-Type: ${downloadRes.headers['content-type']}`);
    console.log(`   Content-Length: ${downloadRes.headers['content-length']}`);
    console.log(`   Content-Disposition: ${downloadRes.headers['content-disposition']}`);

    if (downloadRes.status === 404) {
      logTest('⚠️', 'No completed APK build found', 'Status: 404 - Need to run build first');
    } else if (downloadRes.status === 410) {
      logTest('⚠️', 'APK data is missing or incomplete', 'Status: 410 - Need to rebuild');
    } else if (downloadRes.status === 401) {
      logTest('❌', 'Authentication failed', 'Status: 401 - Token invalid or expired');
    } else if (downloadRes.status === 403) {
      logTest('❌', 'Authorization failed', 'Status: 403 - Insufficient permissions');
    } else if (downloadRes.status === 500) {
      logTest('❌', 'Server error', `Status: 500 - ${JSON.stringify(downloadRes.data)}`);
    } else if (downloadRes.status === 200) {
      // Test 6: Response headers validation
      console.log('\n📍 Test 6: Response Headers Validation');
      console.log('-'.repeat(80));

      // Check Content-Type
      const contentType = downloadRes.headers['content-type'];
      if (contentType?.includes('application/vnd.android.package-archive') || contentType?.includes('application/octet-stream')) {
        logTest('✅', 'Content-Type is correct', contentType);
      } else {
        logTest('⚠️', 'Unexpected Content-Type', contentType || 'not set');
      }

      // Check Content-Disposition
      const disposition = downloadRes.headers['content-disposition'];
      if (!disposition) {
        logTest('❌', 'Content-Disposition header is missing', '');
      } else if (disposition.includes('attachment')) {
        logTest('✅', 'Content-Disposition has attachment', disposition);
        
        // Check for filename
        if (disposition.includes('filename=') || disposition.includes('filename*=')) {
          logTest('✅', 'Filename is present', '');
        } else {
          logTest('⚠️', 'Filename not found in Content-Disposition', '');
        }

        // Check for UTF-8 encoding (RFC 5987)
        if (disposition.includes('filename*=UTF-8')) {
          logTest('✅', 'RFC 5987 UTF-8 encoding is used', 'filename*=UTF-8\'\'...');
        } else {
          logTest('⚠️', 'RFC 5987 encoding not found (might be OK for ASCII-only names)', '');
        }
      } else {
        logTest('❌', 'Content-Disposition is not for attachment', disposition);
      }

      // Test 7: File data validation
      console.log('\n📍 Test 7: File Data Validation');
      console.log('-'.repeat(80));

      const dataSize = downloadRes.data?.length || 0;
      if (dataSize === 0) {
        logTest('❌', 'APK data is empty', 'Downloaded file size: 0 bytes');
      } else if (dataSize < 1024 * 1024) {
        logTest('⚠️', 'APK file seems too small', `Size: ${(dataSize / 1024).toFixed(2)} KB`);
      } else {
        logTest('✅', 'APK data received', `Size: ${(dataSize / 1024 / 1024).toFixed(2)} MB`);

        // Check APK magic number (PK signature)
        const magic = downloadRes.data?.slice(0, 2);
        if (magic?.[0] === 0x50 && magic?.[1] === 0x4b) {
          logTest('✅', 'APK file has correct magic number', 'Starts with PK (ZIP format)');
        } else {
          logTest('⚠️', 'APK magic number check failed', `Got: 0x${magic?.[0]?.toString(16)} 0x${magic?.[1]?.toString(16)}`);
        }

        // Save for manual inspection
        fs.writeFileSync(DOWNLOAD_PATH, downloadRes.data);
        logTest('✅', 'APK saved to disk', DOWNLOAD_PATH);
      }
    } else {
      logTest('❌', `Unexpected status code: ${downloadRes.status}`, JSON.stringify(downloadRes.data));
    }

  } catch (err) {
    logTest('❌', 'Test failed with exception', (err as any).message);
  }
}

await runTests();

// Summary
console.log('\n' + '═'.repeat(80));
console.log(`\n📊 Test Summary: ${testsPassed} passed, ${testsFailed} failed\n`);

if (testsFailed === 0) {
  console.log('🎉 All tests passed! The APK download fix is working correctly.\n');
  process.exit(0);
} else if (testsFailed <= 2) {
  console.log('⚠️  Some tests failed, but the core fix may be working.\n');
  console.log('💡 Common issues:');
  console.log('  • No completed build: Run POST /api/builder/build first');
  console.log('  • 401 Unauthorized: Token expired, re-login');
  console.log('  • 403 Forbidden: User missing builder:access permission\n');
  process.exit(1);
} else {
  console.log('❌ Multiple tests failed. Please check the issues above.\n');
  process.exit(1);
}
