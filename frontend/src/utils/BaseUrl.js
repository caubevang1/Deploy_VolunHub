import axios from "axios";
import { DOMAIN_BE, LOCALSTORAGE_USER } from "./Constants";
import { getLocalStorage } from "./Configs";

export const http = axios.create({
  baseURL: DOMAIN_BE,
  timeout: 10000,
});

http.interceptors.request.use((config) => {
  const user = getLocalStorage(LOCALSTORAGE_USER);
  if (user?.token) {
    config.headers.Authorization = `Bearer ${user.token}`;
  }
  return config;
});
