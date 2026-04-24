import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';
import DataTable from '../components/DataTable';
import FormModal from '../components/FormModal';

const CONGESTION_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const MODE_OPTIONS = [
  { value: 'air', label: 'Air' },
  { value: 'ocean', label: 'Ocean' },
  { value: 'rail', label: 'Rail' },
  { value: 'truck', label: 'Truck' },
];

const columns = [
  { key: 'origin_city', header: 'Origin City' },
  { key: 'origin_country', header: 'Origin Country' },
  { key: 'destination_city', header: 'Dest City' },
  { key: 'destination_country', header: 'Dest Country' },
  { key: 'mode', header: 'Mode' },
  {
    key: 'distance_km',
    header: 'Distance (km)',
    render: (value) => value != null ? Number(value).toLocaleString() : '—',
  },
  {
    key: 'transit_days_avg',
    header: 'Transit Days',
    render: (value) => value != null ? value : '—',
  },
  {
    key: 'avg_rate_per_kg',
    header: 'Rate/kg ($)',
    render: (value) => value != null ? `$${Number(value).toFixed(2)}` : '—',
  },
  {
    key: 'volume_last_30d',
    header: 'Volume (30d)',
    render: (value) => value != null ? Number(value).toLocaleString() : '—',
  },
  {
    key: 'congestion_level',
    header: 'Congestion',
    render: (value) => <StatusBadge status={value} />,
  },
];

const formFields = [
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

export default function RouteAnalytics() {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchRoutes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/routes');
      setRoutes(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch routes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  const handleCreate = async (formData) => {
    await api.post('/routes', formData);
    setModalOpen(false);
    fetchRoutes();
  };

  const handleRowClick = (row) => {
    navigate(`/routes/${row.id}`);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Route Analytics</h1>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          New Route
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <DataTable
        columns={columns}
        data={routes}
        loading={loading}
        onRowClick={handleRowClick}
      />

      <FormModal
        open={modalOpen}
        title="New Route"
        fields={formFields}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
      />
    </div>
  );
}
