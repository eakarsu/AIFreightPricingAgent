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

function EditField({ label, value, onChange, type = 'text' }) {
  return (
    <div className="detail-field">
      <span className="detail-label">{label}</span>
      <input
        className="form-control"
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 6 }}
      />
    </div>
  );
}

export default function AuditTrailDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});

  const EDITABLE = ['entity_type', 'entity_id', 'action', 'field_changed', 'old_value', 'new_value', 'user_name', 'ip_address'];

  const startEdit = () => {
    const f = {};
    EDITABLE.forEach((k) => { f[k] = entry[k] ?? ''; });
    setForm(f);
    setEditing(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await api.put(`/audit-trail/${id}`, form);
      setEntry(res.data);
      setEditing(false);
    } catch (err) {
      setError('Failed to save audit trail entry.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this audit entry? This permanently removes the record.')) return;
    try {
      setDeleting(true);
      await api.delete(`/audit-trail/${id}`);
      navigate('/audit-trail');
    } catch (err) {
      setError('Failed to delete audit trail entry.');
      setDeleting(false);
    }
  };

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
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/audit-trail')}>
            Back
          </button>
          <h1>Audit Entry #{entry.id}</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {editing ? (
            <>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button className="btn btn-secondary" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={startEdit}>Edit</button>
              <button
                className="btn"
                onClick={handleDelete}
                disabled={deleting}
                style={{ background: '#dc2626', color: '#fff', border: 0, opacity: deleting ? 0.6 : 1 }}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="card">
        {editing ? (
          <div className="detail-grid">
            <EditField label="Entity Type" value={form.entity_type} onChange={(v) => setForm({ ...form, entity_type: v })} />
            <EditField label="Entity ID" type="number" value={form.entity_id} onChange={(v) => setForm({ ...form, entity_id: v })} />
            <EditField label="Action" value={form.action} onChange={(v) => setForm({ ...form, action: v })} />
            <EditField label="Field Changed" value={form.field_changed} onChange={(v) => setForm({ ...form, field_changed: v })} />
            <EditField label="Old Value" value={form.old_value} onChange={(v) => setForm({ ...form, old_value: v })} />
            <EditField label="New Value" value={form.new_value} onChange={(v) => setForm({ ...form, new_value: v })} />
            <EditField label="User" value={form.user_name} onChange={(v) => setForm({ ...form, user_name: v })} />
            <EditField label="IP Address" value={form.ip_address} onChange={(v) => setForm({ ...form, ip_address: v })} />
          </div>
        ) : (
          <div className="detail-grid">
            <DetailField label="Entity Type">{entry.entity_type}</DetailField>
            <DetailField label="Entity ID">{entry.entity_id}</DetailField>
            <DetailField label="Action">
              <StatusBadge status={entry.action} />
            </DetailField>
            <DetailField label="Field Changed">{entry.field_changed}</DetailField>
            <DetailField label="Old Value">{entry.old_value}</DetailField>
            <DetailField label="New Value">{entry.new_value}</DetailField>
            <DetailField label="User">{entry.user_name}</DetailField>
            <DetailField label="IP Address">{entry.ip_address}</DetailField>
            <DetailField label="Timestamp">{entry.created_at}</DetailField>
          </div>
        )}
      </div>
    </div>
  );
}
