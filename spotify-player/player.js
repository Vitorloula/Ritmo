const SpotifyPlayer = {
    state: {
        isPlaying: false,
        currentTrack: null,
        shuffle: false,
        repeat: 'off',
        progress: 0,
        duration: 0
    },

    updateInterval: null,

    async apiRequest(endpoint, options = {}) {
        const token = await SpotifyAuth.getAccessToken();
        
        if (!token) {
            throw new Error('Não autenticado');
        }

        const url = `${CONFIG.API_BASE_URL}${endpoint}`;
        
        OAuthLogger.log(`${options.method || 'GET'} ${endpoint}`, 'info');

        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        if (response.status === 204) {
            return null;
        }

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            OAuthLogger.log(`ERRO ${response.status}: ${error.error?.message || 'Erro desconhecido'}`, 'error');
            throw new Error(error.error?.message || `Erro ${response.status}`);
        }

        const data = await response.json();
        OAuthLogger.log(`Resposta recebida ✓`, 'success');
        return data;
    },

    async getUserProfile() {
        OAuthLogger.log('Buscando perfil do usuário...', 'info');
        return this.apiRequest('/me');
    },

    async getPlaybackState() {
        try {
            return await this.apiRequest('/me/player');
        } catch (error) {
            return null;
        }
    },

    async getCurrentlyPlaying() {
        try {
            return await this.apiRequest('/me/player/currently-playing');
        } catch (error) {
            return null;
        }
    },

    async getRecentlyPlayed(limit = 10) {
        OAuthLogger.log('Buscando músicas recentes...', 'info');
        return this.apiRequest(`/me/player/recently-played?limit=${limit}`);
    },

    async getUserPlaylists(limit = 12) {
        OAuthLogger.log('Buscando playlists...', 'info');
        return this.apiRequest(`/me/playlists?limit=${limit}`);
    },

    async play(contextUri = null, uris = null) {
        OAuthLogger.log('Iniciando reprodução...', 'info');
        
        const body = {};
        if (contextUri) body.context_uri = contextUri;
        if (uris) body.uris = uris;

        await this.apiRequest('/me/player/play', {
            method: 'PUT',
            body: Object.keys(body).length ? JSON.stringify(body) : undefined
        });
        
        this.state.isPlaying = true;
        this.updatePlayButton();
    },

    async pause() {
        OAuthLogger.log('Pausando reprodução...', 'info');
        
        await this.apiRequest('/me/player/pause', {
            method: 'PUT'
        });
        
        this.state.isPlaying = false;
        this.updatePlayButton();
    },

    async togglePlay() {
        try {
            if (this.state.isPlaying) {
                await this.pause();
            } else {
                await this.play();
            }
        } catch (error) {
            App.showToast('Erro ao controlar reprodução: ' + error.message, 'error');
        }
    },

    async next() {
        OAuthLogger.log('Pulando para próxima música...', 'info');
        
        await this.apiRequest('/me/player/next', {
            method: 'POST'
        });
        
        setTimeout(() => this.refreshState(), 500);
    },

    async previous() {
        OAuthLogger.log('Voltando para música anterior...', 'info');
        
        await this.apiRequest('/me/player/previous', {
            method: 'POST'
        });
        
        setTimeout(() => this.refreshState(), 500);
    },

    async shuffle() {
        this.state.shuffle = !this.state.shuffle;
        OAuthLogger.log(`Shuffle: ${this.state.shuffle ? 'ON' : 'OFF'}`, 'info');
        
        await this.apiRequest(`/me/player/shuffle?state=${this.state.shuffle}`, {
            method: 'PUT'
        });
        
        document.getElementById('shuffle-btn')?.classList.toggle('active', this.state.shuffle);
    },

    async repeat() {
        const states = ['off', 'context', 'track'];
        const currentIndex = states.indexOf(this.state.repeat);
        this.state.repeat = states[(currentIndex + 1) % states.length];
        
        OAuthLogger.log(`Repeat: ${this.state.repeat.toUpperCase()}`, 'info');
        
        await this.apiRequest(`/me/player/repeat?state=${this.state.repeat}`, {
            method: 'PUT'
        });
        
        const repeatBtn = document.getElementById('repeat-btn');
        if (repeatBtn) {
            repeatBtn.classList.toggle('active', this.state.repeat !== 'off');
            repeatBtn.querySelector('.material-symbols-rounded').textContent = 
                this.state.repeat === 'track' ? 'repeat_one' : 'repeat';
        }
    },

    async setVolume(volume) {
        OAuthLogger.log(`Volume: ${volume}%`, 'info');
        
        await this.apiRequest(`/me/player/volume?volume_percent=${volume}`, {
            method: 'PUT'
        });
    },

    async seek(positionMs) {
        OAuthLogger.log(`Seek: ${Math.floor(positionMs / 1000)}s`, 'info');
        
        await this.apiRequest(`/me/player/seek?position_ms=${positionMs}`, {
            method: 'PUT'
        });
    },

    async refreshState() {
        try {
            const playback = await this.getPlaybackState();
            
            if (playback && playback.item) {
                this.state.isPlaying = playback.is_playing;
                this.state.currentTrack = playback.item;
                this.state.progress = playback.progress_ms;
                this.state.duration = playback.item.duration_ms;
                this.state.shuffle = playback.shuffle_state;
                this.state.repeat = playback.repeat_state;

                this.updateUI(playback);
            } else {
                this.clearNowPlaying();
            }
        } catch (error) {
            console.error('Erro ao atualizar estado:', error);
        }
    },

    updateUI(playback) {
        const track = playback.item;
        
        const albumArt = document.getElementById('album-art');
        if (albumArt && track.album?.images?.[0]) {
            albumArt.src = track.album.images[0].url;
        }
        
        document.getElementById('track-name').textContent = track.name;
        document.getElementById('artist-name').textContent = 
            track.artists.map(a => a.name).join(', ');
        document.getElementById('album-name').textContent = track.album?.name || '';
        
        this.updateProgress(playback.progress_ms, track.duration_ms);
        
        this.updatePlayButton();
        
        document.getElementById('shuffle-btn')?.classList.toggle('active', playback.shuffle_state);
        const repeatBtn = document.getElementById('repeat-btn');
        if (repeatBtn) {
            repeatBtn.classList.toggle('active', playback.repeat_state !== 'off');
        }
    },

    updateProgress(currentMs, totalMs) {
        const progressFill = document.getElementById('progress-fill');
        const currentTime = document.getElementById('current-time');
        const totalTime = document.getElementById('total-time');
        
        if (progressFill) {
            const percentage = (currentMs / totalMs) * 100;
            progressFill.style.width = `${percentage}%`;
        }
        
        if (currentTime) {
            currentTime.textContent = this.formatTime(currentMs);
        }
        
        if (totalTime) {
            totalTime.textContent = this.formatTime(totalMs);
        }
    },

    formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    },

    updatePlayButton() {
        const playIcon = document.getElementById('play-icon');
        if (playIcon) {
            playIcon.textContent = this.state.isPlaying ? 'pause' : 'play_arrow';
        }
    },

    clearNowPlaying() {
        document.getElementById('album-art').src = 
            'https://via.placeholder.com/300x300/1DB954/ffffff?text=🎵';
        document.getElementById('track-name').textContent = 'Nenhuma música tocando';
        document.getElementById('artist-name').textContent = 
            'Abra o Spotify em outro dispositivo para começar';
        document.getElementById('album-name').textContent = '';
        this.updateProgress(0, 1);
    },

    startStateUpdates() {
        this.updateInterval = setInterval(() => {
            if (this.state.isPlaying) {
                this.state.progress += 1000;
                this.updateProgress(this.state.progress, this.state.duration);
            }
        }, 1000);

        setInterval(() => this.refreshState(), 5000);
    },

    stopStateUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    },

    async renderRecentTracks() {
        const container = document.getElementById('recent-tracks');
        if (!container) return;

        try {
            const data = await this.getRecentlyPlayed(10);
            
            if (!data?.items?.length) {
                container.innerHTML = '<p class="no-data">Nenhuma música recente encontrada</p>';
                return;
            }

            container.innerHTML = data.items.map(item => {
                const track = item.track;
                return `
                    <div class="track-item" onclick="SpotifyPlayer.play(null, ['${track.uri}'])">
                        <img src="${track.album?.images?.[2]?.url || ''}" alt="${track.name}">
                        <div class="track-item-info">
                            <div class="track-item-name">${track.name}</div>
                            <div class="track-item-artist">${track.artists.map(a => a.name).join(', ')}</div>
                        </div>
                        <div class="track-item-duration">${this.formatTime(track.duration_ms)}</div>
                    </div>
                `;
            }).join('');
            
        } catch (error) {
            container.innerHTML = `<p class="error">Erro ao carregar músicas: ${error.message}</p>`;
        }
    },

    async renderPlaylists() {
        const container = document.getElementById('playlists-grid');
        if (!container) return;

        try {
            const data = await this.getUserPlaylists(12);
            
            if (!data?.items?.length) {
                container.innerHTML = '<p class="no-data">Nenhuma playlist encontrada</p>';
                return;
            }

            container.innerHTML = data.items.map(playlist => `
                <div class="playlist-card" onclick="SpotifyPlayer.play('${playlist.uri}')">
                    <img src="${playlist.images?.[0]?.url || 'https://via.placeholder.com/180x180/282828/ffffff?text=🎵'}" 
                         alt="${playlist.name}">
                    <div class="playlist-card-name">${playlist.name}</div>
                    <div class="playlist-card-tracks">${playlist.tracks?.total || 0} músicas</div>
                </div>
            `).join('');
            
        } catch (error) {
            container.innerHTML = `<p class="error">Erro ao carregar playlists: ${error.message}</p>`;
        }
    }
};
