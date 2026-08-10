# Documentação da API - atend.io

## Visão Geral

A API do atend.io é um sistema de integração entre plataformas de Chat, Chatbots e WhatsApp. A API está dividida em duas seções principais:

1. **API de Recursos** (`/resources`) - Endpoints administrativos que requerem autenticação JWT
2. **API de Integração** (`/api/v1`) - Endpoints para integração com plataformas externas que requerem token de licenciado

## Autenticação

### API de Recursos
- **Header**: `x-access-token: <JWT_TOKEN>`
- **JWT**: Token válido por 7 dias

### API de Integração
- **Query Parameter**: `?token=<LICENSEE_API_TOKEN>`
- **Token**: Token único do licenciado (gerado automaticamente)

---

## 1. API de Recursos (`/resources`)

### 1.1 Autenticação

#### POST `/login`
**Descrição**: Autenticação de usuários no sistema

**Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response** (200):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response** (401):
```json
{
  "message": "Email ou senha inválidos!"
}
```

---

### 1.2 Usuários

#### GET `/resources/users`
**Descrição**: Lista todos os usuários

**Headers**: `x-access-token: <JWT_TOKEN>`

**Response** (200):
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "name": "João Silva",
    "email": "joao@example.com",
    "active": true,
    "isAdmin": false,
    "isSuper": false,
    "licensee": "507f1f77bcf86cd799439012"
  }
]
```

#### GET `/resources/users/:id`
**Descrição**: Busca usuário por ID ou email

**Headers**: `x-access-token: <JWT_TOKEN>`

**Response** (200):
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "João Silva",
  "email": "joao@example.com",
  "active": true,
  "isAdmin": false,
  "isSuper": false,
  "licensee": "507f1f77bcf86cd799439012"
}
```

#### POST `/resources/users`
**Descrição**: Cria novo usuário

**Headers**: `x-access-token: <JWT_TOKEN>`

**Body**:
```json
{
  "name": "João Silva",
  "email": "joao@example.com",
  "password": "password123",
  "active": true,
  "licensee": "507f1f77bcf86cd799439012",
  "isAdmin": false,
  "isSuper": false
}
```

#### POST `/resources/users/:id`
**Descrição**: Atualiza usuário existente

**Headers**: `x-access-token: <JWT_TOKEN>`

**Body**:
```json
{
  "name": "João Silva Atualizado",
  "email": "joao.novo@example.com",
  "password": "newpassword123",
  "active": true
}
```

---

### 1.3 Licenciados

#### GET `/resources/licensees`
**Descrição**: Lista licenciados com filtros

**Headers**: `x-access-token: <JWT_TOKEN>`

**Query Parameters**:
- `page` (number): Página (default: 1)
- `limit` (number): Limite por página (default: 30)
- `chatDefault` (string): Filtro por plataforma de chat
- `chatbotDefault` (string): Filtro por plataforma de chatbot
- `whatsappDefault` (string): Filtro por plataforma de WhatsApp
- `expression` (string): Filtro por expressão
- `active` (boolean): Filtro por status ativo
- `pedidos10_active` (boolean): Filtro por integração Pedidos10

#### GET `/resources/licensees/:id`
**Descrição**: Busca licenciado por ID

**Headers**: `x-access-token: <JWT_TOKEN>`

#### POST `/resources/licensees`
**Descrição**: Cria novo licenciado

**Headers**: `x-access-token: <JWT_TOKEN>`

**Body**:
```json
{
  "name": "Restaurante Exemplo",
  "email": "contato@restaurante.com",
  "phone": "11999999999",
  "active": true,
  "licenseKind": "paid",
  "useChatbot": true,
  "chatbotDefault": "landbot",
  "chatbotUrl": "https://landbot.io/...",
  "chatbotAuthorizationToken": "token123",
  "whatsappDefault": "dialog",
  "whatsappToken": "token456",
  "whatsappUrl": "https://waba.360dialog.io/",
  "chatDefault": "crisp",
  "chatUrl": "https://crisp.chat/...",
  "chatKey": "key123",
  "chatIdentifier": "identifier123"
}
```

#### POST `/resources/licensees/:id`
**Descrição**: Atualiza licenciado existente

