import { test } from "node:test";
import assert from "node:assert/strict";
import referrals from "../backend/services/visaReferral.js";

test("visa referral rewards match the approved plans", () => {
  assert.equal(referrals.rewardForPlan("visa_six_month"), 15100);
  assert.equal(referrals.rewardForPlan("visa_monthly"), 4500);
  assert.equal(referrals.rewardForPlan("unknown"), 0);
});

test("UPI IDs are normalized and validated", () => {
  assert.equal(referrals.normalizeUpiId(" Name.Pay@OKAXIS "), "name.pay@okaxis");
  assert.equal(referrals.isValidUpiId("name.pay@okaxis"), true);
  assert.equal(referrals.isValidUpiId("not-an-id"), false);
  assert.equal(referrals.isValidUpiId("@bank"), false);
});

test("referral codes are normalized and generated without ambiguous punctuation", () => {
  assert.equal(referrals.normalizeReferralCode(" mlv-ab 12! "), "MLVAB12");
  assert.equal(referrals.createReferralCode(() => Buffer.from("0102030405", "hex")), "MLV0102030405");
});
