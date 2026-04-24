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
  { value: 'booked', label: 'Booked' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const formatCurrency = (value) => {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

const formFields = [
  { name: 'tracking_number', label: 'Tracking Number', type: 'text', required: true },
  { name: 'customer_id', label: 'Customer ID', type: 'number', required: true },
  { name: 'carrier_id', label: 'Carrier ID', type: 'number', required: true },
  { name: 'route_id', label: 'Route ID', type: 'number' },
  { name: 'origin', label: 'Origin', type: 'text', required: true },
  { name: 'destination', label: 'Destination', type: 'text', required: true },
  { name: 'mode', label: 'Mode', type: 'select', options: modeOptions, required: true },
  { name: 'weight_kg', label: 'Weight (kg)', type: 'number' },
  { name: 'volume_cbm', label: 'Volume (CBM)', type: 'number' },
  { name: 'status', label: 'Status', type: 'select', options: statusOptions, required: true },
  { name: 'quoted_price', label: 'Quoted Price ($)', type: 'number' },
  { name: 'actual_cost', label: 'Actual Cost ($)', type: 'number' },
  { name: 'pickup_date', label: 'Pickup Date', type: 'date' },
  { name: 'delivery_date', label: 'Delivery Date', type: 'date' },
];

const columns = [
  { key: 'tracking_number', header: 'Tracking #' },
  { key: 'customer_name', header: 'Customer' },
  { key: 'carrier_name', header: 'Carrier' },
  { key: 'origin', header: 'Origin' },
  { key: 'destination', header: 'Destination' },
  { key: 'mode', header: 'Mode' },
  {
    key: 'weight_kg',
    header: 'Weight (kg)',
    render: (value) => (value != null ? Number(value).toFixed(1) : '—'),
  },
  {
    key: 'status',
    header: 'Status',
    render: (value) => <StatusBadge status={value} />,
  },
  {
    key: 'quoted_price',
    header: 'Quoted Price ($)',
    render: (value) => formatCurrency(value),
  },
  { key: 'pickup_date', header: 'Pickup Date' },
];

export default function Shipments() {
  const navigate = useNavigate();
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchShipments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/shipments');
      setShipments(res.data);
      setError(null);
    } catch (err) {
      setError('Failed to load shipments.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  const handleRowClick = (row) => {
    navigate(`/shipments/${row.id}`);
  };

  const handleCreate = async (formData) => {
    try {
      setSubmitting(true);
      await api.post('/shipments', formData);
      setShowModal(false);
      fetchShipments();
    } catch (err) {
      console.error('Failed to create shipment:', err);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Shipments</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          New Shipment
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <DataTable
        columns={columns}
        data={shipments}
        loading={loading}
        onRowClick={handleRowClick}
      />

      {showModal && (
        <FormModal
          title="New Shipment"
          fields={formFields}
          onSubmit={handleCreate}
          onClose={() => setShowModal(false)}
          submitting={submitting}
        />
      )}
    </div>
  );
}
