import { useState } from 'react';
import api from '../api/client';

/**
 * Frontend for the 3 new AI endpoints in server/routes/ai.js (mounted at /api/ai):
 *   POST /api/ai/dynamic-rate
 *   POST /api/ai/carrier-capacity-forecast
 *   POST /api/ai/lane-profitability
 *
 * Mirrors AgentQuote.jsx style — Tailwind classes, axios via the shared client.
 */

const TABS = [
  { id: 'dynamic-rate', label: 'Dynamic Rate' },
  { id: 'carrier-capacity-forecast', label: 'Carrier Capacity Forecast' },
  { id: 'lane-profitability', label: 'Lane Profitability' },
  { id: 'contract-optimization', label: 'Contract Optimization' },
  { id: 'fraud-detection', label: 'Fraud Detection' },
  { id: 'shipment-mode-recommendation', label: 'Mode Recommendation' },
];

export default function AIPricingTools() {
  const [tab, setTab] = useState('dynamic-rate');

  const [rateForm, setRateForm] = useState({
    origin: '',
    destination: '',
    mode: 'truckload',
    weight_kg: '',
    distance_miles: '',
  });
  const [capacityForm, setCapacityForm] = useState({
    horizon_days: 14,
    region: '',
  });
  const [laneForm, setLaneForm] = useState({
    lookback_days: 90,
    min_shipments: 5,
  });
  const [contractForm, setContractForm] = useState({
    customer_id: '',
    lookback_days: 180,
  });
  const [fraudForm, setFraudForm] = useState({
    lookback_days: 90,
  });
  const [modeForm, setModeForm] = useState({
    origin: '',
    destination: '',
    weight_kg: '',
    volume_cbm: '',
    urgency: 'standard',
    budget_usd: '',
    value_usd: '',
    hazmat: false,
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const submit = async () => {
    setLoading(true);
    setResult(null);
    try {
      let body, path;
      if (tab === 'dynamic-rate') {
        path = '/ai/dynamic-rate';
        body = {
          ...rateForm,
          weight_kg: rateForm.weight_kg ? Number(rateForm.weight_kg) : undefined,
          distance_miles: rateForm.distance_miles ? Number(rateForm.distance_miles) : undefined,
        };
      } else if (tab === 'carrier-capacity-forecast') {
        path = '/ai/carrier-capacity-forecast';
        body = { ...capacityForm, horizon_days: Number(capacityForm.horizon_days) || undefined };
      } else if (tab === 'lane-profitability') {
        path = '/ai/lane-profitability';
        body = {
          lookback_days: Number(laneForm.lookback_days) || undefined,
          min_shipments: Number(laneForm.min_shipments) || undefined,
        };
      } else if (tab === 'contract-optimization') {
        path = '/ai/contract-optimization';
        body = {
          customer_id: contractForm.customer_id ? Number(contractForm.customer_id) : undefined,
          lookback_days: Number(contractForm.lookback_days) || undefined,
        };
      } else if (tab === 'fraud-detection') {
        path = '/ai/fraud-detection';
        body = { lookback_days: Number(fraudForm.lookback_days) || undefined };
      } else {
        path = '/ai/shipment-mode-recommendation';
        body = {
          origin: modeForm.origin,
          destination: modeForm.destination,
          weight_kg: modeForm.weight_kg ? Number(modeForm.weight_kg) : undefined,
          volume_cbm: modeForm.volume_cbm ? Number(modeForm.volume_cbm) : undefined,
          urgency: modeForm.urgency,
          budget_usd: modeForm.budget_usd ? Number(modeForm.budget_usd) : undefined,
          value_usd: modeForm.value_usd ? Number(modeForm.value_usd) : undefined,
          hazmat: !!modeForm.hazmat,
        };
      }
      const res = await api.post(path, body);
      setResult(res.data);
    } catch (err) {
      const status = err.response?.status;
      const errMsg = err.response?.data?.error || err.message;
      if (status === 503) {
        setResult({ error: errMsg, hint: 'AI service is not configured. Set OPENROUTER_API_KEY in the server .env to enable this feature.' });
      } else {
        setResult({ error: errMsg });
      }
    } finally {
      setLoading(false);
    }
  };

  const renderRateForm = () => (
    <div className="grid grid-cols-2 gap-3">
      <input className="px-3 py-2 border rounded" placeholder="Origin" value={rateForm.origin} onChange={(e) => setRateForm({ ...rateForm, origin: e.target.value })} />
      <input className="px-3 py-2 border rounded" placeholder="Destination" value={rateForm.destination} onChange={(e) => setRateForm({ ...rateForm, destination: e.target.value })} />
      <select className="px-3 py-2 border rounded" value={rateForm.mode} onChange={(e) => setRateForm({ ...rateForm, mode: e.target.value })}>
        <option value="truckload">Truckload</option>
        <option value="ltl">LTL</option>
        <option value="ocean">Ocean</option>
        <option value="air">Air</option>
        <option value="rail">Rail</option>
      </select>
      <input type="number" className="px-3 py-2 border rounded" placeholder="Weight (kg)" value={rateForm.weight_kg} onChange={(e) => setRateForm({ ...rateForm, weight_kg: e.target.value })} />
      <input type="number" className="px-3 py-2 border rounded" placeholder="Distance (miles)" value={rateForm.distance_miles} onChange={(e) => setRateForm({ ...rateForm, distance_miles: e.target.value })} />
    </div>
  );

  const renderCapacityForm = () => (
    <div className="grid grid-cols-2 gap-3">
      <input type="number" className="px-3 py-2 border rounded" placeholder="Horizon (days)" value={capacityForm.horizon_days} onChange={(e) => setCapacityForm({ ...capacityForm, horizon_days: e.target.value })} />
      <input className="px-3 py-2 border rounded" placeholder="Region (optional)" value={capacityForm.region} onChange={(e) => setCapacityForm({ ...capacityForm, region: e.target.value })} />
    </div>
  );

  const renderLaneForm = () => (
    <div className="grid grid-cols-2 gap-3">
      <input type="number" className="px-3 py-2 border rounded" placeholder="Lookback (days)" value={laneForm.lookback_days} onChange={(e) => setLaneForm({ ...laneForm, lookback_days: e.target.value })} />
      <input type="number" className="px-3 py-2 border rounded" placeholder="Min shipments" value={laneForm.min_shipments} onChange={(e) => setLaneForm({ ...laneForm, min_shipments: e.target.value })} />
    </div>
  );

  const renderContractForm = () => (
    <div className="grid grid-cols-2 gap-3">
      <input type="number" className="px-3 py-2 border rounded" placeholder="Customer ID (optional)" value={contractForm.customer_id} onChange={(e) => setContractForm({ ...contractForm, customer_id: e.target.value })} />
      <input type="number" className="px-3 py-2 border rounded" placeholder="Lookback (days)" value={contractForm.lookback_days} onChange={(e) => setContractForm({ ...contractForm, lookback_days: e.target.value })} />
    </div>
  );

  const renderFraudForm = () => (
    <div className="grid grid-cols-2 gap-3">
      <input type="number" className="px-3 py-2 border rounded" placeholder="Lookback (days)" value={fraudForm.lookback_days} onChange={(e) => setFraudForm({ ...fraudForm, lookback_days: e.target.value })} />
    </div>
  );

  const renderModeForm = () => (
    <div className="grid grid-cols-2 gap-3">
      <input className="px-3 py-2 border rounded" placeholder="Origin" value={modeForm.origin} onChange={(e) => setModeForm({ ...modeForm, origin: e.target.value })} />
      <input className="px-3 py-2 border rounded" placeholder="Destination" value={modeForm.destination} onChange={(e) => setModeForm({ ...modeForm, destination: e.target.value })} />
      <input type="number" className="px-3 py-2 border rounded" placeholder="Weight (kg)" value={modeForm.weight_kg} onChange={(e) => setModeForm({ ...modeForm, weight_kg: e.target.value })} />
      <input type="number" className="px-3 py-2 border rounded" placeholder="Volume (cbm, optional)" value={modeForm.volume_cbm} onChange={(e) => setModeForm({ ...modeForm, volume_cbm: e.target.value })} />
      <select className="px-3 py-2 border rounded" value={modeForm.urgency} onChange={(e) => setModeForm({ ...modeForm, urgency: e.target.value })}>
        <option value="standard">Standard</option>
        <option value="expedited">Expedited</option>
        <option value="economy">Economy</option>
      </select>
      <input type="number" className="px-3 py-2 border rounded" placeholder="Budget USD (optional)" value={modeForm.budget_usd} onChange={(e) => setModeForm({ ...modeForm, budget_usd: e.target.value })} />
      <input type="number" className="px-3 py-2 border rounded" placeholder="Declared value USD (optional)" value={modeForm.value_usd} onChange={(e) => setModeForm({ ...modeForm, value_usd: e.target.value })} />
      <label className="flex items-center gap-2 px-3 py-2">
        <input type="checkbox" checked={modeForm.hazmat} onChange={(e) => setModeForm({ ...modeForm, hazmat: e.target.checked })} />
        Hazmat
      </label>
    </div>
  );

  const valid =
    (tab === 'dynamic-rate' && rateForm.origin && rateForm.destination) ||
    (tab === 'carrier-capacity-forecast' && capacityForm.horizon_days) ||
    (tab === 'lane-profitability') ||
    (tab === 'contract-optimization') ||
    (tab === 'fraud-detection') ||
    (tab === 'shipment-mode-recommendation' && modeForm.origin && modeForm.destination && modeForm.weight_kg);

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-2">AI Pricing Tools</h1>
      <p className="text-gray-600 mb-4">
        Structured AI tools that complement Agent Quote: dynamic rate, carrier capacity forecast, and lane profitability.
      </p>

      <div className="flex gap-2 mb-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`px-4 py-2 rounded ${tab === t.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            onClick={() => { setTab(t.id); setResult(null); }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white p-4 rounded-lg shadow space-y-3">
        {tab === 'dynamic-rate' && renderRateForm()}
        {tab === 'carrier-capacity-forecast' && renderCapacityForm()}
        {tab === 'lane-profitability' && renderLaneForm()}
        {tab === 'contract-optimization' && renderContractForm()}
        {tab === 'fraud-detection' && renderFraudForm()}
        {tab === 'shipment-mode-recommendation' && renderModeForm()}

        <button onClick={submit} disabled={loading || !valid} className="px-6 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
          {loading ? 'Running...' : 'Run AI'}
        </button>
      </div>

      {result && (
        <div className="mt-6 bg-white rounded-lg shadow p-4">
          {result.error ? (
            <div>
              <div className="text-red-600">{result.error}</div>
              {result.hint && <div className="text-sm text-gray-600 mt-2">{result.hint}</div>}
            </div>
          ) : (
            <>
              {result.parsed && (
                <pre className="bg-slate-900 text-white text-xs p-3 rounded overflow-auto max-h-96">
                  {JSON.stringify(result.parsed, null, 2)}
                </pre>
              )}
              {!result.parsed && (
                <pre className="bg-slate-900 text-white text-xs p-3 rounded overflow-auto max-h-96">
                  {JSON.stringify(result, null, 2)}
                </pre>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
