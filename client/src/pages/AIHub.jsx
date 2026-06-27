import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import AIResponseCard from '../components/AIResponseCard';

const modes = ['ocean', 'air', 'rail', 'truck', 'intermodal', 'LTL', 'FTL'];
const urgencyOptions = ['standard', 'expedited', 'economy'];

const tools = [
  {
    id: 'dynamic-rate',
    group: 'Pricing AI',
    title: 'Dynamic Rate',
    description: 'Recommend a freight price from lane, fuel, capacity, equipment, and urgency.',
    endpoint: '/ai/dynamic-rate',
    fields: [
      { name: 'route_id', label: 'Route', type: 'route' },
      { name: 'origin', label: 'Origin', required: true },
      { name: 'destination', label: 'Destination', required: true },
      { name: 'weight_lbs', label: 'Weight (lbs)', type: 'number', required: true },
      { name: 'mode', label: 'Mode', type: 'select', options: modes },
      { name: 'equipment', label: 'Equipment', type: 'select', options: ['dry_van', 'reefer', 'flatbed', 'container', 'tanker'] },
      { name: 'fuel_surcharge_pct', label: 'Fuel Surcharge %', type: 'number' },
      { name: 'capacity_utilization_pct', label: 'Capacity Utilization %', type: 'number' },
      { name: 'urgency', label: 'Urgency', type: 'select', options: urgencyOptions },
    ],
    defaults: { mode: 'LTL', equipment: 'dry_van', fuel_surcharge_pct: 28, capacity_utilization_pct: 80, urgency: 'standard' },
  },
  {
    id: 'carrier-capacity-forecast',
    group: 'Carrier AI',
    title: 'Carrier Capacity Forecast',
    description: 'Forecast capacity tightness for selected lanes and recommend rate strategy.',
    endpoint: '/ai/carrier-capacity-forecast',
    fields: [
      { name: 'route_id', label: 'Lane', type: 'route', required: true },
      { name: 'horizon_days', label: 'Horizon Days', type: 'number', required: true },
    ],
    defaults: { horizon_days: 30 },
    buildPayload: (form, lookups) => {
      const route = lookups.routes.find(r => String(r.id) === String(form.route_id));
      return {
        horizon_days: Number(form.horizon_days) || 30,
        lanes: route ? [{
          origin: `${route.origin_city}, ${route.origin_country}`,
          destination: `${route.destination_city}, ${route.destination_country}`,
          mode: route.mode,
        }] : [],
      };
    },
  },
  {
    id: 'lane-profitability',
    group: 'Pricing AI',
    title: 'Lane Profitability',
    description: 'Find unprofitable lanes and recommend repricing, expansion, or discontinuation.',
    endpoint: '/ai/lane-profitability',
    fields: [
      { name: 'lookback_days', label: 'Lookback Days', type: 'number', required: true },
      { name: 'min_shipments', label: 'Minimum Shipments', type: 'number', required: true },
    ],
    defaults: { lookback_days: 180, min_shipments: 1 },
  },
  {
    id: 'contract-optimization',
    group: 'Contract AI',
    title: 'Contract Optimization',
    description: 'Compare customer contracts against recent shipment benchmarks and renewal timing.',
    endpoint: '/ai/contract-optimization',
    fields: [
      { name: 'customer_id', label: 'Customer', type: 'customer' },
      { name: 'lookback_days', label: 'Lookback Days', type: 'number', required: true },
    ],
    defaults: { lookback_days: 180 },
  },
  {
    id: 'fraud-detection',
    group: 'Risk AI',
    title: 'Fraud Detection',
    description: 'Flag duplicate tracking numbers, impossible margins, and suspicious shipment patterns.',
    endpoint: '/ai/fraud-detection',
    fields: [
      { name: 'lookback_days', label: 'Lookback Days', type: 'number', required: true },
    ],
    defaults: { lookback_days: 90 },
  },
  {
    id: 'shipment-mode-recommendation',
    group: 'Shipment AI',
    title: 'Mode Recommendation',
    description: 'Recommend the best shipment mode from lane, urgency, budget, weight, and value.',
    endpoint: '/ai/shipment-mode-recommendation',
    fields: [
      { name: 'shipment_id', label: 'Use Shipment', type: 'shipment' },
      { name: 'origin', label: 'Origin', required: true },
      { name: 'destination', label: 'Destination', required: true },
      { name: 'weight_kg', label: 'Weight (kg)', type: 'number', required: true },
      { name: 'volume_cbm', label: 'Volume (CBM)', type: 'number' },
      { name: 'urgency', label: 'Urgency', type: 'select', options: urgencyOptions },
      { name: 'budget_usd', label: 'Budget USD', type: 'number' },
      { name: 'value_usd', label: 'Declared Value USD', type: 'number' },
      { name: 'hazmat', label: 'Hazmat', type: 'checkbox' },
    ],
    defaults: { urgency: 'standard', hazmat: false },
  },
  {
    id: 'spot-market-scan',
    group: 'Market AI',
    title: 'Spot Market Scan',
    description: 'Scan spot market conditions and propose pricing rule adjustments.',
    endpoint: '/spot-market/scan',
    fields: [
      { name: 'route_id', label: 'Lane', type: 'route' },
      { name: 'lane', label: 'Lane Text' },
      { name: 'mode', label: 'Mode', type: 'select', options: modes },
      { name: 'horizon_hours', label: 'Horizon Hours', type: 'number' },
    ],
    defaults: { mode: 'truck', horizon_hours: 24 },
  },
  {
    id: 'detention-demurrage',
    group: 'Shipment AI',
    title: 'Detention & Demurrage Predictor',
    description: 'Predict fee exposure from dwell time, free time, appointment misses, and congestion.',
    endpoint: '/detention-demurrage-predictor/predict',
    fields: [
      { name: 'route_id', label: 'Lane', type: 'route' },
      { name: 'lane', label: 'Lane Text' },
      { name: 'dwell_hours', label: 'Dwell Hours', type: 'number' },
      { name: 'free_hours', label: 'Free Hours', type: 'number' },
      { name: 'appointment_misses', label: 'Appointment Misses', type: 'number' },
      { name: 'port_congestion_pct', label: 'Port Congestion %', type: 'number' },
      { name: 'daily_charge', label: 'Daily Charge USD', type: 'number' },
    ],
    defaults: { dwell_hours: 38, free_hours: 24, appointment_misses: 1, port_congestion_pct: 72, daily_charge: 185 },
  },
  {
    id: 'damage-vision',
    group: 'Claims AI',
    title: 'Damage Vision Assessor',
    description: 'Estimate severity, repair cost, salvage value, and claim package from image URLs.',
    endpoint: '/damage-vision/assess',
    fields: [
      { name: 'shipment_id', label: 'Shipment', type: 'shipment', required: true },
      { name: 'damage_type', label: 'Damage Type', type: 'select', options: ['visible', 'concealed', 'shortage', 'temperature', 'wet', 'crushed', 'other'] },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'image_urls', label: 'Image URLs, one per line', type: 'textarea', required: true },
    ],
    buildPayload: (form) => ({
      shipment_id: form.shipment_id ? Number(form.shipment_id) : undefined,
      damage_type: form.damage_type,
      description: form.description,
      image_urls: String(form.image_urls || '').split('\n').map(v => v.trim()).filter(Boolean),
    }),
  },
];

