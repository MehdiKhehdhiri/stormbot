const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.vercel.app'] 
    : ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Store active test processes (in production, use a database)
const activeTests = new Map();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get test status
app.get('/api/status', (req, res) => {
  const activeTestsList = Array.from(activeTests.entries()).map(([id, test]) => ({
    id,
    status: test.status,
    startTime: test.startTime,
    config: test.config
  }));
  
  res.json({
    activeTests: activeTestsList.length,
    tests: activeTestsList
  });
});

// Start a new test
app.post('/api/test/start', (req, res) => {
  const { url, users, duration, aiEnabled, reportDir } = req.body;
  
  // Validate required parameters
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  // In serverless environment, we have limitations
  if (process.env.VERCEL) {
    return res.status(501).json({ 
      error: 'Load testing not available in serverless environment',
      message: 'Please use the local version or deploy backend to a long-running server'
    });
  }

  const testId = Date.now().toString();
  const config = {
    url,
    users: users || 5,
    duration: duration || 60,
    aiEnabled: aiEnabled !== false,
    reportDir: reportDir || './stormbot-reports'
  };

  // Build command arguments
  const args = [
    'stormbot.js',
    '--url', config.url,
    '--users', config.users.toString(),
    '--duration', config.duration.toString(),
    '--report-dir', config.reportDir
  ];

  if (config.aiEnabled) {
    args.push('--ai-enabled');
  }

  console.log(`🚀 Starting test ${testId} with args:`, args);

  try {
    // Spawn StormBot process
    const stormBotProcess = spawn('node', args, {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const testInfo = {
      id: testId,
      process: stormBotProcess,
      status: 'running',
      startTime: new Date().toISOString(),
      config,
      logs: [],
      metrics: {
        requests: 0,
        errors: 0,
        agents: []
      }
    };

    activeTests.set(testId, testInfo);

    // Handle process completion
    stormBotProcess.on('close', (code) => {
      testInfo.status = code === 0 ? 'completed' : 'failed';
      testInfo.endTime = new Date().toISOString();
      console.log(`✅ Test ${testId} finished with code ${code}`);
    });

    stormBotProcess.on('error', (error) => {
      console.error(`❌ Test ${testId} error:`, error);
      testInfo.status = 'error';
      testInfo.error = error.message;
    });

    res.json({
      testId,
      status: 'started',
      config
    });
  } catch (error) {
    console.error('Error starting test:', error);
    res.status(500).json({ error: 'Failed to start test' });
  }
});

// Get available reports
app.get('/api/reports', (req, res) => {
  const reportsDir = './stormbot-reports';
  
  if (!fs.existsSync(reportsDir)) {
    return res.json({ reports: [] });
  }

  try {
    const reports = fs.readdirSync(reportsDir)
      .filter(dir => {
        const fullPath = path.join(reportsDir, dir);
        return fs.statSync(fullPath).isDirectory();
      })
      .map(dir => {
        const reportPath = path.join(reportsDir, dir);
        const stats = fs.statSync(reportPath);
        
        // Try to read test results
        let summary = null;
        const resultsFile = path.join(reportPath, 'test-results.json');
        if (fs.existsSync(resultsFile)) {
          try {
            const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
            summary = results.summary;
          } catch (e) {
            console.warn(`Failed to parse results for ${dir}:`, e.message);
          }
        }

        return {
          id: dir,
          path: reportPath,
          createdAt: stats.birthtime.toISOString(),
          summary
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ reports });
  } catch (error) {
    console.error('Error reading reports:', error);
    res.status(500).json({ error: 'Failed to read reports' });
  }
});

// Export for Vercel
module.exports = app;

// For local development
if (require.main === module) {
  const server = http.createServer(app);
  const io = socketIo(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = process.env.PORT || 3000;

  // WebSocket handling for local development
  io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);
    socket.on('disconnect', () => {
      console.log('🔌 Client disconnected:', socket.id);
    });
  });

  server.listen(PORT, () => {
    console.log(`🌩️  StormBot Frontend Server running on http://localhost:${PORT}`);
    console.log(`📊 Dashboard available at http://localhost:${PORT}`);
    console.log(`🔌 WebSocket server ready for real-time updates`);
  });
}
