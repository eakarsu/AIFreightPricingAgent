import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';
import DataTable from '../components/DataTable';

const columns = [
  { key: 'entity_type', header: 'Entity Type' },
  { key: 'entity_id', header: 'Entity ID' },
  {
    key: 'action',
    header: 'Action',
    render: (value) => <StatusBadge status={value} />,
  },
  { key: 'field_changed', header: 'Field Changed' },
  { key: 'old_value', header: 'Old Value' },
  { key: 'new_value', header: 'New Value' },
  { key: 'user', header: 'User' },
  { key: 'ip_address', header: 'IP' },
  { key: 'timestamp', header: 'Timestamp' },
];

export default function AuditTrail() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/audit-trail');
      setEntries(res.data);
      setError(null);
    } catch (err) {
      setError('Failed to load audit trail.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleRowClick = (row) => {
    navigate(`/audit-trail/${row.id}`);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Audit Trail</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <DataTable
        deleteEndpoint="/audit-trail"
        columns={columns}
        data={entries}
        loading={loading}
        onRowClick={handleRowClick}
      />
    </div>
  );
}
