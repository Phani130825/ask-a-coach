import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import resumeRoutes from './routes/resumes.js';
import interviewRoutes from './routes/interviews.js';
import analyticsRoutes from './routes/analytics.js';
import aiRoutes from './routes/ai.js';
import pipelineRoutes from './routes/pipelines.js';
import codingRoutes from './routes/coding.js';

// Import middleware
import { authenticateToken } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';

// Import database connection
import { connectDB } from './config/database.js';

// Import AI services
import { initializeAIServices } from './services/aiService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(compression());
app.use(limiter);
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'InterviewAI Backend'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/resumes', authenticateToken, resumeRoutes);
app.use('/api/interviews', authenticateToken, interviewRoutes);
app.use('/api/analytics', authenticateToken, analyticsRoutes);
app.use('/api/ai', authenticateToken, aiRoutes);
app.use('/api/pipelines', authenticateToken, pipelineRoutes);
app.use('/api/coding', authenticateToken, codingRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join-interview', (interviewId) => {
    socket.join(interviewId);
    console.log(`User ${socket.id} joined interview ${interviewId}`);
  });
  
  socket.on('interview-response', (data) => {
    // Handle real-time interview responses
    socket.to(data.interviewId).emit('response-received', data);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

// Initialize services and start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Initialize AI services (optional - server will start even if AI fails)
    try {
      await initializeAIServices();
    } catch (aiError) {
      console.warn('⚠️  AI services failed to initialize, but server will continue running');
      console.warn('💡 AI features will be limited until OpenAI is properly configured');
    }
    
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export { io };