**Headers**: `x-access-token: <JWT_TOKEN>`

#### POST `/resources/licensees/:id/dialogwebhook`
**Descrição**: Configura webhook do Dialog para o licenciado

**Headers**: `x-access-token: <JWT_TOKEN>`

#### POST `/resources/licensees/:id/sign-order-webhook`
**Descrição**: Assina webhook de pedidos para o licenciado

**Headers**: `x-access-token: <JWT_TOKEN>`

#### POST `/resources/licensees/:id/integration/pagarme`
**Descrição**: Envia licenciado para PagarMe

**Headers**: `x-access-token: <JWT_TOKEN>`

#### GET `/resources/licensees/:id/baileys-status`
**Descrição**: Retorna o status da conexão Baileys do licenciado

**Headers**: `x-access-token: <JWT_TOKEN>`

**Response** (200):
```json
{ "connected": true }
```

#### POST `/resources/licensees/:id/baileys-qr`
**Descrição**: Gera o QR code de autenticação Baileys para o licenciado

**Headers**: `x-access-token: <JWT_TOKEN>`

**Response** (200 — QR gerado):
```json
{ "qr": "<qr-string>" }
```

**Response** (200 — já autenticado):
```json
{ "message": "Já conectado" }
```

**Response** (408 — timeout):
```json
{ "errors": { "message": "Timeout ao gerar QR Code" } }
```

#### POST `/resources/licensees/:id/baileys-sync`
**Descrição**: Sincroniza os grupos WhatsApp do licenciado nos registros de `Contact`. Requer sessão Baileys ativa.

**Headers**: `x-access-token: <JWT_TOKEN>`

**Response** (200):
```json
{
  "importedContacts": 0,
  "updatedContacts": 0,
  "importedGroups": 3,
  "updatedGroups": 1,
  "skipped": 0
}
```

- `importedGroups`: novos registros de Contact do tipo grupo criados
- `updatedGroups`: registros de grupo existentes atualizados
- `importedContacts` / `updatedContacts` / `skipped`: sempre `0` (sincronização de contatos individuais não implementada)

**Response** (200 — licenciado não usa Baileys):
```json
{ "message": "Licensee não usa Baileys" }
```

**Response** (500 — erro de socket ou sessão desconectada):
```json
{ "errors": { "message": "Erro interno do servidor: <detalhe>" } }
```

> A sincronização usa `groupFetchAllParticipating()` do SDK Baileys e não lê, importa nem persiste histórico de mensagens.

---

### 1.4 Contatos

#### GET `/resources/contacts`
**Descrição**: Lista contatos com filtros

**Headers**: `x-access-token: <JWT_TOKEN>`

**Query Parameters**:
- `page` (number): Página (default: 1)
- `limit` (number): Limite por página (default: 30)
- `type` (string): Filtro por tipo de contato
- `talkingWithChatbot` (boolean): Filtro por contatos conversando com chatbot
- `licensee` (string): Filtro por licenciado
- `expression` (string): Filtro por expressão
- `isGroup` (boolean `"true"` / `"false"`): Filtra somente grupos (`true`) ou somente contatos individuais (`false`). Omitir retorna todos.
- `updatedAtStart` (ISO 8601 datetime): Retorna contatos atualizados a partir desta data (inclusive)
- `updatedAtEnd` (ISO 8601 datetime): Retorna contatos atualizados até esta data (inclusive)

**Exemplos**:
```
GET /resources/contacts?isGroup=true
GET /resources/contacts?isGroup=true&licensee=<id>
GET /resources/contacts?updatedAtStart=2026-05-01T00:00:00.000Z&updatedAtEnd=2026-05-31T23:59:59.999Z
GET /resources/contacts?isGroup=true&updatedAtStart=2026-05-16T00:00:00.000Z
```

#### GET `/resources/contacts/:id`
**Descrição**: Busca contato por ID

**Headers**: `x-access-token: <JWT_TOKEN>`

#### POST `/resources/contacts`
**Descrição**: Cria novo contato

**Headers**: `x-access-token: <JWT_TOKEN>`

