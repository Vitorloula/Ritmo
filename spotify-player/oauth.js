const SpotifyAuth = {
    generateRandomString(length) {
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
        const values = crypto.getRandomValues(new Uint8Array(length));
        return values.reduce((acc, x) => acc + possible[x % possible.length], '');
    },

    async generateCodeChallenge(codeVerifier) {
        const encoder = new TextEncoder();
        const data = encoder.encode(codeVerifier);
        const digest = await crypto.subtle.digest('SHA-256', data);
        
        return btoa(String.fromCharCode(...new Uint8Array(digest)))
            .replace(/=/g, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');
    },

    generateState() {
        return this.generateRandomString(16);
    },

    async login() {
        OAuthLogger.log('Iniciando fluxo OAuth 2.0 + PKCE...', 'info');
        
        if (!CONFIG.CLIENT_ID || CONFIG.CLIENT_ID === 'SEU_CLIENT_ID_AQUI') {
            OAuthLogger.log('ERRO: Client ID não configurado.', 'error');
            App.showToast('Configure seu Client ID no arquivo config.js', 'error');
            return;
        }

        const codeVerifier = this.generateRandomString(64);
        OAuthLogger.log(`Code Verifier gerado: ${codeVerifier.substring(0, 20)}...`, 'info');
        
        const codeChallenge = await this.generateCodeChallenge(codeVerifier);
        OAuthLogger.log(`Code Challenge (SHA-256): ${codeChallenge.substring(0, 20)}...`, 'info');
        
        const state = this.generateState();
        OAuthLogger.log(`State CSRF: ${state}`, 'info');
        
        localStorage.setItem(CONFIG.STORAGE_KEYS.CODE_VERIFIER, codeVerifier);
        localStorage.setItem(CONFIG.STORAGE_KEYS.STATE, state);
        
        const params = new URLSearchParams({
            client_id: CONFIG.CLIENT_ID,
            response_type: 'code',
            redirect_uri: CONFIG.REDIRECT_URI,
            scope: CONFIG.SCOPES.join(' '),
            state: state,
            code_challenge_method: 'S256',
            code_challenge: codeChallenge
        });

        const authUrl = `${CONFIG.AUTH_ENDPOINT}?${params.toString()}`;
        
        OAuthLogger.log('Redirecionando para Spotify...', 'info');
        OAuthLogger.log(`URL: ${CONFIG.AUTH_ENDPOINT}`, 'info');
        OAuthLogger.log(`Escopos solicitados: ${CONFIG.SCOPES.length}`, 'info');
        
        window.location.href = authUrl;
    },

    async handleCallback(code, state) {
        OAuthLogger.log('Callback recebido do Spotify', 'info');
        
        const savedState = localStorage.getItem(CONFIG.STORAGE_KEYS.STATE);
        if (state !== savedState) {
            OAuthLogger.log('ERRO: State inválido! Possível ataque CSRF.', 'error');
            throw new Error('State inválido - possível ataque CSRF');
        }
        OAuthLogger.log('State verificado com sucesso ✓', 'success');
        
        const codeVerifier = localStorage.getItem(CONFIG.STORAGE_KEYS.CODE_VERIFIER);
        if (!codeVerifier) {
            OAuthLogger.log('ERRO: Code Verifier não encontrado!', 'error');
            throw new Error('Code Verifier não encontrado');
        }
        OAuthLogger.log('Code Verifier recuperado ✓', 'success');
        
        OAuthLogger.log('Trocando código por Access Token...', 'info');
        OAuthLogger.log(`POST ${CONFIG.TOKEN_ENDPOINT}`, 'info');
        
        const response = await fetch(CONFIG.TOKEN_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                client_id: CONFIG.CLIENT_ID,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: CONFIG.REDIRECT_URI,
                code_verifier: codeVerifier
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            OAuthLogger.log(`ERRO: ${errorData.error_description || errorData.error}`, 'error');
            throw new Error(errorData.error_description || 'Falha ao trocar código por token');
        }

        const data = await response.json();
        OAuthLogger.log('Access Token recebido com sucesso! ✓', 'success');
        OAuthLogger.log(`Token expira em: ${data.expires_in} segundos`, 'info');
        
        this.saveTokens(data);
        
        localStorage.removeItem(CONFIG.STORAGE_KEYS.CODE_VERIFIER);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.STATE);
        
        return data;
    },

    saveTokens(tokenData) {
        const expiresAt = Date.now() + (tokenData.expires_in * 1000);
        
        localStorage.setItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN, tokenData.access_token);
        localStorage.setItem(CONFIG.STORAGE_KEYS.EXPIRES_AT, expiresAt.toString());
        
        if (tokenData.refresh_token) {
            localStorage.setItem(CONFIG.STORAGE_KEYS.REFRESH_TOKEN, tokenData.refresh_token);
        }
        
        OAuthLogger.log('Tokens salvos no localStorage', 'success');
    },

    async getAccessToken() {
        const accessToken = localStorage.getItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
        const expiresAt = parseInt(localStorage.getItem(CONFIG.STORAGE_KEYS.EXPIRES_AT) || '0');
        
        if (!accessToken) {
            return null;
        }
        
        if (Date.now() > expiresAt - 300000) {
            OAuthLogger.log('Token expirando, renovando...', 'warning');
            try {
                await this.refreshToken();
                return localStorage.getItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
            } catch (error) {
                OAuthLogger.log('Falha ao renovar token', 'error');
                return null;
            }
        }
        
        return accessToken;
    },

    async refreshToken() {
        const refreshToken = localStorage.getItem(CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
        
        if (!refreshToken) {
            OAuthLogger.log('Refresh Token não encontrado', 'error');
            throw new Error('Refresh Token não encontrado');
        }
        
        OAuthLogger.log('Renovando Access Token...', 'info');
        OAuthLogger.log(`POST ${CONFIG.TOKEN_ENDPOINT}`, 'info');
        
        const response = await fetch(CONFIG.TOKEN_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                client_id: CONFIG.CLIENT_ID,
                grant_type: 'refresh_token',
                refresh_token: refreshToken
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            OAuthLogger.log(`ERRO: ${errorData.error_description || errorData.error}`, 'error');
            throw new Error(errorData.error_description || 'Falha ao renovar token');
        }

        const data = await response.json();
        OAuthLogger.log('Token renovado com sucesso! ✓', 'success');
        
        this.saveTokens(data);
        return data;
    },

    isAuthenticated() {
        const token = localStorage.getItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
        const expiresAt = parseInt(localStorage.getItem(CONFIG.STORAGE_KEYS.EXPIRES_AT) || '0');
        
        return token && Date.now() < expiresAt;
    },

    logout() {
        OAuthLogger.log('Fazendo logout...', 'info');
        
        localStorage.removeItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.EXPIRES_AT);
        
        OAuthLogger.log('Tokens removidos ✓', 'success');
        
        App.showScreen('login');
    },

    getTokenTimeRemaining() {
        const expiresAt = parseInt(localStorage.getItem(CONFIG.STORAGE_KEYS.EXPIRES_AT) || '0');
        const remaining = Math.max(0, expiresAt - Date.now());
        
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
};

const OAuthLogger = {
    log(message, type = 'info') {
        const now = new Date();
        const time = now.toLocaleTimeString('pt-BR');
        
        console.log(`[${time}] [${type.toUpperCase()}] ${message}`);
        
        const logContainer = document.getElementById('oauth-log');
        if (logContainer) {
            const entry = document.createElement('div');
            entry.className = `log-entry ${type}`;
            entry.innerHTML = `
                <span class="log-time">${time}</span>
                <span class="log-message">${message}</span>
            `;
            
            if (logContainer.children.length === 1 && 
                logContainer.children[0].textContent.includes('Aguardando')) {
                logContainer.innerHTML = '';
            }
            
            logContainer.appendChild(entry);
            logContainer.scrollTop = logContainer.scrollHeight;
        }
    },

    clear() {
        const logContainer = document.getElementById('oauth-log');
        if (logContainer) {
            logContainer.innerHTML = '';
        }
    }
};
