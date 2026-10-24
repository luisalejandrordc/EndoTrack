import axios from "axios";

let inMemoryAccessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  inMemoryAccessToken = token;
};

export const apiClient = axios.create({
  baseURL: "/api/v1",
  withCredentials: true, // Required to send the HttpOnly refresh cookie
});

// Attach access token
apiClient.interceptors.request.use((config) => {
  if (inMemoryAccessToken) {
    config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
  }
  return config;
});

// Automatic 401 Refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const { data } = await axios.post(
          "/api/v1/auth/refresh",
          {},
          {
            baseURL: "/api/v1",
            withCredentials: true,
            headers: { "X-Requested-With": "EndosoFlow" }, // Required CSRF header
          },
        );
        setAccessToken(data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        setAccessToken(null);
        window.location.href = "/login"; // Force logout on failed refresh
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);