**Body**:
```json
{
  "name": "Cliente Exemplo",
  "number": "11999999999",
  "type": "whatsapp",
  "talkingWithChatBot": true,
  "licensee": "507f1f77bcf86cd799439012",
  "email": "cliente@example.com",
  "address": "Rua Exemplo, 123",
  "city": "São Paulo",
  "uf": "SP",
  "cep": "01234-567"
}
```

#### POST `/resources/contacts/:id`
**Descrição**: Atualiza contato existente

**Headers**: `x-access-token: <JWT_TOKEN>`

---

### 1.5 Triggers

#### GET `/resources/triggers`
**Descrição**: Lista triggers com filtros

**Headers**: `x-access-token: <JWT_TOKEN>`

**Query Parameters**:
- `page` (number): Página (default: 1)
- `limit` (number): Limite por página (default: 30)
- `kind` (string): Filtro por tipo de trigger
- `licensee` (string): Filtro por licenciado
- `expression` (string): Filtro por expressão

#### GET `/resources/triggers/:id`
**Descrição**: Busca trigger por ID

**Headers**: `x-access-token: <JWT_TOKEN>`

#### POST `/resources/triggers`
**Descrição**: Cria novo trigger

**Headers**: `x-access-token: <JWT_TOKEN>`

**Body**:
```json
{
  "name": "Trigger de Cardápio",
  "triggerKind": "multi_product",
  "expression": "cardápio",
  "catalogId": "catalog123",
  "catalogMulti": "catalog_data",
  "licensee": "507f1f77bcf86cd799439012",
  "order": 1
}
```

#### POST `/resources/triggers/:id`
**Descrição**: Atualiza trigger existente

**Headers**: `x-access-token: <JWT_TOKEN>`

#### POST `/resources/triggers/:id/importation`
**Descrição**: Importa catálogo do Facebook para o trigger

**Headers**: `x-access-token: <JWT_TOKEN>`

**Body**:
```json
{
  "text": "dados_do_catalogo_facebook"
}
```

---

### 1.6 Templates

#### GET `/resources/templates`
**Descrição**: Lista templates com filtros

**Headers**: `x-access-token: <JWT_TOKEN>`

**Query Parameters**:
- `page` (number): Página (default: 1)
- `limit` (number): Limite por página (default: 30)
- `licensee` (string): Filtro por licenciado
- `expression` (string): Filtro por expressão

#### GET `/resources/templates/:id`
**Descrição**: Busca template por ID

**Headers**: `x-access-token: <JWT_TOKEN>`

#### POST `/resources/templates`
**Descrição**: Cria novo template

**Headers**: `x-access-token: <JWT_TOKEN>`

**Body**:
```json
{
  "name": "template_boas_vindas",
  "namespace": "welcome_template",
  "licensee": "507f1f77bcf86cd799439012"
}
```

#### POST `/resources/templates/:id`
**Descrição**: Atualiza template existente

**Headers**: `x-access-token: <JWT_TOKEN>`

#### POST `/resources/templates/:id/importation`
**Descrição**: Importa template do WhatsApp

**Headers**: `x-access-token: <JWT_TOKEN>`

---

### 1.7 Mensagens

#### GET `/resources/messages`
**Descrição**: Lista mensagens com filtros

**Headers**: `x-access-token: <JWT_TOKEN>`

**Query Parameters**:
- `page` (number): Página (default: 1)
- `limit` (number): Limite por página (default: 30)
- `startDate` (datetime): Data inicial
- `endDate` (datetime): Data final
- `licensee` (string): Filtro por licenciado
- `contact` (string): Filtro por contato
- `kind` (string): Filtro por tipo de mensagem
- `destination` (string): Filtro por destino
- `sended` (boolean): Filtro por mensagens enviadas

---

## 2. API de Integração (`/api/v1`)

### 2.1 Chat

#### POST `/api/v1/chat/message?token=<LICENSEE_TOKEN>`
**Descrição**: Recebe mensagem da plataforma de chat

**Body**: Dados da mensagem do chat (estrutura varia conforme plataforma)

**Response** (200):
```json
{
  "body": "Solicitação de mensagem para a plataforma de chat agendado"
}
```

#### POST `/api/v1/chat/reset?token=<LICENSEE_TOKEN>`
**Descrição**: Agenda reset de chats expirados

**Response** (200):
```json
{
  "body": "Solicitação para avisar os chats com janela vencendo agendado com sucesso"
}
```

