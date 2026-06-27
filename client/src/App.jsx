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
import AIResults from './pages/AIResults';
import AgentQuote from './pages/AgentQuote';
import LaneElasticity from './pages/LaneElasticity';
import AIHub from './pages/AIHub';
import AIPricingTools from './pages/AIPricingTools';
import BacklogTools from './pages/BacklogTools';
import RenewalAlerts from './pages/RenewalAlerts';
import PortalQuote from './pages/PortalQuote';
import Register from './pages/Register';
import DetentionDemurragePredictor from './pages/DetentionDemurragePredictor';

// === Batch 04 Gaps & Frontend Mounts ===
import CfAgenticSpotMarketTradingAgentMonito from './pages/CfAgenticSpotMarketTradingAgentMonito';
import CfMultimodalOptimizationSolverAcrossTr from './pages/CfMultimodalOptimizationSolverAcrossTr';
import CfCarrierComplianceSustainabilityTracki from './pages/CfCarrierComplianceSustainabilityTracki';
import CfSupplyChainFinanceIntegrationRecomme from './pages/CfSupplyChainFinanceIntegrationRecomme';
import CfCustomerDemandForecastingLaneCapacit from './pages/CfCustomerDemandForecastingLaneCapacit';
import CfVisionBasedDamageAssessmentAccepting from './pages/CfVisionBasedDamageAssessmentAccepting';
import GapNoDynamicRateCalculatorEndpointReal from './pages/GapNoDynamicRateCalculatorEndpointReal';
import GapNoCarrierCapacityForecast from './pages/GapNoCarrierCapacityForecast';
import GapNoContractOptimizationRecommender from './pages/GapNoContractOptimizationRecommender';
import GapNoFraudDetectionOnShipmentPatterns from './pages/GapNoFraudDetectionOnShipmentPatterns';
import GapNoLaneProfitabilityAnalyzer from './pages/GapNoLaneProfitabilityAnalyzer';
import GapNoModeOfShipmentRecommenderAir from './pages/GapNoModeOfShipmentRecommenderAir';
import GapLimitedNotificationsOnly2FileRefere from './pages/GapLimitedNotificationsOnly2FileRefere';
import GapNoWebhookReceiversdispatchers from './pages/GapNoWebhookReceiversdispatchers';
import GapNoCarrierPerformanceScorecardReports from './pages/GapNoCarrierPerformanceScorecardReports';
import GapNoExceptionclaimManagementModule from './pages/GapNoExceptionclaimManagementModule';
import GapNoWebsocketRealTimeShipmentTracking from './pages/GapNoWebsocketRealTimeShipmentTracking';

import CodexCustomVizFeature from './pages/CodexCustomVizFeature';
import CodexOperationsFeature from './pages/CodexOperationsFeature';

import TimelineView from './pages/TimelineView';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  if (!user) return <Navigate to="/login" />;
  return children;
}

export default function App() {
  return (
    <Routes>
        <Route path="/insights/timeline" element={<ProtectedRoute><TimelineView /></ProtectedRoute>} />
        <Route path="/codex/custom-viz" element={<ProtectedRoute><CodexCustomVizFeature /></ProtectedRoute>} />
        <Route path="/codex/operations" element={<ProtectedRoute><CodexOperationsFeature /></ProtectedRoute>} />

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/portal/quote/:token" element={<PortalQuote />} />
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
        <Route path="ai-results" element={<AIResults />} />
        <Route path="ai-hub" element={<AIHub />} />
        <Route path="agent-quote" element={<AgentQuote />} />
        <Route path="lane-elasticity" element={<LaneElasticity />} />
        <Route path="renewal-alerts" element={<RenewalAlerts />} />
        <Route path="ai-pricing-tools" element={<AIPricingTools />} />
        <Route path="backlog-tools" element={<BacklogTools />} />
        <Route path="detention-demurrage-predictor" element={<DetentionDemurragePredictor />} />
      </Route>
    
          {/* // === Batch 04 Gaps & Frontend Mounts === */}
          <Route path="/cf-agentic-spot-market-trading-agent-monito" element={<CfAgenticSpotMarketTradingAgentMonito />} />
          <Route path="/cf-multimodal-optimization-solver-across-tr" element={<CfMultimodalOptimizationSolverAcrossTr />} />
          <Route path="/cf-carrier-compliance-sustainability-tracki" element={<CfCarrierComplianceSustainabilityTracki />} />
          <Route path="/cf-supply-chain-finance-integration-recomme" element={<CfSupplyChainFinanceIntegrationRecomme />} />
          <Route path="/cf-customer-demand-forecasting-lane-capacit" element={<CfCustomerDemandForecastingLaneCapacit />} />
          <Route path="/cf-vision-based-damage-assessment-accepting" element={<CfVisionBasedDamageAssessmentAccepting />} />
          <Route path="/gap-no-dynamic-rate-calculator-endpoint-real" element={<GapNoDynamicRateCalculatorEndpointReal />} />
          <Route path="/gap-no-carrier-capacity-forecast" element={<GapNoCarrierCapacityForecast />} />
          <Route path="/gap-no-contract-optimization-recommender" element={<GapNoContractOptimizationRecommender />} />
          <Route path="/gap-no-fraud-detection-on-shipment-patterns" element={<GapNoFraudDetectionOnShipmentPatterns />} />
          <Route path="/gap-no-lane-profitability-analyzer" element={<GapNoLaneProfitabilityAnalyzer />} />
          <Route path="/gap-no-mode-of-shipment-recommender-air" element={<GapNoModeOfShipmentRecommenderAir />} />
          <Route path="/gap-limited-notifications-only-2-file-refere" element={<GapLimitedNotificationsOnly2FileRefere />} />
          <Route path="/gap-no-webhook-receiversdispatchers" element={<GapNoWebhookReceiversdispatchers />} />
          <Route path="/gap-no-carrier-performance-scorecard-reports" element={<GapNoCarrierPerformanceScorecardReports />} />
          <Route path="/gap-no-exceptionclaim-management-module" element={<GapNoExceptionclaimManagementModule />} />
          <Route path="/gap-no-websocket-real-time-shipment-tracking" element={<GapNoWebsocketRealTimeShipmentTracking />} />
</Routes>
  );
}
