#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Validate MCP response format
 */
function validateResponse(response) {
    const errors = [];
    
    try {
        const result = JSON.parse(response.result.content[0].text);
        
        // Check required fields
        if (!result.success) {
            errors.push('Missing or invalid "success" field');
        }
        
        if (typeof result.query !== 'string') {
            errors.push('Missing or invalid "query" field');
        }
        
        if (typeof result.totalFound !== 'number') {
            errors.push('Missing or invalid "totalFound" field');
        }
        
        if (!Array.isArray(result.products)) {
            errors.push('Missing or invalid "products" array');
        }
        
        // Validate each product
        result.products.forEach((product, index) => {
            const productErrors = [];
            
            if (typeof product.code !== 'number') {
                productErrors.push('Missing or invalid "code" field');
            }
            
            if (typeof product.name !== 'string') {
                productErrors.push('Missing or invalid "name" field');
            }
            
            if (typeof product.unit !== 'string') {
                productErrors.push('Missing or invalid "unit" field');
            }
            
            if (typeof product.estimatedPrice !== 'number') {
                productErrors.push('Missing or invalid "estimatedPrice" field');
            }
            
            if (productErrors.length > 0) {
                errors.push(`Product ${index}: ${productErrors.join(', ')}`);
            }
        });
        
        return {
            valid: errors.length === 0,
            errors,
            data: result
        };
    } catch (error) {
        return {
            valid: false,
            errors: [`JSON parse error: ${error.message}`],
            data: null
        };
    }
}

/**
 * Test MCP server with validation
 */
async function testWithValidation(toolName, args) {
    console.log(`\n🧪 Testing ${toolName} with validation...`);
    
    const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
            name: toolName,
            arguments: args
        }
    };

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
                    const validation = validateResponse(response);
                    
                    console.log(`✅ ${toolName} response received`);
                    console.log(`📊 Total products found: ${validation.data?.totalFound || 0}`);
                    
                    if (validation.valid) {
                        console.log('✅ Response format is valid');
                        
                        // Show sample products
                        if (validation.data?.products?.length > 0) {
                            console.log('📦 Sample products:');
                            validation.data.products.slice(0, 3).forEach((product, index) => {
                                console.log(`  ${index + 1}. ${product.name} (Code: ${product.code})`);
                                console.log(`     Unit: ${product.unit}, Price: R$ ${product.estimatedPrice}`);
                                if (product.similarity) {
                                    console.log(`     Similarity: ${(product.similarity * 100).toFixed(1)}%`);
                                }
                            });
                        }
                    } else {
                        console.log('❌ Response format validation failed:');
                        validation.errors.forEach(error => {
                            console.log(`  - ${error}`);
                        });
                    }
                    
                    resolve({ validation, response, stderr });
                } catch (error) {
                    reject(new Error(`Failed to parse response: ${error.message}\nOutput: ${stdout}`));
                }
            } else {
                reject(new Error(`Process exited with code ${code}\nStderr: ${stderr}`));
            }
        });

        child.stdin.write(JSON.stringify(request) + '\n');
        child.stdin.end();
    });
}

/**
 * Main validation function
 */
async function main() {
    console.log('🔍 ULBRA Supply MCP Response Validation\n');
    
    try {
        // Test products.search
        await testWithValidation('products.search', {
            query: 'seringa 5ml',
            limit: 5
        });
        
        // Test products.vectorSearch
        await testWithValidation('products.vectorSearch', {
            query: 'seringa 5ml',
            limit: 5,
            threshold: 0.7
        });
        
        // Test with different query
        await testWithValidation('products.vectorSearch', {
            query: 'computador notebook',
            limit: 3
        });
        
        console.log('\n✅ All validations completed!');
    } catch (error) {
        console.error('\n❌ Validation failed:', error.message);
        process.exit(1);
    }
}

// Run validation
main();


