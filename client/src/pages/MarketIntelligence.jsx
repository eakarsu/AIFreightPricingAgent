import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';
import DataTable from '../components/DataTable';
import FormModal from '../components/FormModal';
import AIResponseCard from '../components/AIResponseCard';

const modeOptions = [
  { value: 'ocean', label: 'Ocean' },
  { value: 'air', label: 'Air' },
  { value: 'rail', label: 'Rail' },
  { value: 'truck', label: 'Truck' },
  { value: 'intermodal', label: 'Intermodal' },
];

const reportTypeOptions = [
  { value: 'trend', label: 'Trend' },
  { value: 'alert', label: 'Alert' },
  { value: 'forecast', label: 'Forecast' },
  { value: 'benchmark', label: 'Benchmark' },
];

const severityOptions = [
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'critical', label: 'Critical' },
];

const formFields = [
  { name: 'title', label: 'Title', type: 'text', required: true },
  { name: 'region', label: 'Region', type: 'text', required: true },
  { name: 'mode', label: 'Mode', type: 'select', options: modeOptions, required: true },
  { name: 'report_type', label: 'Report Type', type: 'select', options: reportTypeOptions, required: true },
  { name: 'summary', label: 'Summary', type: 'textarea' },
  { name: 'severity', label: 'Severity', type: 'select', options: severityOptions, required: true },
  { name: 'report_date', label: 'Report Date', type: 'date', required: true },
];

const columns = [
  { key: 'title', header: 'Title' },
  { key: 'region', header: 'Region' },
  { key: 'mode', header: 'Mode' },
  { key: 'report_type', header: 'Type' },
  {
    key: 'severity',
    header: 'Severity',
    render: (value) => <StatusBadge status={value} />,
  },
  { key: 'report_date', header: 'Report Date' },
];

export default function MarketIntelligence() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [showAIModal, setShowAIModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // AI analysis state
  const [aiForm, setAiForm] = useState({ region: '', mode: '', timeframe: '' });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState(null);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/market-intelligence');
      setReports(res.data);
      setError(null);
    } catch (err) {
      setError('Failed to load market intelligence reports.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleRowClick = (row) => {
    navigate(`/market-intelligence/${row.id}`);
  };

  const handleSave = async (formData) => {
    try {
      setSubmitting(true);
      if (editingRow) await api.put(`/market-intelligence/${editingRow.id}`, formData);
      else await api.post('/market-intelligence', formData);
      setShowModal(false);
      setEditingRow(null);
      fetchReports();
    } catch (err) {
      console.error('Failed to save report:', err);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const handleAIAnalysis = async () => {
    try {
      setAiLoading(true);
      setAiError(null);
      setAiResult(null);
      const res = await api.post('/market-intelligence/analyze', aiForm);
      setAiResult(res.data);
    } catch (err) {
      setAiError('Failed to generate AI analysis.');
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveReport = async () => {
    if (!aiResult) return;
    try {
      setSubmitting(true);
      await api.post('/market-intelligence', {
        title: `AI Analysis: ${aiForm.region} - ${aiForm.mode}`,
        region: aiForm.region,
        mode: aiForm.mode,
        report_type: 'forecast',
        summary: aiResult.summary || aiResult.analysis || '',
        severity: 'info',
        report_date: new Date().toISOString().split('T')[0],
        ai_analysis: aiResult.analysis || aiResult.summary || '',
      });
      setShowAIModal(false);
      setAiResult(null);
      setAiForm({ region: '', mode: '', timeframe: '' });
      fetchReports();
    } catch (err) {
      console.error('Failed to save report:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const openAIModal = () => {
    setAiResult(null);
    setAiError(null);
    setAiForm({ region: '', mode: '', timeframe: '' });
    setShowAIModal(true);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Market Intelligence</h1>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={openAIModal}>
            <svg className="w-4 h-4 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            AI Analysis
          </button>
          <button className="btn btn-primary" onClick={() => { setEditingRow(null); setShowModal(true); }}>
            New Report
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <DataTable
        deleteEndpoint="/market-intelligence"
        columns={columns}
        data={reports}
        loading={loading}
        onRowClick={handleRowClick}
        onEdit={(row) => { setEditingRow(row); setShowModal(true); }}
      />

      {showModal && (
        <FormModal
        deleteEndpoint="/market-intelligence"
        onDeleted={() => window.location.reload()}
          title={editingRow ? 'Edit Report' : 'New Report'}
          fields={formFields}
          initialData={editingRow || {}}
          onSubmit={handleSave}
          onClose={() => { setShowModal(false); setEditingRow(null); }}
          submitting={submitting}
        />
      )}

      {showAIModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-xl max-w-2xl w-full mx-4 shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">AI Market Analysis</h3>
              <button
                onClick={() => setShowAIModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Region</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., Asia-Pacific"
                    value={aiForm.region}
                    onChange={(e) => setAiForm({ ...aiForm, region: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mode</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={aiForm.mode}
                    onChange={(e) => setAiForm({ ...aiForm, mode: e.target.value })}
                  >
                    <option value="">Select mode</option>
                    {modeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Timeframe</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., Q1 2026"
                    value={aiForm.timeframe}
                    onChange={(e) => setAiForm({ ...aiForm, timeframe: e.target.value })}
                  />
                </div>
              </div>

              <button
                onClick={handleAIAnalysis}
                disabled={aiLoading || !aiForm.region || !aiForm.mode}
                className="btn btn-primary w-full flex items-center justify-center gap-2"
              >
                {aiLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Generating Analysis...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Generate AI Analysis
                  </>
                )}
              </button>

              {aiError && <div className="alert alert-error">{aiError}</div>}

              {aiResult && (
                <>
                  <AIResponseCard
                    response={aiResult}
                    title="Market Analysis"
                    onRegenerate={handleAIAnalysis}
                  />
                  <button
                    onClick={handleSaveReport}
                    disabled={submitting}
                    className="btn btn-primary w-full"
                  >
                    {submitting ? 'Saving...' : 'Save Report'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
