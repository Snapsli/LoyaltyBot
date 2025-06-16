import WebApp from '@twa-dev/sdk';

const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
const useMockAuth = process.env.NODE_ENV === 'development' && window.location.hostname === 'localhost';

// Mock Telegram client data for development
const mockTelegramData = {
    id: 12345,
    username: "devuser",
    first_name: "Dev",
    last_name: "User"
};

// Session storage keys
const SESSION_TOKEN_KEY = 'session_token';
const TELEGRAM_ID_KEY = 'telegram_id';

export class TelegramAuth {
    constructor() {
        this.isAuthenticated = false;
        this.user = null;
        this.isTelegramApp = false;
        
        this.initTelegram();
    }

    initTelegram() {
        try {
            if (useMockAuth) {
                console.log("Using mock authentication for development");
                this.isTelegramApp = true;
            } else if (window.Telegram?.WebApp) {
                WebApp.ready();
                this.isTelegramApp = true;
                console.log("Telegram WebApp initialized");
            } else {
                console.log("Not running in Telegram WebApp");
            }
        } catch (error) {
            console.error("Error initializing Telegram:", error);
        }
    }

    getTelegramUserData() {
        if (useMockAuth) {
            return mockTelegramData;
        }

        if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
            return window.Telegram.WebApp.initDataUnsafe.user;
        }

        return null;
    }

    async authenticateWithTelegram() {
        const userData = this.getTelegramUserData();
        
        if (!userData) {
            throw new Error("Telegram user data not available");
        }

        try {
            const response = await fetch(`${apiUrl}/auth/telegram`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    telegram_id: userData.id,
                    username: userData.username,
                    first_name: userData.first_name,
                    last_name: userData.last_name
                })
            });

            if (!response.ok) {
                throw new Error(`Authentication failed: ${response.status}`);
            }

            const data = await response.json();
            
            // Store credentials
            localStorage.setItem(SESSION_TOKEN_KEY, data.session_token);
            localStorage.setItem(TELEGRAM_ID_KEY, data.telegram_id);
            
            return data;
        } catch (error) {
            console.error("Authentication error:", error);
            throw error;
        }
    }

    async getCurrentUser() {
        const storedToken = localStorage.getItem(SESSION_TOKEN_KEY);
        const storedTelegramId = localStorage.getItem(TELEGRAM_ID_KEY);

        if (!storedToken || !storedTelegramId) {
            return null;
        }

        try {
            const response = await fetch(`${apiUrl}/auth/me`, {
                method: 'GET',
                headers: {
                    'X-Session-Token': storedToken,
                    'X-Telegram-ID': storedTelegramId,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                this.logout();
                return null;
            }

            const userData = await response.json();
            this.user = userData;
            this.isAuthenticated = true;
            return userData;
        } catch (error) {
            console.error("Get current user error:", error);
            this.logout();
            return null;
        }
    }

    logout() {
        this.isAuthenticated = false;
        this.user = null;
        localStorage.removeItem(SESSION_TOKEN_KEY);
        localStorage.removeItem(TELEGRAM_ID_KEY);
    }

    // Authenticated fetch helper
    async authFetch(endpoint, options = {}) {
        const storedToken = localStorage.getItem(SESSION_TOKEN_KEY);
        const storedTelegramId = localStorage.getItem(TELEGRAM_ID_KEY);

        if (!storedToken || !storedTelegramId) {
            this.logout();
            throw new Error("Not authenticated");
        }

        const defaultHeaders = {
            'X-Session-Token': storedToken,
            'X-Telegram-ID': storedTelegramId,
        };

        const requestHeaders = {
            ...defaultHeaders,
            ...options.headers,
        };

        // Add Content-Type only if body is not FormData
        if (!(options.body instanceof FormData)) {
            if (!requestHeaders['Content-Type'] && !requestHeaders['content-type']) {
                requestHeaders['Content-Type'] = 'application/json';
            }
        } else {
            delete requestHeaders['Content-Type'];
            delete requestHeaders['content-type'];
        }

        const config = {
            ...options,
            headers: requestHeaders,
        };

        try {
            const url = endpoint.startsWith('http') ? endpoint : apiUrl + endpoint;
            const response = await fetch(url, config);

            if (response.status === 401) {
                this.logout();
                throw new Error("Unauthorized");
            }

            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }

            if (response.headers.get("content-length") === "0" || response.status === 204) {
                return null;
            }
            
            return await response.json();
        } catch (error) {
            console.error("AuthFetch Exception:", error);
            throw error;
        }
    }
}

export default new TelegramAuth(); 