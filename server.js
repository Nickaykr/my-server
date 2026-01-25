require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const apiRoutes = require('./routes/api'); 
const mediaRoutes = require('./routes/media');
const cinemaRoutes = require('./routes/cinemaRoutes');
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
app.use('/api/media', mediaRoutes);
app.use('/api/cinema-clubs', cinemaRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', auth, userRoutes); 
app.use('/api', apiRoutes); 

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

app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n✅ Server running on port ${PORT}`);
  console.log(`📍 API endpoints:`);
  console.log(`   http://localhost:${PORT}/api/media/comingSoon `);
});