const db = require("../db");

// Keep recommendation behaviour transparent and adjustable in one place.
const FEATURED_RANKING_WEIGHTS = {
  plan29: 30, plan11: 20, defaultPlan: 15, skillMatch: 6, locationMatch: 18,
  categoryMatch: 14, experienceMatch: 8, freshness: 12, engagement: 8, deadlineSoon: 5,
};

const words = (value) => String(value || "").toLowerCase().split(/[^a-z0-9+#.]+/).filter((word) => word.length > 1);
const unique = (items) => [...new Set(items)];
const numberIn = (value) => Number((String(value || "").match(/\d+(?:\.\d+)?/) || [])[0]);

function candidateScore(job, candidate, context) {
  let score = (job.plan_id === "featured_29" ? FEATURED_RANKING_WEIGHTS.plan29 : job.plan_id === "featured_11" ? FEATURED_RANKING_WEIGHTS.plan11 : FEATURED_RANKING_WEIGHTS.defaultPlan) + Math.min(Number(job.promotion_priority || 0), 100);
  const jobWords = unique(words(`${job.title} ${job.skills} ${job.description} ${job.job_category}`));
  const candidateWords = unique(words(`${candidate?.skills || ""} ${candidate?.bio || ""} ${context.query || ""}`));
  const sharedSkills = candidateWords.filter((word) => jobWords.includes(word)).length;
  score += Math.min(sharedSkills, 5) * FEATURED_RANKING_WEIGHTS.skillMatch;
  const location = String(context.location || candidate?.location || candidate?.bio || "").toLowerCase();
  if (location && String(job.location || "").toLowerCase().includes(location)) score += FEATURED_RANKING_WEIGHTS.locationMatch;
  if (context.category && String(job.job_category || "").toLowerCase() === String(context.category).toLowerCase()) score += FEATURED_RANKING_WEIGHTS.categoryMatch;
  const candidateExperience = numberIn(candidate?.experience);
  const requiredExperience = numberIn(job.experience);
  if (candidateExperience && requiredExperience) score += candidateExperience >= requiredExperience ? FEATURED_RANKING_WEIGHTS.experienceMatch : -1000;
  const ageDays = Math.max(0, (Date.now() - new Date(job.posted_at || Date.now()).getTime()) / 86400000);
  score += Math.max(0, FEATURED_RANKING_WEIGHTS.freshness - ageDays);
  score += Math.min(8, Math.log2(1 + Number(job.apply_clicks || 0) + Number(job.views_count || 0) / 10));
  if (job.last_date && /^\d{4}-\d{2}-\d{2}$/.test(job.last_date)) { const days = (new Date(job.last_date).getTime() - Date.now()) / 86400000; if (days >= 0 && days <= 14) score += FEATURED_RANKING_WEIGHTS.deadlineSoon; }
  return score;
}

function rotation(job, context) {
  const seed = `${new Date().toISOString().slice(0, 10)}:${context.candidateId || context.visitorKey || "public"}:${job.id}`;
  return [...seed].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 1000, 0) / 100000;
}

async function getFeaturedJobs(context = {}) {
  const limit = Math.min(Math.max(Number(context.limit) || 8, 1), 10);
  const candidate = context.candidateId ? (await db.query("SELECT id, bio, skills, experience FROM users WHERE id=$1 AND role='user'", [context.candidateId])).rows[0] : null;
  const query = `SELECT j.* FROM jobs j LEFT JOIN users e ON e.id=j.employer_id WHERE j.is_featured=TRUE AND (j.employer_id IS NULL OR j.employer_status='Live') AND (j.featured_start_date IS NULL OR j.featured_start_date <= NOW()) AND (j.featured_end_date IS NULL OR j.featured_end_date > NOW()) AND (e.id IS NULL OR e.employer_suspended=FALSE) AND CASE WHEN j.last_date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN j.last_date::date >= CURRENT_DATE ELSE TRUE END ORDER BY j.featured_end_date ASC NULLS LAST LIMIT 80`;
  const jobs = (await db.query(query)).rows;
  return jobs.map((job) => ({ ...job, applyLink: job.apply_link || null, featured: true, featured_score: candidateScore(job, candidate, context) + rotation(job, context) })).filter((job) => job.featured_score > -500).sort((a, b) => b.featured_score - a.featured_score).slice(0, limit);
}

module.exports = { FEATURED_RANKING_WEIGHTS, getFeaturedJobs };
