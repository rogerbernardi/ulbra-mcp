# ULBRA Supply MCP Server

Servidor MCP (Model Context Protocol) para o sistema de suprimentos da ULBRA, fornecendo busca de produtos via IA.

## Funcionalidades

### 🔍 **products.search**
Busca literal de produtos usando regex em nome ou código.

**Parâmetros:**
- `query` (obrigatório): Texto de busca
- `limit` (opcional): Número máximo de resultados (padrão: 10)

**Exemplo:**
```json
{
  "query": "seringa 5ml",
  "limit": 5
}
```

### 🧠 **products.vectorSearch**
Busca semântica de produtos usando embeddings e similaridade.

**Parâmetros:**
- `query` (obrigatório): Texto de busca semântica
- `limit` (opcional): Número máximo de resultados (padrão: 10)
- `threshold` (opcional): Limiar de similaridade 0-1 (padrão: 0.7)

**Exemplo:**
```json
{
  "query": "seringa 5ml",
  "limit": 5,
  "threshold": 0.7
}
```

## Instalação

```bash
# Instalar dependências
npm install

# Copiar configuração
cp config.example .env

# Editar configurações
nano .env
```

## Uso

### Como servidor MCP
```bash
# Iniciar servidor
npm start

# Modo desenvolvimento (auto-reload)
npm run dev
```

### Teste local
```bash
# Testar busca literal
echo '{"method": "tools/call", "params": {"name": "products.search", "arguments": {"query": "seringa 5ml", "limit": 5}}}' | node index.js

# Testar busca vetorial
echo '{"method": "tools/call", "params": {"name": "products.vectorSearch", "arguments": {"query": "seringa 5ml", "limit": 5}}}' | node index.js
```

## Formato de Resposta

```json
{
  "success": true,
  "query": "seringa 5ml",
  "totalFound": 3,
  "products": [
    {
      "code": 12345,
      "name": "SERINGA DESCARTÁVEL 5ML",
      "unit": "UNIDADE",
      "estimatedPrice": 2.50,
      "description": "Seringa descartável 5ml com agulha",
      "type": "Produto",
      "family": "MATERIAL HOSPITALAR",
      "similarity": 0.95
    }
  ]
}
```

## Configuração

Edite o arquivo `.env`:

```env
BACKEND_URL=http://192.168.37.1:3100
ADMIN_EMAIL=admin@ulbra.edu.br
ADMIN_PASSWORD=123456
```

## Dependências

- `@modelcontextprotocol/sdk`: SDK oficial do MCP
- `axios`: Cliente HTTP para comunicação com backend
- `dotenv`: Gerenciamento de variáveis de ambiente

## Requisitos

- Node.js >= 18.0.0
- Backend ULBRA rodando e acessível
- Credenciais de administrador válidas

