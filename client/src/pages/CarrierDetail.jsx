import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/ConfirmDialog';
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

const editFields = [
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

function RatingBar({ rating }) {
  const numRating = Number(rating);
  if (rating == null || isNaN(numRating)) return <span>—</span>;
  const percentage = (numRating / 5) * 100;

  let barColor = '#22c55e';
  if (numRating < 2) barColor = '#ef4444';
  else if (numRating < 3) barColor = '#f97316';
  else if (numRating < 4) barColor = '#eab308';

  return (
    <div className="rating-bar-container">
      <div className="rating-bar-track">
        <div
          className="rating-bar-fill"
          style={{ width: `${percentage}%`, backgroundColor: barColor }}
        />
      </div>
      <div className="rating-bar-stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`rating-star ${star <= Math.round(numRating) ? 'rating-star-filled' : 'rating-star-empty'}`}
          >
            ★
          </span>
        ))}
        <span className="rating-bar-value">{numRating.toFixed(1)} / 5</span>
      </div>
    </div>
  );
}

export default function CarrierDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [carrier, setCarrier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const fetchCarrier = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/carriers/${id}`);
      setCarrier(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch carrier');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCarrier();
  }, [fetchCarrier]);

  const handleEdit = async (formData) => {
    await api.put(`/carriers/${id}`, formData);
    setEditOpen(false);
    fetchCarrier();
  };

  const handleDelete = async () => {
    await api.delete(`/carriers/${id}`);
    navigate('/carriers');
  };

  if (loading) {
    return <div className="page-container"><p>Loading...</p></div>;
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="alert alert-error">{error}</div>
        <button className="btn btn-secondary" onClick={() => navigate('/carriers')}>
          Back to Carriers
        </button>
      </div>
    );
  }

  if (!carrier) {
    return (
      <div className="page-container">
        <p>Carrier not found.</p>
        <button className="btn btn-secondary" onClick={() => navigate('/carriers')}>
          Back to Carriers
        </button>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>{carrier.name}</h1>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/carriers')}>
            Back
          </button>
          <button className="btn btn-primary" onClick={() => setEditOpen(true)}>
            Edit
          </button>
          <button className="btn btn-danger" onClick={() => setDeleteOpen(true)}>
            Delete
          </button>
        </div>
      </div>

      <div className="detail-card">
        <div className="detail-card-grid">
          <div className="detail-field">
            <span className="detail-label">Name</span>
            <span className="detail-value">{carrier.name}</span>
          </div>
          <div className="detail-field">
            <span className="detail-label">Code</span>
            <span className="detail-value">{carrier.code}</span>
          </div>
          <div className="detail-field">
            <span className="detail-label">Mode</span>
            <span className="detail-value">{carrier.mode}</span>
          </div>
          <div className="detail-field">
            <span className="detail-label">Contact Email</span>
            <span className="detail-value">{carrier.contact_email || '—'}</span>
          </div>
          <div className="detail-field">
            <span className="detail-label">Contact Phone</span>
            <span className="detail-value">{carrier.contact_phone || '—'}</span>
          </div>
          <div className="detail-field">
            <span className="detail-label">Base Country</span>
            <span className="detail-value">{carrier.base_country}</span>
          </div>
          <div className="detail-field">
            <span className="detail-label">On-Time %</span>
            <span className="detail-value">
              {carrier.on_time_pct != null
                ? `${Number(carrier.on_time_pct).toFixed(1)}%`
                : '—'}
            </span>
          </div>
          <div className="detail-field">
            <span className="detail-label">Status</span>
            <span className="detail-value">
              <StatusBadge status={carrier.status} />
            </span>
          </div>
        </div>

        <div className="detail-field detail-field-full">
          <span className="detail-label">Rating</span>
          <RatingBar rating={carrier.rating} />
        </div>
      </div>

      <FormModal
        open={editOpen}
        title="Edit Carrier"
        fields={editFields}
        initialValues={carrier}
        onClose={() => setEditOpen(false)}
        onSubmit={handleEdit}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Delete Carrier"
        message={`Are you sure you want to delete carrier "${carrier.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
