import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';
import AIResponseCard from '../components/AIResponseCard';
import ConfirmDialog from '../components/ConfirmDialog';
import FormModal from '../components/FormModal';

const editFormFields = [
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

const formatCurrency = (value) => {
  if (value == null) return '-';
  return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

function DetailRow({ label, children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.625rem 0', borderBottom: '1px solid #f3f4f6' }}>
      <span style={{ fontWeight: 500, color: '#6b7280' }}>{label}</span>
      <span style={{ color: '#111827' }}>{children}</span>
    </div>
  );
}

export default function RateQuoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const fetchQuote = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/rate-quotes/${id}`);
      setQuote(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch quote details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  const handleEdit = async (data) => {
    await api.put(`/rate-quotes/${id}`, data);
    setShowEditModal(false);
    fetchQuote();
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/rate-quotes/${id}`);
      navigate('/rate-quotes');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete quote.');
      setShowDeleteDialog(false);
    }
  };

  if (loading) return <p>Loading quote details...</p>;
  if (error) return <div style={{ color: '#dc2626' }}>{error}</div>;
  if (!quote) return <p>Quote not found.</p>;

  return (
    <div className="rate-quote-detail-page">
      <button
        className="btn btn-link"
        onClick={() => navigate('/rate-quotes')}
        style={{ marginBottom: '1rem', cursor: 'pointer', background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.95rem' }}
      >
        &larr; Back to Rate Quotes
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>
            Quote {quote.quote_number}
          </h1>
          {quote.customer_name && (
            <p style={{ margin: '0.25rem 0 0', color: '#6b7280', fontSize: '1rem' }}>
              {quote.customer_name}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={() => setShowEditModal(true)}>
            Edit
          </button>
          <button
            className="btn btn-danger"
            style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.375rem', cursor: 'pointer' }}
            onClick={() => setShowDeleteDialog(true)}
          >
            Delete
          </button>
        </div>
      </div>

      <div className="card" style={{ background: '#fff', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.1rem', color: '#374151' }}>Quote Details</h2>

        <DetailRow label="Quote Number">{quote.quote_number}</DetailRow>
        <DetailRow label="Customer">
          {quote.customer_name || (quote.customer_id ? `Customer #${quote.customer_id}` : '-')}
        </DetailRow>
        <DetailRow label="Status"><StatusBadge status={quote.status} /></DetailRow>
        <DetailRow label="Origin">{quote.origin || '-'}</DetailRow>
        <DetailRow label="Destination">{quote.destination || '-'}</DetailRow>
        <DetailRow label="Mode">
          {quote.mode ? quote.mode.charAt(0).toUpperCase() + quote.mode.slice(1) : '-'}
        </DetailRow>
        <DetailRow label="Weight (kg)">
          {quote.weight_kg != null ? Number(quote.weight_kg).toLocaleString() : '-'}
        </DetailRow>
        <DetailRow label="Volume (CBM)">
          {quote.volume_cbm != null ? Number(quote.volume_cbm).toLocaleString() : '-'}
        </DetailRow>
      </div>

      <div className="card" style={{ background: '#fff', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.1rem', color: '#374151' }}>Pricing</h2>

        <DetailRow label="Base Rate">{formatCurrency(quote.base_rate)}</DetailRow>
        <DetailRow label="AI Rate">{formatCurrency(quote.ai_rate)}</DetailRow>
        <DetailRow label="Final Rate">{formatCurrency(quote.final_rate)}</DetailRow>
        <DetailRow label="Margin">
          {quote.margin_pct != null ? `${quote.margin_pct}%` : '-'}
        </DetailRow>
        <DetailRow label="Valid Until">
          {quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : '-'}
        </DetailRow>
      </div>

      {quote.ai_reasoning && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', color: '#374151', marginBottom: '0.75rem' }}>AI Reasoning</h2>
          <AIResponseCard response={{ reasoning: quote.ai_reasoning }} />
        </div>
      )}

      {showEditModal && (
        <FormModal
          title="Edit Rate Quote"
          fields={editFormFields}
          initialValues={{
            quote_number: quote.quote_number,
            customer_id: quote.customer_id,
            origin: quote.origin,
            destination: quote.destination,
            mode: quote.mode,
            weight_kg: quote.weight_kg,
            volume_cbm: quote.volume_cbm,
            base_rate: quote.base_rate,
            final_rate: quote.final_rate,
            margin_pct: quote.margin_pct,
            status: quote.status,
            valid_until: quote.valid_until ? quote.valid_until.split('T')[0] : '',
          }}
          onSubmit={handleEdit}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {showDeleteDialog && (
        <ConfirmDialog
          title="Delete Quote"
          message={`Are you sure you want to delete quote ${quote.quote_number}? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteDialog(false)}
        />
      )}
    </div>
  );
}
