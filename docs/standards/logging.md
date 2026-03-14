# Formato Obrigatório do Payload de Log

Os logs devem ser em formato JSON (utilizando Pino) e obrigatoriamente conter as seguintes chaves:
- `timestamp`
- `level`
- `message`
- `requestId`
- `tenantId` (quando aplicável)
- `userId` (quando aplicável)
