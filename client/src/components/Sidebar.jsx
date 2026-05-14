import { NavLink } from 'react-router-dom';

const nav = [
  { section: 'Overview', items: [
    { to: '/', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  ]},
  { section: 'Operations', items: [
    { to: '/rate-quotes', label: 'Rate Quotes', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
    { to: '/shipments', label: 'Shipments', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { to: '/routes', label: 'Route Analytics', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
  ]},
  { section: 'Partners', items: [
    { to: '/carriers', label: 'Carriers', icon: 'M8 17a5 5 0 0110 0m-10 0a5 5 0 00-2-4m12 4a5 5 0 002-4M3 13h1m16 0h1M5.5 5.5l.7.7m12.6 0l-.7.7M12 2v1' },
    { to: '/customers', label: 'Customers', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  ]},
  { section: 'Intelligence', items: [
    { to: '/market-intelligence', label: 'Market Intel', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
    { to: '/cost-optimization', label: 'Cost Optimization', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { to: '/ai-pricing-tools', label: 'AI Pricing Tools', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
    { to: '/backlog-tools', label: 'Backlog Tools', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2H7a2 2 0 00-2 2v2m6-4V5a2 2 0 114 0v2' },
  ]},
  { section: 'Configuration', items: [
    { to: '/contracts', label: 'Contracts', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { to: '/pricing-rules', label: 'Pricing Rules', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
  ]},
  { section: 'System', items: [
    { to: '/audit-trail', label: 'Audit Trail', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  ]}
];

export default function Sidebar() {
  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col overflow-y-auto scrollbar-thin">
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-sm font-bold">FP</div>
          <div>
            <div className="font-semibold text-sm">FreightPricing</div>
            <div className="text-xs text-slate-400">AI-Powered Platform</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3">
        {nav.map(section => (
          <div key={section.section} className="mb-4">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-1">{section.section}</div>
            {section.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                </svg>
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      
        {/* // === Batch 04 Gaps & Frontend Mounts === */}
        <div style={{ borderTop: '1px solid #eee', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
        <a href="/cf-agentic-spot-market-trading-agent-monito" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>Agentic spot-market trading agent monito</a>
        <a href="/cf-multimodal-optimization-solver-across-tr" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>Multimodal optimization solver across tr</a>
        <a href="/cf-carrier-compliance-sustainability-tracki" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>Carrier compliance + sustainability trac</a>
        <a href="/cf-supply-chain-finance-integration-recomme" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>Supply-chain finance integration recomme</a>
        <a href="/cf-customer-demand-forecasting-lane-capacit" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>Customer demand forecasting + lane capac</a>
        <a href="/cf-vision-based-damage-assessment-accepting" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>Vision-based damage assessment accepting</a>
        <a href="/gap-no-dynamic-rate-calculator-endpoint-real" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No dynamic-rate-calculator endpoint (rea</a>
        <a href="/gap-no-carrier-capacity-forecast" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No carrier-capacity-forecast</a>
        <a href="/gap-no-contract-optimization-recommender" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No contract-optimization recommender</a>
        <a href="/gap-no-fraud-detection-on-shipment-patterns" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No fraud-detection on shipment patterns</a>
        <a href="/gap-no-lane-profitability-analyzer" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No lane-profitability analyzer</a>
        <a href="/gap-no-mode-of-shipment-recommender-air" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No mode-of-shipment recommender (air vs </a>
        <a href="/gap-limited-notifications-only-2-file-refere" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>Limited notifications (only 2 file refer</a>
        <a href="/gap-no-webhook-receiversdispatchers" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No webhook receivers/dispatchers</a>
        <a href="/gap-no-carrier-performance-scorecard-reports" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No carrier performance scorecard reports</a>
        <a href="/gap-no-exceptionclaim-management-module" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No exception/claim management module</a>
        <a href="/gap-no-websocket-real-time-shipment-tracking" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No WebSocket real-time shipment tracking</a>
        </div>
</nav>
    </div>
  );
}
