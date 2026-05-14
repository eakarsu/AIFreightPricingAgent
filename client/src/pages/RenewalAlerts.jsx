import { useState } from 'react';
import { renewalAlerts } from '../api/client';
import ReactMarkdown from 'react-markdown';

export default function RenewalAlerts() {
  const [days, setDays] = useState(60);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    setLoading(true); setResult(null);
    try { const r = await renewalAlerts(days); setResult(r.data); }
    catch (e) { setResult({ error: e.response?.data?.error || e.message }); }
    setLoading(false);
  };

  const sevColor = s => ({ immediate: '#dc2626', high: '#f97316', medium: '#eab308', low: '#16a34a' }[s] || '#94a3b8');

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-bold mb-2">Contract Renewal Alerts</h1>
      <p className="text-gray-600 mb-4">AI scans pending renewals and recommends price actions.</p>
      <div className="flex gap-2 items-center mb-4">
        <label>Window (days):</label>
        <input type="number" value={days} onChange={e => setDays(parseInt(e.target.value) || 60)} className="px-3 py-2 border rounded w-24" />
        <button onClick={run} disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
          {loading ? 'Scanning...' : 'Scan'}
        </button>
      </div>

      {result && (
        <div>
          {result.error ? <div className="text-red-600">{result.error}</div> : (
            <>
              <div className="bg-white p-4 rounded-lg shadow mb-4">
                <div className="flex gap-6">
                  <div><div className="text-xs text-gray-500">Contracts analysed</div><div className="text-2xl font-bold">{result.contracts_analysed}</div></div>
                  <div><div className="text-xs text-gray-500">Revenue at risk</div><div className="text-2xl font-bold">${(result.total_revenue_at_risk_usd || 0).toLocaleString()}</div></div>
                  <div><div className="text-xs text-gray-500">Days window</div><div className="text-2xl font-bold">{result.days_window}</div></div>
                </div>
                <div className="mt-2 text-gray-700"><ReactMarkdown>{result.summary}</ReactMarkdown></div>
              </div>

              <table className="w-full bg-white rounded-lg shadow">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left p-2">Customer</th><th className="text-left p-2">Carrier</th>
                    <th className="text-left p-2">Days to Expiry</th><th className="text-left p-2">Action</th>
                    <th className="text-left p-2">Rate Change</th><th className="text-left p-2">Priority</th>
                    <th className="text-left p-2">Justification</th>
                  </tr>
                </thead>
                <tbody>
                  {(result.alerts || []).map((a, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2">{a.customer_name}</td>
                      <td className="p-2">{a.carrier_name}</td>
                      <td className="p-2">{a.days_to_expiry}</td>
                      <td className="p-2">{a.action}</td>
                      <td className="p-2">{a.recommended_rate_change_pct != null ? `${a.recommended_rate_change_pct > 0 ? '+' : ''}${a.recommended_rate_change_pct}%` : '-'}</td>
                      <td className="p-2"><span style={{ background: sevColor(a.priority), color: '#fff', padding: '2px 8px', borderRadius: 999, fontSize: 12 }}>{a.priority}</span></td>
                      <td className="p-2 text-sm">{a.justification}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  );
}
