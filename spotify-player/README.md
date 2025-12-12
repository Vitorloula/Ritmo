# 🎵 Spotify Player - Implementação OAuth 2.0 com PKCE

> **Trabalho de Segurança** - Demonstração prática de autenticação OAuth 2.0

## 📋 Índice

- [Sobre o Projeto](#sobre-o-projeto)
- [Conceitos de OAuth 2.0](#conceitos-de-oauth-20)
- [Configuração do Ambiente](#configuração-do-ambiente)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Como Usar](#como-usar)
- [Fluxo de Autenticação](#fluxo-de-autenticação)
- [Segurança](#segurança)
- [Referências](#referências)

---

## 📖 Sobre o Projeto

Este projeto demonstra a implementação do protocolo **OAuth 2.0** com a extensão **PKCE** (Proof Key for Code Exchange) utilizando a API do Spotify. O objetivo é criar um player de mídia web que permite aos usuários autenticarem-se com suas contas do Spotify e controlarem a reprodução de músicas.

### Funcionalidades

- ✅ Autenticação segura via OAuth 2.0 + PKCE
- ✅ Visualização do perfil do usuário
- ✅ Controle de reprodução (play, pause, próxima, anterior)
- ✅ Exibição da música atual com artwork
- ✅ Lista de músicas reproduzidas recentemente
- ✅ Visualização de playlists do usuário
- ✅ Log de requisições OAuth em tempo real
- ✅ Renovação automática do Access Token

---

## 🔐 Conceitos de OAuth 2.0

### O que é OAuth 2.0?

OAuth 2.0 é um protocolo de **autorização** que permite que aplicações de terceiros acessem recursos de um usuário em um serviço (como Spotify) sem precisar conhecer suas credenciais (senha).

### Principais Componentes

| Componente               | Descrição                                                 |
| ------------------------ | --------------------------------------------------------- |
| **Resource Owner**       | O usuário que possui os dados (sua conta Spotify)         |
| **Client**               | A aplicação que quer acessar os dados (este player)       |
| **Authorization Server** | Servidor que autentica o usuário (accounts.spotify.com)   |
| **Resource Server**      | Servidor que possui os dados protegidos (api.spotify.com) |

### Fluxos OAuth 2.0

O Spotify suporta 3 fluxos principais:

1. **Authorization Code** - Para apps com backend seguro
2. **Authorization Code + PKCE** - Para apps client-side (móvel, SPA) ✅ _Usado neste projeto_
3. **Client Credentials** - Para acesso sem usuário

### Por que PKCE?

PKCE (pronuncia-se "pixie") adiciona uma camada extra de segurança para aplicações que não podem manter um `client_secret` em segredo (como SPAs e apps móveis).

```
Sem PKCE:
  Atacante intercepta o código → Usa para obter token ❌

Com PKCE:
  Atacante intercepta o código → Não possui o code_verifier → Não consegue token ✅
```

---

## ⚙️ Configuração do Ambiente

### Pré-requisitos

- Conta no Spotify (gratuita ou Premium)
- Navegador moderno (Chrome, Firefox, Edge)
- Servidor web local (Live Server, http-server, etc.)

### Passo 1: Criar App no Spotify Developer

1. Acesse [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Faça login com sua conta Spotify
3. Clique em **"Create App"**
4. Preencha os campos:
   - **App name**: Player OAuth Demo
   - **App description**: Trabalho de Segurança
   - **Website**: http://localhost:5500 (ou a porta do seu servidor)
   - **Redirect URIs**: `http://localhost:5500/callback.html`
5. Marque **Web API** nas APIs utilizadas
6. Aceite os termos e clique em **Save**
7. Anote o **Client ID** gerado

### Passo 2: Configurar o Projeto

1. Abra o arquivo `config.js`
2. Substitua `'SEU_CLIENT_ID_AQUI'` pelo seu Client ID:

```javascript
const CONFIG = {
  CLIENT_ID: "abc123def456...",
};
```

### Passo 3: Executar o Projeto

**Opção A - VS Code Live Server:**

1. Instale a extensão "Live Server"
2. Clique com botão direito no `index.html`
3. Selecione "Open with Live Server"

**Opção B - Python:**

```bash
cd spotify-player
python -m http.server 5500
```

**Opção C - Node.js:**

```bash
npx http-server -p 5500
```

4. Acesse `http://localhost:5500` no navegador

---

## 📁 Estrutura do Projeto

```
spotify-player/
├── index.html       # Página principal do player
├── callback.html    # Página de callback OAuth
├── styles.css       # Estilos CSS
├── config.js        # Configurações (Client ID, escopos)
├── oauth.js         # Módulo de autenticação OAuth 2.0 + PKCE
├── player.js        # Módulo de controle do player
├── app.js           # Lógica principal da aplicação
└── README.md        # Este arquivo
```

### Descrição dos Arquivos

| Arquivo     | Responsabilidade                               |
| ----------- | ---------------------------------------------- |
| `config.js` | Armazena Client ID, escopos e endpoints da API |
| `oauth.js`  | Implementa todo o fluxo OAuth 2.0 + PKCE       |
| `player.js` | Integração com a Web API do Spotify            |
| `app.js`    | Gerenciamento de telas e UI                    |

---

## 🚀 Como Usar

1. Abra a aplicação no navegador
2. Clique em **"Conectar com Spotify"**
3. Faça login na sua conta Spotify (se necessário)
4. Autorize as permissões solicitadas
5. Você será redirecionado de volta para o player
6. Abra o Spotify em outro dispositivo (celular, desktop) e toque uma música
7. O player web mostrará a música atual e permitirá controlar a reprodução

> **Nota:** O controle de reprodução requer uma conta **Spotify Premium**.

---

## 🔄 Fluxo de Autenticação

```
┌─────────────────────────────────────────────────────────────────────┐
│                     FLUXO OAuth 2.0 + PKCE                          │
└─────────────────────────────────────────────────────────────────────┘

     USUÁRIO                APLICAÇÃO               SPOTIFY
        │                       │                       │
        │  1. Clica Login       │                       │
        │──────────────────────>│                       │
        │                       │                       │
        │                       │  2. Gera:             │
        │                       │  - code_verifier      │
        │                       │  - code_challenge     │
        │                       │  - state              │
        │                       │                       │
        │                       │  3. Redireciona       │
        │<──────────────────────│──────────────────────>│
        │                       │                       │
        │  4. Login + Autoriza  │                       │
        │────────────────────────────────────────────>  │
        │                       │                       │
        │<──────────────────────┼───────────────────────│
        │  5. Redirect com code e state                 │
        │                       │                       │
        │  6. Callback          │                       │
        │──────────────────────>│                       │
        │                       │                       │
        │                       │  7. Verifica state    │
        │                       │                       │
        │                       │  8. POST /api/token   │
        │                       │  (code + verifier)    │
        │                       │──────────────────────>│
        │                       │                       │
        │                       │<──────────────────────│
        │                       │  9. access_token      │
        │                       │     refresh_token     │
        │                       │                       │
        │  10. Player carregado │                       │
        │<──────────────────────│                       │
        │                       │                       │
        │                       │  11. GET /v1/me       │
        │                       │  Authorization: Bearer│
        │                       │──────────────────────>│
        │                       │                       │
        │                       │<──────────────────────│
        │  12. Dados do usuário │  User Profile         │
        │<──────────────────────│                       │
        │                       │                       │
```

### Detalhamento das Etapas

1. **Usuário inicia login** - Clica no botão "Conectar com Spotify"

2. **Geração de parâmetros PKCE:**

   - `code_verifier`: String aleatória de 64 caracteres
   - `code_challenge`: Hash SHA-256 do verifier em Base64URL
   - `state`: Token CSRF de 16 caracteres

3. **Redirecionamento para Spotify** com parâmetros:

   - `client_id`
   - `response_type=code`
   - `redirect_uri`
   - `scope`
   - `code_challenge`
   - `code_challenge_method=S256`
   - `state`

4. **Usuário faz login** e autoriza as permissões

5. **Spotify redireciona** para callback com `code` e `state`

6. **Aplicação recebe callback** na página callback.html

7. **Verificação de state** para proteção contra CSRF

8. **Troca de código por token** - POST para /api/token com:

   - `grant_type=authorization_code`
   - `code`
   - `redirect_uri`
   - `code_verifier`
   - `client_id`

9. **Spotify retorna tokens:**

   - `access_token` (expira em 1 hora)
   - `refresh_token` (longa duração)
   - `expires_in`

10. **Player é carregado** com interface completa

11. **Requisições à API** usando `Authorization: Bearer {token}`

12. **Dados retornados** e exibidos na interface

---

## 🛡️ Segurança

### Proteções Implementadas

| Ameaça                      | Proteção                                              |
| --------------------------- | ----------------------------------------------------- |
| **Interceptação de código** | PKCE (code_verifier não é transmitido na autorização) |
| **CSRF**                    | Verificação de state                                  |
| **Token theft**             | Tokens armazenados apenas no navegador do usuário     |
| **Token expiration**        | Renovação automática via refresh_token                |

### Boas Práticas

1. **Nunca exponha o Client Secret** em código client-side
2. **Sempre use HTTPS** em produção
3. **Valide o state** em todo callback
4. **Solicite apenas escopos necessários**
5. **Implemente renovação de token** antes da expiração
6. **Limpe tokens no logout**

### Escopos Utilizados

| Escopo                       | Justificativa              |
| ---------------------------- | -------------------------- |
| `user-read-private`          | Obter nome e tipo de conta |
| `user-read-email`            | Identificação do usuário   |
| `user-read-playback-state`   | Ver música atual           |
| `user-modify-playback-state` | Controlar reprodução       |
| `user-read-recently-played`  | Histórico de músicas       |
| `playlist-read-private`      | Listar playlists           |
| `streaming`                  | Reprodução via SDK         |

---

## 📚 Referências

- [RFC 6749 - OAuth 2.0](https://datatracker.ietf.org/doc/html/rfc6749)
- [RFC 7636 - PKCE](https://datatracker.ietf.org/doc/html/rfc7636)
- [Spotify Web API Docs](https://developer.spotify.com/documentation/web-api)
- [Spotify Authorization Guide](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow)
- [OAuth 2.0 Simplified](https://www.oauth.com/)

---

## 👨‍💻 Desenvolvimento

```
Trabalho de Segurança
Implementação de OAuth 2.0
```

---

## 📝 Licença

Este projeto é para fins educacionais.