---

### 2.2 Chatbot

#### POST `/api/v1/chatbot/message?token=<LICENSEE_TOKEN>`
**Descrição**: Recebe mensagem do chatbot

**Body**: Dados da mensagem do chatbot

**Response** (200):
```json
{
  "body": "Solicitação de mensagem para a plataforma de chatbot agendado"
}
```

#### POST `/api/v1/chatbot/transfer?token=<LICENSEE_TOKEN>`
**Descrição**: Transfere conversa do chatbot para chat humano

**Body**: Dados da transferência

**Response** (200):
```json
{
  "body": "Solicitação de transferência do chatbot para a plataforma de chat agendado"
}
```

#### POST `/api/v1/chatbot/reset?token=<LICENSEE_TOKEN>`
**Descrição**: Agenda reset de chatbots abandonados

**Response** (200):
```json
{
  "body": "Solicitação para resetar os chatbots abandonados agendado"
}
```

---

### 2.3 Messenger (WhatsApp)

#### POST `/api/v1/messenger/message?token=<LICENSEE_TOKEN>`
**Descrição**: Recebe mensagem do WhatsApp

**Body**: Dados da mensagem do WhatsApp (estrutura varia conforme provedor)

**Response** (200):
```json
{
  "body": "Solicitação de mensagem para a plataforma de messenger agendado"
}
```

---

### 2.4 Carrinhos

#### POST `/api/v1/carts?token=<LICENSEE_TOKEN>&contact=<PHONE>&name=<NAME>&origin=<PLUGIN>`
**Descrição**: Cria ou atualiza carrinho de compras

**Body**: Dados do carrinho (produtos, endereço, etc.)

**Response** (201):
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "contact": "507f1f77bcf86cd799439012",
  "products": [...],
  "total": 50.00,
  "concluded": false
}
```

#### POST `/api/v1/carts/:contact?token=<LICENSEE_TOKEN>`
**Descrição**: Atualiza carrinho existente

**Body**: Campos a serem atualizados

#### GET `/api/v1/carts/:contact?token=<LICENSEE_TOKEN>`
**Descrição**: Busca carrinho por contato

**Response** (200):
```json
{
  "cart": "Descrição formatada do carrinho"
}
```

#### DELETE `/api/v1/carts/:contact?token=<LICENSEE_TOKEN>`
**Descrição**: Fecha carrinho (marca como concluído)

#### POST `/api/v1/carts/:contact/item?token=<LICENSEE_TOKEN>`
**Descrição**: Adiciona item ao carrinho

**Body**:
```json
{
  "products": [
    {
      "product_retailer_id": "prod123",
      "quantity": 2,
      "unit_price": 25.00
    }
  ]
}
```

#### DELETE `/api/v1/carts/:contact/item?token=<LICENSEE_TOKEN>`
**Descrição**: Remove item do carrinho

**Body**:
```json
{
  "item": 1
}
```

#### POST `/api/v1/carts/:contact/send?token=<LICENSEE_TOKEN>`
**Descrição**: Envia carrinho por WhatsApp

**Response** (200):
```json
{
  "message": "Carrinho agendado para envio"
}
```

#### GET `/api/v1/carts/:contact/cart?token=<LICENSEE_TOKEN>`
**Descrição**: Obtém carrinho formatado para plataforma específica

#### GET `/api/v1/carts/:contact/payment?token=<LICENSEE_TOKEN>`
**Descrição**: Obtém status de pagamento do carrinho

**Response** (200):
```json
{
  "cart_id": "507f1f77bcf86cd799439011",
  "payment_status": "pending",
  "integration_status": "processing"
}
```

#### POST `/api/v1/carts/reset?token=<LICENSEE_TOKEN>`
**Descrição**: Agenda reset de carrinhos expirados

---

### 2.5 Endereços

#### GET `/api/v1/contacts/address/:number?token=<LICENSEE_TOKEN>`
**Descrição**: Busca endereço do contato

**Response** (200):
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Cliente Exemplo",
  "number": "11999999999",
  "address": "Rua Exemplo, 123",
  "city": "São Paulo",
  "uf": "SP",
  "cep": "01234-567"
}
```

