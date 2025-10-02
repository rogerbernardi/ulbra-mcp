#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Demo function to show MCP capabilities
 */
async function runDemo() {
    console.log('🚀 ULBRA Supply MCP Server Demo\n');
    console.log('This demo shows how to use the MCP server for product search.\n');

    const demos = [
        {
            name: 'Search for medical syringes',
            tool: 'products.vectorSearch',
            args: { query: 'seringa médica', limit: 3 }
        },
        {
            name: 'Search for computer equipment',
            tool: 'products.vectorSearch', 
            args: { query: 'equipamento informática', limit: 3 }
        },
        {
            name: 'Search for cleaning products',
            tool: 'products.search',
            args: { query: 'limpeza', limit: 3 }
        }
    ];

    for (const demo of demos) {
        console.log(`\n📋 ${demo.name}`);
        console.log('─'.repeat(50));
        
        const request = {
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/call',
            params: {
                name: demo.tool,
                arguments: demo.args
            }
        };

        try {
            const result = await callMCP(request);
            const data = JSON.parse(result.result.content[0].text);
            
            console.log(`Query: "${data.query}"`);
            console.log(`Found: ${data.totalFound} products`);
            
            if (data.products.length > 0) {
                console.log('\nProducts:');
                data.products.forEach((product, index) => {
                    console.log(`  ${index + 1}. ${product.name}`);
                    console.log(`     Code: ${product.code} | Unit: ${product.unit} | Price: R$ ${product.estimatedPrice}`);
                    if (product.similarity) {
                        console.log(`     Similarity: ${(product.similarity * 100).toFixed(1)}%`);
                    }
                });
            } else {
                console.log('  No products found');
            }
            
            if (data.cacheInfo) {
                console.log(`\nCache: ${data.cacheInfo.wasCached ? 'Hit' : 'Miss'} (${data.cacheInfo.cacheSize} entries)`);
            }
            
        } catch (error) {
            console.error(`❌ Demo failed: ${error.message}`);
        }
    }

    console.log('\n✅ Demo completed!');
    console.log('\nTo use this MCP server with an AI agent:');
    console.log('1. Add the server to your MCP client configuration');
    console.log('2. Use the tools: products.search and products.vectorSearch');
    console.log('3. The server will handle authentication and caching automatically');
}

/**
 * Call MCP server
 */
function callMCP(request) {
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
                    resolve(response);
                } catch (error) {
                    reject(new Error(`Failed to parse response: ${error.message}`));
                }
            } else {
                reject(new Error(`Process exited with code ${code}`));
            }
        });

        child.stdin.write(JSON.stringify(request) + '\n');
        child.stdin.end();
    });
}

// Run demo
runDemo().catch(console.error);


