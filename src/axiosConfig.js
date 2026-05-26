import axios from "axios";

const instance = axios.create({
  baseURL: "https://humorous-fulfillment-production-1f5e.up.railway.app"
});

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default instance;