const App = {
    async init() {
        console.log('🎵 Spotify Player - OAuth 2.0 Demo');

        await this.checkCallback();

        if (SpotifyAuth.isAuthenticated()) {
            OAuthLogger.log('Usuário autenticado, carregando player...', 'success');
            await this.loadPlayer();
        } else {
            OAuthLogger.log('Usuário não autenticado', 'info');
            this.showScreen('login');
        }

        this.startTokenTimer();
    },

    async checkCallback() {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        const error = params.get('error');

        if (error) {
            OAuthLogger.log(`Erro de autorização: ${error}`, 'error');
            this.showToast('Autorização negada pelo usuário', 'error');
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
        }

        if (code && state) {
            OAuthLogger.log('Código de autorização detectado na URL', 'info');
            
            try {
                await SpotifyAuth.handleCallback(code, state);
                this.showToast('Login realizado com sucesso!', 'success');
                window.history.replaceState({}, document.title, window.location.pathname);
            } catch (error) {
                OAuthLogger.log(`Erro no callback: ${error.message}`, 'error');
                this.showToast('Erro ao processar login: ' + error.message, 'error');
            }
        }
    },

    async loadPlayer() {
        this.showScreen('player');

        try {
            const profile = await SpotifyPlayer.getUserProfile();
            this.updateUserInfo(profile);

            this.updateTokenInfo();

            await SpotifyPlayer.refreshState();

            await SpotifyPlayer.renderRecentTracks();
            await SpotifyPlayer.renderPlaylists();

            SpotifyPlayer.startStateUpdates();

        } catch (error) {
            OAuthLogger.log(`Erro ao carregar player: ${error.message}`, 'error');
            this.showToast('Erro ao carregar dados: ' + error.message, 'error');
        }
    },

    updateUserInfo(profile) {
        const avatar = document.getElementById('user-avatar');
        const name = document.getElementById('user-name');
        const plan = document.getElementById('user-plan');

        if (avatar && profile.images?.[0]) {
            avatar.src = profile.images[0].url;
        } else if (avatar) {
            avatar.src = 'https://via.placeholder.com/40x40/1DB954/ffffff?text=' + 
                        (profile.display_name?.[0] || 'U');
        }

        if (name) {
            name.textContent = profile.display_name || profile.id;
        }

        if (plan) {
            plan.textContent = profile.product === 'premium' ? 'Premium' : 'Free';
            plan.classList.toggle('free', profile.product !== 'premium');
        }

        OAuthLogger.log(`Usuário: ${profile.display_name} (${profile.product})`, 'success');
    },

    updateTokenInfo() {
        const tokenDisplay = document.getElementById('access-token-display');
        const token = localStorage.getItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);

        if (tokenDisplay && token) {
            const maskedToken = token.substring(0, 20) + '...' + token.substring(token.length - 10);
            tokenDisplay.innerHTML = `
                <code>${maskedToken}</code>
                <button class="copy-btn" onclick="App.copyToken('access')">
                    <span class="material-symbols-rounded">content_copy</span>
                </button>
            `;
        }

        const scopesList = document.getElementById('scopes-list');
        if (scopesList) {
            scopesList.innerHTML = CONFIG.SCOPES.map(scope => 
                `<span class="scope-badge">${scope}</span>`
            ).join('');
        }
    },

    startTokenTimer() {
        const updateTimer = () => {
            const expiryElement = document.getElementById('token-expiry');
            if (expiryElement) {
                const timeRemaining = SpotifyAuth.getTokenTimeRemaining();
                expiryElement.innerHTML = `<span class="expiry-time">${timeRemaining}</span>`;
                
                const [mins] = timeRemaining.split(':').map(Number);
                expiryElement.classList.toggle('expiring', mins < 5);
            }
        };

        updateTimer();
        setInterval(updateTimer, 1000);
    },

    async copyToken(type) {
        let token;
        
        if (type === 'access') {
            token = localStorage.getItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
        } else if (type === 'refresh') {
            token = localStorage.getItem(CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
        }

        if (token) {
            try {
                await navigator.clipboard.writeText(token);
                this.showToast('Token copiado para a área de transferência!', 'success');
                OAuthLogger.log('Token copiado ✓', 'success');
            } catch (error) {
                this.showToast('Erro ao copiar token', 'error');
            }
        }
    },

    showScreen(screen) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        
        const targetScreen = document.getElementById(`${screen}-screen`);
        if (targetScreen) {
            targetScreen.classList.add('active');
        }
    },

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="material-symbols-rounded">
                ${type === 'success' ? 'check_circle' : 
                  type === 'error' ? 'error' : 
                  type === 'warning' ? 'warning' : 'info'}
            </span>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());

function copyToken(type) {
    App.copyToken(type);
}
