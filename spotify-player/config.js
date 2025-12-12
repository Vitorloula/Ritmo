const CONFIG = {
    CLIENT_ID: (window.LOCAL_ENV && window.LOCAL_ENV.CLIENT_ID) ? window.LOCAL_ENV.CLIENT_ID : 'SEU_CLIENT_ID_AQUI',
    
    REDIRECT_URI: window.location.hostname.includes('github.io') 
        ? 'https://vitorloula.github.io/Ritmo/callback.html'
        : window.location.origin + '/callback.html',
    
    SCOPES: [
        'user-read-private',
        'user-read-email',
        'user-read-playback-state',
        'user-modify-playback-state',
        'user-read-currently-playing',
        'user-read-recently-played',
        'user-top-read',
        'user-library-read',
        'user-library-modify',
        'playlist-read-private',
        'playlist-read-collaborative',
        'streaming'
    ],
    
    AUTH_ENDPOINT: 'https://accounts.spotify.com/authorize',
    TOKEN_ENDPOINT: 'https://accounts.spotify.com/api/token',
    API_BASE_URL: 'https://api.spotify.com/v1',
    
    STORAGE_KEYS: {
        ACCESS_TOKEN: 'spotify_access_token',
        REFRESH_TOKEN: 'spotify_refresh_token',
        EXPIRES_AT: 'spotify_expires_at',
        CODE_VERIFIER: 'spotify_code_verifier',
        STATE: 'spotify_auth_state'
    }
};
