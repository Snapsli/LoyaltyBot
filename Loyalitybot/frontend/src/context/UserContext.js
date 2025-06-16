import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import WebApp from '@twa-dev/sdk';

const UserContext = createContext();
export const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
const useMockAuth = process.env.REACT_APP_USE_MOCK_AUTH === 'true';
// Use separate keys for clarity
const SESSION_TOKEN_KEY = 'session_token';
const TELEGRAM_ID_KEY = 'telegram_id';

// Mock Telegram client data for development
const mockTelegramData = {
    id: 12345,
    username: "devuser",
    first_name: "Dev",
    last_name: "User"
};

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isTelegramApp, setIsTelegramApp] = useState(false);

    // Define logout first as it might be used by authFetch
    const logout = useCallback(() => {
        console.log("Logging out...");
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem(SESSION_TOKEN_KEY);
        localStorage.removeItem(TELEGRAM_ID_KEY); // Clear the telegram_id too
    }, []);

    // NEW: Centralized authenticated fetch helper
    const authFetch = useCallback(async (endpoint, options = {}) => {
        const storedToken = localStorage.getItem(SESSION_TOKEN_KEY);
        const storedTelegramId = localStorage.getItem(TELEGRAM_ID_KEY);

        if (!storedToken || !storedTelegramId) {
            console.error("AuthFetch: No credentials found in localStorage. Logging out.");
            logout(); // Trigger logout if credentials are missing
            throw new Error("Not authenticated");
        }

        const defaultHeaders = {
            'Content-Type': 'application/json',
            'X-Session-Token': storedToken,
            'X-Telegram-ID': storedTelegramId,
        };

        const config = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers, // Allow overriding default headers or adding new ones
            },
        };

        try {
            // Automatically prepend apiUrl if endpoint doesn't start with http
            const url = endpoint.startsWith('http') ? endpoint : apiUrl + endpoint;
            const response = await fetch(url, config);

            if (response.status === 401) {
                console.warn("AuthFetch: Received 401 Unauthorized. Logging out.");
                logout(); // Automatically log out on 401
                throw new Error("Unauthorized");
            }

            if (!response.ok) {
                // Try to get error details from response body
                let errorDetails = `API request failed with status ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorDetails += `: ${JSON.stringify(errorData)}`;
                } catch (e) {
                    // Ignore if response body is not JSON or empty
                }
                console.error(`AuthFetch Error: ${errorDetails}`);
                throw new Error(errorDetails); // Throw error with details if possible
            }

            // Handle successful responses
            if (response.headers.get("content-length") === "0" || response.status === 204) {
                return null; // No content
            }
            return await response.json(); // Parse JSON body

        } catch (error) {
            // Log network errors or errors from the try block
            console.error("AuthFetch Exception:", error);
            // Re-throw the error for the calling component to potentially handle
            // Avoid re-throwing specific "Unauthorized" error if logout is handled here
            if (error.message !== "Unauthorized") {
                throw error;
            }
            // If it was an Unauthorized error, we already logged out, maybe return null or specific error indication
            return Promise.reject(error); // Propagate the rejection
        }
    }, [logout]); // Dependency on logout


    // Verify session using custom headers - uses raw fetch as authFetch isn't available yet/circular dependency
    const verifySession = useCallback(async () => {
        console.log("Verifying session using stored credentials...");
        const storedToken = localStorage.getItem(SESSION_TOKEN_KEY);
        const storedTelegramId = localStorage.getItem(TELEGRAM_ID_KEY);

        if (!storedToken || !storedTelegramId) {
            console.log("No stored credentials found.");
            return false;
        }

        // setLoading(true) should be handled by the caller (initSession)
        try {
            // Use raw fetch here as authFetch depends on credentials being present
            const response = await fetch(`${apiUrl}/auth/me`, {
                method: 'GET',
                headers: {
                    'X-Session-Token': storedToken,
                    'X-Telegram-ID': storedTelegramId,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                // Do not call logout here, let initSession handle flow
                localStorage.removeItem(SESSION_TOKEN_KEY);
                localStorage.removeItem(TELEGRAM_ID_KEY);
                throw new Error(`Session verification failed: ${response.status}`);
            }
            const userData = await response.json();
            setUser(userData);
            setIsAuthenticated(true);
            console.log("Session verified successfully using custom headers.");
            return true;
        } catch (error) {
            console.error("Session verification error:", error);
            // Ensure state reflects failed verification, but don't logout yet
            setUser(null);
            setIsAuthenticated(false);
            localStorage.removeItem(SESSION_TOKEN_KEY); // Clean up storage on error too
            localStorage.removeItem(TELEGRAM_ID_KEY);
            return false;
        } finally {
            // setLoading(false) should be handled by the caller (initSession)
        }
    }, []); // No dependency on logout or authFetch

    // Authenticate user via /auth/telegram (unauthenticated), then fetch user data via /auth/me (authenticated)
    const authenticateTelegramUser = useCallback(async (userData) => {
        setLoading(true);
        let authData = null; // To store response from /auth/telegram
        try {
            // Step 1: Authenticate via /auth/telegram (does not require auth headers)
            const response = await fetch(`${apiUrl}/auth/telegram`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });

            if (!response.ok) {
                throw new Error(`Failed to authenticate via /auth/telegram: ${response.status}`);
            }
            authData = await response.json(); // { message, telegram_id, session_token }

            if (!authData.session_token || !authData.telegram_id) {
                throw new Error("Credentials missing in /auth/telegram response.");
            }

            // Step 2: Store credentials immediately
            localStorage.setItem(SESSION_TOKEN_KEY, authData.session_token);
            localStorage.setItem(TELEGRAM_ID_KEY, authData.telegram_id);

            // Step 3: Fetch full user data using the NEWLY stored credentials via /auth/me
            // We use raw fetch here to avoid potential issues if authFetch's dependencies aren't fully resolved
            const fetchResponse = await fetch(`${apiUrl}/auth/me`, {
                method: 'GET',
                headers: {
                    'X-Session-Token': authData.session_token,
                    'X-Telegram-ID': authData.telegram_id,
                    'Content-Type': 'application/json'
                }
            });

            if (!fetchResponse.ok) {
                // If fetching user data fails immediately after auth, something is wrong. Clean up.
                localStorage.removeItem(SESSION_TOKEN_KEY);
                localStorage.removeItem(TELEGRAM_ID_KEY);
                throw new Error(`Failed to fetch user data after authentication: ${fetchResponse.status}`);
            }

            const fullUserData = await fetchResponse.json();

            // Step 4: Set state only after all steps succeed
            setUser(fullUserData);
            setIsAuthenticated(true);
            console.log("User authenticated, credentials stored, user data fetched.");
            return authData; // Return original authData if needed by caller

        } catch (error) {
            console.error('Authentication process error:', error);
            setUser(null);
            setIsAuthenticated(false);
            // Ensure cleanup if any step failed
            localStorage.removeItem(SESSION_TOKEN_KEY);
            localStorage.removeItem(TELEGRAM_ID_KEY);
            return null; // Indicate failure
        } finally {
            setLoading(false);
        }
    }, []); // Keeping dependencies minimal for now


    // Check if running in Telegram WebApp (no change)
    useEffect(() => {
        try {
            const isTelegram = WebApp.initDataUnsafe && WebApp.initDataUnsafe.user;
            setIsTelegramApp(!!isTelegram);
        } catch (error) {
            console.error('Error checking Telegram WebApp:', error);
            setIsTelegramApp(false);
        }
    }, []);

    // Initialize user session
    useEffect(() => {
        const initSession = async () => {
            setLoading(true); // Ensure loading starts
            let sessionRestored = false;
            try {
                sessionRestored = await verifySession(); // Try restoring session first
            } catch (e) {
                // Errors during verifySession are logged internally, state/storage are cleaned up.
                // We just need to ensure loading stops eventually.
                console.error("Error during verifySession call in init:", e);
                sessionRestored = false; // Ensure it's false
            }

            // If session wasn't restored, AND (TWA or Mock mode), try TWA/Mock auth flow
            if (!sessionRestored && (isTelegramApp || useMockAuth)) {
                console.log("No valid stored session, attempting TWA/Mock auth...");
                // No need for try-catch here, authenticateTelegramUser handles its errors
                const success = await authenticateTelegramUser({ // This handles its own loading state and cleanup
                    telegram_id: useMockAuth ? mockTelegramData.id.toString() : WebApp.initDataUnsafe?.user?.id.toString(),
                    username: useMockAuth ? mockTelegramData.username : (WebApp.initDataUnsafe?.user?.username || WebApp.initDataUnsafe?.user?.id.toString()),
                    first_name: useMockAuth ? mockTelegramData.first_name : (WebApp.initDataUnsafe?.user?.first_name || ''),
                    last_name: useMockAuth ? mockTelegramData.last_name : (WebApp.initDataUnsafe?.user?.last_name || '')
                });
                if (!success) {
                    console.warn("TWA/Mock authentication failed.");
                    // State is already cleared by authenticateTelegramUser on failure
                    setLoading(false); // Ensure loading stops if auth fails
                }
                // authenticateTelegramUser sets loading to false in its finally block on success/failure

            } else if (!sessionRestored) {
                // Not restored, not TWA/Mock -> Ensure logged out state
                console.log("No stored session, not TWA/Mock. Ensuring logged out state.");
                setUser(null);
                setIsAuthenticated(false);
                setLoading(false); // Stop loading
            } else {
                // Session was restored by verifySession
                setLoading(false); // Stop loading after successful verification
            }
        };

        initSession();
    }, [verifySession, authenticateTelegramUser, isTelegramApp, useMockAuth]); // Added useMockAuth dependency

    // Login with Telegram widget data - uses authenticateTelegramUser
    const loginWithTelegramData = useCallback(async (authData) => {
        try {
            const telegramData = useMockAuth ? mockTelegramData : authData;
            if (!telegramData || !telegramData.id) {
                console.error("Invalid auth data received in loginWithTelegramData");
                return false;
            }
            // authenticateTelegramUser handles loading state, storage, state updates, cleanup
            const result = await authenticateTelegramUser({
                telegram_id: telegramData.id.toString(),
                username: telegramData.username || telegramData.id.toString(),
                first_name: telegramData.first_name || '',
                last_name: telegramData.last_name || ''
            });
            return !!result;
        } catch (error) {
            console.error('Error during loginWithTelegramData process:', error);
            return false;
        }
    }, [authenticateTelegramUser, useMockAuth]); // Added useMockAuth dependency


    return (
        <UserContext.Provider value={{
            user,
            // setUser, // Probably remove direct setUser access from context consumers
            loading,
            isAuthenticated,
            isTelegramApp,
            loginWithTelegramData,
            logout,
            authFetch // Provide the new helper function
        }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    return useContext(UserContext);
};
