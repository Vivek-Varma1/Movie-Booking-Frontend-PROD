import axios from "axios";
import { appConfig } from "@/theme/theme";
import { emitUnauthorized } from "@/lib/auth-storage";

export const http = axios.create({ baseURL: appConfig.apiBaseUrl, withCredentials: true });

http.interceptors.response.use(
  (r) => r,
  (error) => {
    // Signed-out session checks and incorrect OTPs must not reopen/reset the modal.
    const status = error?.response?.status;
    if ((status === 401 || status === 403) && !error.config?.url?.startsWith("/auth/")) emitUnauthorized(status);
    return Promise.reject(error);
  },
);
