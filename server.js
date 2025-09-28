const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Store active test processes
const activeTests = new Map();

// API Routes

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

  // Spawn StormBot process
  const stormBotProcess = spawn('node', args, {
    cwd: __dirname,
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

  // Handle process output
  stormBotProcess.stdout.on('data', (data) => {
    const output = data.toString();
    testInfo.logs.push({
      timestamp: new Date().toISOString(),
      type: 'stdout',
      message: output
    });

    // Parse metrics from output
    parseMetricsFromOutput(output, testInfo);

    // Emit real-time updates
    io.emit('test-update', {
      testId,
      type: 'log',
      data: output,
      metrics: testInfo.metrics
    });
  });

  stormBotProcess.stderr.on('data', (data) => {
    const output = data.toString();
    testInfo.logs.push({
      timestamp: new Date().toISOString(),
      type: 'stderr',
      message: output
    });

    io.emit('test-update', {
      testId,
      type: 'error',
      data: output
    });
  });

  stormBotProcess.on('close', (code) => {
    testInfo.status = code === 0 ? 'completed' : 'failed';
    testInfo.endTime = new Date().toISOString();
    
    console.log(`✅ Test ${testId} finished with code ${code}`);

    // Try to read the generated report
    setTimeout(() => {
      loadTestReport(testInfo);
    }, 1000);

    io.emit('test-update', {
      testId,
      type: 'completed',
      status: testInfo.status,
      code
    });
  });

  stormBotProcess.on('error', (error) => {
    console.error(`❌ Test ${testId} error:`, error);
    testInfo.status = 'error';
    testInfo.error = error.message;

    io.emit('test-update', {
      testId,
      type: 'error',
      error: error.message
    });
  });

  res.json({
    testId,
    status: 'started',
    config
  });
});

// Stop a test
app.post('/api/test/:testId/stop', (req, res) => {
  const { testId } = req.params;
  const test = activeTests.get(testId);

  if (!test) {
    return res.status(404).json({ error: 'Test not found' });
  }

  if (test.process && !test.process.killed) {
    test.process.kill('SIGTERM');
    test.status = 'stopped';
    
    io.emit('test-update', {
      testId,
      type: 'stopped'
    });
  }

  res.json({ status: 'stopped' });
});

// Get test details
app.get('/api/test/:testId', (req, res) => {
  const { testId } = req.params;
  const test = activeTests.get(testId);

  if (!test) {
    return res.status(404).json({ error: 'Test not found' });
  }

  res.json({
    id: testId,
    status: test.status,
    startTime: test.startTime,
    endTime: test.endTime,
    config: test.config,
    metrics: test.metrics,
    logs: test.logs.slice(-50), // Last 50 log entries
    report: test.report
  });
});

