const jwt = require('jsonwebtoken');
const express = require('express');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));
// Demo API key for now (Phase 3 will add real key management)
const VALID_API_KEY = 'ak_demo1234567890abcdef1234567890ab';
// ---- Rate limiting (in-memory, resets daily) ----
const JWT_SECRET = 'demo_jwt_secret_change_in_production';
const ADMIN_EMAIL = 'admin@locationapi.com';
const ADMIN_PASSWORD = 'admin123'; // demo only
const DAILY_LIMIT = 5000;
const requestCounts = {};

function rateLimiter(req, res, next) {
  const key = req.header('X-API-Key');
  const today = new Date().toISOString().slice(0, 10);
  const rlKey = key + '_' + today;

  if (!requestCounts[rlKey]) requestCounts[rlKey] = 0;
  requestCounts[rlKey]++;

  const remaining = DAILY_LIMIT - requestCounts[rlKey];
  res.set('X-RateLimit-Limit', DAILY_LIMIT);
  res.set('X-RateLimit-Remaining', Math.max(0, remaining));

  if (requestCounts[rlKey] > DAILY_LIMIT) {
    return sendError(res, 429, 'RATE_LIMITED', 'Daily quota exceeded');
  }
  next();
}
// ---- Helper: standard success response ----
function sendSuccess(res, data, count) {
  res.json({
    success: true,
    count: count !== undefined ? count : (Array.isArray(data) ? data.length : 1),
    data: data,
    meta: {
      requestId: 'req_' + Math.random().toString(36).substring(2, 10),
      responseTime: Math.floor(Math.random() * 50) + 10
    }
  });
}

// ---- Helper: standard error response ----
function sendError(res, httpCode, errorCode, message) {
  res.status(httpCode).json({
    success: false,
    error: {
      code: errorCode,
      message: message
    }
  });
}

// ---- Middleware: API key check ----
function requireApiKey(req, res, next) {
  const key = req.header('X-API-Key');
  if (!key) {
    return sendError(res, 401, 'INVALID_API_KEY', 'API key missing');
  }
  if (key !== VALID_API_KEY) {
    return sendError(res, 401, 'INVALID_API_KEY', 'API key invalid');
  }
  next();
}
// ---- POST /v1/admin/login ----
app.post('/v1/admin/login', (req, res) => {
  const { email, password } = req.body;
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const token = jwt.sign({ email, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
    return sendSuccess(res, { token, expiresIn: '24h' });
  }
  sendError(res, 401, 'INVALID_CREDENTIALS', 'Invalid email or password');
});

// ---- Middleware: JWT check for admin routes ----
function requireAdminAuth(req, res, next) {
  const authHeader = req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 401, 'UNAUTHORIZED', 'Missing or invalid token');
  }
  const token = authHeader.split(' ')[1];
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    sendError(res, 401, 'UNAUTHORIZED', 'Invalid or expired token');
  }
}

app.get('/', (req, res) => {
  res.send('Location API is running! (v1)');
});

// ---- GET /v1/states ----
app.get('/v1/states', requireApiKey, async (req, res) => {
  try {
    const states = await prisma.state.findMany();
    sendSuccess(res, states);
  } catch (error) {
    sendError(res, 500, 'INTERNAL_ERROR', error.message);
  }
});

// ---- GET /v1/states/:id/districts ----
app.get('/v1/states/:id/districts', requireApiKey, async (req, res) => {
  try {
    const districts = await prisma.district.findMany({
      where: { stateId: parseInt(req.params.id) }
    });
    sendSuccess(res, districts);
  } catch (error) {
    sendError(res, 500, 'INTERNAL_ERROR', error.message);
  }
});

// ---- GET /v1/districts/:id/subdistricts ----
app.get('/v1/districts/:id/subdistricts', requireApiKey, async (req, res) => {
  try {
    const subDistricts = await prisma.subDistrict.findMany({
      where: { districtId: parseInt(req.params.id) }
    });
    sendSuccess(res, subDistricts);
  } catch (error) {
    sendError(res, 500, 'INTERNAL_ERROR', error.message);
  }
});

// ---- GET /v1/subdistricts/:id/villages ----
app.get('/v1/subdistricts/:id/villages', requireApiKey, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const villages = await prisma.village.findMany({
      where: { subDistrictId: parseInt(req.params.id) },
      skip: (page - 1) * limit,
      take: limit
    });
    sendSuccess(res, villages);
  } catch (error) {
    sendError(res, 500, 'INTERNAL_ERROR', error.message);
  }
});

// ---- GET /v1/search ----
app.get('/v1/search', requireApiKey, async (req, res) => {
  try {
    const q = req.query.q;
    const limit = parseInt(req.query.limit) || 20;

    if (!q || q.length < 2) {
      return sendError(res, 400, 'INVALID_QUERY', 'Search query too short or invalid');
    }

    const villages = await prisma.village.findMany({
      where: { name: { contains: q, mode: 'insensitive' } },
      take: limit,
      include: {
        subDistrict: {
          include: {
            district: {
              include: { state: { include: { country: true } } }
            }
          }
        }
      }
    });

    const formatted = villages.map(v => ({
      value: `village_id_${v.code}`,
      label: v.name,
      fullAddress: `${v.name}, ${v.subDistrict.name}, ${v.subDistrict.district.name}, ${v.subDistrict.district.state.name}, ${v.subDistrict.district.state.country.name}`,
      hierarchy: {
        village: v.name,
        subDistrict: v.subDistrict.name,
        district: v.subDistrict.district.name,
        state: v.subDistrict.district.state.name,
        country: v.subDistrict.district.state.country.name
      }
    }));

    sendSuccess(res, formatted);
  } catch (error) {
    sendError(res, 500, 'INTERNAL_ERROR', error.message);
  }
});

// ---- GET /v1/autocomplete ----
app.get('/v1/autocomplete', requireApiKey, async (req, res) => {
  try {
    const q = req.query.q;
    if (!q || q.length < 2) {
      return sendError(res, 400, 'INVALID_QUERY', 'Query must be at least 2 characters');
    }

    const villages = await prisma.village.findMany({
      where: { name: { contains: q, mode: 'insensitive' } },
      take: 10,
      include: {
        subDistrict: {
          include: { district: { include: { state: true } } }
        }
      }
    });

    const suggestions = villages.map(v => ({
      value: `village_id_${v.code}`,
      label: `${v.name} (${v.subDistrict.name}, ${v.subDistrict.district.name}, ${v.subDistrict.district.state.name})`
    }));

    sendSuccess(res, suggestions);
  } catch (error) {
    sendError(res, 500, 'INTERNAL_ERROR', error.message);
  }
});

// ---- 404 handler ----
app.use((req, res) => {
  sendError(res, 404, 'NOT_FOUND', 'Requested resource does not exist');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Demo API key: ${VALID_API_KEY}`);
});