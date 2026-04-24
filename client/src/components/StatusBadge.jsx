const colors = {
  active: 'bg-emerald-100 text-emerald-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  accepted: 'bg-emerald-100 text-emerald-800',
  implemented: 'bg-emerald-100 text-emerald-800',
  in_transit: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-blue-100 text-blue-800',
  booked: 'bg-indigo-100 text-indigo-800',
  sent: 'bg-indigo-100 text-indigo-800',
  pending: 'bg-amber-100 text-amber-800',
  draft: 'bg-slate-100 text-slate-800',
  identified: 'bg-amber-100 text-amber-800',
  expired: 'bg-red-100 text-red-800',
  cancelled: 'bg-red-100 text-red-800',
  rejected: 'bg-red-100 text-red-800',
  terminated: 'bg-red-100 text-red-800',
  suspended: 'bg-orange-100 text-orange-800',
  inactive: 'bg-slate-100 text-slate-600',
  critical: 'bg-red-100 text-red-800',
  warning: 'bg-amber-100 text-amber-800',
  info: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-slate-100 text-slate-700',
};

export default function StatusBadge({ status }) {
  if (!status) return null;
  const display = status.replace(/_/g, ' ');
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${colors[status] || 'bg-slate-100 text-slate-800'}`}>
      {display}
    </span>
  );
}
