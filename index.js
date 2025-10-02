#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://192.168.37.1:3100';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@ulbra.edu.br';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '123456';

// Global token cache
let authToken = null;
let tokenExpiry = null;

/**
 * Get authentication token from backend
 */
async function getAuthToken() {
    // Check if token is still valid
    if (authToken && tokenExpiry && Date.now() < tokenExpiry) {
        return authToken;
    }

    try {
        console.error('🔐 Authenticating with backend...');
        const response = await axios.post(`${BACKEND_URL}/login`, {
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        });

        authToken = response.data.token;
        // Set expiry to 23 hours (token is valid for 24h)
        tokenExpiry = Date.now() + (23 * 60 * 60 * 1000);
        
        console.error('✅ Authentication successful');
        return authToken;
    } catch (error) {
        console.error('❌ Authentication failed:', error.message);
        throw new Error('Failed to authenticate with backend');
    }
}

/**
 * Make authenticated request to backend
 */
async function makeBackendRequest(endpoint, params = {}) {
    const token = await getAuthToken();
    
    try {
        const response = await axios.get(`${BACKEND_URL}${endpoint}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            params
        });
        return response.data;
    } catch (error) {
        console.error(`❌ Backend request failed: ${error.message}`);
        throw new Error(`Backend request failed: ${error.message}`);
    }
}

/**
 * Search products by literal text (regex in name or code)
 */
async function searchProducts(query, limit = 10) {
    try {
        console.error(`🔍 Searching products: "${query}"`);
        
        // Try vector search first
        let results = await makeBackendRequest('/api/supply/products/vector-search', {
            query,
            limit
        });

        // If no vector results, fall back to regular search
        if (!results.success || results.totalFound === 0) {
            console.error('📝 No vector results, trying regular search...');
            
            // Search by name (regex)
            const nameResults = await makeBackendRequest('/api/supply/products', {
                search: query,
                limit
            });

            if (nameResults && nameResults.length > 0) {
                results = {
                    success: true,
                    query,
                    totalFound: nameResults.length,
                    products: nameResults.map(product => ({
                        code: product.code,
                        name: product.name,
                        unit: product.unit,
                        estimatedPrice: product.priceEstimated,
                        description: product.description,
                        type: product.type,
                        family: product.family
                    }))
                };
            }
        }

        return {
            success: true,
            query,
            totalFound: results.totalFound || 0,
            products: (results.products || []).map(product => ({
                code: product.code,
                name: product.name,
                unit: product.unit,
                estimatedPrice: product.priceEstimated,
                description: product.description,
                type: product.type,
                family: product.family,
                similarity: product.similarity || null
            }))
        };
    } catch (error) {
        console.error('❌ Product search failed:', error.message);
        return {
            success: false,
            error: error.message,
            query,
            totalFound: 0,
            products: []
        };
    }
}

/**
 * Vector search for products using semantic similarity
 */
async function vectorSearchProducts(query, limit = 10, threshold = 0.7) {
    try {
        console.error(`🧠 Vector searching products: "${query}"`);
        
        const results = await makeBackendRequest('/api/supply/products/vector-search', {
            query,
            limit,
            threshold
        });

        return {
            success: results.success,
            query,
            totalFound: results.totalFound || 0,
            threshold: results.threshold || threshold,
            products: (results.products || []).map(product => ({
                code: product.code,
                name: product.name,
                unit: product.unit,
                estimatedPrice: product.priceEstimated,
                description: product.description,
                type: product.type,
                family: product.family,
                similarity: product.similarity || null
            })),
            cacheInfo: results.cacheInfo || null
        };
    } catch (error) {
        console.error('❌ Vector search failed:', error.message);
        return {
            success: false,
            error: error.message,
            query,
            totalFound: 0,
            products: []
        };
    }
}

// Create MCP server
const server = new Server(
    {
        name: 'ulbra-supply-mcp',
        version: '1.0.0',
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'products.search',
                description: 'Search products by literal text (regex in name or code)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'Search query text'
                        },
                        limit: {
                            type: 'number',
                            description: 'Maximum number of results (default: 10)',
                            default: 10
                        }
                    },
                    required: ['query']
                }
            },
            {
                name: 'products.vectorSearch',
                description: 'Search products using semantic similarity with embeddings',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'Search query text for semantic search'
                        },
                        limit: {
                            type: 'number',
                            description: 'Maximum number of results (default: 10)',
                            default: 10
                        },
                        threshold: {
                            type: 'number',
                            description: 'Similarity threshold (0-1, default: 0.7)',
                            default: 0.7
                        }
                    },
                    required: ['query']
                }
            }
        ]
    };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        switch (name) {
            case 'products.search': {
                const { query, limit = 10 } = args;
                const result = await searchProducts(query, limit);
                
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(result, null, 2)
                        }
                    ]
                };
            }

            case 'products.vectorSearch': {
                const { query, limit = 10, threshold = 0.7 } = args;
                const result = await vectorSearchProducts(query, limit, threshold);
                
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(result, null, 2)
                        }
                    ]
                };
            }

            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    } catch (error) {
        console.error(`❌ Tool execution failed: ${error.message}`);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: false,
                        error: error.message
                    }, null, 2)
                }
            ],
            isError: true
        };
    }
});

// Start server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('🚀 ULBRA Supply MCP Server started');
}

main().catch((error) => {
    console.error('❌ Server failed to start:', error);
    process.exit(1);
});