// Get available reports
app.get('/api/reports', (req, res) => {
  const reportsDir = './stormbot-reports';
  
  if (!fs.existsSync(reportsDir)) {
    return res.json({ reports: [] });
  }

  try {
    const reports = fs.readdirSync(reportsDir)
      .filter(dir => fs.statSync(path.join(reportsDir, dir)).isDirectory())
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

// Get specific report
app.get('/api/reports/:reportId', (req, res) => {
  const { reportId } = req.params;
  const reportPath = path.join('./stormbot-reports', reportId);

  if (!fs.existsSync(reportPath)) {
    return res.status(404).json({ error: 'Report not found' });
  }

  try {
    const report = {};
    
    // Read test results
    const resultsFile = path.join(reportPath, 'test-results.json');
    if (fs.existsSync(resultsFile)) {
      report.results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
    }

    // Read error report if exists
    const errorFile = path.join(reportPath, 'error-report.json');
    if (fs.existsSync(errorFile)) {
      report.errors = JSON.parse(fs.readFileSync(errorFile, 'utf8'));
    }

    // Read agent report if exists
    const agentFile = path.join(reportPath, 'agent-report.json');
    if (fs.existsSync(agentFile)) {
      report.agents = JSON.parse(fs.readFileSync(agentFile, 'utf8'));
    }

    // List screenshot files
    const screenshots = fs.readdirSync(reportPath)
      .filter(file => file.endsWith('.png'))
      .map(file => ({
        filename: file,
        path: `/api/reports/${reportId}/screenshot/${file}`
      }));
    
    report.screenshots = screenshots;

    res.json(report);
  } catch (error) {
    console.error('Error reading report:', error);
    res.status(500).json({ error: 'Failed to read report' });
  }
});

// Serve screenshot files
app.get('/api/reports/:reportId/screenshot/:filename', (req, res) => {
  const { reportId, filename } = req.params;
  const filePath = path.join('./stormbot-reports', reportId, filename);

  if (!fs.existsSync(filePath) || !filename.endsWith('.png')) {
    return res.status(404).json({ error: 'Screenshot not found' });
  }

  res.sendFile(path.resolve(filePath));
});

// Utility functions
function parseMetricsFromOutput(output, testInfo) {
  // Parse various metrics from StormBot output
  const lines = output.split('\n');
  
  lines.forEach(line => {
    // Parse agent actions
    if (line.includes('Agent (') && line.includes(')-')) {
      const agentMatch = line.match(/Agent \(([^)]+)\)-(.+)/);
      if (agentMatch) {
        const [, agentName, action] = agentMatch;
        
        let agent = testInfo.metrics.agents.find(a => a.name === agentName);
        if (!agent) {
          agent = { name: agentName, actions: 0, lastAction: null };
          testInfo.metrics.agents.push(agent);
        }
        
        agent.actions++;
        agent.lastAction = action.trim();
        agent.lastUpdate = new Date().toISOString();
      }
    }

    // Parse error counts
    if (line.includes('Total Errors:')) {
      const errorMatch = line.match(/Total Errors:\s*(\d+)/);
      if (errorMatch) {
        testInfo.metrics.errors = parseInt(errorMatch[1]);
      }
    }

    // Parse request counts
    if (line.includes('Total Requests:')) {
      const requestMatch = line.match(/Total Requests:\s*(\d+)/);
      if (requestMatch) {
        testInfo.metrics.requests = parseInt(requestMatch[1]);
      }
    }
  });
}

function loadTestReport(testInfo) {
  // Try to find and load the generated report
  const reportsDir = testInfo.config.reportDir;
  
  if (!fs.existsSync(reportsDir)) {
    return;
  }

  try {
    // Find the most recent report directory
    const reportDirs = fs.readdirSync(reportsDir)
      .filter(dir => {
        const fullPath = path.join(reportsDir, dir);
        return fs.statSync(fullPath).isDirectory() && dir.startsWith('test-');
      })
      .sort()
      .reverse();

    if (reportDirs.length > 0) {
      const latestReportDir = path.join(reportsDir, reportDirs[0]);
      const resultsFile = path.join(latestReportDir, 'test-results.json');
      
      if (fs.existsSync(resultsFile)) {
        testInfo.report = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
        testInfo.reportPath = latestReportDir;
        
        console.log(`📊 Loaded report for test ${testInfo.id}`);
        
        // Emit report loaded event
        io.emit('test-update', {
          testId: testInfo.id,
          type: 'report-ready',
          report: testInfo.report
        });
      }
    }
  } catch (error) {
    console.error('Error loading test report:', error);
  }
}

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });

  // Send current active tests to new clients
  const activeTestsList = Array.from(activeTests.entries()).map(([id, test]) => ({
    id,
    status: test.status,
    startTime: test.startTime,
    config: test.config,
    metrics: test.metrics
  }));

  socket.emit('active-tests', activeTestsList);
});

// Serve the main application
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
server.listen(PORT, () => {
  console.log(`🌩️  StormBot Frontend Server running on http://localhost:${PORT}`);
  console.log(`📊 Dashboard available at http://localhost:${PORT}`);
  console.log(`🔌 WebSocket server ready for real-time updates`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down server...');
  
  // Kill all active test processes
  activeTests.forEach((test, testId) => {
    if (test.process && !test.process.killed) {
      console.log(`🛑 Stopping test ${testId}`);
      test.process.kill('SIGTERM');
    }
  });

  server.close(() => {
    console.log('✅ Server shut down gracefully');
    process.exit(0);
  });
});
