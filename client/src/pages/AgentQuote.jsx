import { useState } from 'react';
import { agentQuote, generateQuote } from '../api/client';
import ReactMarkdown from 'react-markdown';

export default function AgentQuote() {
  const [form, setForm] = useState({ origin: '', destination: '', mode: 'truckload', weight_kg: '', volume_cbm: '', customer_id: '' });
  const [mode, setMode] = useState('agent'); // 'agent' or 'simple'
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const submit = async () => {
    setLoading(true); setResult(null);
    try {
      const fn = mode === 'agent' ? agentQuote : generateQuote;
      const r = await fn(form);
      setResult(r.data);
    } catch (err) {
      setResult({ error: err.response?.data?.error || err.message });
    }
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-2">AI Pricing Agent</h1>
      <p className="text-gray-600 mb-4">
        Agent mode uses tool-calling to look up carrier rates, fuel surcharges, lane history, and spot rates. Simple mode is a single-shot JSON quote.
      </p>

      <div className="flex gap-4 mb-4">
        <label><input type="radio" checked={mode === 'agent'} onChange={() => setMode('agent')} /> Agent (tool-calling)</label>
        <label><input type="radio" checked={mode === 'simple'} onChange={() => setMode('simple')} /> Simple (single-shot)</label>
      </div>

      <div className="grid grid-cols-2 gap-3 bg-white p-4 rounded-lg shadow">
        <input placeholder="Origin" value={form.origin} onChange={e => setForm({ ...form, origin: e.target.value })} className="px-3 py-2 border rounded" />
        <input placeholder="Destination" value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} className="px-3 py-2 border rounded" />
        <select value={form.mode} onChange={e => setForm({ ...form, mode: e.target.value })} className="px-3 py-2 border rounded">
          <option value="truckload">Truckload</option>
          <option value="ltl">LTL</option>
          <option value="ocean">Ocean</option>
          <option value="air">Air</option>
          <option value="rail">Rail</option>
        </select>
        <input type="number" placeholder="Customer ID (optional)" value={form.customer_id} onChange={e => setForm({ ...form, customer_id: e.target.value })} className="px-3 py-2 border rounded" />
        <input type="number" placeholder="Weight (kg)" value={form.weight_kg} onChange={e => setForm({ ...form, weight_kg: e.target.value })} className="px-3 py-2 border rounded" />
        <input type="number" placeholder="Volume (CBM)" value={form.volume_cbm} onChange={e => setForm({ ...form, volume_cbm: e.target.value })} className="px-3 py-2 border rounded" />
      </div>

      <button onClick={submit} disabled={loading || !form.origin || !form.destination} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
        {loading ? 'Calling agent...' : 'Run Pricing Agent'}
      </button>

      {result && (
        <div className="mt-6 bg-white rounded-lg shadow p-4">
          {result.error ? <div className="text-red-600">{result.error}</div> : (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-blue-50 p-3 rounded">
                  <div className="text-xs text-gray-600">Suggested Rate</div>
                  <div className="text-2xl font-bold">${result.ai_suggested_rate?.toLocaleString() || 'N/A'}</div>
                </div>
                <div className="bg-green-50 p-3 rounded">
                  <div className="text-xs text-gray-600">Win probability</div>
                  <div className="text-2xl font-bold">{result.win_probability_pct ?? result.parsed?.win_probability_pct ?? 'N/A'}%</div>
                </div>
                <div className="bg-purple-50 p-3 rounded">
                  <div className="text-xs text-gray-600">Confidence</div>
                  <div className="text-2xl font-bold">{result.parsed?.confidence_score ?? 'N/A'}</div>
                </div>
              </div>
              {result.parsed && (
                <pre className="bg-slate-900 text-white text-xs p-3 rounded overflow-auto max-h-96">
                  {JSON.stringify(result.parsed, null, 2)}
                </pre>
              )}
              {result.raw && (
                <details className="mt-3">
                  <summary>Raw AI text</summary>
                  <ReactMarkdown>{result.raw}</ReactMarkdown>
                </details>
              )}
              {result.ai_reasoning && (
                <details className="mt-3">
                  <summary>Reasoning</summary>
                  <ReactMarkdown>{result.ai_reasoning}</ReactMarkdown>
                </details>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
