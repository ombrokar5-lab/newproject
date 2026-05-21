const dns = require('dns');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const studentRoutes = require('./routes/studentRoutes');
const authRoutes = require('./routes/authRoutes');
const authMiddleware = require('./middleware/authMiddleware');

dns.setServers(['1.1.1.1', '8.8.8.8']);

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/students', authMiddleware, studentRoutes);

app.get('/', (req, res) => {
  res.send('Student Database Management API');
});

app.get('/health', (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  res.json({
    status: 'ok',
    server: 'running',
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

const DEFAULT_MONGO_URI = 'mongodb+srv://ombrokar5:Password5%40@clusterabhi.teoq31b.mongodb.net/studentdb?retryWrites=true&w=majority&appName=Clusterabhi';

function buildMongoUri() {
  if (process.env.MONGO_URI) {
    return process.env.MONGO_URI;
  }

  const user = process.env.MONGO_USER;
  const password = process.env.MONGO_PASSWORD;
  const cluster = process.env.MONGO_CLUSTER;
  const db = process.env.MONGO_DB || 'studentdb';

  if (user && password && cluster) {
    return `mongodb+srv://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${cluster}/${db}?retryWrites=true&w=majority&appName=Clusterabhi`;
  }

  return DEFAULT_MONGO_URI;
}

const MONGO_URI = buildMongoUri();
const http = require('http');
const startingPort = Number(process.env.PORT || 5000);
let currentPort = startingPort;

console.log('Environment Variables:');
console.log('MONGO_URI env:', process.env.MONGO_URI ? 'SET' : 'NOT SET');
console.log('MONGO_USER:', process.env.MONGO_USER);
console.log('MONGO_CLUSTER:', process.env.MONGO_CLUSTER);
console.log('MONGO_DB:', process.env.MONGO_DB);
console.log('Built connection URI:', MONGO_URI);
console.log('Connecting to MongoDB...');

const server = http.createServer(app);

function onServerError(error) {
  if (error.syscall !== 'listen') {
    console.error('✗ Server error:', error);
    process.exit(1);
  }

  const bind = `Port ${currentPort}`;
  if (error.code === 'EADDRINUSE') {
    const fallbackPort = currentPort + 1;
    console.warn(`⚠ ${bind} is already in use. Trying ${fallbackPort}...`);
    currentPort = fallbackPort;
    server.listen(currentPort);
  } else {
    console.error('✗ Server error:', error);
    process.exit(1);
  }
}

server.on('error', onServerError);

mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('✓ Connected to MongoDB');
    server.listen(currentPort, () => {
      console.log(`✓ Server running on port ${currentPort}`);
    });
  })
  .catch((error) => {
    console.error('✗ MongoDB connection failed:', error.message);
    process.exit(1);
  });
