import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/ConfirmDialog';
import FormModal from '../components/FormModal';

const ruleTypeOptions = [
  { value: 'surcharge', label: 'Surcharge' },
  { value: 'discount', label: 'Discount' },
  { value: 'minimum', label: 'Minimum' },
  { value: 'dynamic', label: 'Dynamic' },
];

const adjustmentTypeOptions = [
  { value: 'percentage', label: 'Percentage' },
  { value: 'flat', label: 'Flat' },
];

const editFields = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'rule_type', label: 'Type', type: 'select', options: ruleTypeOptions, required: true },
  { name: 'mode', label: 'Mode', type: 'text' },
  { name: 'condition_field', label: 'Condition Field', type: 'text' },
  { name: 'condition_operator', label: 'Condition Operator', type: 'text' },
  { name: 'condition_value', label: 'Condition Value', type: 'text' },
  { name: 'adjustment_type', label: 'Adjustment Type', type: 'select', options: adjustmentTypeOptions, required: true },
  { name: 'adjustment_value', label: 'Adjustment Value', type: 'number', required: true },
  { name: 'priority', label: 'Priority', type: 'number' },
  { name: 'is_active', label: 'Active', type: 'checkbox' },
];

function DetailField({ label, children }) {
  return (
    <div className="detail-field">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{children ?? '—'}</span>
    </div>
  );
}

export default function PricingRuleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [rule, setRule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchRule = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/pricing-rules/${id}`);
      setRule(res.data);
      setError(null);
    } catch (err) {
      setError('Failed to load pricing rule.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRule();
  }, [fetchRule]);

  const handleUpdate = async (formData) => {
    try {
      setSubmitting(true);
      await api.put(`/pricing-rules/${id}`, formData);
      setShowEdit(false);
      fetchRule();
    } catch (err) {
      console.error('Failed to update pricing rule:', err);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setSubmitting(true);
      await api.delete(`/pricing-rules/${id}`);
      navigate('/pricing-rules');
    } catch (err) {
      console.error('Failed to delete pricing rule:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="page-container"><p>Loading pricing rule...</p></div>;
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="alert alert-error">{error}</div>
        <button className="btn btn-secondary" onClick={() => navigate('/pricing-rules')}>
          Back to Pricing Rules
        </button>
      </div>
    );
  }

  if (!rule) return null;

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/pricing-rules')}>
            Back
          </button>
          <h1>Rule: {rule.name}</h1>
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
          <DetailField label="Name">{rule.name}</DetailField>
          <DetailField label="Type">{rule.rule_type}</DetailField>
          <DetailField label="Mode">{rule.mode}</DetailField>
          <DetailField label="Condition Field">{rule.condition_field}</DetailField>
          <DetailField label="Condition Operator">{rule.condition_operator}</DetailField>
          <DetailField label="Condition Value">{rule.condition_value}</DetailField>
          <DetailField label="Adjustment Type">{rule.adjustment_type}</DetailField>
          <DetailField label="Adjustment Value">{rule.adjustment_value}</DetailField>
          <DetailField label="Priority">{rule.priority}</DetailField>
          <DetailField label="Active">
            <StatusBadge status={rule.is_active ? 'active' : 'inactive'} />
          </DetailField>
        </div>
      </div>

      {showEdit && (
        <FormModal
          title="Edit Pricing Rule"
          fields={editFields}
          initialValues={rule}
          onSubmit={handleUpdate}
          onClose={() => setShowEdit(false)}
          submitting={submitting}
        />
      )}

      {showDelete && (
        <ConfirmDialog
          title="Delete Pricing Rule"
          message={`Are you sure you want to delete rule "${rule.name}"? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
          submitting={submitting}
        />
      )}
    </div>
  );
}
