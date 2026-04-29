import axios from "axios";

const API = axios.create({
  baseURL: "https://humorous-fulfillment-production-1f5e.up.railway.app/api"
});

export const fetchJobs = async () => {
  const res = await API.get("/jobs");
  return res.data;
};