import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/ConfirmDialog';
import FormModal from '../components/FormModal';
import AIResponseCard from '../components/AIResponseCard';

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

const editFields = [
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

function DetailField({ label, children }) {
  return (
    <div className="detail-field">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{children ?? '—'}</span>
    </div>
  );
}

export default function CostOptimizationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchItem = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/cost-optimization/${id}`);
      setItem(res.data);
      setError(null);
    } catch (err) {
      setError('Failed to load cost optimization.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchItem();
  }, [fetchItem]);

  const handleUpdate = async (formData) => {
    try {
      setSubmitting(true);
      await api.put(`/cost-optimization/${id}`, formData);
      setShowEdit(false);
      fetchItem();
    } catch (err) {
      console.error('Failed to update optimization:', err);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setSubmitting(true);
      await api.delete(`/cost-optimization/${id}`);
      navigate('/cost-optimization');
    } catch (err) {
      console.error('Failed to delete optimization:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="page-container"><p>Loading cost optimization...</p></div>;
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="alert alert-error">{error}</div>
        <button className="btn btn-secondary" onClick={() => navigate('/cost-optimization')}>
          Back to Cost Optimization
        </button>
      </div>
    );
  }

  if (!item) return null;

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/cost-optimization')}>
            Back
          </button>
          <h1>{item.title}</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-primary" onClick={() => setShowEdit(true)}>
            Edit
          </button>
          <button className="btn btn-danger" onClick={() => setShowDelete(true)}>
            Delete
          </button>
        </div>
      </div>

      <div className="card">
        <div className="detail-grid">
          <DetailField label="Title">{item.title}</DetailField>
          <DetailField label="Category">{item.category}</DetailField>
          <DetailField label="Current Cost">{formatCurrency(item.current_cost)}</DetailField>
          <DetailField label="Projected Savings">{formatCurrency(item.projected_savings)}</DetailField>
          <DetailField label="Savings %">{item.savings_pct != null ? `${item.savings_pct}%` : null}</DetailField>
          <DetailField label="Status">
            <StatusBadge status={item.status} />
          </DetailField>
          <DetailField label="Priority">
            <StatusBadge status={item.priority} />
          </DetailField>
          <DetailField label="Affected Routes">{item.affected_routes}</DetailField>
          <DetailField label="Implementation Notes">{item.implementation_notes}</DetailField>
        </div>
      </div>

      {item.ai_recommendation && (
        <div style={{ marginTop: '1.5rem' }}>
          <h2>AI Recommendation</h2>
          <AIResponseCard response={item.ai_recommendation} />
        </div>
      )}

      {showEdit && (
        <FormModal
          title="Edit Optimization"
          fields={editFields}
          initialValues={item}
          onSubmit={handleUpdate}
          onClose={() => setShowEdit(false)}
          submitting={submitting}
        />
      )}

      {showDelete && (
        <ConfirmDialog
          title="Delete Optimization"
          message={`Are you sure you want to delete "${item.title}"? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
          submitting={submitting}
        />
      )}
    </div>
  );
}
