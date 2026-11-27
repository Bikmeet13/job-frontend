async function getCandidateDashboardStats(db, user) {
  const [savedJobs, applications] = await Promise.all([
    db.query("SELECT COUNT(*)::int AS count FROM saved_jobs WHERE user_id = $1", [user.id]),
    db.query(
      `SELECT COUNT(*)::int AS count
       FROM applications
       WHERE candidate_user_id = $1
          OR (candidate_user_id IS NULL AND LOWER(email) = LOWER($2))`,
      [user.id, user.email]
    ),
  ]);

  return {
    saved: Number(savedJobs.rows[0]?.count || 0),
    applied: Number(applications.rows[0]?.count || 0),
  };
}

module.exports = { getCandidateDashboardStats };
