const GURU_PARAB_PROMOTION = Object.freeze({
  code: "GURU_PARAB_2026",
  name: "Guru Parab Special",
  discountPercent: 80,
  startsAt: "2026-11-22T18:30:00.000Z",
  endsAt: "2026-11-24T18:30:00.000Z",
});

function getActiveVisaPromotion(now = Date.now()) {
  const timestamp = now instanceof Date ? now.getTime() : Number(now);
  const startsAt = Date.parse(GURU_PARAB_PROMOTION.startsAt);
  const endsAt = Date.parse(GURU_PARAB_PROMOTION.endsAt);
  return Number.isFinite(timestamp) && timestamp >= startsAt && timestamp < endsAt
    ? GURU_PARAB_PROMOTION
    : null;
}

function priceVisaPlan(plan, now = Date.now()) {
  const promotion = getActiveVisaPromotion(now);
  const originalAmount = Number(plan.amount);
  const amount = promotion
    ? Math.round(originalAmount * (100 - promotion.discountPercent) / 100)
    : originalAmount;
  return { ...plan, amount, originalAmount, promotion };
}

module.exports = {
  GURU_PARAB_PROMOTION,
  getActiveVisaPromotion,
  priceVisaPlan,
};
