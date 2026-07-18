import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_URL = "https://humorous-fulfillment-production-1f5e.up.railway.app";

function assetUrl(url) {
  if (!url) return "";
  return url.startsWith("http") ? url : `${API_URL}/uploads/${url}`;
}

function AdminCandidates() {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const role = localStorage.getItem("role");
    const token = localStorage.getItem("token");

    if (!token || (role !== "admin" && role !== "superadmin")) {
      navigate("/admin-login", { replace: true });
      return;
    }

    axios
      .get(`${API_URL}/api/admin/candidates`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => setCandidates(response.data))
      .catch(() => setError("Could not load the candidate directory."))
      .finally(() => setLoading(false));
  }, [navigate]);

  const filteredCandidates = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return candidates;

    return candidates.filter((candidate) =>
      [candidate.username, candidate.email, candidate.skills, candidate.experience]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term))
    );
  }, [candidates, query]);

  return (
    <main className="min-h-screen bg-gray-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <p className="text-sm font-semibold text-blue-600">ADMIN AREA</p>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
              Candidate Directory
            </h1>
            <p className="text-gray-600 mt-2">
              Review registered candidates, resumes, and contact details.
            </p>
          </div>
          <button
            onClick={() => navigate("/admin")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-semibold"
          >
            Back to Admin Dashboard
          </button>
        </div>

        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, email, skills, or experience"
          className="w-full mb-8 p-4 rounded-xl border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {loading && <p className="text-gray-600">Loading candidates...</p>}
        {error && <p className="text-red-600">{error}</p>}

        {!loading && !error && filteredCandidates.length === 0 && (
          <p className="text-gray-600">No matching candidates found.</p>
        )}

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredCandidates.map((candidate) => {
            const resume = assetUrl(candidate.resume_url);
            const avatar = assetUrl(candidate.profile_pic);

            return (
              <article key={candidate.id} className="bg-white rounded-2xl shadow-md p-6 flex flex-col">
                <div className="flex items-center gap-4 mb-5">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt=""
                      className="w-14 h-14 rounded-full object-cover border"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xl font-bold">
                      {(candidate.username || "C").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold text-gray-900 truncate">
                      {candidate.username || "Candidate"}
                    </h2>
                    <p className="text-sm text-gray-600 break-all">{candidate.email}</p>
                  </div>
                </div>

                {candidate.bio && <p className="text-gray-700 mb-4">{candidate.bio}</p>}

                <dl className="space-y-3 text-sm mb-6">
                  {candidate.skills && (
                    <div><dt className="font-semibold text-gray-900">Skills</dt><dd className="text-gray-600">{candidate.skills}</dd></div>
                  )}
                  {candidate.experience && (
                    <div><dt className="font-semibold text-gray-900">Experience</dt><dd className="text-gray-600">{candidate.experience}</dd></div>
                  )}
                  {candidate.education && (
                    <div><dt className="font-semibold text-gray-900">Education</dt><dd className="text-gray-600">{candidate.education}</dd></div>
                  )}
                  {candidate.projects && (
                    <div><dt className="font-semibold text-gray-900">Projects</dt><dd className="text-gray-600">{candidate.projects}</dd></div>
                  )}
                </dl>

                <div className="mt-auto grid grid-cols-2 gap-3">
                  {resume ? (
                    <a
                      href={resume}
                      target="_blank"
                      rel="noreferrer"
                      download
                      className="text-center border border-blue-600 text-blue-700 hover:bg-blue-50 px-3 py-3 rounded-xl font-semibold"
                    >
                      Resume
                    </a>
                  ) : (
                    <span className="text-center bg-gray-100 text-gray-500 px-3 py-3 rounded-xl font-semibold">
                      No resume
                    </span>
                  )}
                  <a
                    href={`mailto:${candidate.email}`}
                    className="text-center bg-blue-600 hover:bg-blue-700 text-white px-3 py-3 rounded-xl font-semibold"
                  >
                    Contact
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}

export default AdminCandidates;
