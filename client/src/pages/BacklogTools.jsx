// Apply pass 5 — Backlog tool surface for the freight project.
// Wires the new /api/backlog/* endpoints (integrations, billing, notifications,
// agentic spot recommend, multimodal optimizer, vision damage assessment).
import { useState, useEffect } from 'react';
import api from '../api/client';
import AIResponseCard from '../components/AIResponseCard';

const TABS = [
  { k: 'integrations', label: 'Integrations' },
  { k: 'billing', label: 'Billing' },
  { k: 'notify', label: 'Notify' },
  { k: 'agent', label: 'Spot Agent' },
  { k: 'multimodal', label: 'Multimodal' },
  { k: 'vision', label: 'Damage Vision' }
];

function normalizeRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

export default function BacklogTools() {
  const [tab, setTab] = useState('integrations');
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState(null);
  const [err, setErr] = useState(null);
  const [diag, setDiag] = useState(null);
  const [customers, setCustomers] = useState([]);

  // Billing form
  const [bEmail, setBEmail] = useState('');
  const [bItems, setBItems] = useState('[{"description":"Lane LAX-CHI","qty":1,"unit_amount_usd":2500}]');

  // Notify form
  const [nTo, setNTo] = useState('');
  const [nSubject, setNSubject] = useState('Quote ready');
  const [nBody, setNBody] = useState('Your freight quote is attached.');

  // Spot agent form
  const [sOrigin, setSOrigin] = useState('Los Angeles, CA');
  const [sDest, setSDest] = useState('Chicago, IL');
  const [sUrgency, setSUrgency] = useState('normal');

  // Multimodal form
  const [mWeight, setMWeight] = useState(2000);
  const [mDist, setMDist] = useState(800);
  const [mUrg, setMUrg] = useState('normal');

  // Vision form
  const [vDesc, setVDesc] = useState('Pallet shows multiple dents and a crack on the corner.');

  useEffect(() => {
    api.get('/backlog/_diagnostics').then(r => setDiag(r.data)).catch(() => {});
    api.get('/customers').then(r => setCustomers(normalizeRows(r.data))).catch(() => setCustomers([]));
  }, []);

  async function probe(path) {
    setBusy(true); setErr(null); setOut(null);
    try { const r = await api.get(path); setOut(r.data); }
    catch (e) { setErr(e?.response?.data?.missing ? `Set ${e.response.data.missing}` : (e?.response?.data?.error || e.message)); setOut(e?.response?.data); }
    finally { setBusy(false); }
  }
  async function post(path, body) {
    setBusy(true); setErr(null); setOut(null);
    try { const r = await api.post(path, body); setOut(r.data); }
    catch (e) { setErr(e?.response?.data?.missing ? `Set ${e.response.data.missing}` : (e?.response?.data?.error || e.message)); setOut(e?.response?.data); }
    finally { setBusy(false); }
  }

  const inputCls = 'w-full px-3 py-2 border border-slate-300 rounded mb-2';
  const btnCls = 'px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded mr-2 mb-2';
  const customerEmailOptions = customers.filter((customer) => customer.email);
  const renderCustomerEmailSelect = (value, onChange, placeholder) => (
    <select className={inputCls} value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">{placeholder}</option>
      {customerEmailOptions.map((customer) => (
        <option key={customer.id} value={customer.email}>
          {customer.company_name || customer.contact_name || 'Customer'} - {customer.email}
        </option>
      ))}
    </select>
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-2">Backlog Tools</h1>
      <p className="text-slate-500 mb-4">Apply pass 5 — integrations, billing, notifications, spot agent, multimodal, damage vision.</p>
      {diag && (
        <div className="mb-4 text-sm">
          <span className="font-semibold">Missing env: </span>
          <span className="text-red-600">{diag.missing.length === 0 ? 'none' : diag.missing.join(', ')}</span>
        </div>
      )}
      <div className="mb-4 flex flex-wrap">
        {TABS.map(t => (
          <button key={t.k} onClick={() => { setTab(t.k); setOut(null); setErr(null); }}
            className={`px-3 py-1 mr-2 mb-2 rounded ${tab === t.k ? 'bg-indigo-600 text-white' : 'bg-slate-200'}`}>{t.label}</button>
        ))}
      </div>

      {tab === 'integrations' && (
        <div className="bg-white p-4 rounded border">
          <h3 className="font-semibold mb-2">External feeds (NEEDS-CREDS)</h3>
          <button onClick={() => probe('/backlog/integrations/dat/spot-rate')} className={btnCls}>DAT spot rate</button>
          <button onClick={() => probe('/backlog/integrations/truckstop/spot-rate')} className={btnCls}>Truckstop spot rate</button>
          <button onClick={() => probe('/backlog/integrations/doe/fuel-index')} className={btnCls}>DOE fuel</button>
          <button onClick={() => probe('/backlog/integrations/fmcsa/carrier-score?dot=123456')} className={btnCls}>FMCSA score</button>
          <button onClick={() => probe('/backlog/integrations/carbon/emissions')} className={btnCls}>Carbon emissions</button>
        </div>
      )}

      {tab === 'billing' && (
        <div className="bg-white p-4 rounded border">
          {renderCustomerEmailSelect(bEmail, setBEmail, 'Select customer email')}
          <input className={inputCls} placeholder="customer email" value={bEmail} onChange={e => setBEmail(e.target.value)}/>
          <textarea className={inputCls} rows={4} value={bItems} onChange={e => setBItems(e.target.value)}/>
          <button className={btnCls} disabled={busy} onClick={() => {
            try { const items = JSON.parse(bItems); post('/backlog/billing/invoices', { customer_email: bEmail, line_items: items }); }
            catch (e) { setErr('line_items must be valid JSON'); }
          }}>Create invoice</button>
          <button className={btnCls} onClick={() => probe('/backlog/billing/invoices')}>List invoices</button>
        </div>
      )}

      {tab === 'notify' && (
        <div className="bg-white p-4 rounded border">
          {renderCustomerEmailSelect(nTo, setNTo, 'Select recipient customer email')}
          <input className={inputCls} placeholder="to (email)" value={nTo} onChange={e => setNTo(e.target.value)}/>
          <input className={inputCls} placeholder="subject" value={nSubject} onChange={e => setNSubject(e.target.value)}/>
          <textarea className={inputCls} rows={3} value={nBody} onChange={e => setNBody(e.target.value)}/>
          <button className={btnCls} disabled={busy || !nTo} onClick={() => post('/backlog/notifications/send', { to: nTo, subject: nSubject, body: nBody })}>Send</button>
          <button className={btnCls} onClick={() => probe('/backlog/notifications')}>List notifications</button>
        </div>
      )}

      {tab === 'agent' && (
        <div className="bg-white p-4 rounded border">
          <input className={inputCls} placeholder="origin" value={sOrigin} onChange={e => setSOrigin(e.target.value)}/>
          <input className={inputCls} placeholder="destination" value={sDest} onChange={e => setSDest(e.target.value)}/>
          <select className={inputCls} value={sUrgency} onChange={e => setSUrgency(e.target.value)}>
            <option value="normal">normal</option><option value="urgent">urgent</option><option value="cheapest">cheapest</option>
          </select>
          <button className={btnCls} disabled={busy} onClick={() => post('/backlog/agent/spot-recommend', { origin: sOrigin, destination: sDest, urgency: sUrgency })}>Recommend (no auto-book)</button>
        </div>
      )}

      {tab === 'multimodal' && (
        <div className="bg-white p-4 rounded border">
          <input className={inputCls} type="number" value={mWeight} onChange={e => setMWeight(parseInt(e.target.value) || 0)} placeholder="weight (lbs)"/>
          <input className={inputCls} type="number" value={mDist} onChange={e => setMDist(parseInt(e.target.value) || 0)} placeholder="distance (mi)"/>
          <select className={inputCls} value={mUrg} onChange={e => setMUrg(e.target.value)}>
            <option value="normal">normal</option><option value="urgent">urgent</option><option value="cheapest">cheapest</option>
          </select>
          <button className={btnCls} disabled={busy} onClick={() => post('/backlog/optimize/multimodal', { weight_lbs: mWeight, distance_miles: mDist, urgency: mUrg })}>Optimize</button>
        </div>
      )}

      {tab === 'vision' && (
        <div className="bg-white p-4 rounded border">
          <textarea className={inputCls} rows={4} value={vDesc} onChange={e => setVDesc(e.target.value)} placeholder="describe damage"/>
          <button className={btnCls} disabled={busy} onClick={() => post('/backlog/vision/damage-assess', { description: vDesc })}>Assess (heuristic stub)</button>
        </div>
      )}

      {err && <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">{err}</div>}
      {out && (
        <div className="mt-4">
          <AIResponseCard response={out} title="Tool Result" />
        </div>
      )}
    </div>
  );
}
