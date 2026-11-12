const crypto = require("crypto");

const VISA_REFERRAL_REWARDS = Object.freeze({
  visa_six_month: 15100,
  visa_monthly: 4500,
});

function normalizeReferralCode(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);
}

function normalizeUpiId(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidUpiId(value) {
  const upiId = normalizeUpiId(value);
  return /^[a-z0-9][a-z0-9._-]{1,255}@[a-z][a-z0-9.-]{1,63}$/.test(upiId);
}

function createReferralCode(randomBytes = crypto.randomBytes) {
  return "MLV" + randomBytes(5).toString("hex").toUpperCase();
}

function rewardForPlan(planId) {
  return VISA_REFERRAL_REWARDS[String(planId || "")] || 0;
}

module.exports = {
  VISA_REFERRAL_REWARDS,
  createReferralCode,
  isValidUpiId,
  normalizeReferralCode,
  normalizeUpiId,
  rewardForPlan,
};
