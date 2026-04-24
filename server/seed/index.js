const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const db = require('../db');
const bcrypt = require('bcryptjs');

async function seed() {
  console.log('Seeding database...');

  // Users
  const hash = await bcrypt.hash(process.env.DEMO_PASSWORD || 'admin123', 10);
  await db.query(`INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING`,
    [process.env.DEMO_EMAIL || 'admin@freightai.com', hash, 'Admin User', 'admin']);

  // Carriers (16)
  const carriers = [
    ['Maersk Line', 'MAEU', 'ocean', 'ops@maersk.com', '+45-3363-3363', 4.8, 96.2, 'Denmark'],
    ['MSC', 'MSCU', 'ocean', 'booking@msc.com', '+41-22-703-8888', 4.6, 94.1, 'Switzerland'],
    ['CMA CGM', 'CMDU', 'ocean', 'sales@cma-cgm.com', '+33-4-88-91-90-00', 4.5, 93.8, 'France'],
    ['Hapag-Lloyd', 'HLCU', 'ocean', 'info@hapag-lloyd.com', '+49-40-3001-0', 4.7, 95.3, 'Germany'],
    ['COSCO Shipping', 'COSU', 'ocean', 'service@cosco.com', '+86-21-6596-6105', 4.3, 91.5, 'China'],
    ['Evergreen Marine', 'EGLV', 'ocean', 'info@evergreen.com', '+886-2-2505-7766', 4.4, 92.8, 'Taiwan'],
    ['FedEx Freight', 'FEDX', 'air', 'support@fedex.com', '+1-800-463-3339', 4.7, 97.1, 'United States'],
    ['DHL Express', 'DHLX', 'air', 'express@dhl.com', '+49-228-767-6', 4.6, 96.5, 'Germany'],
    ['UPS Supply Chain', 'UPSC', 'air', 'scs@ups.com', '+1-800-742-5877', 4.5, 95.8, 'United States'],
    ['Emirates SkyCargo', 'EKSC', 'air', 'cargo@emirates.com', '+971-4-708-1111', 4.8, 97.5, 'UAE'],
    ['DB Schenker', 'DBSK', 'rail', 'rail@dbschenker.com', '+49-201-8781-0', 4.4, 93.2, 'Germany'],
    ['Union Pacific', 'UPRR', 'rail', 'service@up.com', '+1-402-544-5000', 4.3, 91.8, 'United States'],
    ['XPO Logistics', 'XPOL', 'truck', 'info@xpo.com', '+1-855-976-6951', 4.2, 92.1, 'United States'],
    ['J.B. Hunt', 'JBHT', 'truck', 'info@jbhunt.com', '+1-479-820-0000', 4.3, 93.5, 'United States'],
    ['Kuehne+Nagel', 'KNAG', 'intermodal', 'info@kuehne-nagel.com', '+41-44-786-95-11', 4.6, 94.7, 'Switzerland'],
    ['C.H. Robinson', 'CHRW', 'intermodal', 'info@chrobinson.com', '+1-952-937-8500', 4.4, 93.1, 'United States']
  ];
  for (const c of carriers) {
    await db.query(`INSERT INTO carriers (name, code, mode, contact_email, contact_phone, rating, on_time_pct, base_country) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, c);
  }

  // Customers (16)
  const customers = [
    ['Tesla Inc', 'Sarah Chen', 'logistics@tesla.com', '+1-650-681-5000', 'Automotive', 'enterprise', 45000000, 'United States'],
    ['Samsung Electronics', 'Jin Park', 'supply@samsung.com', '+82-2-2255-0114', 'Electronics', 'enterprise', 62000000, 'South Korea'],
    ['Nestlé SA', 'Marco Rossi', 'shipping@nestle.com', '+41-21-924-2111', 'Food & Beverage', 'enterprise', 38000000, 'Switzerland'],
    ['Nike Inc', 'Mike Johnson', 'logistics@nike.com', '+1-503-671-6453', 'Retail/Apparel', 'enterprise', 28000000, 'United States'],
    ['Siemens AG', 'Klaus Weber', 'freight@siemens.com', '+49-89-636-00', 'Industrial', 'enterprise', 35000000, 'Germany'],
    ['Unilever', 'Priya Sharma', 'transport@unilever.com', '+44-20-7822-5252', 'Consumer Goods', 'enterprise', 42000000, 'United Kingdom'],
    ['Zara (Inditex)', 'Carlos Lopez', 'logistics@inditex.com', '+34-981-185-400', 'Fashion Retail', 'mid-market', 18000000, 'Spain'],
    ['BHP Group', 'James Wilson', 'shipping@bhp.com', '+61-3-9609-3333', 'Mining', 'enterprise', 55000000, 'Australia'],
    ['Alibaba Group', 'Wei Zhang', 'logistics@alibaba.com', '+86-571-8502-2088', 'E-Commerce', 'enterprise', 72000000, 'China'],
    ['Pfizer Inc', 'Dr. Emily Davis', 'coldchain@pfizer.com', '+1-212-733-2323', 'Pharmaceutical', 'enterprise', 25000000, 'United States'],
    ['IKEA', 'Erik Svensson', 'transport@ikea.com', '+46-42-267-100', 'Furniture', 'mid-market', 15000000, 'Sweden'],
    ['Caterpillar Inc', 'Bob Miller', 'freight@cat.com', '+1-309-675-1000', 'Heavy Equipment', 'mid-market', 12000000, 'United States'],
    ['L\'Oréal', 'Marie Dupont', 'supply@loreal.com', '+33-1-47-56-70-00', 'Cosmetics', 'mid-market', 9500000, 'France'],
    ['Huawei Technologies', 'Li Wei', 'logistics@huawei.com', '+86-755-2878-0808', 'Telecommunications', 'enterprise', 48000000, 'China'],
    ['Volvo Group', 'Anna Lindberg', 'freight@volvo.com', '+46-31-66-00-00', 'Automotive', 'mid-market', 14000000, 'Sweden'],
    ['ArcelorMittal', 'Pierre Martin', 'shipping@arcelormittal.com', '+352-4792-1', 'Steel/Metals', 'enterprise', 32000000, 'Luxembourg']
  ];
  for (const c of customers) {
    await db.query(`INSERT INTO customers (company_name, contact_name, email, phone, industry, tier, annual_volume, country) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, c);
  }

  // Routes (16)
  const routes = [
    ['Shanghai', 'China', 'Los Angeles', 'United States', 'ocean', 10900, 14.5, 2.85, 4250, 'high'],
    ['Rotterdam', 'Netherlands', 'New York', 'United States', 'ocean', 5900, 10.2, 2.45, 3800, 'moderate'],
    ['Singapore', 'Singapore', 'Dubai', 'UAE', 'ocean', 5800, 8.5, 2.15, 2900, 'low'],
    ['Shenzhen', 'China', 'Hamburg', 'Germany', 'ocean', 17400, 22.0, 2.65, 3100, 'high'],
    ['Hong Kong', 'China', 'London', 'United Kingdom', 'air', 9600, 1.2, 8.50, 1850, 'moderate'],
    ['Tokyo', 'Japan', 'Chicago', 'United States', 'air', 10200, 1.5, 9.20, 1200, 'low'],
    ['Mumbai', 'India', 'Frankfurt', 'Germany', 'air', 6500, 1.0, 7.80, 980, 'moderate'],
    ['Seoul', 'South Korea', 'Amsterdam', 'Netherlands', 'air', 8800, 1.3, 8.90, 1100, 'low'],
    ['Chongqing', 'China', 'Duisburg', 'Germany', 'rail', 11000, 16.0, 1.85, 650, 'moderate'],
    ['Xi\'an', 'China', 'Warsaw', 'Poland', 'rail', 8200, 14.0, 1.65, 420, 'low'],
    ['Dallas', 'United States', 'Toronto', 'Canada', 'truck', 2400, 2.5, 1.20, 2800, 'low'],
    ['Los Angeles', 'United States', 'Mexico City', 'Mexico', 'truck', 2800, 3.0, 1.45, 2200, 'moderate'],
    ['Shanghai', 'China', 'Rotterdam', 'Netherlands', 'ocean', 19500, 28.0, 2.55, 5100, 'critical'],
    ['Dubai', 'UAE', 'Mumbai', 'India', 'ocean', 2100, 4.0, 1.80, 1800, 'low'],
    ['Sydney', 'Australia', 'Shanghai', 'China', 'ocean', 8100, 12.0, 2.30, 1500, 'moderate'],
    ['Chicago', 'United States', 'Atlanta', 'United States', 'truck', 1100, 1.5, 0.95, 3500, 'low']
  ];
  for (const r of routes) {
    await db.query(`INSERT INTO routes (origin_city, origin_country, destination_city, destination_country, mode, distance_km, transit_days_avg, avg_rate_per_kg, volume_last_30d, congestion_level) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, r);
  }

  // Shipments (16)
  const shipments = [
    ['FP-2024-001', 1, 1, 1, 'Shanghai, China', 'Los Angeles, USA', 'ocean', 25000, 48.5, 'delivered', 71250, 68500, '2024-01-15', '2024-01-29'],
    ['FP-2024-002', 2, 3, 4, 'Shenzhen, China', 'Hamburg, Germany', 'ocean', 18500, 35.2, 'delivered', 49025, 47200, '2024-01-20', '2024-02-11'],
    ['FP-2024-003', 3, 7, 5, 'Hong Kong, China', 'London, UK', 'air', 2200, 4.8, 'delivered', 18700, 17850, '2024-02-01', '2024-02-02'],
    ['FP-2024-004', 4, 8, 7, 'Mumbai, India', 'Frankfurt, Germany', 'air', 1800, 3.5, 'in_transit', 14040, null, '2024-02-10', null],
    ['FP-2024-005', 5, 11, 9, 'Chongqing, China', 'Duisburg, Germany', 'rail', 32000, 62.0, 'in_transit', 59200, null, '2024-02-05', null],
    ['FP-2024-006', 6, 2, 2, 'Rotterdam, Netherlands', 'New York, USA', 'ocean', 15000, 28.8, 'booked', 36750, null, '2024-02-20', null],
    ['FP-2024-007', 7, 13, 11, 'Dallas, USA', 'Toronto, Canada', 'truck', 8500, 16.2, 'delivered', 10200, 9800, '2024-01-25', '2024-01-27'],
    ['FP-2024-008', 8, 4, 1, 'Shanghai, China', 'Los Angeles, USA', 'ocean', 42000, 85.0, 'in_transit', 119700, null, '2024-02-08', null],
    ['FP-2024-009', 9, 9, 6, 'Tokyo, Japan', 'Chicago, USA', 'air', 3500, 7.2, 'delivered', 32200, 30800, '2024-01-18', '2024-01-19'],
    ['FP-2024-010', 10, 10, 8, 'Seoul, South Korea', 'Amsterdam, Netherlands', 'air', 1500, 2.8, 'booked', 13350, null, '2024-02-25', null],
    ['FP-2024-011', 11, 5, 3, 'Singapore', 'Dubai, UAE', 'ocean', 22000, 42.5, 'delivered', 47300, 45100, '2024-01-10', '2024-01-18'],
    ['FP-2024-012', 12, 14, 12, 'Los Angeles, USA', 'Mexico City, Mexico', 'truck', 12000, 24.0, 'in_transit', 17400, null, '2024-02-12', null],
    ['FP-2024-013', 13, 6, 13, 'Shanghai, China', 'Rotterdam, Netherlands', 'ocean', 28000, 55.0, 'booked', 71400, null, '2024-02-28', null],
    ['FP-2024-014', 14, 15, 14, 'Dubai, UAE', 'Mumbai, India', 'ocean', 9000, 17.5, 'delivered', 16200, 15600, '2024-01-22', '2024-01-26'],
    ['FP-2024-015', 15, 12, 10, 'Xi\'an, China', 'Warsaw, Poland', 'rail', 16000, 30.0, 'in_transit', 26400, null, '2024-02-01', null],
    ['FP-2024-016', 16, 16, 16, 'Chicago, USA', 'Atlanta, USA', 'truck', 5500, 10.2, 'delivered', 5225, 5100, '2024-02-08', '2024-02-09']
  ];
  for (const s of shipments) {
    await db.query(`INSERT INTO shipments (tracking_number, customer_id, carrier_id, route_id, origin, destination, mode, weight_kg, volume_cbm, status, quoted_price, actual_cost, pickup_date, delivery_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`, s);
  }

  // Rate Quotes (16)
  const quotes = [
    ['RQ-2024-001', 1, 'Shanghai, China', 'Los Angeles, USA', 'ocean', 30000, 58.0, 82500, 85500, 85500, 12.5, 'accepted', '2024-03-15',
      '**Recommended Rate: $85,500**\n\n**Confidence Score: 87/100**\n\n**Key Pricing Factors:**\n- Trans-Pacific route experiencing high demand due to pre-Chinese New Year rush\n- Fuel surcharge index at $650/TEU, up 8% from last month\n- Route congestion level: HIGH - port delays averaging 2.3 days at LA/Long Beach\n- Enterprise tier customer with strong volume commitment\n\n**Market Comparison:**\n- Current market average: $2.85/kg for this lane\n- Our rate: $2.85/kg (at market)\n- Competitor range: $2.70 - $3.10/kg\n\n**Risk Assessment:**\n- Medium risk of rate increases in next 30 days due to capacity constraints\n- Recommend locking in rate for 60-day validity'],
    ['RQ-2024-002', 2, 'Shenzhen, China', 'Hamburg, Germany', 'ocean', 20000, 38.0, 50000, 53000, 52000, 14.2, 'accepted', '2024-03-10',
      '**Recommended Rate: $53,000**\n\n**Confidence Score: 82/100**\n\n**Key Pricing Factors:**\n- Asia-Europe lane rates stabilizing after Q4 peak\n- Red Sea disruption adding 7-10 days transit via Cape of Good Hope\n- Bunker fuel costs: $580/MT, relatively stable\n- Samsung electronics classified as high-value cargo\n\n**Market Comparison:**\n- Market average: $2.65/kg\n- Our rate: $2.60/kg (2% below market)\n- Volume discount applied for enterprise tier\n\n**Recommendation:**\n- Competitive rate factoring in long-term relationship value'],
    ['RQ-2024-003', 3, 'Hong Kong, China', 'London, UK', 'air', 2500, 5.5, 20000, 21250, 21250, 15.8, 'sent', '2024-03-20',
      '**Recommended Rate: $21,250**\n\n**Confidence Score: 91/100**\n\n**Key Pricing Factors:**\n- Air freight rates on HKG-LHR stable at $8.50/kg\n- Peak season surcharge: +5% (fashion/retail seasonal demand)\n- Perishable handling premium for food & beverage client\n- Express transit 1.2 days vs 22+ days ocean alternative\n\n**Market Comparison:**\n- Market rate: $8.50/kg\n- Quoted: $8.50/kg (at market)\n- Premium justified by time-sensitive cargo nature'],
    ['RQ-2024-004', 5, 'Munich, Germany', 'Detroit, USA', 'air', 4500, 9.0, 38250, 41500, 40000, 16.1, 'draft', '2024-04-01',
      '**Recommended Rate: $41,500**\n\n**Confidence Score: 78/100**\n\n**Key Pricing Factors:**\n- Industrial equipment requiring special handling\n- Oversize surcharge applicable for heavy machinery components\n- MUC-DTW lane has limited direct capacity\n- Q1 industrial demand uptick increasing spot rates\n\n**Market Comparison:**\n- Market range: $8.00-$9.50/kg for this lane\n- Our rate: $9.22/kg (mid-range)\n- Premium reflects handling requirements'],
    ['RQ-2024-005', 6, 'Rotterdam, Netherlands', 'Santos, Brazil', 'ocean', 35000, 68.0, 77000, 80500, 78000, 11.8, 'sent', '2024-03-25',
      '**Recommended Rate: $80,500**\n\n**Confidence Score: 84/100**\n\n**Key Pricing Factors:**\n- Europe-South America rates trending upward (+4% MoM)\n- Santos port congestion moderate - 1.5 day average delay\n- Consumer goods shipment - standard handling\n- Unilever volume contract provides 3% discount basis\n\n**Market Comparison:**\n- Market rate: $2.30/kg average\n- Our rate: $2.23/kg (3% below market via volume discount)'],
    ['RQ-2024-006', 8, 'Perth, Australia', 'Shanghai, China', 'ocean', 50000, 95.0, 105000, 115000, 112000, 13.5, 'accepted', '2024-03-08',
      '**Recommended Rate: $115,000**\n\n**Confidence Score: 89/100**\n\n**Key Pricing Factors:**\n- Bulk mining commodities - heavy cargo premium\n- Australia-China trade lane high volume, competitive\n- Iron ore market prices supporting higher freight rates\n- BHP enterprise contract baseline considered\n\n**Market Comparison:**\n- Bulk rate: $2.30/kg\n- Our rate: $2.24/kg\n- Competitive for heavy bulk cargo'],
    ['RQ-2024-007', 9, 'Guangzhou, China', 'Memphis, USA', 'air', 1200, 2.2, 10200, 10800, 10800, 17.5, 'accepted', '2024-03-12',
      '**Recommended Rate: $10,800**\n\n**Confidence Score: 93/100**\n\n**Key Pricing Factors:**\n- E-commerce express lane - premium service\n- CAN-MEM direct route with FedEx partnership\n- High-value electronics requiring secure handling\n- Alibaba enterprise volume tier\n\n**Market Comparison:**\n- Express air rate: $9.00/kg\n- Our rate: $9.00/kg (at market for express tier)'],
    ['RQ-2024-008', 10, 'Basel, Switzerland', 'Newark, USA', 'air', 800, 1.5, 7200, 8400, 8000, 22.0, 'sent', '2024-04-05',
      '**Recommended Rate: $8,400**\n\n**Confidence Score: 95/100**\n\n**Key Pricing Factors:**\n- Pharmaceutical cold-chain requirements (+25% surcharge)\n- Temperature-controlled container mandatory\n- BSL-EWR lane with dedicated pharma capacity\n- Regulatory compliance documentation included\n\n**Market Comparison:**\n- Pharma air rate: $10.50/kg (cold-chain premium)\n- Our rate: $10.00/kg (loyal customer discount)'],
    ['RQ-2024-009', 4, 'Ho Chi Minh City, Vietnam', 'Portland, USA', 'ocean', 12000, 22.5, 30000, 31200, 31200, 14.0, 'draft', '2024-04-10',
      '**Recommended Rate: $31,200**\n\n**Confidence Score: 80/100**\n\n**Key Pricing Factors:**\n- Vietnam-US lane growing rapidly\n- Apparel/footwear cargo - standard container\n- Moderate congestion at Ho Chi Minh port\n- Nike mid-tier volume expectations\n\n**Market Comparison:**\n- Lane rate: $2.60/kg\n- Our rate: $2.60/kg (at market)'],
    ['RQ-2024-010', 7, 'Valencia, Spain', 'New York, USA', 'ocean', 15000, 28.0, 33750, 36000, 35000, 13.2, 'expired', '2024-02-01',
      '**Recommended Rate: $36,000**\n\n**Confidence Score: 85/100**\n\n**Key Pricing Factors:**\n- Mediterranean-US East Coast standard lane\n- Fashion retail seasonal surge for spring collections\n- Valencia port efficient - minimal delays\n- Mid-market customer tier pricing\n\n**Market Comparison:**\n- Lane average: $2.40/kg\n- Our rate: $2.33/kg'],
    ['RQ-2024-011', 11, 'Gothenburg, Sweden', 'Newark, USA', 'ocean', 8000, 45.0, 18000, 19200, 18500, 12.0, 'sent', '2024-03-30',
      '**Recommended Rate: $19,200**\n\n**Key Pricing Factors:**\n- Furniture cargo: high volume, low weight density\n- GOT-EWR lane moderate volume\n- IKEA standard container optimization\n- Volume-based pricing applied\n\n**Market Comparison:**\n- Rate: $2.40/kg for furniture-class cargo'],
    ['RQ-2024-012', 12, 'Peoria, USA', 'Dubai, UAE', 'ocean', 22000, 35.0, 55000, 58500, 57000, 15.5, 'draft', '2024-04-15',
      '**Recommended Rate: $58,500**\n\n**Key Pricing Factors:**\n- Heavy equipment: special handling required\n- Out-of-gauge surcharge for machinery\n- US-Middle East lane stable rates\n- Mid-market customer pricing tier\n\n**Market Comparison:**\n- Heavy cargo rate: $2.66/kg\n- Our rate: $2.59/kg'],
    ['RQ-2024-013', 13, 'Paris, France', 'Tokyo, Japan', 'air', 3000, 6.5, 24000, 25800, 25500, 16.8, 'accepted', '2024-03-18',
      '**Recommended Rate: $25,800**\n\n**Key Pricing Factors:**\n- Cosmetics: high-value, temperature-sensitive\n- CDG-NRT premium lane pricing\n- L\'Oréal volume commitment considered\n- Seasonal demand stable\n\n**Market Comparison:**\n- Rate: $8.60/kg (premium handling included)'],
    ['RQ-2024-014', 14, 'Shenzhen, China', 'São Paulo, Brazil', 'ocean', 26000, 50.0, 62400, 66300, 65000, 14.5, 'sent', '2024-04-01',
      '**Recommended Rate: $66,300**\n\n**Key Pricing Factors:**\n- Telecom equipment: standard container\n- SZX-Santos growing trade lane\n- Huawei enterprise tier discount\n- 30-day transit via Cape route\n\n**Market Comparison:**\n- Rate: $2.55/kg for Asia-South America'],
    ['RQ-2024-015', 15, 'Gothenburg, Sweden', 'Shanghai, China', 'ocean', 20000, 38.0, 42000, 44500, 43500, 13.8, 'draft', '2024-04-20',
      '**Recommended Rate: $44,500**\n\n**Key Pricing Factors:**\n- Automotive parts: requires careful handling\n- GOT-SHA lane moderate volume\n- Volvo mid-market pricing tier\n- European export demand steady\n\n**Market Comparison:**\n- Rate: $2.23/kg'],
    ['RQ-2024-016', 16, 'Luxembourg City', 'Busan, South Korea', 'ocean', 35000, 65.0, 77000, 80500, 79000, 12.2, 'accepted', '2024-03-05',
      '**Recommended Rate: $80,500**\n\n**Key Pricing Factors:**\n- Steel/metals: heavy bulk cargo\n- Europe-Asia backhaul rate advantage\n- ArcelorMittal enterprise volume\n- Busan port efficient operations\n\n**Market Comparison:**\n- Bulk rate: $2.30/kg\n- Our rate: $2.26/kg']
  ];
  for (const q of quotes) {
    await db.query(`INSERT INTO rate_quotes (quote_number, customer_id, origin, destination, mode, weight_kg, volume_cbm, base_rate, ai_suggested_rate, final_rate, margin_pct, status, valid_until, ai_reasoning) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`, q);
  }

  // Contracts (16)
  const contracts = [
    ['CT-2024-001', 1, 1, '2024-01-01', '2024-12-31', 'ocean', 500, 2.75, 'USD', 'active', 'Annual volume commitment for Trans-Pacific lane. Minimum 500 TEU.'],
    ['CT-2024-002', 2, 3, '2024-01-01', '2024-12-31', 'ocean', 400, 2.55, 'USD', 'active', 'Asia-Europe service agreement. Quarterly volume review.'],
    ['CT-2024-003', 3, 7, '2024-01-01', '2024-06-30', 'air', 200, 8.25, 'USD', 'active', 'Air freight contract for perishable goods. Priority handling.'],
    ['CT-2024-004', 5, 11, '2024-01-01', '2024-12-31', 'rail', 300, 1.75, 'USD', 'active', 'China-Europe rail corridor agreement.'],
    ['CT-2024-005', 6, 2, '2024-01-01', '2024-12-31', 'ocean', 350, 2.35, 'USD', 'active', 'Trans-Atlantic service contract.'],
    ['CT-2024-006', 8, 4, '2024-01-01', '2024-12-31', 'ocean', 600, 2.20, 'USD', 'active', 'Bulk cargo agreement for mining commodities.'],
    ['CT-2024-007', 9, 9, '2024-01-01', '2024-06-30', 'air', 150, 8.80, 'USD', 'active', 'Express e-commerce air freight contract.'],
    ['CT-2024-008', 10, 8, '2024-01-01', '2024-12-31', 'air', 100, 10.20, 'USD', 'active', 'Pharmaceutical cold-chain air agreement.'],
    ['CT-2024-009', 4, 13, '2024-01-01', '2024-12-31', 'truck', 250, 1.15, 'USD', 'active', 'North American trucking services.'],
    ['CT-2024-010', 7, 5, '2023-06-01', '2024-05-31', 'ocean', 200, 2.50, 'USD', 'active', 'Trans-Pacific service for fashion retail.'],
    ['CT-2024-011', 11, 6, '2024-01-01', '2024-12-31', 'ocean', 180, 2.30, 'USD', 'active', 'Europe-North America furniture logistics.'],
    ['CT-2024-012', 12, 15, '2024-01-01', '2024-12-31', 'intermodal', 150, 2.00, 'USD', 'active', 'Multi-modal heavy equipment transport.'],
    ['CT-2024-013', 13, 10, '2024-02-01', '2025-01-31', 'air', 120, 8.40, 'USD', 'pending', 'Premium cosmetics air freight.'],
    ['CT-2024-014', 14, 1, '2023-01-01', '2023-12-31', 'ocean', 450, 2.60, 'USD', 'expired', 'Previous year telecom equipment contract.'],
    ['CT-2024-015', 15, 4, '2024-01-01', '2024-12-31', 'ocean', 220, 2.15, 'USD', 'active', 'Automotive parts Europe-Asia.'],
    ['CT-2024-016', 16, 16, '2024-03-01', '2025-02-28', 'intermodal', 280, 1.95, 'USD', 'pending', 'Steel logistics multi-modal agreement.']
  ];
  for (const c of contracts) {
    await db.query(`INSERT INTO contracts (contract_number, customer_id, carrier_id, start_date, end_date, mode, min_volume, committed_rate, currency, status, terms) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, c);
  }

  // Pricing Rules (16)
  const rules = [
    ['Peak Season Surcharge', 'surcharge', 'ocean', 'season', 'in', 'Q4,Q1', 'percentage', 15.00, 10, true],
    ['Heavy Cargo Premium', 'surcharge', null, 'weight', 'gt', '20000', 'percentage', 8.00, 8, true],
    ['Enterprise Volume Discount', 'discount', null, 'customer_tier', 'eq', 'enterprise', 'percentage', -5.00, 9, true],
    ['Air Express Premium', 'surcharge', 'air', 'weight', 'lt', '1000', 'flat', 250.00, 7, true],
    ['Fuel Surcharge Index', 'surcharge', 'ocean', 'season', 'eq', 'all', 'percentage', 6.50, 10, true],
    ['Cold Chain Premium', 'surcharge', 'air', 'condition_field', 'eq', 'temperature_controlled', 'percentage', 25.00, 9, true],
    ['Bulk Cargo Discount', 'discount', 'ocean', 'volume', 'gt', '50', 'percentage', -3.00, 6, true],
    ['Minimum Rate Floor', 'minimum', null, 'weight', 'lt', '100', 'flat', 500.00, 10, true],
    ['Congestion Surcharge', 'dynamic', 'ocean', 'congestion_level', 'eq', 'critical', 'percentage', 12.00, 8, true],
    ['Intermodal Discount', 'discount', 'intermodal', 'distance', 'gt', '5000', 'percentage', -4.50, 5, true],
    ['Hazmat Handling Fee', 'surcharge', null, 'condition_field', 'eq', 'hazardous', 'flat', 1500.00, 10, true],
    ['Weekend Pickup Surcharge', 'surcharge', 'truck', 'condition_field', 'eq', 'weekend_pickup', 'flat', 350.00, 6, true],
    ['Long-haul Rail Discount', 'discount', 'rail', 'distance', 'gt', '8000', 'percentage', -6.00, 7, true],
    ['New Customer Rate', 'dynamic', null, 'customer_tier', 'eq', 'smb', 'percentage', 3.00, 4, true],
    ['Oversized Cargo Fee', 'surcharge', null, 'volume', 'gt', '80', 'flat', 2000.00, 8, true],
    ['Loyalty Discount', 'discount', null, 'customer_tier', 'eq', 'enterprise', 'percentage', -2.50, 3, false]
  ];
  for (const r of rules) {
    await db.query(`INSERT INTO pricing_rules (name, rule_type, mode, condition_field, condition_operator, condition_value, adjustment_type, adjustment_value, priority, is_active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, r);
  }

  // Market Intelligence (16)
  const intel = [
    ['Trans-Pacific Rate Surge Q1 2024', 'Asia-Pacific', 'ocean', 'trend', 'Ocean freight rates on Asia-US routes increased 18% in January due to Red Sea diversions.',
      '**Market Overview:**\nThe Trans-Pacific trade lane is experiencing significant rate volatility driven by geopolitical disruptions in the Red Sea region. Carriers are diverting vessels via the Cape of Good Hope, adding 10-14 days to transit times.\n\n**Rate Trends:**\n- Shanghai-LA rates: $2,850/TEU (+18% MoM)\n- Shanghai-NY rates: $3,200/TEU (+22% MoM)\n- Spot rates 35% above contract rates\n\n**Capacity Outlook:**\n- Effective capacity reduced by 15-20% due to longer routing\n- Blank sailings decreased as carriers deploy more vessels\n- Equipment availability tightening at Asian origin ports\n\n**Key Disruptions:**\n- Houthi attacks on commercial vessels in Red Sea\n- Panama Canal drought restrictions (12 daily transits vs normal 36)\n- Chinese New Year factory shutdowns\n\n**30-Day Forecast:**\n- Rates expected to remain elevated through February\n- Possible 5-8% additional increase if Red Sea situation persists\n- Contract negotiations for 2024 heavily impacted\n\n**Recommended Actions:**\n1. Lock in rates for Q2 shipments now before further increases\n2. Consider rail alternatives for time-flexible cargo\n3. Diversify carrier mix to ensure capacity access',
      '{"rate_change": 18, "avg_rate": 2850, "capacity_utilization": 92}', 'critical', '2024-01-28'],
    ['European Air Cargo Demand Steady', 'Europe', 'air', 'benchmark', 'Air cargo demand in Europe remains stable with slight capacity tightness.',
      '**Market Overview:**\nEuropean air cargo market showing resilience with steady demand across pharmaceutical, automotive, and fashion verticals.\n\n**Rate Trends:**\n- FRA-JFK rates: $4.20/kg (flat MoM)\n- LHR-HKG rates: $3.80/kg (+3% MoM)\n- Overall European air rates: stable to +2%\n\n**Capacity Outlook:**\n- Belly cargo capacity improving with passenger recovery\n- Dedicated freighter utilization at 78%\n- New A350F orders to add capacity in 2025\n\n**30-Day Forecast:**\n- Rates to remain stable through February\n- Spring fashion season may drive 5% increase in March\n\n**Recommended Actions:**\n1. Maintain current air freight contracts\n2. Pre-book space for March fashion peak\n3. Consider charter options for oversized shipments',
      '{"rate_change": 1.5, "avg_rate": 4.0, "capacity_utilization": 78}', 'info', '2024-01-25'],
    ['China-Europe Rail Growth Continues', 'Asia-Europe', 'rail', 'trend', 'China-Europe rail volumes up 12% YoY, driven by Red Sea disruption.',
      '**Market Overview:**\nChina-Europe rail services seeing unprecedented demand as shippers seek alternatives to disrupted ocean routes.\n\n**Rate Trends:**\n- Chongqing-Duisburg: $1,850/TEU (+8% MoM)\n- Xi\'an-Warsaw: $1,650/TEU (+6% MoM)\n- Rail rates now 35% premium over ocean (was 50%)\n\n**Capacity Outlook:**\n- Train frequency increased to 4-5 departures/week on major corridors\n- Customs processing improved, average border crossing: 24hrs\n\n**30-Day Forecast:**\n- Continued strong demand through Q1\n- Rate premium over ocean narrowing\n\n**Recommended Actions:**\n1. Increase rail allocation for time-sensitive cargo\n2. Book 2-3 weeks in advance for guaranteed space\n3. Consider consolidated LCL rail services',
      '{"rate_change": 8, "avg_rate": 1850, "volume_growth": 12}', 'warning', '2024-01-30'],
    ['North American Trucking Rates Decline', 'North America', 'truck', 'trend', 'US trucking spot rates down 5% as capacity rebalances post-holiday.',
      '**Market Overview:**\nThe North American trucking market continues its post-pandemic normalization with spot rates declining as capacity returns to the market.\n\n**Rate Trends:**\n- National average spot rate: $1.85/mile (-5% MoM)\n- Contract rates: $2.15/mile (-2% QoQ)\n- Dry van rates leading the decline\n\n**Capacity Outlook:**\n- Driver availability improving\n- New truck orders stable\n- Capacity-to-load ratio favorable for shippers\n\n**30-Day Forecast:**\n- Rates to stabilize at current levels\n- Possible uptick in March with produce season\n\n**Recommended Actions:**\n1. Renegotiate expiring contracts at lower rates\n2. Lock in favorable long-haul rates\n3. Consider spot market for ad-hoc shipments',
      '{"rate_change": -5, "avg_rate": 1.85, "capacity_utilization": 68}', 'info', '2024-01-22'],
    ['Middle East Shipping Alert', 'Middle East', 'ocean', 'alert', 'Red Sea attacks causing major disruptions to global shipping routes.',
      '**ALERT: Critical Disruption**\n\nOngoing attacks on commercial vessels in the Red Sea are causing carriers to divert around the Cape of Good Hope.\n\n**Impact:**\n- Transit time increase: 10-14 days\n- Cost increase: $500-$1,000 per TEU in war risk premiums\n- Insurance costs up 200%\n\n**Affected Routes:**\n- All Asia-Europe services\n- Asia-Mediterranean services\n- India-Europe services\n\n**Recommended Actions:**\n1. Factor in extended transit times for supply chain planning\n2. Review insurance coverage\n3. Consider air freight for urgent shipments',
      '{"risk_level": "critical", "transit_delay_days": 12, "cost_premium_pct": 25}', 'critical', '2024-02-01'],
    ['India Export Volumes Rising', 'South Asia', 'ocean', 'trend', 'Indian container exports up 15% driven by manufacturing growth.',
      '**Market Overview:**\nIndia emerging as major export hub with manufacturing sector expansion driving container volume growth.\n\n**Rate Trends:**\n- Mumbai-Rotterdam: $1,800/TEU (+5% MoM)\n- Chennai-Singapore: $850/TEU (+3% MoM)\n\n**Key Drivers:**\n- PLI scheme boosting electronics and pharma exports\n- China+1 strategy benefiting Indian manufacturers\n- New port infrastructure at JNPT and Mundra\n\n**30-Day Forecast:**\n- Continued growth trajectory\n- Rates to increase 3-5% in February\n\n**Recommended Actions:**\n1. Expand Indian carrier partnerships\n2. Position equipment at key Indian ports\n3. Develop India-specific pricing models',
      '{"volume_growth": 15, "avg_rate": 1800, "export_index": 112}', 'info', '2024-01-26'],
    ['Panama Canal Restrictions Update', 'Americas', 'ocean', 'alert', 'Panama Canal daily transits reduced to 24 from 36 due to severe drought.',
      '**ALERT: Canal Restrictions**\n\nHistoric drought conditions continue to limit Panama Canal operations.\n\n**Current Status:**\n- Daily transits: 24 (down from 36 normal)\n- Draft restrictions: 44 feet (normal: 50 feet)\n- Wait times: 5-7 days (normal: 1-2 days)\n\n**Impact:**\n- US East Coast-Asia rates up 15%\n- Some vessels rerouting via Suez or Cape\n\n**Forecast:**\n- Restrictions expected through April 2024\n- Gradual improvement with rainy season in May\n\n**Recommended Actions:**\n1. Pre-book Panama Canal transit slots\n2. Evaluate Suez alternative for Asia-USEC\n3. Adjust inventory buffers for longer transits',
      '{"daily_transits": 24, "wait_days": 6, "draft_limit_ft": 44}', 'warning', '2024-01-29'],
    ['Global Container Shipping Forecast Q2 2024', 'Global', 'ocean', 'forecast', 'Mixed outlook for Q2 with geopolitical uncertainty driving rate volatility.',
      '**Q2 2024 Global Container Shipping Forecast**\n\n**Overall Outlook: Cautiously Bullish**\n\nRates expected to remain above 2023 levels due to effective capacity reduction from route diversions.\n\n**Regional Forecasts:**\n- Trans-Pacific: +10-15% above current levels\n- Asia-Europe: +8-12% if Red Sea persists\n- Trans-Atlantic: Stable to +3%\n- Intra-Asia: +2-5%\n\n**Key Variables:**\n1. Red Sea situation duration\n2. Panama Canal water levels\n3. Chinese manufacturing PMI\n4. US consumer demand\n\n**Carrier Behavior:**\n- Alliances maintaining discipline on capacity\n- New vessel deliveries partially offset by slow-steaming\n\n**Recommended Strategy:**\n1. Secure Q2 contract rates now\n2. Maintain 30% spot market flexibility\n3. Diversify across multiple trade lanes',
      '{"forecast_direction": "up", "confidence": 72, "rate_change_expected": 10}', 'info', '2024-02-05'],
    ['Southeast Asia Manufacturing Boom', 'Southeast Asia', 'ocean', 'trend', 'Vietnam, Thailand, and Indonesia seeing major export growth.',
      '**Market Overview:**\nSoutheast Asia emerging as key manufacturing hub driving export volume growth.\n\n**Volume Growth:**\n- Vietnam: +22% YoY\n- Thailand: +15% YoY\n- Indonesia: +12% YoY\n\n**Rate Trends:**\n- Ho Chi Minh-LA: $2,400/TEU\n- Bangkok-Rotterdam: $2,100/TEU\n- Jakarta-Osaka: $1,200/TEU\n\n**Recommended Actions:**\n1. Establish carrier partnerships in SEA\n2. Develop competitive pricing for Vietnam-US lane\n3. Invest in SEA origin logistics capabilities',
      '{"vietnam_growth": 22, "thailand_growth": 15, "avg_rate": 2400}', 'info', '2024-01-31'],
    ['Baltic Dry Index Recovery', 'Global', 'ocean', 'benchmark', 'BDI recovering from December lows, signaling improved dry bulk demand.',
      '**Baltic Dry Index Update**\n\nBDI recovered to 1,850 points from December low of 1,200.\n\n**Analysis:**\n- Capesize rates: $18,500/day (+35% from low)\n- Panamax rates: $14,200/day (+20%)\n- Iron ore trade driving recovery\n- Grain shipments picking up seasonally\n\n**Implications for Container Rates:**\n- Positive correlation suggests container rates will remain firm\n- Vessel redelivery from dry bulk to container unlikely\n\n**Recommended Actions:**\n1. Monitor BDI as leading indicator\n2. Adjust bulk cargo pricing accordingly',
      '{"bdi_current": 1850, "bdi_change_pct": 35, "capesize_rate": 18500}', 'info', '2024-02-03'],
    ['E-Commerce Peak Season Analysis', 'Global', 'air', 'trend', 'Post-holiday air cargo analysis shows 8% YoY growth in e-commerce volumes.',
      '**E-Commerce Air Cargo Analysis**\n\n**Peak Season Results:**\n- Global e-commerce air volumes: +8% YoY\n- Cross-border parcels: +12% YoY\n- Average shipment weight declining (more parcels, smaller sizes)\n\n**Rate Impact:**\n- Express rates: $6.50/kg (peak) vs $5.20/kg (current)\n- Capacity tightness during Nov-Dec peak: 92% utilization\n\n**Key Trends:**\n- Temu/Shein driving China-US parcel volumes\n- Same-day delivery demand increasing\n- Returns logistics growing segment\n\n**Recommended Actions:**\n1. Develop e-commerce specific pricing tiers\n2. Partner with express carriers for small parcel\n3. Plan capacity for Q4 2024 peak early',
      '{"ecommerce_growth": 8, "peak_utilization": 92, "express_rate": 6.50}', 'info', '2024-02-02'],
    ['Australian Coal Export Trends', 'Oceania', 'ocean', 'benchmark', 'Australian coal exports shifting patterns as Asia demand evolves.',
      '**Australian Coal Export Analysis**\n\n**Current Status:**\n- Thermal coal exports: stable\n- Metallurgical coal: +5% to Japan/South Korea\n- India emerging as top destination\n\n**Rate Trends:**\n- Newcastle-Shanghai: $12.50/MT\n- Newcastle-Mumbai: $14.20/MT\n\n**Forecast:**\n- Gradual shift from thermal to met coal\n- India demand to grow 10% annually\n\n**Recommended Actions:**\n1. Adjust pricing for India-bound routes\n2. Consider long-term contracts with Indian steel mills',
      '{"met_coal_growth": 5, "rate_newcastle_shanghai": 12.50}', 'info', '2024-01-27'],
    ['Mediterranean Shipping Capacity Crunch', 'Mediterranean', 'ocean', 'alert', 'Red Sea diversions creating capacity shortage in Mediterranean ports.',
      '**ALERT: Mediterranean Capacity Crunch**\n\nVessel rerouting via Cape of Good Hope is creating scheduling chaos in Mediterranean ports.\n\n**Impact:**\n- Port of Piraeus: 3-day delays\n- Barcelona: 2-day delays\n- Genoa: berthing wait times doubled\n\n**Rate Impact:**\n- Intra-Med rates: +15%\n- Asia-Med rates: +25%\n\n**Recommended Actions:**\n1. Reroute through less congested Med ports\n2. Pre-book berth slots 2 weeks ahead\n3. Consider truck/rail for intra-European legs',
      '{"piraeus_delay_days": 3, "rate_increase_pct": 25}', 'warning', '2024-02-04'],
    ['Green Shipping Corridor Developments', 'Global', 'ocean', 'trend', 'New green shipping corridors launching between major trade hubs.',
      '**Green Shipping Corridors Update**\n\n**New Developments:**\n- Singapore-Rotterdam green corridor: Methanol-powered vessels\n- Shanghai-LA: LNG dual-fuel services launching Q2\n- EU ETS now applies to shipping (Jan 2024)\n\n**Cost Impact:**\n- Green fuel premium: 15-20% above conventional\n- EU ETS: ~$50/TEU additional cost\n\n**Opportunity:**\n- Premium pricing for carbon-neutral shipping\n- ESG-focused customers willing to pay 10-15% premium\n\n**Recommended Actions:**\n1. Develop green shipping product tier\n2. Calculate and offer carbon offset pricing\n3. Partner with green fuel corridor carriers',
      '{"green_premium_pct": 17.5, "eu_ets_cost": 50}', 'info', '2024-02-06'],
    ['Black Sea Grain Export Recovery', 'Black Sea', 'ocean', 'trend', 'Ukrainian grain corridor showing signs of recovery with new insurance schemes.',
      '**Black Sea Grain Export Update**\n\n**Current Status:**\n- Ukrainian grain corridor: partially operational\n- New maritime insurance products available\n- Monthly volumes: 4.2M tonnes (vs 6M pre-war)\n\n**Rate Trends:**\n- Odessa-Alexandria: $45/MT (+8% with war risk)\n- Insurance premium: $15,000/voyage\n\n**Forecast:**\n- Gradual volume recovery expected\n- Insurance costs may decrease if security improves\n\n**Recommended Actions:**\n1. Monitor corridor status daily\n2. Offer flexible booking terms\n3. Maintain alternative sourcing routes',
      '{"monthly_volume_mt": 4200000, "war_risk_premium": 15000}', 'warning', '2024-01-24'],
    ['Lithium Battery Shipping Regulations', 'Global', 'air', 'alert', 'New IATA DGR regulations for lithium battery air transport effective March 2024.',
      '**ALERT: New Lithium Battery Air Shipping Regulations**\n\n**Effective: March 1, 2024**\n\n**Key Changes:**\n- State of charge limit: 30% for bulk shipments\n- New packaging requirements for Section II batteries\n- Enhanced documentation requirements\n- Shipper declaration of compliance mandatory\n\n**Impact:**\n- Estimated 10-15% cost increase for battery shipments\n- Some carriers restricting acceptance\n- Lead time for compliance: 4-6 weeks\n\n**Recommended Actions:**\n1. Update pricing for lithium battery shipments\n2. Notify affected customers immediately\n3. Verify carrier acceptance policies\n4. Train operations team on new DGR requirements',
      '{"cost_increase_pct": 12.5, "compliance_lead_weeks": 5}', 'critical', '2024-02-07']
  ];
  for (const i of intel) {
    await db.query(`INSERT INTO market_intelligence (title, region, mode, report_type, summary, ai_analysis, data_points, severity, report_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, i);
  }

  // Cost Optimizations (16)
  const optimizations = [
    ['Trans-Pacific Route Consolidation', 'consolidation', 450000, 67500, 15.0, 'identified', '**Optimization Opportunity: Shipment Consolidation**\n\nMultiple small shipments on Shanghai-LA route can be consolidated into fewer full container loads.\n\n**Current State:**\n- 12 LCL shipments/month averaging 8 CBM each\n- Current cost: $450,000/month\n- Average utilization per container: 62%\n\n**Recommended Actions:**\n1. Consolidate into 4 FCL shipments bi-weekly\n2. Implement consolidation hub in Shanghai\n3. Coordinate pickup schedules with 3 key customers\n\n**Projected Savings:**\n- Monthly: $67,500 (15%)\n- Annual: $810,000\n- Payback period: 2 months\n\n**Implementation Timeline:** 6-8 weeks\n\n**Risk Assessment:**\n- Low risk - proven consolidation model\n- Requires customer coordination for pickup timing', 'high', 'Shanghai-Los Angeles', 'Set up consolidation warehouse, coordinate with Tesla, Samsung, Alibaba'],
    ['Air-to-Ocean Mode Shift', 'mode_shift', 280000, 168000, 60.0, 'in_progress', '**Optimization: Mode Shift Analysis**\n\nNon-urgent electronics shipments currently air-freighted can be shifted to ocean.\n\n**Current State:**\n- 15 air shipments/month for non-critical components\n- Current cost: $280,000/month\n- Only 3 shipments genuinely time-critical\n\n**Recommended Actions:**\n1. Classify shipments by urgency (A/B/C)\n2. Shift B and C class to ocean freight\n3. Maintain air only for A-class urgent shipments\n\n**Projected Savings:**\n- Monthly: $168,000 (60%)\n- Annual: $2,016,000\n\n**Risk Assessment:**\n- Medium risk - requires 3-4 week inventory buffer\n- Some customers may resist longer lead times', 'critical', 'Hong Kong-London, Tokyo-Chicago', 'Phase 1: Classify all shipments. Phase 2: Shift B-class. Phase 3: Negotiate ocean rates.'],
    ['Carrier Rate Renegotiation', 'negotiation', 850000, 127500, 15.0, 'identified', '**Optimization: Carrier Contract Renegotiation**\n\nCurrent carrier contracts above market rates on 4 key lanes.\n\n**Current State:**\n- 4 contracts expiring in Q2 2024\n- Current rates 8-12% above market average\n- Total monthly spend: $850,000\n\n**Recommended Actions:**\n1. Issue RFQ to 5 alternative carriers per lane\n2. Benchmark against current spot rates\n3. Negotiate with incumbent carriers using market data\n\n**Projected Savings:**\n- 15% average rate reduction achievable\n- Monthly: $127,500\n- Annual: $1,530,000\n\n**Risk Assessment:**\n- Low risk - standard procurement process\n- Maintain relationship with incumbent carriers', 'high', 'Multiple lanes', 'RFQ in preparation for Q2 contract renewals'],
    ['Warehouse Dwell Time Reduction', 'routing', 120000, 36000, 30.0, 'implemented', '**Optimization: Reduce Port Warehouse Dwell**\n\nExcessive dwell time at destination ports causing demurrage charges.\n\n**Current State:**\n- Average dwell time: 5.2 days (target: 3 days)\n- Monthly demurrage charges: $120,000\n- Top offenders: LA (6.1 days), Hamburg (5.8 days)\n\n**Implemented Actions:**\n1. Pre-clearance documentation filing (48hrs before arrival)\n2. Direct-to-store delivery for 40% of shipments\n3. Automated customs broker notification system\n\n**Achieved Savings:**\n- Dwell time reduced to 3.4 days\n- Monthly savings: $36,000\n- Annual savings: $432,000', 'medium', 'LA, Hamburg, Rotterdam', 'Completed - monitoring ongoing performance'],
    ['LTL to FTL Conversion', 'consolidation', 95000, 23750, 25.0, 'identified', '**Optimization: LTL to FTL Conversion**\n\nDomestic trucking shipments using expensive LTL when FTL is more economical.\n\n**Current State:**\n- 45 LTL shipments/month in US domestic\n- Average cost per LTL: $2,100\n- Many routes have multiple daily LTL shipments\n\n**Recommended Actions:**\n1. Identify routes with 3+ daily LTL shipments\n2. Convert to FTL with milk-run optimization\n3. Implement route planning software\n\n**Projected Savings:**\n- 25% cost reduction on converted routes\n- Monthly: $23,750\n- Annual: $285,000', 'medium', 'Dallas-Toronto, LA-Mexico City, Chicago-Atlanta', 'Evaluate route planning software options'],
    ['Dynamic Pricing Implementation', 'routing', 2500000, 250000, 10.0, 'in_progress', '**Optimization: AI Dynamic Pricing**\n\nImplement machine learning-based dynamic pricing to capture margin upside.\n\n**Current State:**\n- Static pricing updated quarterly\n- Missing 8-12% margin capture opportunity\n- Competitors using real-time pricing\n\n**Recommended Actions:**\n1. Deploy AI pricing model for spot quotes\n2. Real-time market data integration\n3. A/B test against static pricing\n\n**Projected Savings:**\n- 10% margin improvement on spot market\n- Monthly: $250,000\n- Annual: $3,000,000\n\n**Risk Assessment:**\n- Medium risk - requires model validation\n- 3-month pilot recommended before full rollout', 'critical', 'All routes', 'Pilot phase on Trans-Pacific routes'],
    ['Backhaul Optimization', 'routing', 340000, 102000, 30.0, 'identified', '**Optimization: Backhaul Utilization**\n\nEmpty container repositioning costing significantly.\n\n**Current State:**\n- 35% of return legs running empty\n- Monthly empty repositioning cost: $340,000\n- Key imbalance: US West Coast to Asia\n\n**Recommended Actions:**\n1. Partner with exporters for backhaul cargo\n2. Offer discounted rates for backhaul direction\n3. Implement backhaul matching platform\n\n**Projected Savings:**\n- Monthly: $102,000 (30%)\n- Annual: $1,224,000', 'high', 'LA-Shanghai, Rotterdam-Singapore', 'Identify potential backhaul partners'],
    ['Insurance Cost Optimization', 'negotiation', 180000, 36000, 20.0, 'identified', '**Optimization: Marine Insurance Review**\n\nCargo insurance premiums above market due to legacy policy.\n\n**Projected Savings:**\n- Monthly: $36,000 (20%)\n- Annual: $432,000\n\n**Recommended Actions:**\n1. Tender insurance to 4 marine insurers\n2. Implement claims reduction program\n3. Increase deductible for low-value shipments', 'medium', 'All routes', 'Insurance tender in Q2'],
    ['Cross-Dock Efficiency', 'routing', 75000, 18750, 25.0, 'implemented', '**Optimization: Cross-Dock Operations**\n\nStreamlined cross-dock operations reducing handling costs.\n\n**Implemented:**\n- Automated sorting system\n- Pre-staged outbound loads\n- Reduced touch points from 4 to 2\n\n**Achieved Savings:**\n- 25% reduction in handling costs\n- Monthly: $18,750', 'low', 'Chicago hub, Dallas hub', 'Completed'],
    ['Fuel Hedging Strategy', 'negotiation', 620000, 93000, 15.0, 'in_progress', '**Optimization: Fuel Cost Hedging**\n\nLock in fuel costs to reduce volatility exposure.\n\n**Current State:**\n- Monthly fuel exposure: $620,000\n- No hedging in place\n- Fuel costs vary ±20% quarterly\n\n**Recommended Actions:**\n1. Hedge 60% of fuel exposure quarterly\n2. Use fuel surcharge index for remaining 40%\n3. Review hedging positions monthly\n\n**Projected Savings:**\n- 15% cost reduction vs spot fuel\n- Monthly: $93,000\n- Annual: $1,116,000', 'high', 'All ocean and truck routes', 'Fuel hedging contract under review'],
    ['Digital Documentation Savings', 'routing', 45000, 31500, 70.0, 'implemented', '**Optimization: Paperless Documentation**\n\nDigitize all shipping documentation to reduce processing costs.\n\n**Implemented:**\n- Electronic Bill of Lading\n- Digital customs declarations\n- Automated document verification\n\n**Achieved Savings:**\n- 70% reduction in documentation costs\n- Monthly: $31,500\n- Processing time: 4 hours → 30 minutes', 'medium', 'All routes', 'Fully implemented'],
    ['Multi-Modal Route Optimization', 'routing', 520000, 104000, 20.0, 'identified', '**Optimization: Multi-Modal Routing**\n\nCombine ocean + rail + truck for optimal cost-transit balance.\n\n**Current State:**\n- Pure ocean routes used for all Asia-inland US\n- Additional trucking from port adds cost\n\n**Recommended:**\n1. Ocean to LA + rail to Chicago/Dallas\n2. Ocean to Seattle + rail to Midwest\n3. Reduce last-mile trucking distance\n\n**Projected Savings:**\n- Monthly: $104,000 (20%)\n- Transit time improvement: 2-3 days', 'high', 'Shanghai-Chicago, Shenzhen-Dallas', 'Route analysis in progress'],
    ['Customer Payment Terms Optimization', 'negotiation', 0, 45000, 0, 'identified', '**Optimization: Payment Terms**\n\nNegotiate better payment terms with carriers.\n\n**Current State:**\n- Average payment: Net 30\n- Cash flow cost of $45,000/month\n\n**Recommended:**\n1. Negotiate Net 45 with top 5 carriers\n2. Implement early payment discount program\n3. Use supply chain financing\n\n**Projected Benefit:**\n- $45,000/month in cash flow improvement\n- Better working capital management', 'low', 'All carriers', 'Finance team reviewing proposals'],
    ['Seasonal Capacity Pre-booking', 'timing', 380000, 76000, 20.0, 'identified', '**Optimization: Pre-book Peak Season Capacity**\n\nSecure capacity 3 months ahead of peak season.\n\n**Current State:**\n- Spot bookings during peak: +30-40% premium\n- Monthly peak premium cost: $380,000\n\n**Recommended:**\n1. Pre-book 70% of Q4 capacity by July\n2. Use Named Account agreements\n3. Commit minimum volumes for guaranteed space\n\n**Projected Savings:**\n- 20% reduction in peak premiums\n- Monthly: $76,000 (during peak months)', 'high', 'Trans-Pacific, Asia-Europe', 'Planning for Q4 2024 pre-booking'],
    ['Packaging Optimization', 'consolidation', 65000, 16250, 25.0, 'in_progress', '**Optimization: Packaging Redesign**\n\nOptimize packaging to increase container utilization.\n\n**Current State:**\n- Average container utilization: 72%\n- Oversized packaging on 40% of shipments\n\n**Recommended:**\n1. Redesign packaging for top 20 SKUs\n2. Use collapsible/nestable containers\n3. Implement 3D load planning software\n\n**Projected Savings:**\n- 25% fewer containers needed\n- Monthly: $16,250', 'medium', 'All container routes', 'Packaging redesign for top 10 SKUs in progress'],
    ['Customs Brokerage Consolidation', 'negotiation', 95000, 28500, 30.0, 'identified', '**Optimization: Single Customs Broker**\n\nConsolidate from 6 customs brokers to 2 preferred partners.\n\n**Current State:**\n- 6 different brokers across regions\n- Inconsistent pricing and service levels\n- Monthly brokerage cost: $95,000\n\n**Recommended:**\n1. RFP for global customs brokerage\n2. Select 2 brokers (primary + backup)\n3. Volume discount negotiation\n\n**Projected Savings:**\n- 30% cost reduction\n- Monthly: $28,500\n- Improved compliance and visibility', 'medium', 'All international routes', 'RFP preparation started']
  ];
  for (const o of optimizations) {
    await db.query(`INSERT INTO cost_optimizations (title, category, current_cost, projected_savings, savings_pct, status, ai_recommendation, priority, affected_routes, implementation_notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, o);
  }

  // Audit Trail (16)
  const audits = [
    ['shipment', 1, 'create', null, null, null, 'Admin User', '192.168.1.100'],
    ['shipment', 1, 'status_change', 'status', 'booked', 'in_transit', 'Admin User', '192.168.1.100'],
    ['shipment', 1, 'status_change', 'status', 'in_transit', 'delivered', 'Admin User', '192.168.1.100'],
    ['rate_quote', 1, 'create', null, null, null, 'Admin User', '192.168.1.101'],
    ['rate_quote', 1, 'update', 'status', 'draft', 'accepted', 'Admin User', '192.168.1.101'],
    ['carrier', 1, 'update', 'rating', '4.7', '4.8', 'Admin User', '192.168.1.100'],
    ['contract', 1, 'create', null, null, null, 'Admin User', '192.168.1.102'],
    ['customer', 9, 'update', 'annual_volume', '68000000', '72000000', 'Admin User', '192.168.1.100'],
    ['pricing_rule', 1, 'create', null, null, null, 'Admin User', '192.168.1.103'],
    ['shipment', 4, 'status_change', 'status', 'booked', 'in_transit', 'Admin User', '192.168.1.100'],
    ['market_intelligence', 5, 'create', null, null, null, 'Admin User', '192.168.1.104'],
    ['cost_optimization', 4, 'status_change', 'status', 'identified', 'implemented', 'Admin User', '192.168.1.100'],
    ['contract', 14, 'status_change', 'status', 'active', 'expired', 'System', '10.0.0.1'],
    ['rate_quote', 10, 'status_change', 'status', 'sent', 'expired', 'System', '10.0.0.1'],
    ['carrier', 3, 'update', 'on_time_pct', '92.5', '93.8', 'Admin User', '192.168.1.100'],
    ['shipment', 16, 'create', null, null, null, 'Admin User', '192.168.1.100']
  ];
  for (const a of audits) {
    await db.query(`INSERT INTO audit_trail (entity_type, entity_id, action, field_changed, old_value, new_value, user_name, ip_address) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, a);
  }

  console.log('Database seeded successfully!');
  process.exit(0);
}

seed().catch(err => { console.error('Seed error:', err); process.exit(1); });
