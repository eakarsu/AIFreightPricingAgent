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
  { value: 'booked', label: 'Booked' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const formatCurrency = (value) => {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

const editFields = [
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

function DetailField({ label, children }) {
  return (
    <div className="detail-field">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{children ?? '—'}</span>
    </div>
  );
}

export default function ShipmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchShipment = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/shipments/${id}`);
      setShipment(res.data);
      setError(null);
    } catch (err) {
      setError('Failed to load shipment.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchShipment();
  }, [fetchShipment]);

  const handleUpdate = async (formData) => {
    try {
      setSubmitting(true);
      await api.put(`/shipments/${id}`, formData);
      setShowEdit(false);
      fetchShipment();
    } catch (err) {
      console.error('Failed to update shipment:', err);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setSubmitting(true);
      await api.delete(`/shipments/${id}`);
      navigate('/shipments');
    } catch (err) {
      console.error('Failed to delete shipment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="page-container"><p>Loading shipment...</p></div>;
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="alert alert-error">{error}</div>
        <button className="btn btn-secondary" onClick={() => navigate('/shipments')}>
          Back to Shipments
        </button>
      </div>
    );
  }

  if (!shipment) return null;

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/shipments')}>
            Back
          </button>
          <h1>Shipment: {shipment.tracking_number}</h1>
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
          <DetailField label="Tracking Number">{shipment.tracking_number}</DetailField>
          <DetailField label="Status">
            <StatusBadge status={shipment.status} />
          </DetailField>
          <DetailField label="Customer">{shipment.customer_name}</DetailField>
          <DetailField label="Carrier">{shipment.carrier_name}</DetailField>
          <DetailField label="Origin">{shipment.origin}</DetailField>
          <DetailField label="Destination">{shipment.destination}</DetailField>
          <DetailField label="Mode">{shipment.mode}</DetailField>
          <DetailField label="Weight (kg)">
            {shipment.weight_kg != null ? Number(shipment.weight_kg).toFixed(1) : null}
          </DetailField>
          <DetailField label="Volume (CBM)">
            {shipment.volume_cbm != null ? Number(shipment.volume_cbm).toFixed(2) : null}
          </DetailField>
          <DetailField label="Quoted Price">{formatCurrency(shipment.quoted_price)}</DetailField>
          <DetailField label="Actual Cost">{formatCurrency(shipment.actual_cost)}</DetailField>
          <DetailField label="Route ID">{shipment.route_id}</DetailField>
          <DetailField label="Pickup Date">{shipment.pickup_date}</DetailField>
          <DetailField label="Delivery Date">{shipment.delivery_date}</DetailField>
        </div>
      </div>

      {showEdit && (
        <FormModal
          title="Edit Shipment"
          fields={editFields}
          initialValues={shipment}
          onSubmit={handleUpdate}
          onClose={() => setShowEdit(false)}
          submitting={submitting}
        />
      )}

      {showDelete && (
        <ConfirmDialog
          title="Delete Shipment"
          message={`Are you sure you want to delete shipment ${shipment.tracking_number}? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
          submitting={submitting}
        />
      )}
    </div>
  );
}
