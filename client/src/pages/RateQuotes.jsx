import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';
import DataTable from '../components/DataTable';
import AIResponseCard from '../components/AIResponseCard';
import FormModal from '../components/FormModal';

const quoteFormFields = [
  { name: 'quote_number', label: 'Quote Number', type: 'text', required: true },
  { name: 'customer_id', label: 'Customer ID', type: 'number', required: true },
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
  { name: 'customer_id', label: 'Customer ID', type: 'number' },
];

const formatCurrency = (value) => {
  if (value == null) return '-';
  return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const columns = [
  { key: 'quote_number', header: 'Quote #' },
  { key: 'customer_name', header: 'Customer', render: (row) => row.customer_name || `#${row.customer_id}` },
  { key: 'origin', header: 'Origin' },
  { key: 'destination', header: 'Destination' },
  { key: 'mode', header: 'Mode', render: (row) => row.mode?.charAt(0).toUpperCase() + row.mode?.slice(1) },
  { key: 'weight_kg', header: 'Weight (kg)', render: (row) => row.weight_kg?.toLocaleString() ?? '-' },
  { key: 'base_rate', header: 'Base Rate ($)', render: (row) => formatCurrency(row.base_rate) },
  { key: 'ai_rate', header: 'AI Rate ($)', render: (row) => formatCurrency(row.ai_rate) },
  { key: 'final_rate', header: 'Final Rate ($)', render: (row) => formatCurrency(row.final_rate) },
  { key: 'margin_pct', header: 'Margin (%)', render: (row) => row.margin_pct != null ? `${row.margin_pct}%` : '-' },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <StatusBadge status={row.status} />,
  },
];

export default function RateQuotes() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showNewModal, setShowNewModal] = useState(false);
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

  const handleNewQuoteSubmit = async (data) => {
    await api.post('/rate-quotes', data);
    setShowNewModal(false);
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
          <button className="btn btn-primary" onClick={() => setShowNewModal(true)}>
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
          columns={columns}
          data={quotes}
          onRowClick={handleRowClick}
        />
      )}

      {showNewModal && (
        <FormModal
          title="New Rate Quote"
          fields={quoteFormFields}
          onSubmit={handleNewQuoteSubmit}
          onClose={() => setShowNewModal(false)}
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
