import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';

const ID_LOOKUPS = {
  customer_id: { key: 'customers', endpoint: '/customers', empty: 'No customer selected' },
  carrier_id: { key: 'carriers', endpoint: '/carriers', empty: 'No carrier selected' },
  route_id: { key: 'routes', endpoint: '/routes', empty: 'No route selected' },
  contract_id: { key: 'contracts', endpoint: '/contracts', empty: 'No contract selected' },
  quote_id: { key: 'quotes', endpoint: '/rate-quotes', empty: 'No quote selected' },
  shipment_id: { key: 'shipments', endpoint: '/shipments', empty: 'No shipment selected' },
};

function normalizeRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function toInputValue(value, type) {
  if (value === null || value === undefined) return type === 'checkbox' ? false : '';
  if (type === 'date' && typeof value === 'string') return value.slice(0, 10);
  return value;
}

function optionLabel(key, item) {
  if (key === 'customers') return `${item.company_name || item.contact_name || 'Customer'} (#${item.id})`;
  if (key === 'carriers') return `${item.name || item.code || 'Carrier'}${item.mode ? ` - ${item.mode}` : ''} (#${item.id})`;
  if (key === 'routes') return `${item.origin_city || item.origin || 'Origin'} to ${item.destination_city || item.destination || 'Destination'}${item.mode ? ` - ${item.mode}` : ''} (#${item.id})`;
  if (key === 'contracts') return `${item.contract_number || 'Contract'}${item.customer_name ? ` - ${item.customer_name}` : ''} (#${item.id})`;
  if (key === 'quotes') return `${item.quote_number || 'Quote'}${item.origin && item.destination ? ` - ${item.origin} to ${item.destination}` : ''} (#${item.id})`;
  if (key === 'shipments') return `${item.tracking_number || 'Shipment'}${item.status ? ` - ${item.status}` : ''} (#${item.id})`;
  return `#${item.id}`;
}

export default function FormModal({
  open = true,
  title,
  fields = [],
  initialData = {},
  initialValues,
  onClose,
  children,
  onSubmit,
  submitLabel = 'Save',
  submitDisabled = false,
  submitting = false,
  deleteEndpoint,
  onDeleted,
}) {
  const [formData, setFormData] = useState({});
  const [lookups, setLookups] = useState({});
  const [lookupError, setLookupError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const recordId = (initialValues || initialData)?.id;
  const canDelete = Boolean(deleteEndpoint && recordId);

  const handleDelete = async () => {
    if (!window.confirm('Delete this record? This cannot be undone.')) return;
    try {
      setDeleting(true);
      await api.delete(`${deleteEndpoint}/${recordId}`);
      if (onDeleted) onDeleted();
      onClose();
    } catch (err) {
      window.alert(err.response?.data?.error || 'Delete failed.');
      setDeleting(false);
    }
  };

  const requiredLookupNames = useMemo(() => (
    [...new Set(fields.map((field) => field.name).filter((name) => ID_LOOKUPS[name]))]
  ), [fields]);

  useEffect(() => {
    const source = initialValues || initialData;
    const next = {};
    fields.forEach((field) => {
      next[field.name] = toInputValue(source[field.name], field.type);
    });
    setFormData(next);
  }, [fields, initialData, initialValues]);

  useEffect(() => {
    if (requiredLookupNames.length === 0) return;

    let cancelled = false;
    async function loadLookups() {
      try {
        const entries = await Promise.all(requiredLookupNames.map(async (name) => {
          const config = ID_LOOKUPS[name];
          const response = await api.get(config.endpoint);
          return [config.key, normalizeRows(response.data)];
        }));
        if (!cancelled) {
          setLookups((current) => ({ ...current, ...Object.fromEntries(entries) }));
          setLookupError(null);
        }
      } catch (err) {
        if (!cancelled) setLookupError(err.response?.data?.error || 'Could not load dropdown options.');
      }
    }

    loadLookups();
    return () => { cancelled = true; };
  }, [requiredLookupNames]);

  if (!open) return null;

  const updateField = (name, value) => {
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const renderField = (field) => {
    const value = formData[field.name] ?? (field.type === 'checkbox' ? false : '');
    const baseClass = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500';

    if (field.type === 'select') {
      return (
        <select
          id={field.name}
          value={value}
          required={field.required}
          className={baseClass}
          onChange={(event) => updateField(field.name, event.target.value)}
        >
          <option value="">Select...</option>
          {(field.options || []).map((option) => {
            const optionValue = typeof option === 'object' ? option.value : option;
            const optionLabel = typeof option === 'object' ? option.label : option;
            return <option key={optionValue} value={optionValue}>{optionLabel}</option>;
          })}
        </select>
      );
    }

    if (ID_LOOKUPS[field.name]) {
      const config = ID_LOOKUPS[field.name];
      const rows = lookups[config.key] || [];
      return (
        <select
          id={field.name}
          value={value}
          required={field.required}
          className={baseClass}
          onChange={(event) => updateField(field.name, event.target.value)}
        >
          <option value="">{field.required ? `Select ${field.label}` : config.empty}</option>
          {rows.map((item) => (
            <option key={item.id} value={item.id}>{optionLabel(config.key, item)}</option>
          ))}
        </select>
      );
    }

    if (field.type === 'textarea') {
      return (
        <textarea
          id={field.name}
          rows={4}
          value={value}
          required={field.required}
          className={baseClass}
          onChange={(event) => updateField(field.name, event.target.value)}
        />
      );
    }

    if (field.type === 'checkbox') {
      return (
        <input
          id={field.name}
          type="checkbox"
          checked={!!value}
          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          onChange={(event) => updateField(field.name, event.target.checked)}
        />
      );
    }

    return (
      <input
        id={field.name}
        type={field.type || 'text'}
        value={value}
        required={field.required}
        min={field.min}
        max={field.max}
        step={field.step}
        className={baseClass}
        onChange={(event) => updateField(field.name, event.target.value)}
      />
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
      <div className="bg-white rounded-xl max-w-2xl w-full mx-4 shadow-xl">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSubmit(formData); }}>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {lookupError && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                {lookupError}
              </div>
            )}
            {fields.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fields.map((field) => (
                  <label key={field.name} htmlFor={field.name} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                    <span className="block text-sm font-medium text-slate-700 mb-1">
                      {field.label}{field.required && <span className="text-red-500"> *</span>}
                    </span>
                    {renderField(field)}
                  </label>
                ))}
              </div>
            )}
            {children}
          </div>
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-3">
            <div>
              {canDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
              <button
                type="submit"
                disabled={submitDisabled || submitting}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Saving...' : submitLabel}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
