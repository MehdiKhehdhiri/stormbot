# StormBot Frontend Dashboard

A modern web-based dashboard for StormBot - the AI-powered load testing tool.

## Features

🌩️ **Real-time Dashboard**
- Live test monitoring with WebSocket updates
- Real-time performance metrics and charts
- Active agent tracking with persona-based behavior
- Live log streaming with color-coded messages

🚀 **Test Management**
- Intuitive test configuration interface
- Support for all StormBot parameters (URL, users, duration, AI settings)
- Test preview and validation
- One-click test execution and stopping

📊 **Results & Analytics**
- Interactive performance charts (Chart.js)
- Comprehensive test reports with AI analysis
- Error tracking with screenshots
- Agent performance breakdown
- Historical test comparison

📋 **Report Management**
- Browse and view historical test reports
- Detailed error analysis with AI summaries
- Screenshot gallery for visual debugging
- Export capabilities

⚙️ **Settings & Configuration**
- BlackBox AI API key management
- Default test parameter configuration
- Dashboard customization options
- Auto-refresh controls

## Architecture

### Backend (Express.js + Socket.IO)
- **server.js**: Main Express server with REST API endpoints
- **WebSocket Integration**: Real-time updates during test execution
- **Process Management**: Spawns and manages StormBot processes
- **Report Processing**: Parses and serves test reports

### Frontend (Vanilla JavaScript + Modern CSS)
- **public/index.html**: Main application structure
- **public/css/styles.css**: Modern responsive styling with CSS Grid/Flexbox
- **public/js/app.js**: Application logic with real-time updates

### API Endpoints

#### Test Management
- `POST /api/test/start` - Start a new load test
- `POST /api/test/:testId/stop` - Stop a running test
- `GET /api/test/:testId` - Get test details and status
- `GET /api/status` - Get system status and active tests

#### Reports
- `GET /api/reports` - List all available reports
- `GET /api/reports/:reportId` - Get detailed report data
- `GET /api/reports/:reportId/screenshot/:filename` - Serve screenshot files

#### WebSocket Events
- `test-update` - Real-time test progress updates
- `active-tests` - Current active tests list
- `connect/disconnect` - Connection status

## Installation & Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Environment Variables**
   Create a `.env` file with your BlackBox AI API key:
   ```
   API_KEY=your_blackbox_ai_api_key_here
   ```

3. **Start the Frontend Server**
   ```bash
   npm run server
   # or
   npm run dev
   ```

4. **Access the Dashboard**
   Open your browser to: `http://localhost:3000`

## Usage

### Starting a Load Test
1. Navigate to the "New Test" tab
2. Enter the target URL and configure parameters
3. Click "Start Load Test"
4. Monitor progress in real-time on the Dashboard tab

### Viewing Results
1. Go to the "Reports" tab to see historical tests
2. Click on any report to view detailed results
3. View performance metrics, agent behavior, and error analysis
4. Check screenshots for visual debugging

### Real-time Monitoring
- The Dashboard tab shows live updates during test execution
- Watch agent actions, performance metrics, and logs in real-time
- Performance charts update automatically
- Error notifications appear instantly

## Technology Stack

- **Backend**: Node.js, Express.js, Socket.IO
- **Frontend**: HTML5, CSS3 (Grid/Flexbox), Vanilla JavaScript (ES6+)
- **Charts**: Chart.js for interactive visualizations
- **Real-time**: WebSocket communication for live updates
- **Styling**: Modern CSS with custom properties and responsive design

## Browser Support

- Chrome/Chromium 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Development

### File Structure
```
stormbot/
├── server.js              # Express server
├── stormbot.js            # Original CLI tool
├── blackbox.js            # AI integration
├── package.json           # Dependencies
├── public/                # Frontend assets
│   ├── index.html         # Main HTML
│   ├── css/
│   │   └── styles.css     # Styling
│   └── js/
│       └── app.js         # Application logic
└── agents/                # Agent system
    └── baseAgent.js
```

### Key Features Implementation

**Real-time Updates**: WebSocket connection provides instant updates during test execution, including agent actions, performance metrics, and error notifications.

**Responsive Design**: Mobile-first CSS with breakpoints for tablet and desktop viewing.

**Error Handling**: Comprehensive error tracking with visual feedback and detailed logging.

**Performance Optimization**: Efficient DOM updates, chart animations, and memory management for long-running tests.

## Integration with StormBot CLI

The frontend seamlessly integrates with the existing StormBot CLI tool:
- Spawns `node stormbot.js` processes with configured parameters
- Parses real-time output for metrics and agent actions
- Processes generated reports and screenshots
- Maintains compatibility with all existing features

## Troubleshooting

### Common Issues

1. **Port 3000 already in use**
   ```bash
   PORT=3001 npm run server
   ```

2. **API Key not working**
   - Verify your BlackBox AI API key in the `.env` file
   - Check the Settings tab in the dashboard

3. **Tests not starting**
   - Ensure all dependencies are installed
   - Check that the original StormBot CLI works: `node stormbot.js --help`

4. **Real-time updates not working**
   - Check browser console for WebSocket connection errors
   - Verify firewall settings for port 3000

### Performance Tips

- Use Chrome DevTools to monitor WebSocket messages
- Check Network tab for API call performance
- Monitor memory usage during long-running tests
- Clear browser cache if experiencing issues

## Contributing

The frontend is designed to be easily extensible:
- Add new chart types in `app.js`
- Extend API endpoints in `server.js`
- Customize styling in `styles.css`
- Add new dashboard widgets by modifying the grid layout

## License

MIT License - Same as the main StormBot project.
