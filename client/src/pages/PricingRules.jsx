import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';
import DataTable from '../components/DataTable';
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

const formFields = [
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

const columns = [
  { key: 'name', header: 'Name' },
  { key: 'rule_type', header: 'Type' },
  { key: 'mode', header: 'Mode' },
  { key: 'condition_field', header: 'Condition' },
  { key: 'condition_operator', header: 'Operator' },
  { key: 'condition_value', header: 'Value' },
  { key: 'adjustment_type', header: 'Adjustment Type' },
  { key: 'adjustment_value', header: 'Adjustment Value' },
  { key: 'priority', header: 'Priority' },
  {
    key: 'is_active',
    header: 'Active',
    render: (value) => (
      <StatusBadge status={value ? 'active' : 'inactive'} />
    ),
  },
];

export default function PricingRules() {
  const navigate = useNavigate();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/pricing-rules');
      setRules(res.data);
      setError(null);
    } catch (err) {
      setError('Failed to load pricing rules.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleRowClick = (row) => {
    navigate(`/pricing-rules/${row.id}`);
  };

  const handleCreate = async (formData) => {
    try {
      setSubmitting(true);
      await api.post('/pricing-rules', formData);
      setShowModal(false);
      fetchRules();
    } catch (err) {
      console.error('Failed to create pricing rule:', err);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Pricing Rules</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          New Rule
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <DataTable
        columns={columns}
        data={rules}
        loading={loading}
        onRowClick={handleRowClick}
      />

      {showModal && (
        <FormModal
          title="New Rule"
          fields={formFields}
          onSubmit={handleCreate}
          onClose={() => setShowModal(false)}
          submitting={submitting}
        />
      )}
    </div>
  );
}
