import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';
import DataTable from '../components/DataTable';
import AIResponseCard from '../components/AIResponseCard';
import FormModal from '../components/FormModal';

const quoteFormFields = [
  { name: 'quote_number', label: 'Quote Number', type: 'text', required: true },
  { name: 'customer_id', label: 'Customer', type: 'number', required: true },
  { name: 'origin', label: 'Origin', type: 'text', required: true },
  { name: 'destination', label: 'Destination', type: 'text', required: true },
  {
    name: 'mode',
    label: 'Mode',
    type: 'select',
    required: true,
    options: [
      { value: 'ocean', label: 'Ocean' },
      { value: 'air', label: 'Air' },
      { value: 'rail', label: 'Rail' },
      { value: 'truck', label: 'Truck' },
      { value: 'intermodal', label: 'Intermodal' },
    ],
  },
  { name: 'weight_kg', label: 'Weight (kg)', type: 'number' },
  { name: 'volume_cbm', label: 'Volume (CBM)', type: 'number' },
  { name: 'base_rate', label: 'Base Rate ($)', type: 'number' },
  { name: 'final_rate', label: 'Final Rate ($)', type: 'number' },
  { name: 'margin_pct', label: 'Margin (%)', type: 'number' },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    required: true,
    options: [
      { value: 'draft', label: 'Draft' },
      { value: 'sent', label: 'Sent' },
      { value: 'accepted', label: 'Accepted' },
      { value: 'expired', label: 'Expired' },
      { value: 'rejected', label: 'Rejected' },
    ],
  },
  { name: 'valid_until', label: 'Valid Until', type: 'date' },
];

const aiQuoteFormFields = [
  { name: 'origin', label: 'Origin', type: 'text', required: true },
  { name: 'destination', label: 'Destination', type: 'text', required: true },
  {
    name: 'mode',
    label: 'Mode',
    type: 'select',
    required: true,
    options: [
      { value: 'ocean', label: 'Ocean' },
      { value: 'air', label: 'Air' },
      { value: 'rail', label: 'Rail' },
      { value: 'truck', label: 'Truck' },
      { value: 'intermodal', label: 'Intermodal' },
    ],
  },
  { name: 'weight_kg', label: 'Weight (kg)', type: 'number', required: true },
  { name: 'volume_cbm', label: 'Volume (CBM)', type: 'number' },
  { name: 'customer_id', label: 'Customer', type: 'number' },
];

const formatCurrency = (value) => {
  if (value == null) return '-';
  return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const columns = [
  { key: 'quote_number', header: 'Quote #' },
  { key: 'customer_name', header: 'Customer', render: (value, row) => value || `#${row.customer_id}` },
  { key: 'origin', header: 'Origin' },
  { key: 'destination', header: 'Destination' },
  { key: 'mode', header: 'Mode', render: (value) => value?.charAt(0).toUpperCase() + value?.slice(1) },
  { key: 'weight_kg', header: 'Weight (kg)', render: (value) => value?.toLocaleString() ?? '-' },
  { key: 'base_rate', header: 'Base Rate ($)', render: (value) => formatCurrency(value) },
  { key: 'ai_rate', header: 'AI Rate ($)', render: (value) => formatCurrency(value) },
  { key: 'final_rate', header: 'Final Rate ($)', render: (value) => formatCurrency(value) },
  { key: 'margin_pct', header: 'Margin (%)', render: (value) => value != null ? `${value}%` : '-' },
  {
    key: 'status',
    header: 'Status',
    render: (value) => <StatusBadge status={value} />,
  },
];

export default function RateQuotes() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showNewModal, setShowNewModal] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const [aiFormData, setAiFormData] = useState(null);
  const [savingQuote, setSavingQuote] = useState(false);

  const fetchQuotes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/rate-quotes');
      setQuotes(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch rate quotes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  const handleRowClick = (row) => {
    navigate(`/rate-quotes/${row.id}`);
  };

  const handleQuoteSubmit = async (data) => {
    if (editingRow) await api.put(`/rate-quotes/${editingRow.id}`, data);
    else await api.post('/rate-quotes', data);
    setShowNewModal(false);
    setEditingRow(null);
    fetchQuotes();
  };

  const handleAIGenerate = async (data) => {
    try {
      setAiGenerating(true);
      setAiFormData(data);
      setAiResponse(null);
      const res = await api.post('/rate-quotes/generate', data);
      setAiResponse(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'AI generation failed.');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSaveAIQuote = async () => {
    if (!aiResponse || !aiFormData) return;
    try {
      setSavingQuote(true);
      const quoteData = {
        ...aiFormData,
        ai_rate: aiResponse.ai_rate ?? aiResponse.rate,
        base_rate: aiResponse.base_rate,
        final_rate: aiResponse.final_rate ?? aiResponse.ai_rate ?? aiResponse.rate,
        margin_pct: aiResponse.margin_pct,
        ai_reasoning: aiResponse.reasoning ?? aiResponse.ai_reasoning,
        status: 'draft',
      };
      await api.post('/rate-quotes', quoteData);
      setShowAIModal(false);
      setAiResponse(null);
      setAiFormData(null);
      fetchQuotes();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save AI quote.');
    } finally {
      setSavingQuote(false);
    }
  };

  return (
    <div className="rate-quotes-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>Rate Quotes</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setAiResponse(null);
              setAiFormData(null);
              setShowAIModal(true);
            }}
          >
            Generate AI Quote
          </button>
          <button className="btn btn-primary" onClick={() => { setEditingRow(null); setShowNewModal(true); }}>
            New Quote
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem', color: '#dc2626' }}>
          {error}
        </div>
      )}

      {loading ? (
        <p>Loading rate quotes...</p>
      ) : (
        <DataTable
        deleteEndpoint="/rate-quotes"
          columns={columns}
          data={quotes}
          onRowClick={handleRowClick}
          onEdit={(row) => { setEditingRow(row); setShowNewModal(true); }}
        />
      )}

      {showNewModal && (
        <FormModal
        deleteEndpoint="/rate-quotes"
        onDeleted={() => window.location.reload()}
          title={editingRow ? 'Edit Rate Quote' : 'New Rate Quote'}
          fields={quoteFormFields}
          initialData={editingRow || {}}
          onSubmit={handleQuoteSubmit}
          onClose={() => { setShowNewModal(false); setEditingRow(null); }}
        />
      )}

      {showAIModal && (
        <FormModal
          title="Generate AI Quote"
          fields={aiQuoteFormFields}
          onSubmit={handleAIGenerate}
          onClose={() => {
            setShowAIModal(false);
            setAiResponse(null);
            setAiFormData(null);
          }}
          submitLabel={aiGenerating ? 'Generating...' : 'Generate'}
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
              <span>AI is generating your quote...</span>
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
                onClick={handleSaveAIQuote}
                disabled={savingQuote}
              >
                {savingQuote ? 'Saving...' : 'Save as Quote'}
              </button>
            </div>
          )}
        </FormModal>
      )}
    </div>
  );
}
