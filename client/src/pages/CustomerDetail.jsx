import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/ConfirmDialog';
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

const formatCurrency = (value) => {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchCustomer = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/customers/${id}`);
      setCustomer(res.data);
      setError(null);
    } catch (err) {
      setError('Failed to load customer.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  const handleUpdate = async (formData) => {
    try {
      setSubmitting(true);
      await api.put(`/customers/${id}`, formData);
      setShowEdit(false);
      fetchCustomer();
    } catch (err) {
      console.error('Failed to update customer:', err);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/customers/${id}`);
      navigate('/customers');
    } catch (err) {
      console.error('Failed to delete customer:', err);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  if (!customer) return null;

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/customers')} className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1>{customer.company_name}</h1>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => setShowEdit(true)}>Edit</button>
          <button className="btn btn-danger" onClick={() => setShowDelete(true)}>Delete</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Company Information</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">Company Name</dt>
              <dd className="text-sm font-medium text-slate-800">{customer.company_name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">Industry</dt>
              <dd className="text-sm font-medium text-slate-800">{customer.industry || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">Tier</dt>
              <dd><StatusBadge status={customer.tier} /></dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">Annual Volume</dt>
              <dd className="text-sm font-medium text-slate-800">{formatCurrency(customer.annual_volume)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">Country</dt>
              <dd className="text-sm font-medium text-slate-800">{customer.country || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">Status</dt>
              <dd><StatusBadge status={customer.status} /></dd>
            </div>
          </dl>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Contact Information</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">Contact Name</dt>
              <dd className="text-sm font-medium text-slate-800">{customer.contact_name || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">Email</dt>
              <dd className="text-sm font-medium text-slate-800">{customer.email || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">Phone</dt>
              <dd className="text-sm font-medium text-slate-800">{customer.phone || '—'}</dd>
            </div>
          </dl>
        </div>
      </div>

      {showEdit && (
        <FormModal
          title="Edit Customer"
          fields={formFields}
          initialValues={customer}
          onSubmit={handleUpdate}
          onClose={() => setShowEdit(false)}
          submitting={submitting}
        />
      )}

      <ConfirmDialog
        open={showDelete}
        title="Delete Customer"
        message={`Are you sure you want to delete ${customer.company_name}? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
}
