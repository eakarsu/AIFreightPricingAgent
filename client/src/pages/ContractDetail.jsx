import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/ConfirmDialog';
import FormModal from '../components/FormModal';

const modeOptions = [
  { value: 'ocean', label: 'Ocean' },
  { value: 'air', label: 'Air' },
  { value: 'rail', label: 'Rail' },
  { value: 'truck', label: 'Truck' },
  { value: 'intermodal', label: 'Intermodal' },
];

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
  { value: 'pending', label: 'Pending' },
  { value: 'terminated', label: 'Terminated' },
];

const formatCurrency = (value) => {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

const editFields = [
  { name: 'contract_number', label: 'Contract Number', type: 'text', required: true },
  { name: 'customer_id', label: 'Customer', type: 'number', required: true },
  { name: 'carrier_id', label: 'Carrier', type: 'number', required: true },
  { name: 'start_date', label: 'Start Date', type: 'date', required: true },
  { name: 'end_date', label: 'End Date', type: 'date', required: true },
  { name: 'mode', label: 'Mode', type: 'select', options: modeOptions, required: true },
  { name: 'min_volume', label: 'Min Volume', type: 'number' },
  { name: 'committed_rate', label: 'Committed Rate ($)', type: 'number', required: true },
  { name: 'currency', label: 'Currency', type: 'text' },
  { name: 'status', label: 'Status', type: 'select', options: statusOptions, required: true },
  { name: 'terms', label: 'Terms', type: 'textarea' },
];

function DetailField({ label, children }) {
  return (
    <div className="detail-field">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{children ?? '—'}</span>
    </div>
  );
}

export default function ContractDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchContract = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/contracts/${id}`);
      setContract(res.data);
      setError(null);
    } catch (err) {
      setError('Failed to load contract.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchContract();
  }, [fetchContract]);

  const handleUpdate = async (formData) => {
    try {
      setSubmitting(true);
      await api.put(`/contracts/${id}`, formData);
      setShowEdit(false);
      fetchContract();
    } catch (err) {
      console.error('Failed to update contract:', err);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setSubmitting(true);
      await api.delete(`/contracts/${id}`);
      navigate('/contracts');
    } catch (err) {
      console.error('Failed to delete contract:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="page-container"><p>Loading contract...</p></div>;
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="alert alert-error">{error}</div>
        <button className="btn btn-secondary" onClick={() => navigate('/contracts')}>
          Back to Contracts
        </button>
      </div>
    );
  }

  if (!contract) return null;

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/contracts')}>
            Back
          </button>
          <h1>Contract: {contract.contract_number}</h1>
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
          <DetailField label="Contract Number">{contract.contract_number}</DetailField>
          <DetailField label="Customer">{contract.customer_name || contract.customer_id}</DetailField>
          <DetailField label="Carrier">{contract.carrier_name || contract.carrier_id}</DetailField>
          <DetailField label="Start Date">{contract.start_date}</DetailField>
          <DetailField label="End Date">{contract.end_date}</DetailField>
          <DetailField label="Mode">{contract.mode}</DetailField>
          <DetailField label="Min Volume">{contract.min_volume}</DetailField>
          <DetailField label="Committed Rate">{formatCurrency(contract.committed_rate)}</DetailField>
          <DetailField label="Currency">{contract.currency}</DetailField>
          <DetailField label="Status">
            <StatusBadge status={contract.status} />
          </DetailField>
          <DetailField label="Terms">{contract.terms}</DetailField>
        </div>
      </div>

      {showEdit && (
        <FormModal
          title="Edit Contract"
          fields={editFields}
          initialValues={contract}
          onSubmit={handleUpdate}
          onClose={() => setShowEdit(false)}
          submitting={submitting}
        />
      )}

      {showDelete && (
        <ConfirmDialog
          title="Delete Contract"
          message={`Are you sure you want to delete contract ${contract.contract_number}? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
          submitting={submitting}
        />
      )}
    </div>
  );
}
