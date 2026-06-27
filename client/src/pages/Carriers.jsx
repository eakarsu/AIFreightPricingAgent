import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';
import DataTable from '../components/DataTable';
import FormModal from '../components/FormModal';

const MODE_OPTIONS = [
  { value: 'air', label: 'Air' },
  { value: 'ocean', label: 'Ocean' },
  { value: 'rail', label: 'Rail' },
  { value: 'truck', label: 'Truck' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
];

function renderStars(rating) {
  const numRating = Number(rating);
  if (rating == null || isNaN(numRating)) return '—';
  const fullStars = Math.floor(numRating);
  const hasHalf = numRating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
  return (
    <span className="star-rating" title={`${numRating.toFixed(1)} / 5`}>
      {'★'.repeat(fullStars)}
      {hasHalf && '½'}
      {'☆'.repeat(emptyStars)}
      <span className="star-rating-number"> ({numRating.toFixed(1)})</span>
    </span>
  );
}

const columns = [
  { key: 'name', header: 'Name' },
  { key: 'code', header: 'Code' },
  { key: 'mode', header: 'Mode' },
  {
    key: 'rating',
    header: 'Rating',
    render: (value) => renderStars(value),
  },
  {
    key: 'on_time_pct',
    header: 'On-Time %',
    render: (value) => value != null ? `${Number(value).toFixed(1)}%` : '—',
  },
  { key: 'base_country', header: 'Country' },
  {
    key: 'status',
    header: 'Status',
    render: (value) => <StatusBadge status={value} />,
  },
];

const formFields = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'code', label: 'Code', type: 'text', required: true },
  { name: 'mode', label: 'Mode', type: 'select', options: MODE_OPTIONS, required: true },
  { name: 'contact_email', label: 'Contact Email', type: 'email', required: false },
  { name: 'contact_phone', label: 'Contact Phone', type: 'text', required: false },
  { name: 'rating', label: 'Rating (0-5)', type: 'number', step: '0.1', min: 0, max: 5, required: false },
  { name: 'on_time_pct', label: 'On-Time %', type: 'number', step: '0.1', min: 0, max: 100, required: false },
  { name: 'base_country', label: 'Base Country', type: 'text', required: true },
  { name: 'status', label: 'Status', type: 'select', options: STATUS_OPTIONS, required: true },
];

export default function Carriers() {
  const navigate = useNavigate();
  const [carriers, setCarriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);

  const fetchCarriers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/carriers');
      setCarriers(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch carriers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCarriers();
  }, [fetchCarriers]);

  const handleSave = async (formData) => {
    if (editingRow) await api.put(`/carriers/${editingRow.id}`, formData);
    else await api.post('/carriers', formData);
    setModalOpen(false);
    setEditingRow(null);
    fetchCarriers();
  };

  const handleRowClick = (row) => {
    navigate(`/carriers/${row.id}`);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Carriers</h1>
        <button className="btn btn-primary" onClick={() => { setEditingRow(null); setModalOpen(true); }}>
          New Carrier
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <DataTable
        deleteEndpoint="/carriers"
        columns={columns}
        data={carriers}
        loading={loading}
        onRowClick={handleRowClick}
        onEdit={(row) => { setEditingRow(row); setModalOpen(true); }}
      />

      <FormModal
        deleteEndpoint="/carriers"
        onDeleted={() => window.location.reload()}
        open={modalOpen}
        title={editingRow ? 'Edit Carrier' : 'New Carrier'}
        fields={formFields}
        initialData={editingRow || {}}
        onClose={() => { setModalOpen(false); setEditingRow(null); }}
        onSubmit={handleSave}
      />
    </div>
  );
}
