import axios from "axios";

const API = axios.create({
  baseURL: "https://job-frontend-pbhr.onrender.com/api"
});

export const fetchJobs = async () => {
  const res = await API.get("/jobs");
  return res.data;
};