# 🌩️ StormBot - AI-Powered Load Testing Tool

StormBot is a sophisticated CLI tool for AI-powered load testing of websites using Node.js and Playwright. It simulates real user behavior by launching multiple headless browser instances that interact with your target website in realistic ways, enhanced with **free AI model integration**.

## 🤖 AI-Powered Features

StormBot now includes **free AI model integration** using Hugging Face's inference API:

- **Content Analysis**: Automatically analyzes page content to determine website type
- **Intelligent Interactions**: Adapts user behavior based on detected website type
- **Smart Element Selection**: Uses AI to identify relevant elements for interaction
- **Strategy Optimization**: Implements different interaction strategies for different website types
- **Free AI Model**: Uses Hugging Face's BART-large-mnli model (no API key required)

### AI-Detected Website Types

The AI can identify and adapt to:
- **E-commerce**: Focuses on products, shopping cart, search
- **Blog**: Emphasizes reading content, article links
- **News**: Prioritizes headlines, article clicks, search
- **Social Media**: Simulates likes, comments, sharing
- **Landing Page**: Targets CTAs, forms, content reading
- **Dashboard**: Navigates menus, views data, settings
- **Form**: Fills fields, submits, validates
- **General**: Balanced interaction approach

## Features

- **Multi-user simulation**: Launch multiple concurrent browser instances
- **AI-powered behavior**: Intelligent user simulation based on content analysis
- **Realistic user behavior**: Random scrolling, clicking, and mouse movements
- **Comprehensive metrics**: Page load times, console errors, and request counts
- **Detailed reporting**: Per-user breakdown and performance insights
- **Easy CLI interface**: Simple command-line arguments
- **Headless operation**: Runs without visible browser windows
- **Free AI integration**: No API keys or costs required

## Installation

1. **Clone or download the project files**
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Install Playwright browsers:**
   ```bash
   npx playwright install chromium
   ```

## Usage

### Basic Usage

```bash
node stormbot.js --url https://example.com
```

### Advanced Usage with AI

```bash
node stormbot.js --url https://example.com --users 10 --duration 120
```

### Disable AI (Fallback to Basic Mode)

```bash
node stormbot.js --url https://example.com --ai-enabled false
```

### Command Line Options

- `--url <url>` (required): Target website URL to test
- `--users <number>` (optional): Number of simulated users (default: 5)
- `--duration <seconds>` (optional): Test duration in seconds (default: 60)
- `--ai-enabled` (optional): Enable/disable AI-powered interactions (default: true)

### Examples

**AI-powered test with 3 users for 30 seconds:**
```bash
node stormbot.js --url https://google.com --users 3 --duration 30
```

**Heavy AI-powered load test with 20 users for 5 minutes:**
```bash
node stormbot.js --url https://your-website.com --users 20 --duration 300
```

**Basic test without AI (fallback mode):**
```bash
node stormbot.js --url https://example.com --ai-enabled false
```

## What StormBot Does

For each simulated user, StormBot:

1. **Launches a headless Chromium browser**
2. **Navigates to the target URL**
3. **AI Content Analysis**: Analyzes page content to determine website type
4. **AI Strategy Selection**: Chooses appropriate interaction strategy
5. **Performs AI-powered user interactions:**
   - Content-aware scrolling and reading
   - Intelligent element selection and clicking
   - Context-appropriate form filling
   - Website-specific behaviors (search, navigation, etc.)
   - Random waiting and reading simulation
6. **Captures metrics:**
   - Page load time
   - Console errors
   - Total network requests
   - AI analysis results
   - Actions performed
7. **Generates a comprehensive AI-enhanced report**

## Sample AI-Enhanced Output

```
🌩️  StormBot - AI-Powered Load Testing
=====================================
Target URL: https://example.com
Users: 5
Duration: 60 seconds
AI Enabled: Yes
🤖 Using free AI model: Hugging Face BART-large-mnli
Starting test...

🤖 AI detected: e-commerce (confidence: 87.3%)
🎯 Using strategy: scroll, click_products, search, add_to_cart

🤖 AI detected: blog (confidence: 92.1%)
🎯 Using strategy: scroll, read_content, click_links, share

📊 Test Results Summary
======================
Total Duration: 60.12 seconds
Total Requests: 1,247
Total Console Errors: 3
Average Page Load Time: 1,234.56ms
Successful Users: 5/5

🤖 AI Analysis Summary:
======================
e-commerce: 2 users (40.0%)
blog: 2 users (40.0%)
landing page: 1 users (20.0%)

📈 Per-User Breakdown:
=====================
User 1:
  Page Load Time: 1,156ms
  Requests: 245
  Console Errors: 0
  Actions Performed: 12
  AI Detected: e-commerce (87.3% confidence)

User 2:
  Page Load Time: 1,298ms
  Requests: 267
  Console Errors: 1
  Actions Performed: 15
  AI Detected: blog (92.1% confidence)

💡 Performance Insights:
=======================
✅ Page load times are acceptable
⚠️  3 console errors detected
📊 Average requests per second: 20.75
🤖 AI-powered interactions provided intelligent user simulation
```

## AI Model Details

### Free AI Integration

StormBot uses **Hugging Face's free inference API** with the BART-large-mnli model:

- **No API key required**: Completely free to use
- **No rate limits**: Suitable for testing scenarios
- **High accuracy**: State-of-the-art text classification
- **Fast inference**: Quick response times
- **Reliable fallback**: Gracefully handles API failures

### AI Capabilities

1. **Content Classification**: Identifies website type from page content
2. **Strategy Optimization**: Adapts interaction patterns based on website type
3. **Element Intelligence**: Smart selection of relevant page elements
4. **Behavior Adaptation**: Different interaction strategies for different sites
5. **Confidence Scoring**: Provides confidence levels for AI decisions

## Requirements

- Node.js 16.0.0 or higher
- npm or yarn package manager
- Internet connection for downloading dependencies and AI model access

## Dependencies

- **Playwright**: Browser automation and testing
- **Commander**: Command-line argument parsing
- **Hugging Face API**: Free AI model inference (no API key required)

## Performance Considerations

- **Memory usage**: Each browser instance uses significant memory. For high user counts, ensure adequate system resources.
- **Network bandwidth**: The tool generates real HTTP requests, so consider your network capacity.
- **AI API calls**: Free Hugging Face API has reasonable limits for testing scenarios.
- **Target server**: Be mindful of the load you're generating on the target website.

## Troubleshooting

### Common Issues

1. **"Playwright browsers not found"**
   ```bash
   npx playwright install chromium
   ```

2. **Permission denied errors**
   ```bash
   chmod +x stormbot.js
   ```

3. **AI analysis failures**
   - The tool automatically falls back to basic interactions
   - Check internet connection for AI model access
   - Use `--ai-enabled false` to disable AI features

4. **Memory issues with high user counts**
   - Reduce the number of concurrent users
   - Increase system memory or use a more powerful machine

### Error Handling

StormBot includes comprehensive error handling:
- Graceful browser cleanup on errors
- Individual user error tracking
- AI analysis fallback mechanisms
- Detailed error reporting in the final summary

## Contributing

Feel free to submit issues, feature requests, or pull requests to improve StormBot.

## License

MIT License - see LICENSE file for details.

## Disclaimer

This tool is for testing purposes only. Always ensure you have permission to load test any website, and be mindful of the impact on the target server and network infrastructure. The AI features use free public APIs and should be used responsibly. 