import 'dotenv/config';
const __dirname = import.meta.dirname;
import express, { json, static as expressStatic } from 'express';
import cors from 'cors';
import { join } from 'path';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import apiRoutes from './routes/api.js'; 
import mediaRoutes from './routes/media.js';
import cinemaRoutes from './routes/cinemaRoutes.js';
import commentRoutes from './routes/comments.js';
import { auth } from './middleware/auth.js'; 
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(json());

app.use('/public', expressStatic(join(__dirname, 'public')));

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
app.use('/api/comments', commentRoutes);

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