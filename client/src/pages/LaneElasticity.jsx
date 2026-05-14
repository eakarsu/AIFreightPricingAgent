import { useEffect, useState } from 'react';
import { getLaneElasticity, recomputeElasticity, getSpotRates, addSpotRate } from '../api/client';

export default function LaneElasticity() {
  const [lanes, setLanes] = useState([]);
  const [spotRates, setSpotRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);
  const [showAddSpot, setShowAddSpot] = useState(false);
  const [spotForm, setSpotForm] = useState({ origin: '', destination: '', mode: 'truckload', spot_price: '', source: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [laneR, rateR] = await Promise.all([getLaneElasticity(), getSpotRates()]);
      setLanes(laneR.data?.data || []);
      setSpotRates(rateR.data?.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const recompute = async () => {
    setRecomputing(true);
    try { await recomputeElasticity(); await load(); }
    catch (e) { alert(e.response?.data?.error || e.message); }
    setRecomputing(false);
  };

  const submitSpot = async (e) => {
    e.preventDefault();
    try {
      await addSpotRate({ ...spotForm, lane: `${spotForm.origin}->${spotForm.destination}`, spot_price: parseFloat(spotForm.spot_price) });
      setShowAddSpot(false);
      setSpotForm({ origin: '', destination: '', mode: 'truckload', spot_price: '', source: '' });
      load();
    } catch (e) { alert(e.message); }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-bold">Lane Elasticity & Spot Rates</h1>
        <div className="flex gap-2">
          <button onClick={recompute} disabled={recomputing} className="px-4 py-2 bg-purple-600 text-white rounded disabled:opacity-50">
            {recomputing ? 'Recomputing...' : 'Recompute Elasticity'}
          </button>
          <button onClick={() => setShowAddSpot(true)} className="px-4 py-2 bg-blue-600 text-white rounded">Add Spot Rate</button>
        </div>
      </div>

      {showAddSpot && (
        <form onSubmit={submitSpot} className="mb-4 bg-white p-4 rounded-lg shadow grid grid-cols-2 gap-3">
          <input required placeholder="Origin" value={spotForm.origin} onChange={e => setSpotForm({ ...spotForm, origin: e.target.value })} className="px-3 py-2 border rounded" />
          <input required placeholder="Destination" value={spotForm.destination} onChange={e => setSpotForm({ ...spotForm, destination: e.target.value })} className="px-3 py-2 border rounded" />
          <select value={spotForm.mode} onChange={e => setSpotForm({ ...spotForm, mode: e.target.value })} className="px-3 py-2 border rounded">
            <option value="truckload">Truckload</option><option value="ltl">LTL</option><option value="ocean">Ocean</option><option value="air">Air</option><option value="rail">Rail</option>
          </select>
          <input required type="number" placeholder="Spot price (USD)" value={spotForm.spot_price} onChange={e => setSpotForm({ ...spotForm, spot_price: e.target.value })} className="px-3 py-2 border rounded" />
          <input placeholder="Source (DAT, Truckstop, fixture)" value={spotForm.source} onChange={e => setSpotForm({ ...spotForm, source: e.target.value })} className="px-3 py-2 border rounded col-span-2" />
          <div className="col-span-2 flex gap-2">
            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded">Save</button>
            <button type="button" onClick={() => setShowAddSpot(false)} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
          </div>
        </form>
      )}

      {loading ? <div>Loading...</div> : (
        <>
          <h2 className="text-lg font-semibold mb-2">Lane Elasticity</h2>
          <table className="w-full bg-white rounded-lg shadow mb-6">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-2">Origin</th><th className="text-left p-2">Destination</th><th className="text-left p-2">Mode</th>
                <th className="text-left p-2">Total Quotes</th><th className="text-left p-2">Accepted</th>
                <th className="text-left p-2">Accept Rate</th><th className="text-left p-2">Coefficient</th>
              </tr>
            </thead>
            <tbody>
              {lanes.map(l => (
                <tr key={l.id} className="border-t">
                  <td className="p-2">{l.origin}</td><td className="p-2">{l.destination}</td><td className="p-2">{l.mode}</td>
                  <td className="p-2">{l.total_quotes}</td><td className="p-2">{l.accepted_quotes}</td>
                  <td className="p-2">{l.total_quotes ? `${(100 * l.accepted_quotes / l.total_quotes).toFixed(1)}%` : '-'}</td>
                  <td className="p-2">{Number(l.coefficient || 0).toFixed(3)}</td>
                </tr>
              ))}
              {lanes.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-gray-500">No elasticity data — click Recompute.</td></tr>}
            </tbody>
          </table>

          <h2 className="text-lg font-semibold mb-2">Recent Spot Rates</h2>
          <table className="w-full bg-white rounded-lg shadow">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-2">Lane</th><th className="text-left p-2">Mode</th><th className="text-left p-2">Spot Price</th>
                <th className="text-left p-2">Source</th><th className="text-left p-2">Recorded</th>
              </tr>
            </thead>
            <tbody>
              {spotRates.map(s => (
                <tr key={s.id} className="border-t">
                  <td className="p-2">{s.origin} → {s.destination}</td><td className="p-2">{s.mode}</td>
                  <td className="p-2">${Number(s.spot_price).toLocaleString()}</td>
                  <td className="p-2">{s.source}</td><td className="p-2">{new Date(s.recorded_at).toLocaleString()}</td>
                </tr>
              ))}
              {spotRates.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-gray-500">No spot rates recorded.</td></tr>}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