const featureLinks = [
  { title: 'Agent Quote', group: 'Pricing AI', path: '/agent-quote', description: 'Agent-assisted freight quote generation.' },
  { title: 'AI Pricing Tools', group: 'Pricing AI', path: '/ai-pricing-tools', description: 'Original pricing AI workspace.' },
  { title: 'AI Results', group: 'System AI', path: '/ai-results', description: 'Saved AI outputs and audit history.' },
  { title: 'Lane Elasticity', group: 'Pricing AI', path: '/lane-elasticity', description: 'Lane acceptance and elasticity intelligence.' },
  { title: 'Renewal Alerts', group: 'Contract AI', path: '/renewal-alerts', description: 'Contract renewal risk and alerting.' },
  { title: 'Detention Demurrage Predictor', group: 'Shipment AI', path: '/detention-demurrage-predictor', description: 'Predict fee exposure and exception actions.' },
  { title: 'Backlog Tools', group: 'Operations AI', path: '/backlog-tools', description: 'Operational AI utilities and integration probes.' },
  { title: 'Agentic Spot-Market Trading Agent', group: 'Expansion AI', path: '/cf-agentic-spot-market-trading-agent-monito', description: 'Monitoring rates and auto-adjusting pricing rules.' },
  { title: 'Multimodal Optimization Solver', group: 'Expansion AI', path: '/cf-multimodal-optimization-solver-across-tr', description: 'Optimize mode mix across transport options.' },
  { title: 'Carrier Compliance + Sustainability Tracking', group: 'Expansion AI', path: '/cf-carrier-compliance-sustainability-tracki', description: 'Track carrier compliance and sustainability signals.' },
  { title: 'Supply Chain Finance Integration', group: 'Expansion AI', path: '/cf-supply-chain-finance-integration-recomme', description: 'Recommend finance and payment optimization moves.' },
  { title: 'Customer Demand Forecasting + Lane Capacity', group: 'Expansion AI', path: '/cf-customer-demand-forecasting-lane-capacit', description: 'Forecast demand and lane capacity pressure.' },
  { title: 'Vision-Based Damage Assessment', group: 'Expansion AI', path: '/cf-vision-based-damage-assessment-accepting', description: 'Assess cargo damage and claim package readiness.' },
  { title: 'Dynamic Rate Calculator Gap', group: 'Gap AI', path: '/gap-no-dynamic-rate-calculator-endpoint-real', description: 'Dynamic rate calculator analysis.' },
  { title: 'Carrier Capacity Forecast Gap', group: 'Gap AI', path: '/gap-no-carrier-capacity-forecast', description: 'Carrier capacity forecast analysis.' },
  { title: 'Contract Optimization Recommender Gap', group: 'Gap AI', path: '/gap-no-contract-optimization-recommender', description: 'Contract optimization recommender analysis.' },
  { title: 'Fraud Detection On Shipment Patterns Gap', group: 'Gap AI', path: '/gap-no-fraud-detection-on-shipment-patterns', description: 'Shipment fraud pattern analysis.' },
  { title: 'Lane Profitability Analyzer Gap', group: 'Gap AI', path: '/gap-no-lane-profitability-analyzer', description: 'Lane profitability and repricing analysis.' },
  { title: 'Mode Recommendation Gap', group: 'Gap AI', path: '/gap-no-mode-of-shipment-recommender-air', description: 'Air vs ocean vs truck recommendation analysis.' },
  { title: 'Notifications Gap', group: 'Gap AI', path: '/gap-limited-notifications-only-2-file-refere', description: 'Notification and file reference workflow analysis.' },
  { title: 'Webhook Receivers/Dispatchers Gap', group: 'Gap AI', path: '/gap-no-webhook-receiversdispatchers', description: 'Webhook event automation analysis.' },
  { title: 'Carrier Performance Scorecard Gap', group: 'Gap AI', path: '/gap-no-carrier-performance-scorecard-reports', description: 'Carrier scorecard report analysis.' },
  { title: 'Exception/Claim Management Gap', group: 'Gap AI', path: '/gap-no-exceptionclaim-management-module', description: 'Exception and claim workflow analysis.' },
  { title: 'Real-Time Shipment Tracking Gap', group: 'Gap AI', path: '/gap-no-websocket-real-time-shipment-tracking', description: 'Live shipment tracking analysis.' },
];

function normalizeRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function isEmpty(value) {
  return value === undefined || value === null || value === '';
}

function titleize(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());
}

function routePreset(route, fallback = {}) {
  if (!route) return fallback;
  const origin = `${route.origin_city}, ${route.origin_country}`;
  const destination = `${route.destination_city}, ${route.destination_country}`;
  return {
    route_id: route.id,
    origin,
    destination,
    lane: `${origin} to ${destination}`,
    mode: route.mode,
    ...fallback,
  };
}

function shipmentPreset(shipment, fallback = {}) {
  if (!shipment) return fallback;
  return {
    shipment_id: shipment.id,
    origin: shipment.origin,
    destination: shipment.destination,
    weight_kg: shipment.weight_kg,
    volume_cbm: shipment.volume_cbm,
    mode: shipment.mode,
    ...fallback,
  };
}

function getToolPresets(toolId, lookups) {
  const route = lookups.routes[0];
  const altRoute = lookups.routes[1] || route;
  const customer = lookups.customers[0];
  const shipment = lookups.shipments[0];
  const altShipment = lookups.shipments[1] || shipment;

  const presets = {
    'dynamic-rate': [
      { label: 'Seeded lane', values: routePreset(route, { weight_lbs: 18000, equipment: 'dry_van', fuel_surcharge_pct: 28, capacity_utilization_pct: 82, urgency: 'standard' }) },
      { label: 'Expedited reefer', values: routePreset(altRoute, { weight_lbs: 9200, equipment: 'reefer', fuel_surcharge_pct: 31, capacity_utilization_pct: 91, urgency: 'expedited' }) },
      { label: 'Economy container', values: routePreset(route, { weight_lbs: 42000, equipment: 'container', fuel_surcharge_pct: 24, capacity_utilization_pct: 68, urgency: 'economy' }) },
    ],
    'carrier-capacity-forecast': [
      { label: '30 day lane', values: routePreset(route, { horizon_days: 30 }) },
      { label: '60 day pressure', values: routePreset(altRoute, { horizon_days: 60 }) },
      { label: 'Two week check', values: routePreset(route, { horizon_days: 14 }) },
    ],
    'lane-profitability': [
      { label: 'Last 90 days', values: { lookback_days: 90, min_shipments: 1 } },
      { label: 'Six month review', values: { lookback_days: 180, min_shipments: 3 } },
      { label: 'Annual lanes', values: { lookback_days: 365, min_shipments: 5 } },
    ],
    'contract-optimization': [
      { label: 'Seeded customer', values: { customer_id: customer?.id || '', lookback_days: 180 } },
      { label: 'All customers', values: { customer_id: '', lookback_days: 180 } },
      { label: 'Annual renewal', values: { customer_id: customer?.id || '', lookback_days: 365 } },
    ],
    'fraud-detection': [
      { label: 'Recent activity', values: { lookback_days: 30 } },
      { label: 'Quarter scan', values: { lookback_days: 90 } },
      { label: 'Deep audit', values: { lookback_days: 365 } },
    ],
    'shipment-mode-recommendation': [
      { label: 'Seeded shipment', values: shipmentPreset(shipment, { urgency: 'standard', budget_usd: 4200, value_usd: 58000, hazmat: false }) },
      { label: 'Urgent high value', values: shipmentPreset(altShipment, { urgency: 'expedited', budget_usd: 8500, value_usd: 175000, hazmat: false }) },
      { label: 'Hazmat review', values: shipmentPreset(shipment, { urgency: 'standard', budget_usd: 6500, value_usd: 92000, hazmat: true }) },
    ],
    'spot-market-scan': [
      { label: 'Seeded lane', values: routePreset(route, { horizon_hours: 24 }) },
      { label: '48 hour watch', values: routePreset(altRoute, { horizon_hours: 48 }) },
      { label: 'Same day swing', values: routePreset(route, { horizon_hours: 8 }) },
    ],
    'detention-demurrage': [
      { label: 'Port delay', values: routePreset(route, { dwell_hours: 38, free_hours: 24, appointment_misses: 1, port_congestion_pct: 72, daily_charge: 185 }) },
      { label: 'High exposure', values: routePreset(altRoute, { dwell_hours: 64, free_hours: 24, appointment_misses: 2, port_congestion_pct: 88, daily_charge: 240 }) },
      { label: 'Low risk', values: routePreset(route, { dwell_hours: 18, free_hours: 24, appointment_misses: 0, port_congestion_pct: 35, daily_charge: 150 }) },
    ],
    'damage-vision': [
      { label: 'Visible pallet damage', values: { shipment_id: shipment?.id || '', damage_type: 'visible', description: 'Forklift impact on two outer cartons; product condition unknown.', image_urls: 'https://example.com/damage-pallet-front.jpg\nhttps://example.com/damage-pallet-side.jpg' } },
      { label: 'Wet cargo claim', values: { shipment_id: altShipment?.id || shipment?.id || '', damage_type: 'wet', description: 'Water staining on cartons after delivery exception; consignee reports softened packaging.', image_urls: 'https://example.com/wet-carton-1.jpg\nhttps://example.com/wet-carton-2.jpg' } },
      { label: 'Temperature exception', values: { shipment_id: shipment?.id || '', damage_type: 'temperature', description: 'Temperature logger exceeded threshold during transit; assess claim packet readiness.', image_urls: 'https://example.com/temp-logger.jpg\nhttps://example.com/product-condition.jpg' } },
    ],
  };

  return presets[toolId] || [];
}

