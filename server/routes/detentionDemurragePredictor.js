const express = require('express');

const router = express.Router();

function predict(payload = {}) {
  const dwellHours = Number(payload.dwell_hours ?? 38);
  const freeHours = Number(payload.free_hours ?? 24);
  const appointmentMisses = Number(payload.appointment_misses ?? 1);
  const portCongestion = Number(payload.port_congestion_pct ?? 72);
  const dailyCharge = Number(payload.daily_charge ?? 185);
  const overageHours = Math.max(0, dwellHours - freeHours);
  const riskScore = Math.min(100, Math.round(overageHours * 3 + appointmentMisses * 18 + portCongestion * 0.45));
  const projectedFees = Math.round(Math.ceil(overageHours / 24) * dailyCharge);

  return {
    lane: payload.lane || 'LAX to Dallas intermodal',
    risk_score: riskScore,
    tier: riskScore >= 75 ? 'critical' : riskScore >= 50 ? 'watch' : 'normal',
    projected_fees: projectedFees,
    triggers: [
      `${overageHours} hours beyond free time`,
      `${appointmentMisses} missed or rolled appointment(s)`,
      `${portCongestion}% congestion index`,
    ],
    actions: [
      'Pre-book recovery appointment before container availability confirmation.',
      'Push consignee exception notice with fee exposure and deadline.',
      'Escalate carrier free-time extension when congestion index is above 65%.',
    ],
  };
}

router.get('/', (req, res) => res.json(predict()));
router.post('/predict', (req, res) => res.json(predict(req.body || {})));

module.exports = router;
