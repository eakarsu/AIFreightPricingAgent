import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

const formatPercent = (value) => `${Number(value).toFixed(1)}%`;

const kpiConfig = [
  {
    key: 'totalRevenue',
    label: 'Total Revenue',
    format: formatCurrency,
    color: 'from-blue-500 to-blue-600',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: 'activeShipments',
    label: 'Active Shipments',
    format: (v) => Number(v).toLocaleString(),
    color: 'from-emerald-500 to-emerald-600',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
      </svg>
    ),
  },
  {
    key: 'avgMargin',
    label: 'Avg Margin',
    format: formatPercent,
    color: 'from-violet-500 to-violet-600',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    key: 'onTimeDelivery',
    label: 'On-Time Delivery',
    format: formatPercent,
    color: 'from-amber-500 to-amber-600',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: 'pendingQuotes',
    label: 'Pending Quotes',
    format: (v) => Number(v).toLocaleString(),
    color: 'from-orange-500 to-orange-600',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    key: 'costSavings',
    label: 'Cost Savings',
    format: formatCurrency,
    color: 'from-teal-500 to-teal-600',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
];

const featureCards = [
  { name: 'Rate Quotes', path: '/rate-quotes', statKey: 'rateQuotes', description: 'Generate and manage AI-powered freight rate quotes' },
  { name: 'Shipments', path: '/shipments', statKey: 'shipments', description: 'Track and manage all active and completed shipments' },
  { name: 'Route Analytics', path: '/routes', statKey: 'routes', description: 'Analyze route performance and optimization opportunities' },
  { name: 'Carriers', path: '/carriers', statKey: 'carriers', description: 'Manage carrier profiles, ratings, and capacity' },
  { name: 'Customers', path: '/customers', statKey: 'customers', description: 'View customer accounts and pricing agreements' },
  { name: 'Market Intelligence', path: '/market-intelligence', statKey: 'marketIntelligence', description: 'Real-time market trends and competitive insights' },
  { name: 'Cost Optimization', path: '/cost-optimization', statKey: 'costOptimization', description: 'AI recommendations to reduce freight costs' },
  { name: 'Contracts', path: '/contracts', statKey: 'contracts', description: 'Manage carrier and customer pricing contracts' },
  { name: 'Pricing Rules', path: '/pricing-rules', statKey: 'pricingRules', description: 'Configure dynamic pricing rules and surcharges' },
  { name: 'Audit Trail', path: '/audit-trail', statKey: 'auditTrail', description: 'View complete audit log of pricing decisions' },
];

export default function Dashboard() {
  const [kpis, setKpis] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [kpiRes, statsRes] = await Promise.all([
          api.get('/dashboard/kpis'),
          api.get('/dashboard/stats'),
        ]);
        setKpis(kpiRes.data);
        setStats(statsRes.data);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-10 w-10 text-blue-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <span className="text-gray-500 text-sm">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your freight pricing operations</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiConfig.map(({ key, label, format, color, icon }) => (
          <div
            key={key}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <span className={`inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br ${color} text-white`}>
                {icon}
              </span>
            </div>
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {kpis?.[key] != null ? format(kpis[key]) : '--'}
            </p>
          </div>
        ))}
      </div>

      {/* Feature Cards */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Access</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {featureCards.map(({ name, path, statKey, description }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 text-left hover:shadow-md hover:border-blue-200 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{description}</p>
                </div>
                <svg
                  className="w-5 h-5 text-gray-300 group-hover:text-blue-500 flex-shrink-0 ml-2 mt-0.5 transition-colors"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
              {stats?.[statKey] != null && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <span className="text-lg font-bold text-gray-900">
                    {Number(stats[statKey]).toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-400 ml-1">records</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
