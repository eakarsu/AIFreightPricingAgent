const STAGES = Object.freeze(['draft', 'costed', 'review', 'approved', 'offered', 'accepted', 'booked', 'expired']);

function positive(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw new Error(`${field} must be greater than zero`);
  return number;
}

function calculateQuote(input) {
  const distance = positive(input.distance, 'distance');
  const linehaul = positive(input.linehaul_rate, 'linehaul_rate');
  const fuel = Number(input.fuel_surcharge || 0);
  const accessorials = (input.accessorials || []).reduce((sum, item) => sum + positive(item.amount, 'accessorial amount'), 0);
  const cost = Math.round((distance * linehaul + fuel + accessorials) * 100) / 100;
  const marginPercent = Number(input.margin_percent);
  if (!Number.isFinite(marginPercent) || marginPercent < 0 || marginPercent >= 100) throw new Error('margin_percent must be between 0 and 100');
  const price = Math.round((cost / (1 - marginPercent / 100)) * 100) / 100;
  return { cost, price, margin_amount: Math.round((price - cost) * 100) / 100 };
}

function validateTransition(from, to, { role, rateValidUntil, evidenceCount = 0 } = {}) {
  const allowed = { draft: ['costed'], costed: ['draft', 'review'], review: ['costed', 'approved'], approved: ['offered'], offered: ['accepted', 'expired'], accepted: ['booked'], booked: [], expired: [] };
  if (!allowed[from]?.includes(to)) throw new Error('invalid quote transition');
  if (['approved', 'offered', 'booked'].includes(to) && !['admin', 'pricing_manager', 'pricing'].includes(role)) throw new Error('pricing authority required');
  if (['approved', 'offered'].includes(to) && (!rateValidUntil || new Date(rateValidUntil) <= new Date())) throw new Error('current rate evidence required');
  if (['approved', 'offered'].includes(to) && evidenceCount < 1) throw new Error('source evidence required');
  return true;
}

module.exports = { STAGES, calculateQuote, validateTransition };
