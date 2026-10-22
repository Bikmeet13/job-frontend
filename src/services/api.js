import axios from "axios";

export const API = axios.create({
  baseURL: "https://humorous-fulfillment-production-1f5e.up.railway.app/api",
  // Do not leave a first-time visitor on a blank spinner forever if a service
  // is waking up or a network request stalls. Individual screens can recover
  // and show their normal interface after this limit.
  timeout: 20000,
});

export const fetchJobs = async () => {
  const res = await API.get("/jobs");
  return res.data;
};
