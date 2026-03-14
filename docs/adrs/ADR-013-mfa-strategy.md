# ADR 013: Estratégia de MFA (Multi-Factor Authentication)

## Status
Aceito

## Contexto
O modelo de segurança do BirthHub360 exige a implementação de um modelo robusto de autenticação multifator para proteger as contas dos usuários. Precisamos definir a arquitetura e os métodos preferenciais, como Authenticator App (TOTP) ou SMS/Email.

## Decisão
A principal estratégia adotada será a exigência de **Aplicativos Autenticadores baseados no protocolo TOTP (Time-Based One-Time Password)** para Multi-Factor Authentication (MFA).

## Justificativa
A decisão sobre o uso do **TOTP** é guiada pela segurança, não pela conveniência dos meios SMS ou E-mail.

### Vulnerabilidades SMS/Email
Tanto SMS quanto E-mail possuem vulnerabilidades inatas significativas:
*   O SMS sofre vulnerabilidades conhecidas como o SIM Swapping (sequestro de linha), que compromete a segurança sem a necessidade de interação do usuário com phishing, anulando os benefícios de uma segunda etapa de autenticação segura.
*   O e-mail pode ser interceptado em ataques corporativos comuns.
Portanto, a implementação via aplicativo Authenticator foi escolhida como modelo padrão e primário.

## Implementação da Máquina de Estados (Login MFA)
A experiência de login deve incorporar o ciclo de verificação MFA sem perder a segurança durante as etapas.

1.  O usuário entra com e-mail/senha.
2.  A API responde com a validação das credenciais.
3.  Se a conta requer MFA (`mfa_required` state), a resposta retornará **um Token JWT Temporário Curto** e um status indicativo (ex: `202 Accepted` ou `401 Unauthorized` + flag).
4.  O Frontend o redireciona para a tela de Verificação (`/mfa-verify`).
5.  O usuário insere o código do Authenticator.
6.  A API, ao receber o token curto + o código TOTP válido, emite o **JWT de Acesso Final (Real)** e os cookies de sessão correspondentes.

## Códigos de Recuperação (Recovery Codes)
Usuários podem perder o acesso ao dispositivo. Para contornar isso com segurança:
*   A API deve gerar uma lista restrita de **8 Códigos de Recuperação** por padrão.
*   Estes códigos devem ser exibidos **em plain text uma única vez na UI** durante a configuração da autenticação multifator.
*   Cada código deve ser projetado para **Uso Único**.
*   Apenas os **hashes bcrypt** de cada um desses códigos serão salvos no banco de dados.

## Defesas contra Lockout e Brute-Force
Para blindar o sistema contra tentativa de ataques de força bruta especificamente no endpoint de Verificação (`/mfa-verify`), as seguintes regras devem ser aplicadas:
*   A verificação MFA se limitará a **3 tentativas consecutivas falhas**.
*   Após o limite, o token temporário será revogado compulsoriamente e será exigido o reinício do processo completo de login (e-mail/senha).

## Consequências
*   Maior segurança contra SIM Swapping e outros ataques correlatos.
*   Experiência de login dividida em etapas, possivelmente exigindo mais esforço de onboarding (como o ato de instalar aplicativos).
*   Necessidade de implementar e testar detalhadamente o fluxo de UI e as transições de status da API para MFA.