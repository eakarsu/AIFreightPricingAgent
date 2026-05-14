const jwt = require('jsonwebtoken');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/health',
  '/api/portal/quote' // customer share-token portal (token validated inside route)
];

function auth(req, res, next) {
  // Allow exact-match or prefix-match for public paths
  for (const p of PUBLIC_PATHS) {
    if (req.path === p || req.path.startsWith(p + '/')) return next();
  }

  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token provided' });

  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-change-me');
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = auth;