#### POST `/api/v1/contacts/address/:number?token=<LICENSEE_TOKEN>`
**Descrição**: Atualiza endereço do contato

**Body**:
```json
{
  "address": "Nova Rua, 456",
  "city": "São Paulo",
  "uf": "SP",
  "cep": "01234-567",
  "delivery_tax": 5.00
}
```

---

### 2.6 Background Jobs

#### POST `/api/v1/backgroundjobs?token=<LICENSEE_TOKEN>`
**Descrição**: Cria job em background

**Body**:
```json
{
  "kind": "get-pix",
  "payload": {
    "order_id": "order123",
    "amount": 50.00
  }
}
```

**Response** (200):
```json
{
  "body": {
    "message": "Job agendado com sucesso.",
    "job_id": "507f1f77bcf86cd799439011"
  }
}
```

#### GET `/api/v1/backgroundjobs/:id?token=<LICENSEE_TOKEN>`
**Descrição**: Consulta status do job

**Response** (200):
```json
{
  "message": "O job está em execução, logo deve ficar pronto. Por favor, volte daqui a pouco!"
}
```

---

### 2.7 Pedidos

#### POST `/api/v1/orders?token=<LICENSEE_TOKEN>`
**Descrição**: Processa pedido do Pedidos10

**Body**:
```json
{
  "MerchantExternalCode": "merchant123",
  "order": {
    "id": "order123",
    "items": [...],
    "total": 50.00
  }
}
```

**Response** (202):
```json
{
  "id": "507f1f77bcf86cd799439011"
}
```

#### POST `/api/v1/orders/change-status?token=<LICENSEE_TOKEN>`
**Descrição**: Altera status do pedido

**Body**:
```json
{
  "order": "order123",
  "status": "preparing"
}
```

---

### 2.8 Integrações

#### POST `/api/v1/integrations?token=<LICENSEE_TOKEN>&provider=<PROVIDER>`
**Descrição**: Processa webhook de integração

**Body**: Dados do webhook

**Response** (200): Status OK

---

### 2.9 Utilitários

#### GET `/api/v1/delay/:time?token=<LICENSEE_TOKEN>`
**Descrição**: Delay artificial (para testes)

**Response** (200): Após o delay especificado

#### POST `/api/v1/delay/:time?token=<LICENSEE_TOKEN>`
**Descrição**: Delay artificial (para testes)

**Response** (200): Após o delay especificado

---

## 3. Monitoramento

### 3.1 Bull Board

#### GET `/queue`
**Descrição**: Interface web para monitorar filas de processamento

**Acesso**: Interface gráfica para visualizar jobs em fila

---

## 4. Códigos de Status HTTP

- **200**: Sucesso
- **201**: Criado com sucesso
- **202**: Aceito (processamento assíncrono)
- **401**: Não autorizado (token inválido)
- **404**: Recurso não encontrado
- **422**: Erro de validação
- **500**: Erro interno do servidor

---

## 5. Exemplos de Uso

### 5.1 Autenticação
```bash
curl -X POST http://localhost:5000/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password123"}'
```

### 5.2 Criar Licenciado
```bash
curl -X POST http://localhost:5000/resources/licensees \
  -H "Content-Type: application/json" \
  -H "x-access-token: <JWT_TOKEN>" \
  -d '{
    "name": "Restaurante Exemplo",
    "email": "contato@restaurante.com",
    "licenseKind": "paid",
    "whatsappDefault": "dialog",
    "whatsappToken": "token123"
  }'
```

### 5.3 Receber Mensagem do WhatsApp
```bash
curl -X POST "http://localhost:5000/api/v1/messenger/message?token=<LICENSEE_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "from": "5511999999999",
            "text": {"body": "Olá"}
          }]
        }
      }]
    }]
  }'
```

---

## 6. Notas Importantes

1. **Tokens de Licenciado**: Cada licenciado possui um token único gerado automaticamente
2. **Processamento Assíncrono**: Muitas operações são processadas em background via filas
3. **Validações**: Todos os endpoints validam dados de entrada
4. **Logs**: Todas as operações são logadas para auditoria
5. **Rate Limiting**: Considere implementar rate limiting em produção
6. **Segurança**: Use HTTPS em produção e valide todos os inputs