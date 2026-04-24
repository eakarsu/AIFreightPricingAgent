import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';

function DetailField({ label, children }) {
  return (
    <div className="detail-field">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{children ?? '—'}</span>
    </div>
  );
}

export default function AuditTrailDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEntry = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/audit-trail/${id}`);
      setEntry(res.data);
      setError(null);
    } catch (err) {
      setError('Failed to load audit trail entry.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEntry();
  }, [fetchEntry]);

  if (loading) {
    return <div className="page-container"><p>Loading audit trail entry...</p></div>;
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="alert alert-error">{error}</div>
        <button className="btn btn-secondary" onClick={() => navigate('/audit-trail')}>
          Back to Audit Trail
        </button>
      </div>
    );
  }

  if (!entry) return null;

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/audit-trail')}>
            Back
          </button>
          <h1>Audit Entry #{entry.id}</h1>
        </div>
      </div>

      <div className="card">
        <div className="detail-grid">
          <DetailField label="Entity Type">{entry.entity_type}</DetailField>
          <DetailField label="Entity ID">{entry.entity_id}</DetailField>
          <DetailField label="Action">
            <StatusBadge status={entry.action} />
          </DetailField>
          <DetailField label="Field Changed">{entry.field_changed}</DetailField>
          <DetailField label="Old Value">{entry.old_value}</DetailField>
          <DetailField label="New Value">{entry.new_value}</DetailField>
          <DetailField label="User">{entry.user}</DetailField>
          <DetailField label="IP Address">{entry.ip_address}</DetailField>
          <DetailField label="Timestamp">{entry.timestamp}</DetailField>
        </div>
      </div>
    </div>
  );
}
