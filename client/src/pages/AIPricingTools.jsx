import { useEffect, useState } from 'react';
import api from '../api/client';
import AIResponseCard from '../components/AIResponseCard';

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

function normalizeRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

export default function AIPricingTools() {
  const [tab, setTab] = useState('dynamic-rate');
  const [customers, setCustomers] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [shipments, setShipments] = useState([]);

  const [rateForm, setRateForm] = useState({
    route_id: '',
    shipment_id: '',
    origin: '',
    destination: '',
    mode: 'LTL',
    equipment: 'dry_van',
    weight_lbs: '',
    distance_miles: '',
    fuel_surcharge_pct: 28,
    capacity_utilization_pct: 80,
    urgency: 'standard',
  });
  const [capacityForm, setCapacityForm] = useState({
    horizon_days: 14,
    region: 'US Southeast',
    lanes_text: 'Dallas, US > Atlanta, US : dry_van\nLos Angeles, US > Phoenix, US : reefer\nChicago, US > Detroit, US : dry_van',
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
    route_id: '',
    shipment_id: '',
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

  useEffect(() => {
    Promise.all([
      api.get('/customers'),
      api.get('/routes'),
      api.get('/shipments'),
    ])
      .then(([customerResponse, routeResponse, shipmentResponse]) => {
        setCustomers(normalizeRows(customerResponse.data));
        setRoutes(normalizeRows(routeResponse.data));
        setShipments(normalizeRows(shipmentResponse.data));
      })
      .catch(() => {
        setCustomers([]);
        setRoutes([]);
        setShipments([]);
      });
  }, []);

  const applyRouteToRate = (routeId, extra = {}) => {
    const route = routes.find((item) => String(item.id) === String(routeId));
    if (!route) {
      setRateForm((current) => ({ ...current, route_id: routeId }));
      return;
    }
    setRateForm((current) => ({
      ...current,
      route_id: routeId,
      shipment_id: '',
      origin: `${route.origin_city}, ${route.origin_country}`,
      destination: `${route.destination_city}, ${route.destination_country}`,
      mode: route.mode || current.mode,
      distance_miles: route.distance_km ? Math.round(Number(route.distance_km) * 0.621371) : current.distance_miles,
      ...extra,
    }));
  };

  const applyShipmentToRate = (shipmentId, extra = {}) => {
    const shipment = shipments.find((item) => String(item.id) === String(shipmentId));
    if (!shipment) {
      setRateForm((current) => ({ ...current, shipment_id: shipmentId }));
      return;
    }
    setRateForm((current) => ({
      ...current,
      shipment_id: shipmentId,
      route_id: shipment.route_id || current.route_id,
      origin: shipment.origin || current.origin,
      destination: shipment.destination || current.destination,
      mode: shipment.mode || current.mode,
      weight_lbs: shipment.weight_kg ? Math.round(Number(shipment.weight_kg) * 2.20462) : current.weight_lbs,
      ...extra,
    }));
  };

  const fillDynamicRate = (kind) => {
    if (kind === 'shipment' && shipments[0]) {
      applyShipmentToRate(shipments[0].id, {
        equipment: 'dry_van',
        fuel_surcharge_pct: 28,
        capacity_utilization_pct: 82,
        urgency: 'standard',
      });
      return;
    }

    const route = kind === 'urgent' ? (routes[1] || routes[0]) : routes[0];
    const extra = kind === 'urgent'
      ? { weight_lbs: 9800, equipment: 'reefer', fuel_surcharge_pct: 32, capacity_utilization_pct: 91, urgency: 'expedited' }
      : { weight_lbs: 18000, equipment: 'dry_van', fuel_surcharge_pct: 28, capacity_utilization_pct: 80, urgency: 'standard' };

    if (route) applyRouteToRate(route.id, extra);
    else setRateForm((current) => ({ ...current, origin: 'Dallas, US', destination: 'Atlanta, US', distance_miles: 781, ...extra }));
  };

  const applyRouteToMode = (routeId, extra = {}) => {
    const route = routes.find((item) => String(item.id) === String(routeId));
    if (!route) {
      setModeForm((current) => ({ ...current, route_id: routeId }));
      return;
    }
    setModeForm((current) => ({
      ...current,
      route_id: routeId,
      shipment_id: '',
      origin: `${route.origin_city}, ${route.origin_country}`,
      destination: `${route.destination_city}, ${route.destination_country}`,
      ...extra,
    }));
  };

  const applyShipmentToMode = (shipmentId, extra = {}) => {
    const shipment = shipments.find((item) => String(item.id) === String(shipmentId));
    if (!shipment) {
      setModeForm((current) => ({ ...current, shipment_id: shipmentId }));
      return;
    }
    setModeForm((current) => ({
      ...current,
      shipment_id: shipmentId,
      route_id: shipment.route_id || current.route_id,
      origin: shipment.origin || current.origin,
      destination: shipment.destination || current.destination,
      weight_kg: shipment.weight_kg || current.weight_kg,
      volume_cbm: shipment.volume_cbm || current.volume_cbm,
      ...extra,
    }));
  };

  const fillModeRecommendation = (kind) => {
    if (kind === 'shipment' && shipments[0]) {
      applyShipmentToMode(shipments[0].id, {
        urgency: 'standard',
        budget_usd: 4200,
        value_usd: 58000,
        hazmat: false,
      });
      return;
    }

    const route = kind === 'urgent' ? (routes[1] || routes[0]) : routes[0];
    const extra = kind === 'urgent'
      ? { weight_kg: 4200, volume_cbm: 18, urgency: 'expedited', budget_usd: 8500, value_usd: 175000, hazmat: false }
      : { weight_kg: 8200, volume_cbm: 36, urgency: 'standard', budget_usd: 5200, value_usd: 68000, hazmat: false };

    if (route) applyRouteToMode(route.id, extra);
    else setModeForm((current) => ({ ...current, origin: 'Dallas, US', destination: 'Atlanta, US', ...extra }));
  };

  const submit = async () => {
    setLoading(true);
    setResult(null);
    try {
      let body, path;
      if (tab === 'dynamic-rate') {
        path = '/ai/dynamic-rate';
        body = {
          ...rateForm,
          route_id: undefined,
          shipment_id: undefined,
          weight_lbs: rateForm.weight_lbs ? Number(rateForm.weight_lbs) : undefined,
          distance_miles: rateForm.distance_miles ? Number(rateForm.distance_miles) : undefined,
          fuel_surcharge_pct: rateForm.fuel_surcharge_pct ? Number(rateForm.fuel_surcharge_pct) : undefined,
          capacity_utilization_pct: rateForm.capacity_utilization_pct ? Number(rateForm.capacity_utilization_pct) : undefined,
        };
      } else if (tab === 'carrier-capacity-forecast') {
        path = '/ai/carrier-capacity-forecast';
        const lanes = (capacityForm.lanes_text || '')
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const [route, mode] = line.split(':').map((s) => s.trim());
            const [origin, destination] = (route || '').split('>').map((s) => s.trim());
            return { origin, destination, mode: mode || 'dry_van' };
          })
          .filter((l) => l.origin && l.destination);
        body = {
          lanes,
          region: capacityForm.region || undefined,
          horizon_days: Number(capacityForm.horizon_days) || undefined,
        };
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
          route_id: undefined,
          shipment_id: undefined,
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
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 rounded-lg border border-indigo-100 bg-indigo-50 p-3">
        <button type="button" className="px-3 py-1.5 rounded border border-indigo-200 bg-white text-sm font-medium text-indigo-700 hover:bg-indigo-100" onClick={() => fillDynamicRate('route')}>
          Fill seeded lane
        </button>
        <button type="button" className="px-3 py-1.5 rounded border border-indigo-200 bg-white text-sm font-medium text-indigo-700 hover:bg-indigo-100" onClick={() => fillDynamicRate('urgent')}>
          Fill urgent lane
        </button>
        <button type="button" className="px-3 py-1.5 rounded border border-indigo-200 bg-white text-sm font-medium text-indigo-700 hover:bg-indigo-100" onClick={() => fillDynamicRate('shipment')}>
          Fill from shipment
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
      <select className="px-3 py-2 border rounded" value={rateForm.route_id} onChange={(e) => applyRouteToRate(e.target.value)}>
        <option value="">Select origin and destination lane</option>
        {routes.map((route) => (
          <option key={route.id} value={route.id}>
            {route.origin_city}, {route.origin_country} to {route.destination_city}, {route.destination_country} - {route.mode} (#{route.id})
          </option>
        ))}
      </select>
      <select className="px-3 py-2 border rounded" value={rateForm.shipment_id} onChange={(e) => applyShipmentToRate(e.target.value)}>
        <option value="">Or fill from shipment</option>
        {shipments.map((shipment) => (
          <option key={shipment.id} value={shipment.id}>
            {shipment.tracking_number} - {shipment.origin} to {shipment.destination} (#{shipment.id})
          </option>
        ))}
      </select>
      <input className="px-3 py-2 border rounded" placeholder="Origin city, state/country" value={rateForm.origin} onChange={(e) => setRateForm({ ...rateForm, origin: e.target.value, route_id: '' })} />
      <input className="px-3 py-2 border rounded" placeholder="Destination city, state/country" value={rateForm.destination} onChange={(e) => setRateForm({ ...rateForm, destination: e.target.value, route_id: '' })} />
      <select className="px-3 py-2 border rounded" value={rateForm.mode} onChange={(e) => setRateForm({ ...rateForm, mode: e.target.value })}>
        <option value="LTL">LTL</option>
        <option value="FTL">FTL</option>
        <option value="truck">Truck</option>
        <option value="ocean">Ocean</option>
        <option value="air">Air</option>
        <option value="rail">Rail</option>
        <option value="intermodal">Intermodal</option>
      </select>
      <select className="px-3 py-2 border rounded" value={rateForm.equipment} onChange={(e) => setRateForm({ ...rateForm, equipment: e.target.value })}>
        <option value="dry_van">Dry Van</option>
        <option value="reefer">Reefer</option>
        <option value="flatbed">Flatbed</option>
        <option value="container">Container</option>
        <option value="tanker">Tanker</option>
      </select>
      <input type="number" className="px-3 py-2 border rounded" placeholder="Weight (lbs)" value={rateForm.weight_lbs} onChange={(e) => setRateForm({ ...rateForm, weight_lbs: e.target.value })} />
      <input type="number" className="px-3 py-2 border rounded" placeholder="Distance (miles)" value={rateForm.distance_miles} onChange={(e) => setRateForm({ ...rateForm, distance_miles: e.target.value })} />
      <input type="number" className="px-3 py-2 border rounded" placeholder="Fuel surcharge %" value={rateForm.fuel_surcharge_pct} onChange={(e) => setRateForm({ ...rateForm, fuel_surcharge_pct: e.target.value })} />
      <input type="number" className="px-3 py-2 border rounded" placeholder="Capacity utilization %" value={rateForm.capacity_utilization_pct} onChange={(e) => setRateForm({ ...rateForm, capacity_utilization_pct: e.target.value })} />
      <select className="px-3 py-2 border rounded" value={rateForm.urgency} onChange={(e) => setRateForm({ ...rateForm, urgency: e.target.value })}>
        <option value="standard">Standard</option>
        <option value="expedited">Expedited</option>
        <option value="economy">Economy</option>
      </select>
      </div>
    </div>
  );

  const renderCapacityForm = () => (
    <div className="grid grid-cols-2 gap-3">
      <textarea
        className="px-3 py-2 border rounded col-span-2 font-mono text-sm"
        rows={3}
        placeholder={'Lanes (required) — one per line:  Origin > Destination : mode\ne.g. Dallas, US > Atlanta, US : dry_van'}
        value={capacityForm.lanes_text}
        onChange={(e) => setCapacityForm({ ...capacityForm, lanes_text: e.target.value })}
      />
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
      <select className="px-3 py-2 border rounded" value={contractForm.customer_id} onChange={(e) => setContractForm({ ...contractForm, customer_id: e.target.value })}>
        <option value="">All customers</option>
        {customers.map((customer) => (
          <option key={customer.id} value={customer.id}>
            {customer.company_name || customer.contact_name || 'Customer'} (#{customer.id})
          </option>
        ))}
      </select>
      <input type="number" className="px-3 py-2 border rounded" placeholder="Lookback (days)" value={contractForm.lookback_days} onChange={(e) => setContractForm({ ...contractForm, lookback_days: e.target.value })} />
    </div>
  );

  const renderFraudForm = () => (
    <div className="grid grid-cols-2 gap-3">
      <input type="number" className="px-3 py-2 border rounded" placeholder="Lookback (days)" value={fraudForm.lookback_days} onChange={(e) => setFraudForm({ ...fraudForm, lookback_days: e.target.value })} />
    </div>
  );

  const renderModeForm = () => (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 rounded-lg border border-indigo-100 bg-indigo-50 p-3">
        <button type="button" className="px-3 py-1.5 rounded border border-indigo-200 bg-white text-sm font-medium text-indigo-700 hover:bg-indigo-100" onClick={() => fillModeRecommendation('route')}>
          Fill seeded lane
        </button>
        <button type="button" className="px-3 py-1.5 rounded border border-indigo-200 bg-white text-sm font-medium text-indigo-700 hover:bg-indigo-100" onClick={() => fillModeRecommendation('urgent')}>
          Fill urgent lane
        </button>
        <button type="button" className="px-3 py-1.5 rounded border border-indigo-200 bg-white text-sm font-medium text-indigo-700 hover:bg-indigo-100" onClick={() => fillModeRecommendation('shipment')}>
          Fill from shipment
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
      <select className="px-3 py-2 border rounded" value={modeForm.route_id} onChange={(e) => applyRouteToMode(e.target.value)}>
        <option value="">Select origin and destination lane</option>
        {routes.map((route) => (
          <option key={route.id} value={route.id}>
            {route.origin_city}, {route.origin_country} to {route.destination_city}, {route.destination_country} - {route.mode} (#{route.id})
          </option>
        ))}
      </select>
      <select className="px-3 py-2 border rounded" value={modeForm.shipment_id} onChange={(e) => applyShipmentToMode(e.target.value)}>
        <option value="">Or fill from shipment</option>
        {shipments.map((shipment) => (
          <option key={shipment.id} value={shipment.id}>
            {shipment.tracking_number} - {shipment.origin} to {shipment.destination} (#{shipment.id})
          </option>
        ))}
      </select>
      <input className="px-3 py-2 border rounded" placeholder="Origin city, state/country" value={modeForm.origin} onChange={(e) => setModeForm({ ...modeForm, origin: e.target.value, route_id: '' })} />
      <input className="px-3 py-2 border rounded" placeholder="Destination city, state/country" value={modeForm.destination} onChange={(e) => setModeForm({ ...modeForm, destination: e.target.value, route_id: '' })} />
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
    </div>
  );

  const valid =
    (tab === 'dynamic-rate' && rateForm.origin && rateForm.destination && rateForm.weight_lbs) ||
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
        <div className="mt-6">
          <AIResponseCard response={result} title={`${TABS.find((item) => item.id === tab)?.label || 'AI'} Result`} />
        </div>
      )}
    </div>
  );
}
