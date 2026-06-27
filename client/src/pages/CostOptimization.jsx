import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';
import DataTable from '../components/DataTable';
import AIResponseCard from '../components/AIResponseCard';
import FormModal from '../components/FormModal';

const categoryOptions = [
  { value: 'routing', label: 'Routing' },
  { value: 'consolidation', label: 'Consolidation' },
  { value: 'mode_shift', label: 'Mode Shift' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'timing', label: 'Timing' },
];

const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const formatCurrency = (value) => {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

const formFields = [
  { name: 'title', label: 'Title', type: 'text', required: true },
  { name: 'category', label: 'Category', type: 'select', options: categoryOptions, required: true },
  { name: 'current_cost', label: 'Current Cost ($)', type: 'number', required: true },
  { name: 'projected_savings', label: 'Projected Savings ($)', type: 'number' },
  { name: 'savings_pct', label: 'Savings %', type: 'number' },
  { name: 'status', label: 'Status', type: 'select', options: statusOptions, required: true },
  { name: 'priority', label: 'Priority', type: 'select', options: priorityOptions, required: true },
  { name: 'affected_routes', label: 'Affected Routes', type: 'text' },
  { name: 'implementation_notes', label: 'Implementation Notes', type: 'textarea' },
];

const aiOptimizeFields = [
  { name: 'category', label: 'Category', type: 'select', options: categoryOptions, required: true },
  { name: 'description', label: 'Description', type: 'textarea', required: true },
  { name: 'current_spend', label: 'Current Spend ($)', type: 'number', required: true },
];

const columns = [
  { key: 'title', header: 'Title' },
  { key: 'category', header: 'Category' },
  {
    key: 'current_cost',
    header: 'Current Cost ($)',
    render: (value) => formatCurrency(value),
  },
  {
    key: 'projected_savings',
    header: 'Projected Savings ($)',
    render: (value) => formatCurrency(value),
  },
  {
    key: 'savings_pct',
    header: 'Savings %',
    render: (value) => (value != null ? `${value}%` : '—'),
  },
  {
    key: 'status',
    header: 'Status',
    render: (value) => <StatusBadge status={value} />,
  },
  {
    key: 'priority',
    header: 'Priority',
    render: (value) => <StatusBadge status={value} />,
  },
];

export default function CostOptimization() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [showAIModal, setShowAIModal] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const [aiFormData, setAiFormData] = useState(null);
  const [savingAI, setSavingAI] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/cost-optimization');
      setItems(res.data);
      setError(null);
    } catch (err) {
      setError('Failed to load cost optimizations.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleRowClick = (row) => {
    navigate(`/cost-optimization/${row.id}`);
  };

  const handleSave = async (formData) => {
    try {
      setSubmitting(true);
      if (editingRow) await api.put(`/cost-optimization/${editingRow.id}`, formData);
      else await api.post('/cost-optimization', formData);
      setShowModal(false);
      setEditingRow(null);
      fetchItems();
    } catch (err) {
      console.error('Failed to save optimization:', err);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const handleAIOptimize = async (data) => {
    try {
      setAiGenerating(true);
      setAiFormData(data);
      setAiResponse(null);
      const res = await api.post('/cost-optimization/optimize', data);
      setAiResponse(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'AI optimization failed.');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSaveAIResult = async () => {
    if (!aiResponse || !aiFormData) return;
    try {
      setSavingAI(true);
      const payload = {
        ...aiFormData,
        ...aiResponse,
        status: 'draft',
      };
      await api.post('/cost-optimization', payload);
      setShowAIModal(false);
      setAiResponse(null);
      setAiFormData(null);
      fetchItems();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save AI optimization.');
    } finally {
      setSavingAI(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Cost Optimization</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setAiResponse(null);
              setAiFormData(null);
              setShowAIModal(true);
            }}
          >
            AI Optimize
          </button>
          <button className="btn btn-primary" onClick={() => { setEditingRow(null); setShowModal(true); }}>
            New Optimization
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <DataTable
        deleteEndpoint="/cost-optimization"
        columns={columns}
        data={items}
        loading={loading}
        onRowClick={handleRowClick}
        onEdit={(row) => { setEditingRow(row); setShowModal(true); }}
      />

      {showModal && (
        <FormModal
        deleteEndpoint="/cost-optimization"
        onDeleted={() => window.location.reload()}
          title={editingRow ? 'Edit Optimization' : 'New Optimization'}
          fields={formFields}
          initialData={editingRow || {}}
          onSubmit={handleSave}
          onClose={() => { setShowModal(false); setEditingRow(null); }}
          submitting={submitting}
        />
      )}

      {showAIModal && (
        <FormModal
          title="AI Optimize"
          fields={aiOptimizeFields}
          onSubmit={handleAIOptimize}
          onClose={() => {
            setShowAIModal(false);
            setAiResponse(null);
            setAiFormData(null);
          }}
          submitLabel={aiGenerating ? 'Optimizing...' : 'Optimize'}
          submitDisabled={aiGenerating}
        >
          {aiGenerating && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
              <span className="spinner" style={{
                display: 'inline-block',
                width: '1.25rem',
                height: '1.25rem',
                border: '2px solid #e5e7eb',
                borderTopColor: '#3b82f6',
                borderRadius: '50%',
                animation: 'spin 0.6s linear infinite',
              }} />
              <span>AI is analyzing optimization opportunities...</span>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {aiResponse && (
            <div style={{ marginTop: '1rem' }}>
              <AIResponseCard response={aiResponse} />
              <button
                type="button"
                className="btn btn-primary"
                style={{ marginTop: '0.75rem' }}
                onClick={handleSaveAIResult}
                disabled={savingAI}
              >
                {savingAI ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </FormModal>
      )}
    </div>
  );
}
