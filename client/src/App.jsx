import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RateQuotes from './pages/RateQuotes';
import RateQuoteDetail from './pages/RateQuoteDetail';
import Shipments from './pages/Shipments';
import ShipmentDetail from './pages/ShipmentDetail';
import RouteAnalytics from './pages/RouteAnalytics';
import RouteDetail from './pages/RouteDetail';
import Carriers from './pages/Carriers';
import CarrierDetail from './pages/CarrierDetail';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import MarketIntelligence from './pages/MarketIntelligence';
import MarketIntelligenceDetail from './pages/MarketIntelligenceDetail';
import CostOptimization from './pages/CostOptimization';
import CostOptimizationDetail from './pages/CostOptimizationDetail';
import Contracts from './pages/Contracts';
import ContractDetail from './pages/ContractDetail';
import PricingRules from './pages/PricingRules';
import PricingRuleDetail from './pages/PricingRuleDetail';
import AuditTrail from './pages/AuditTrail';
import AuditTrailDetail from './pages/AuditTrailDetail';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  if (!user) return <Navigate to="/login" />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="rate-quotes" element={<RateQuotes />} />
        <Route path="rate-quotes/:id" element={<RateQuoteDetail />} />
        <Route path="shipments" element={<Shipments />} />
        <Route path="shipments/:id" element={<ShipmentDetail />} />
        <Route path="routes" element={<RouteAnalytics />} />
        <Route path="routes/:id" element={<RouteDetail />} />
        <Route path="carriers" element={<Carriers />} />
        <Route path="carriers/:id" element={<CarrierDetail />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/:id" element={<CustomerDetail />} />
        <Route path="market-intelligence" element={<MarketIntelligence />} />
        <Route path="market-intelligence/:id" element={<MarketIntelligenceDetail />} />
        <Route path="cost-optimization" element={<CostOptimization />} />
        <Route path="cost-optimization/:id" element={<CostOptimizationDetail />} />
        <Route path="contracts" element={<Contracts />} />
        <Route path="contracts/:id" element={<ContractDetail />} />
        <Route path="pricing-rules" element={<PricingRules />} />
        <Route path="pricing-rules/:id" element={<PricingRuleDetail />} />
        <Route path="audit-trail" element={<AuditTrail />} />
        <Route path="audit-trail/:id" element={<AuditTrailDetail />} />
      </Route>
    </Routes>
  );
}
