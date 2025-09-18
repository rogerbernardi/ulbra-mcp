#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Test MCP server with a given request
 */
function testMCPRequest(request) {
    return new Promise((resolve, reject) => {
        const child = spawn('node', [join(__dirname, 'index.js')], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        child.on('close', (code) => {
            if (code === 0) {
                try {
                    const response = JSON.parse(stdout);
                    resolve({ response, stderr });
                } catch (error) {
                    reject(new Error(`Failed to parse response: ${error.message}\nOutput: ${stdout}`));
                }
            } else {
                reject(new Error(`Process exited with code ${code}\nStderr: ${stderr}`));
            }
        });

        // Send the request
        child.stdin.write(JSON.stringify(request) + '\n');
        child.stdin.end();
    });
}

/**
 * Test products.search
 */
async function testProductSearch() {
    console.log('🔍 Testing products.search...');
    
    const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
            name: 'products.search',
            arguments: {
                query: 'seringa 5ml',
                limit: 5
            }
        }
    };

    try {
        const { response, stderr } = await testMCPRequest(request);
        console.log('✅ products.search response:');
        console.log(JSON.stringify(response, null, 2));
        
        if (stderr) {
            console.log('📝 Server logs:');
            console.log(stderr);
        }
    } catch (error) {
        console.error('❌ products.search failed:', error.message);
    }
}

/**
 * Test products.vectorSearch
 */
async function testVectorSearch() {
    console.log('\n🧠 Testing products.vectorSearch...');
    
    const request = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
            name: 'products.vectorSearch',
            arguments: {
                query: 'seringa 5ml',
                limit: 5,
                threshold: 0.7
            }
        }
    };

    try {
        const { response, stderr } = await testMCPRequest(request);
        console.log('✅ products.vectorSearch response:');
        console.log(JSON.stringify(response, null, 2));
        
        if (stderr) {
            console.log('📝 Server logs:');
            console.log(stderr);
        }
    } catch (error) {
        console.error('❌ products.vectorSearch failed:', error.message);
    }
}

/**
 * Test list tools
 */
async function testListTools() {
    console.log('\n📋 Testing tools/list...');
    
    const request = {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/list',
        params: {}
    };

    try {
        const { response, stderr } = await testMCPRequest(request);
        console.log('✅ tools/list response:');
        console.log(JSON.stringify(response, null, 2));
        
        if (stderr) {
            console.log('📝 Server logs:');
            console.log(stderr);
        }
    } catch (error) {
        console.error('❌ tools/list failed:', error.message);
    }
}

/**
 * Main test function
 */
async function main() {
    console.log('🚀 Starting ULBRA Supply MCP Server Tests\n');
    
    try {
        await testListTools();
        await testProductSearch();
        await testVectorSearch();
        
        console.log('\n✅ All tests completed!');
    } catch (error) {
        console.error('\n❌ Test suite failed:', error.message);
        process.exit(1);
    }
}

// Run tests
main();
