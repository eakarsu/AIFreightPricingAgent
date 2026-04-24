import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';
import DataTable from '../components/DataTable';
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

const formFields = [
  { name: 'contract_number', label: 'Contract Number', type: 'text', required: true },
  { name: 'customer_id', label: 'Customer ID', type: 'number', required: true },
  { name: 'carrier_id', label: 'Carrier ID', type: 'number', required: true },
  { name: 'start_date', label: 'Start Date', type: 'date', required: true },
  { name: 'end_date', label: 'End Date', type: 'date', required: true },
  { name: 'mode', label: 'Mode', type: 'select', options: modeOptions, required: true },
  { name: 'min_volume', label: 'Min Volume', type: 'number' },
  { name: 'committed_rate', label: 'Committed Rate ($)', type: 'number', required: true },
  { name: 'currency', label: 'Currency', type: 'text' },
  { name: 'status', label: 'Status', type: 'select', options: statusOptions, required: true },
  { name: 'terms', label: 'Terms', type: 'textarea' },
];

const columns = [
  { key: 'contract_number', header: 'Contract #' },
  { key: 'customer_name', header: 'Customer' },
  { key: 'carrier_name', header: 'Carrier' },
  { key: 'start_date', header: 'Start Date' },
  { key: 'end_date', header: 'End Date' },
  { key: 'mode', header: 'Mode' },
  { key: 'min_volume', header: 'Min Volume' },
  {
    key: 'committed_rate',
    header: 'Rate ($)',
    render: (value) => formatCurrency(value),
  },
  {
    key: 'status',
    header: 'Status',
    render: (value) => <StatusBadge status={value} />,
  },
];

export default function Contracts() {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchContracts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/contracts');
      setContracts(res.data);
      setError(null);
    } catch (err) {
      setError('Failed to load contracts.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const handleRowClick = (row) => {
    navigate(`/contracts/${row.id}`);
  };

  const handleCreate = async (formData) => {
    try {
      setSubmitting(true);
      await api.post('/contracts', formData);
      setShowModal(false);
      fetchContracts();
    } catch (err) {
      console.error('Failed to create contract:', err);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Contracts</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          New Contract
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <DataTable
        columns={columns}
        data={contracts}
        loading={loading}
        onRowClick={handleRowClick}
      />

      {showModal && (
        <FormModal
          title="New Contract"
          fields={formFields}
          onSubmit={handleCreate}
          onClose={() => setShowModal(false)}
          submitting={submitting}
        />
      )}
    </div>
  );
}
