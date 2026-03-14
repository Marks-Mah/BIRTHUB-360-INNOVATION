# Política de Data Masking/Redaction em Logs

É terminantemente proibido o envio de informações sensíveis (PII) para os logs.
Os seguintes campos devem ser mascarados ou omitidos:
- Senhas e hashes
- Tokens (JWT, API Keys, Session IDs)
- CPF, RG, passaportes
- Dados de cartão de crédito (PAN, CVV)
