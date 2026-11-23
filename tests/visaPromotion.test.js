import { test } from "node:test";
import assert from "node:assert/strict";
import promotion from "../backend/services/visaPromotion.js";

const sixMonthPlan = { id: "visa_six_month", amount: 59900 };
const monthlyPlan = { id: "visa_monthly", amount: 12500 };

test("Guru Parab promotion gives exactly 80% off both Visa Jobs plans", () => {
  const duringOffer = new Date("2026-11-24T12:00:00.000Z");
  assert.equal(promotion.priceVisaPlan(sixMonthPlan, duringOffer).amount, 11980);
  assert.equal(promotion.priceVisaPlan(monthlyPlan, duringOffer).amount, 2500);
  assert.equal(promotion.priceVisaPlan(sixMonthPlan, duringOffer).promotion.discountPercent, 80);
});

test("Guru Parab promotion uses the exact IST start and midnight end boundaries", () => {
  assert.equal(promotion.getActiveVisaPromotion(new Date("2026-11-22T18:29:59.999Z")), null);
  assert.equal(promotion.getActiveVisaPromotion(new Date("2026-11-22T18:30:00.000Z"))?.code, "GURU_PARAB_2026");
  assert.equal(promotion.getActiveVisaPromotion(new Date("2026-11-24T18:29:59.999Z"))?.code, "GURU_PARAB_2026");
  assert.equal(promotion.getActiveVisaPromotion(new Date("2026-11-24T18:30:00.000Z")), null);
});

test("Visa Jobs prices automatically return to normal after the offer", () => {
  const afterOffer = new Date("2026-11-24T18:30:00.000Z");
  assert.equal(promotion.priceVisaPlan(sixMonthPlan, afterOffer).amount, 59900);
  assert.equal(promotion.priceVisaPlan(monthlyPlan, afterOffer).amount, 12500);
});
