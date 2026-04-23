import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api"
});

export const fetchJobs = async () => {
  const res = await API.get("/jobs");
  return res.data;
};