/**
 * PXL Chat Server - Socket.io WebSocket server for real-time messaging
 * Provides sub-200ms message delivery with E2EE support
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import { authenticateSocket, AuthenticatedSocket } from './middleware/auth.middleware';
import { MessageHandler } from './handlers/message.handler';
import { PresenceHandler } from './handlers/presence.handler';
import { logger } from './services/logger.service';

// Load environment variables
dotenv.config();

class ChatServer {
  private app: express.Application;
  private server: any;
  private io!: Server;
  private messageHandler!: MessageHandler;
  private presenceHandler!: PresenceHandler;
  
  private readonly port: number;
  private readonly corsOrigin: string;

  constructor() {
    this.port = parseInt(process.env.PORT || '8080');
    this.corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3009';
    
    this.app = express();
    this.server = createServer(this.app);
    
    this.setupMiddleware();
    this.setupSocketIO();
    this.setupHandlers();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: false, // Allow WebSocket connections
      crossOriginEmbedderPolicy: false
    }));

    // CORS configuration
    this.app.use(cors({
      origin: this.corsOrigin,
      credentials: true,
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req, res, next) => {
      logger.debug(`📨 ${req.method} ${req.path} - ${req.ip}`);
      next();
    });
  }

  /**
   * Setup Socket.io server with authentication
   */
  private setupSocketIO(): void {
    this.io = new Server(this.server, {
      cors: {
        origin: this.corsOrigin,
        credentials: true,
        methods: ['GET', 'POST']
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
      upgradeTimeout: 30000,
      allowEIO3: true
    });

    // Authentication middleware
    this.io.use(authenticateSocket);

    logger.info('🔌 Socket.io server configured');
  }

  /**
   * Setup message and presence handlers
   */
  private setupHandlers(): void {
    this.messageHandler = new MessageHandler(this.io);
    this.presenceHandler = new PresenceHandler(this.io);

    // Handle new connections
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      logger.info(`🔗 New connection: ${socket.id} for user: ${socket.data.userId}`);

      // Register event handlers
      this.messageHandler.registerHandlers(socket);
      this.presenceHandler.registerHandlers(socket);

      // Send connection confirmation
      socket.emit('auth:success', {
        userId: socket.data.userId,
        tier: socket.data.tier,
        displayName: socket.data.displayName,
        connectedAt: new Date().toISOString()
      });

      // Handle connection errors
      socket.on('error', (error) => {
        logger.error(`❌ Socket error for ${socket.id}:`, error);
      });

      // Log disconnection
      socket.on('disconnect', (reason) => {
        logger.info(`🔌 Socket disconnected: ${socket.id} - Reason: ${reason}`);
      });
    });

    // Handle connection errors
    this.io.on('connect_error', (error) => {
      logger.error('❌ Socket.io connection error:', error);
    });

    logger.info('📝 Event handlers configured');
  }

  /**
   * Setup Express routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      const stats = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        connections: this.io.engine.clientsCount,
        onlineUsers: this.presenceHandler.getOnlineUsersCount(),
        version: '1.0.0'
      };
      
      res.json(stats);
    });

    // Server info endpoint
    this.app.get('/info', (req, res) => {
      res.json({
        name: 'PXL Chat Server',
        version: '1.0.0',
        description: 'Socket.io server for real-time messaging with E2EE',
        features: [
          'Real-time messaging',
          'End-to-end encryption support',
          'Typing indicators',
          'Presence system',
          'Message delivery receipts',
          'Rate limiting',
          'Firebase authentication'
        ],
        endpoints: {
          websocket: '/socket.io/',
          health: '/health',
          info: '/info'
        }
      });
    });

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        message: 'PXL Chat Server is running',
        status: 'online',
        websocket: '/socket.io/',
        docs: '/info'
      });
    });

    logger.info('🛣️ Express routes configured');
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('💥 Uncaught Exception:', error);
      this.gracefulShutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      this.gracefulShutdown('unhandledRejection');
    });

    // Handle SIGTERM (Docker/K8s shutdown)
    process.on('SIGTERM', () => {
      logger.info('📴 SIGTERM received, starting graceful shutdown');
      this.gracefulShutdown('SIGTERM');
    });

    // Handle SIGINT (Ctrl+C)
    process.on('SIGINT', () => {
      logger.info('📴 SIGINT received, starting graceful shutdown');
      this.gracefulShutdown('SIGINT');
    });

    logger.info('🛡️ Error handling configured');
  }

  /**
   * Graceful shutdown
   */
  private gracefulShutdown(signal: string): void {
    logger.info(`🔄 Graceful shutdown initiated by: ${signal}`);
    
    // Close Socket.io server
    this.io.close(() => {
      logger.info('🔌 Socket.io server closed');
      
      // Close HTTP server
      this.server.close(() => {
        logger.info('🌐 HTTP server closed');
        
        // Exit process
        process.exit(0);
      });
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      logger.error('💥 Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  }

  /**
   * Start the server
   */
  public start(): void {
    this.server.listen(this.port, () => {
      logger.info(`🚀 PXL Chat Server started successfully`);
      logger.info(`📡 Server running on port: ${this.port}`);
      logger.info(`🌐 CORS origin: ${this.corsOrigin}`);
      logger.info(`🔌 WebSocket endpoint: ws://localhost:${this.port}/socket.io/`);
      logger.info(`💚 Health check: http://localhost:${this.port}/health`);
      logger.info(`📋 Server info: http://localhost:${this.port}/info`);
    });
  }
}

// Start the server
const chatServer = new ChatServer();
chatServer.start();
