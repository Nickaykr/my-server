const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const apiRoutes = require('./routes/api'); 
const { auth } = require('./middleware/auth'); 

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

app.use('/public', express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  console.log('📍', new Date().toISOString(), req.method, req.url);
  console.log('📨 Authorization:', req.header('Authorization'));
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', auth, userRoutes); 
app.use('/api', apiRoutes); 

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/protected-test', auth, (req, res) => {
  console.log('✅ Protected test route called');
  res.json({ 
    message: 'Protected route works!', 
    user: req.user.email 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n✅ Server running on port ${PORT}`);
  console.log(`📍 API endpoints:`);
  console.log(`   http://localhost:${PORT}/api/auth/register`);
  console.log(`   http://localhost:${PORT}/api/auth/login`);
  console.log(`   http://localhost:${PORT}/api/auth/me (protected)`);
  console.log(`   http://localhost:${PORT}/api/users/profile (protected)`);
  console.log(`   http://localhost:${PORT}/api/protected-test (protected)`);
   console.log(`   📺 MEDIA ENDPOINTS:`); // ← ДОБАВЬ ЭТО
  console.log(`   http://localhost:${PORT}/api/media`);
  console.log(`   http://localhost:${PORT}/api/media/new`);
  console.log(`   http://localhost:${PORT}/api/media/popular`);
  console.log(`   http://localhost:${PORT}/api/media?type=movie`);
  console.log(`   http://localhost:${PORT}/api/media?type=series`);
});