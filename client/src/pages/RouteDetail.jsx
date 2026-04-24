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

const CONGESTION_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const editFields = [
  { name: 'origin_city', label: 'Origin City', type: 'text', required: true },
  { name: 'origin_country', label: 'Origin Country', type: 'text', required: true },
  { name: 'destination_city', label: 'Destination City', type: 'text', required: true },
  { name: 'destination_country', label: 'Destination Country', type: 'text', required: true },
  { name: 'mode', label: 'Mode', type: 'select', options: MODE_OPTIONS, required: true },
  { name: 'distance_km', label: 'Distance (km)', type: 'number', required: true },
  { name: 'transit_days_avg', label: 'Transit Days (avg)', type: 'number', required: true },
  { name: 'avg_rate_per_kg', label: 'Avg Rate per kg ($)', type: 'number', step: '0.01', required: true },
  { name: 'volume_last_30d', label: 'Volume (last 30 days)', type: 'number', required: false },
  {
    name: 'congestion_level',
    label: 'Congestion Level',
    type: 'select',
    options: CONGESTION_OPTIONS,
    required: true,
  },
];

export default function RouteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const fetchRoute = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/routes/${id}`);
      setRoute(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch route');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRoute();
  }, [fetchRoute]);

  const handleEdit = async (formData) => {
    await api.put(`/routes/${id}`, formData);
    setEditOpen(false);
    fetchRoute();
  };

  const handleDelete = async () => {
    await api.delete(`/routes/${id}`);
    navigate('/routes');
  };

  if (loading) {
    return <div className="page-container"><p>Loading...</p></div>;
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="alert alert-error">{error}</div>
        <button className="btn btn-secondary" onClick={() => navigate('/routes')}>
          Back to Routes
        </button>
      </div>
    );
  }

  if (!route) {
    return (
      <div className="page-container">
        <p>Route not found.</p>
        <button className="btn btn-secondary" onClick={() => navigate('/routes')}>
          Back to Routes
        </button>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Route Detail</h1>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/routes')}>
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
            <span className="detail-label">Origin</span>
            <span className="detail-value">
              {route.origin_city}, {route.origin_country}
            </span>
          </div>
          <div className="detail-field">
            <span className="detail-label">Destination</span>
            <span className="detail-value">
              {route.destination_city}, {route.destination_country}
            </span>
          </div>
          <div className="detail-field">
            <span className="detail-label">Mode</span>
            <span className="detail-value">{route.mode}</span>
          </div>
          <div className="detail-field">
            <span className="detail-label">Distance</span>
            <span className="detail-value">
              {route.distance_km != null
                ? `${Number(route.distance_km).toLocaleString()} km`
                : '—'}
            </span>
          </div>
          <div className="detail-field">
            <span className="detail-label">Transit Days (avg)</span>
            <span className="detail-value">
              {route.transit_days_avg != null ? route.transit_days_avg : '—'}
            </span>
          </div>
          <div className="detail-field">
            <span className="detail-label">Rate per kg</span>
            <span className="detail-value">
              {route.avg_rate_per_kg != null
                ? `$${Number(route.avg_rate_per_kg).toFixed(2)}`
                : '—'}
            </span>
          </div>
          <div className="detail-field">
            <span className="detail-label">Volume (last 30 days)</span>
            <span className="detail-value">
              {route.volume_last_30d != null
                ? Number(route.volume_last_30d).toLocaleString()
                : '—'}
            </span>
          </div>
          <div className="detail-field">
            <span className="detail-label">Congestion</span>
            <span className="detail-value">
              <StatusBadge status={route.congestion_level} />
            </span>
          </div>
        </div>
      </div>

      <FormModal
        open={editOpen}
        title="Edit Route"
        fields={editFields}
        initialValues={route}
        onClose={() => setEditOpen(false)}
        onSubmit={handleEdit}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Delete Route"
        message={`Are you sure you want to delete the route from ${route.origin_city} to ${route.destination_city}? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
