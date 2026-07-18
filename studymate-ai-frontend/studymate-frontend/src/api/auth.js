import { apiClient } from "./client";

export async function registerUser({ email, password, displayName }) {
  const { data } = await apiClient.post("/auth/register", {
    email,
    password,
    display_name: displayName,
  });
  return data;
}

export async function loginUser({ email, password }) {
  const { data } = await apiClient.post("/auth/login", {
    email,
    password,
  });
  return data;
}

export async function refreshToken(refreshToken) {
  const { data } = await apiClient.post("/auth/refresh", {
    refresh_token: refreshToken,
  });
  return data;
}

export async function getMe() {
  const { data } = await apiClient.get("/auth/me");
  return data;
}

export async function performLogout(refreshToken) {
  await apiClient.post("/auth/logout", { refresh_token: refreshToken });
}
