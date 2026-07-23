import axios from "axios";
import { useHunterStore } from "../stores/hunterStore.js";

console.log("VITE_API_URL:", import.meta.env.VITE_API_URL);

const api = axios.create({
  baseURL: "https://solo-leveling-system-backend-we1h.onrender.com/api/v1",
  withCredentials: true,
});

console.log("Axios baseURL:", api.defaults.baseURL);

// ── Request interceptor: attach access token ──────────────────────────────
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    // ONLY retry if status is 401. If it's 403 or 500, DO NOT RETRY/REFRESH.
    if (error.response?.status === 401 && !original._retry) {
      // ... keep existing refresh logic ...
    }

    // If it's a 500 or 403, just reject it so the UI can show the error
    return Promise.reject(error);
  },
);

// ── Response interceptor: handle 401 / token refresh ─────────────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            return api(original);
          })
          .catch((err) => Promise.reject(err));
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const { data } = await api.post("/auth/refresh-token", {});
        const newToken = data.data.accessToken;
        useHunterStore.getState().setToken(newToken);
        processQueue(null, newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useHunterStore.getState().clearAuth();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