function ResultView({ result }) {
  return <AIResponseCard response={result} title="AI Hub Result" />;
}

export default function AIHub() {
  const [activeId, setActiveId] = useState(tools[0].id);
  const [forms, setForms] = useState(() => Object.fromEntries(tools.map(tool => [tool.id, tool.defaults || {}])));
  const [lookups, setLookups] = useState({ customers: [], carriers: [], routes: [], contracts: [], shipments: [], quotes: [] });
  const [lookupError, setLookupError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const activeTool = tools.find(tool => tool.id === activeId) || tools[0];
  const form = forms[activeTool.id] || {};
  const presets = useMemo(() => getToolPresets(activeTool.id, lookups), [activeTool.id, lookups]);
  const groups = useMemo(() => [...new Set(tools.map(tool => tool.group))], []);
  const featureGroups = useMemo(() => [...new Set(featureLinks.map(feature => feature.group))], []);

  useEffect(() => {
    async function loadLookups() {
      try {
        const [customers, carriers, routes, contracts, shipments, quotes] = await Promise.all([
          api.get('/customers'),
          api.get('/carriers'),
          api.get('/routes'),
          api.get('/contracts'),
          api.get('/shipments'),
          api.get('/rate-quotes'),
        ]);
        setLookups({
          customers: normalizeRows(customers.data),
          carriers: normalizeRows(carriers.data),
          routes: normalizeRows(routes.data),
          contracts: normalizeRows(contracts.data),
          shipments: normalizeRows(shipments.data),
          quotes: normalizeRows(quotes.data),
        });
      } catch (err) {
        setLookupError(err.response?.data?.error || 'Could not load dropdown data.');
      }
    }
    loadLookups();
  }, []);

  const updateForm = (name, value) => {
    setForms(current => ({ ...current, [activeTool.id]: { ...(current[activeTool.id] || {}), [name]: value } }));
  };

  const applyPreset = (values) => {
    setForms(current => ({
      ...current,
      [activeTool.id]: {
        ...(activeTool.defaults || {}),
        ...values,
      },
    }));
    setResult(null);
  };

  const applyRoute = (routeId) => {
    const route = lookups.routes.find(item => String(item.id) === String(routeId));
    updateForm('route_id', routeId);
    if (!route) return;
    const lane = `${route.origin_city}, ${route.origin_country} to ${route.destination_city}, ${route.destination_country}`;
    setForms(current => ({
      ...current,
      [activeTool.id]: {
        ...(current[activeTool.id] || {}),
        route_id: routeId,
        origin: `${route.origin_city}, ${route.origin_country}`,
        destination: `${route.destination_city}, ${route.destination_country}`,
        mode: route.mode || current[activeTool.id]?.mode,
        lane,
      },
    }));
  };

  const applyShipment = (shipmentId) => {
    const shipment = lookups.shipments.find(item => String(item.id) === String(shipmentId));
    updateForm('shipment_id', shipmentId);
    if (!shipment) return;
    setForms(current => ({
      ...current,
      [activeTool.id]: {
        ...(current[activeTool.id] || {}),
        shipment_id: shipmentId,
        origin: shipment.origin || current[activeTool.id]?.origin,
        destination: shipment.destination || current[activeTool.id]?.destination,
        weight_kg: shipment.weight_kg || current[activeTool.id]?.weight_kg,
        volume_cbm: shipment.volume_cbm || current[activeTool.id]?.volume_cbm,
        mode: shipment.mode || current[activeTool.id]?.mode,
      },
    }));
  };

  const buildPayload = () => {
    if (activeTool.buildPayload) return activeTool.buildPayload(form, lookups);
    return Object.fromEntries(Object.entries(form).map(([key, value]) => {
      if (['customer_id', 'carrier_id', 'route_id', 'contract_id', 'quote_id', 'shipment_id'].includes(key)) {
        return [key, value ? Number(value) : undefined];
      }
      if (typeof value === 'string' && value !== '' && /(_days|_hours|_pct|_usd|_kg|_lbs|misses|charge|utilization)/.test(key)) {
        return [key, Number(value)];
      }
      return [key, value];
    }).filter(([, value]) => !isEmpty(value)));
  };

  const submit = async () => {
    const missing = activeTool.fields.find(field => field.required && isEmpty(form[field.name]));
    if (missing) {
      setResult({ error: `${missing.label} is required.` });
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.post(activeTool.endpoint, buildPayload());
      setResult(data);
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.error || err.message;
      setResult({
        error: message,
        hint: status === 503 ? 'Set OPENROUTER_API_KEY in the server .env to enable this AI tool.' : undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field) => {
    const value = form[field.name] ?? '';
    const baseClass = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100';

    if (field.type === 'customer') {
      return (
        <select className={baseClass} value={value} onChange={e => updateForm(field.name, e.target.value)}>
          <option value="">All customers</option>
          {lookups.customers.map(customer => <option key={customer.id} value={customer.id}>{customer.company_name} (#{customer.id})</option>)}
        </select>
      );
    }
    if (field.type === 'carrier') {
      return (
        <select className={baseClass} value={value} onChange={e => updateForm(field.name, e.target.value)}>
          <option value="">Select carrier</option>
          {lookups.carriers.map(carrier => <option key={carrier.id} value={carrier.id}>{carrier.name} - {carrier.mode} (#{carrier.id})</option>)}
        </select>
      );
    }
    if (field.type === 'route') {
      return (
        <select className={baseClass} value={value} onChange={e => applyRoute(e.target.value)}>
          <option value="">Select lane</option>
          {lookups.routes.map(route => (
            <option key={route.id} value={route.id}>
              {route.origin_city} to {route.destination_city} - {route.mode} (#{route.id})
            </option>
          ))}
        </select>
      );
    }
    if (field.type === 'contract') {
      return (
        <select className={baseClass} value={value} onChange={e => updateForm(field.name, e.target.value)}>
          <option value="">Select contract</option>
          {lookups.contracts.map(contract => <option key={contract.id} value={contract.id}>{contract.contract_number} - {contract.customer_name || `Customer #${contract.customer_id}`}</option>)}
        </select>
      );
    }
    if (field.type === 'quote') {
      return (
        <select className={baseClass} value={value} onChange={e => updateForm(field.name, e.target.value)}>
          <option value="">Select quote</option>
          {lookups.quotes.map(quote => <option key={quote.id} value={quote.id}>{quote.quote_number} - {quote.origin} to {quote.destination}</option>)}
        </select>
      );
    }
    if (field.type === 'shipment') {
      return (
        <select className={baseClass} value={value} onChange={e => applyShipment(e.target.value)}>
          <option value="">Select shipment</option>
          {lookups.shipments.map(shipment => <option key={shipment.id} value={shipment.id}>{shipment.tracking_number} - {shipment.status} (#{shipment.id})</option>)}
        </select>
      );
    }
    if (field.type === 'select') {
      return (
        <select className={baseClass} value={value} onChange={e => updateForm(field.name, e.target.value)}>
          <option value="">Select...</option>
          {field.options.map(option => <option key={option} value={option}>{titleize(option)}</option>)}
        </select>
      );
    }
    if (field.type === 'textarea') {
      return <textarea rows={4} className={baseClass} value={value} onChange={e => updateForm(field.name, e.target.value)} />;
    }
    if (field.type === 'checkbox') {
      return <input type="checkbox" checked={!!value} onChange={e => updateForm(field.name, e.target.checked)} className="h-4 w-4 rounded border-slate-300" />;
    }
    return <input type={field.type || 'text'} className={baseClass} value={value} onChange={e => updateForm(field.name, e.target.value)} />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">AI Hub</h1>
        <p className="mt-1 text-sm text-slate-500">Run freight AI tools with dropdown context from customers, carriers, routes, contracts, quotes, and shipments.</p>
      </div>

      {lookupError && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{lookupError}</div>}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          {groups.map(group => (
            <div key={group} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <h2 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{group}</h2>
              <div className="space-y-1">
                {tools.filter(tool => tool.group === group).map(tool => (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => { setActiveId(tool.id); setResult(null); }}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${activeId === tool.id ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                  >
                    <div className="font-semibold">{tool.title}</div>
                    <div className={`mt-0.5 text-xs ${activeId === tool.id ? 'text-indigo-100' : 'text-slate-500'}`}>{tool.description}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        <main className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-900">{activeTool.title}</h2>
              <p className="mt-1 text-sm text-slate-500">{activeTool.description}</p>
            </div>

            {presets.length > 0 && (
              <div className="mb-5 rounded-lg border border-indigo-100 bg-indigo-50 p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-700">Fill AI Fields</div>
                <div className="flex flex-wrap gap-2">
                  {presets.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => applyPreset(preset.values)}
                      className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {activeTool.fields.map(field => (
                <label key={field.name} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                  <div className="mb-1 text-sm font-medium text-slate-700">{field.label}{field.required && <span className="text-red-500"> *</span>}</div>
                  {renderField(field)}
                </label>
              ))}
            </div>

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={submit}
                disabled={loading}
                className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
              >
                {loading ? 'Running...' : 'Run AI Tool'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setForms(current => ({ ...current, [activeTool.id]: activeTool.defaults || {} }));
                  setResult(null);
                }}
                className="rounded-lg border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Reset
              </button>
            </div>
          </section>

          <ResultView result={result} />
        </main>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">All AI Feature Pages</h2>
          <p className="mt-1 text-sm text-slate-500">Every AI workspace, operational tool, generated feature, and gap-analysis page currently available in this app.</p>
        </div>
        <div className="space-y-5">
          {featureGroups.map(group => (
            <div key={group}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{group}</h3>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {featureLinks.filter(feature => feature.group === group).map(feature => (
                  <Link
                    key={feature.path}
                    to={feature.path}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-4 transition hover:border-indigo-200 hover:bg-indigo-50"
                  >
                    <div className="font-semibold text-slate-900">{feature.title}</div>
                    <div className="mt-1 text-sm text-slate-500">{feature.description}</div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
