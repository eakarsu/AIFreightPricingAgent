import { useEffect, useState } from 'react';
import { getAIResults } from '../api/client';
import AIResponseCard from '../components/AIResponseCard';

export default function AIResults() {
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getAIResults();
      setRows(r.data?.data || []);
      setPagination(r.data?.pagination || { page: 1, totalPages: 1 });
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">AI Results Audit</h1>
      {loading ? <div>Loading...</div> : (
        <table className="w-full border-collapse bg-white rounded-lg shadow">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left p-2">Type</th>
              <th className="text-left p-2">Entity</th>
              <th className="text-left p-2">Entity ID</th>
              <th className="text-left p-2">Model</th>
              <th className="text-left p-2">Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.analysis_type}</td>
                <td className="p-2">{r.entity_type}</td>
                <td className="p-2">{r.entity_id || '-'}</td>
                <td className="p-2 text-xs">{r.model}</td>
                <td className="p-2 text-xs">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-2"><button onClick={() => setSelected(r)} className="text-blue-600">View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {selected && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">AI Result #{selected.id}</h3>
            <button onClick={() => setSelected(null)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Close</button>
          </div>
          <AIResponseCard response={selected.parsed_data || selected.raw_response} title={selected.analysis_type || 'AI Result'} />
        </div>
      )}
    </div>
  );
}
