# Feature Expansion Plan

Target product: Freight / Customs / Supply Chain Risk Platform

## 1. Shipment Intake
- Import shipments, tenders, lanes, SKUs, pickup/dropoff windows, documents, and service requirements.
- Backend tables: `shipment_intake_batches`, `shipment_intake_items`.
- UI entry points: Shipments, Rate Quotes.

## 2. Customs Document Check
- Validate commercial invoices, packing lists, HS codes, country of origin, and missing declarations.
- Backend tables: `customs_document_checks`, `customs_findings`.
- UI entry points: Shipments, Documents.

## 3. Sanctions Screening
- Screen shippers, consignees, carriers, routes, countries, and counterparties.
- Backend tables: `sanctions_screenings`, `sanctions_matches`.
- UI entry points: Customers, Carriers, Compliance.

## 4. Freight Quote Optimization
- Recommend quote price using lane history, carrier capacity, spot rates, margin target, and SLA.
- Backend tables: `quote_optimization_runs`, `quote_recommendations`.
- UI entry points: Rate Quotes, AI Pricing Tools.

## 5. Exception Alerts
- Flag delays, missing documents, capacity changes, customs holds, temperature excursions, and claims risk.
- Backend tables: `shipment_exceptions`, `exception_events`.
- UI entry points: Shipments, Dashboard.

## 6. Cold Chain Compliance
- Track temperature readings, excursion windows, corrective actions, and compliance evidence.
- Backend tables: `cold_chain_readings`, `temperature_excursions`, `cold_chain_evidence`.
- UI entry points: Shipments, Reports.

## 7. Carrier Performance Dashboard
- Score carriers by on-time pickup, on-time delivery, claims, communication, rate reliability, and compliance.
- Backend views: `carrier_performance_metrics`, `lane_carrier_scorecards`.
- UI entry points: Carriers, Dashboard.

## 8. Landed Cost Calculator
- Calculate freight, duties, taxes, accessorials, detention/demurrage, insurance, and margin.
- Backend tables: `landed_cost_calculations`, `landed_cost_components`.
- UI entry points: Cost Optimization, Rate Quotes.
