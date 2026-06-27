import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';
import DataTable from '../components/DataTable';
import FormModal from '../components/FormModal';

const tierOptions = [
  { value: 'enterprise', label: 'Enterprise' },
  { value: 'mid-market', label: 'Mid-Market' },
  { value: 'smb', label: 'SMB' },
];

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'prospect', label: 'Prospect' },
];

const formatCurrency = (value) => {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

const formFields = [
  { name: 'company_name', label: 'Company Name', type: 'text', required: true },
  { name: 'contact_name', label: 'Contact Name', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'phone', label: 'Phone', type: 'text' },
  { name: 'industry', label: 'Industry', type: 'text' },
  { name: 'tier', label: 'Tier', type: 'select', options: tierOptions, required: true },
  { name: 'annual_volume', label: 'Annual Volume ($)', type: 'number' },
  { name: 'country', label: 'Country', type: 'text' },
  { name: 'status', label: 'Status', type: 'select', options: statusOptions, required: true },
];

const columns = [
  { key: 'company_name', header: 'Company Name' },
  { key: 'contact_name', header: 'Contact' },
  { key: 'email', header: 'Email' },
  { key: 'industry', header: 'Industry' },
  {
    key: 'tier',
    header: 'Tier',
    render: (value) => <StatusBadge status={value} />,
  },
  {
    key: 'annual_volume',
    header: 'Annual Volume ($)',
    render: (value) => formatCurrency(value),
  },
  { key: 'country', header: 'Country' },
  {
    key: 'status',
    header: 'Status',
    render: (value) => <StatusBadge status={value} />,
  },
];

export default function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/customers');
      setCustomers(res.data);
      setError(null);
    } catch (err) {
      setError('Failed to load customers.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleRowClick = (row) => {
    navigate(`/customers/${row.id}`);
  };

  const handleSave = async (formData) => {
    try {
      setSubmitting(true);
      if (editingRow) await api.put(`/customers/${editingRow.id}`, formData);
      else await api.post('/customers', formData);
      setShowModal(false);
      setEditingRow(null);
      fetchCustomers();
    } catch (err) {
      console.error('Failed to save customer:', err);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Customers</h1>
        <button className="btn btn-primary" onClick={() => { setEditingRow(null); setShowModal(true); }}>
          New Customer
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <DataTable
        deleteEndpoint="/customers"
        columns={columns}
        data={customers}
        loading={loading}
        onRowClick={handleRowClick}
        onEdit={(row) => { setEditingRow(row); setShowModal(true); }}
      />

      {showModal && (
        <FormModal
        deleteEndpoint="/customers"
        onDeleted={() => window.location.reload()}
          title={editingRow ? 'Edit Customer' : 'New Customer'}
          fields={formFields}
          initialData={editingRow || {}}
          onSubmit={handleSave}
          onClose={() => { setShowModal(false); setEditingRow(null); }}
          submitting={submitting}
        />
      )}
    </div>
  );
}
