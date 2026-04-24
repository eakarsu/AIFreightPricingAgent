const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const auth = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(auth);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/carriers', require('./routes/carriers'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/routes', require('./routes/routes'));
app.use('/api/shipments', require('./routes/shipments'));
app.use('/api/rate-quotes', require('./routes/rateQuotes'));
app.use('/api/contracts', require('./routes/contracts'));
app.use('/api/pricing-rules', require('./routes/pricingRules'));
app.use('/api/market-intelligence', require('./routes/marketIntelligence'));
app.use('/api/cost-optimization', require('./routes/costOptimization'));
app.use('/api/audit-trail', require('./routes/auditTrail'));

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
