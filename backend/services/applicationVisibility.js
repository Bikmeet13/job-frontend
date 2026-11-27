const applicationSelect = `SELECT applications.*,
  COALESCE(jobs.title, 'Deleted Job') AS title,
  COALESCE(jobs.company, 'Unknown Company') AS company,
  COALESCE(applications.created_at, NOW()) AS created_at,
  COALESCE(applications.updated_at, applications.created_at, NOW()) AS updated_at
  FROM applications
  LEFT JOIN jobs ON applications.jobid = jobs.id`;

async function getVisibleApplications(db, user) {
  if (["admin", "superadmin"].includes(user.role)) {
    return (await db.query(`${applicationSelect}
      ORDER BY applications.updated_at DESC NULLS LAST, applications.id DESC`)).rows;
  }

  return (await db.query(`${applicationSelect}
    WHERE applications.candidate_user_id = $1
       OR (applications.candidate_user_id IS NULL AND LOWER(applications.email) = LOWER($2))
    ORDER BY applications.updated_at DESC NULLS LAST, applications.id DESC`, [user.id, user.email])).rows;
}

module.exports = { getVisibleApplications };
