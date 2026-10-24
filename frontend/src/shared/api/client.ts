import axios from "axios";

let inMemoryAccessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  inMemoryAccessToken = token;
};

export const apiClient = axios.create({
  baseURL: "/api/v1",
  withCredentials: true, // Crucial: forces the browser to send the ef_employee_refresh cookie
});

// Automatically attach the Bearer token to every request
apiClient.interceptors.request.use((config) => {
  if (inMemoryAccessToken) {
    config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
  }
  return config;
});

// Automatically catch 401s, rotate the token, and retry the failed request
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== "/auth/employee/login"
    ) {
      originalRequest._retry = true;
      try {
        const { data } = await axios.post(
          "/api/v1/auth/refresh",
          {},
          {
            baseURL: "/api/v1",
            withCredentials: true,
            headers: { "X-Requested-With": "EndosoFlow" }, // Mandatory CSRF defense
          },
        );

        setAccessToken(data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        setAccessToken(null);
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);
