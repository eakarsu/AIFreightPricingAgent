import { useEffect, useState } from 'react';

export default function DetentionDemurragePredictor() {
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ dwell_hours: 38, free_hours: 24, appointment_misses: 1, port_congestion_pct: 72, daily_charge: 185 });
  const examples = [
    { label: 'Port delay', values: { dwell_hours: 38, free_hours: 24, appointment_misses: 1, port_congestion_pct: 72, daily_charge: 185 } },
    { label: 'High exposure', values: { dwell_hours: 64, free_hours: 24, appointment_misses: 2, port_congestion_pct: 88, daily_charge: 240 } },
    { label: 'Low risk', values: { dwell_hours: 18, free_hours: 24, appointment_misses: 0, port_congestion_pct: 35, daily_charge: 150 } },
  ];

  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  useEffect(() => {
    fetch('/api/detention-demurrage-predictor', { headers }).then((r) => r.json()).then(setData).catch(() => {});
  }, []);

  async function submit(event) {
    event.preventDefault();
    const res = await fetch('/api/detention-demurrage-predictor/predict', { method: 'POST', headers, body: JSON.stringify(form) });
    setData(await res.json());
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Detention Demurrage Predictor</h1>
      <form onSubmit={submit} className="grid gap-3 max-w-2xl">
        <div className="flex flex-wrap gap-2" aria-label="Fill prediction example">{examples.map(example => <button key={example.label} type="button" className="border rounded px-3 py-2" onClick={() => setForm(example.values)}>{example.label}</button>)}</div>
        {Object.keys(form).map((key) => (
          <label key={key} className="grid gap-1 text-sm">
            {key.replaceAll('_', ' ')}
            <input className="border rounded px-3 py-2" type="number" value={form[key]} onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })} />
          </label>
        ))}
        <button className="bg-indigo-600 text-white rounded px-4 py-2" type="submit">Predict fees</button>
      </form>
      {data && <section className="bg-white rounded border p-4"><h2 className="font-semibold">{data.tier}</h2><p>Risk {data.risk_score}. Projected fees ${data.projected_fees}.</p><ul className="list-disc ml-5">{data.actions.map((a) => <li key={a}>{a}</li>)}</ul></section>}
    </div>
  );
}
