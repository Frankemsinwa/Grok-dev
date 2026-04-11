import Constants from 'expo-constants';

/**
 * Dynamically determines the API Base URL.
 * Falls back to the host IP (useful for physical devices/emulators) if the env var is missing.
 */
const getApiBaseUrl = () => {
  // 1. Check for the EXPO_PUBLIC_API_BASE_URL environment variable
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envUrl) return envUrl;

  // 2. Fallback for Local Development (Physical Devices / Emulators)
  // Constants.expoConfig.hostUri gives the IP:Port of the packager
  const debuggerHost = Constants.expoConfig?.hostUri;
  const hostIp = debuggerHost?.split(':')[0];

  if (hostIp) {
    return `http://${hostIp}:5000`;
  }

  // 3. Last resort
  return 'http://localhost:5000';
};

export const API_BASE_URL = getApiBaseUrl();
console.log('[Connection] Initialized with API_BASE_URL:', API_BASE_URL);
