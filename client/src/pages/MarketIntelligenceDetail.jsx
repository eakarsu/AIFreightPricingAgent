import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/ConfirmDialog';
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

export default function MarketIntelligenceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/market-intelligence/${id}`);
      setReport(res.data);
      setError(null);
    } catch (err) {
      setError('Failed to load report.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleUpdate = async (formData) => {
    try {
      setSubmitting(true);
      await api.put(`/market-intelligence/${id}`, formData);
      setShowEdit(false);
      fetchReport();
    } catch (err) {
      console.error('Failed to update report:', err);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/market-intelligence/${id}`);
      navigate('/market-intelligence');
    } catch (err) {
      console.error('Failed to delete report:', err);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/market-intelligence')} className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1>{report.title}</h1>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => setShowEdit(true)}>Edit</button>
          <button className="btn btn-danger" onClick={() => setShowDelete(true)}>Delete</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Report Details</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">Title</dt>
              <dd className="text-sm font-medium text-slate-800">{report.title}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">Region</dt>
              <dd className="text-sm font-medium text-slate-800">{report.region || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">Mode</dt>
              <dd className="text-sm font-medium text-slate-800">{report.mode || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">Report Type</dt>
              <dd className="text-sm font-medium text-slate-800">{report.report_type || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">Severity</dt>
              <dd><StatusBadge status={report.severity} /></dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">Report Date</dt>
              <dd className="text-sm font-medium text-slate-800">{report.report_date || '—'}</dd>
            </div>
          </dl>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Summary</h2>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{report.summary || 'No summary available.'}</p>
        </div>
      </div>

      {report.ai_analysis && (
        <div className="mt-6">
          <AIResponseCard
            content={report.ai_analysis}
            title="AI Analysis"
          />
        </div>
      )}

      {showEdit && (
        <FormModal
          title="Edit Report"
          fields={formFields}
          initialValues={report}
          onSubmit={handleUpdate}
          onClose={() => setShowEdit(false)}
          submitting={submitting}
        />
      )}

      <ConfirmDialog
        open={showDelete}
        title="Delete Report"
        message={`Are you sure you want to delete "${report.title}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
}
