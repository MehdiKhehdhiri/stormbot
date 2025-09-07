const { chromium } = require('playwright');
const { program } = require('commander');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { classifyPage, generatePersonaActions, summarizeError, callBlackboxApi } = require('./blackbox');
const BaseAgent = require('./agents/baseAgent');

// Configuration and data structures
let testResults = [];
let startTime;
let endTime;
let reportDir;

const BLACKBOX_API_KEY="sk-koWMbDA1TzWYzMa7NIQN_Q"

// Parse command line arguments
program
  .name('stormbot')
  .description('AI-powered load testing tool using Playwright')
  .version('1.0.0')
  .requiredOption('--url <url>', 'Target website URL')
  .option('--users <number>', 'Number of simulated users', '5')
  .option('--duration <seconds>', 'Test duration in seconds', '60')
  .option('--ai-enabled', 'Enable AI-powered interactions', true)
  .option('--report-dir <path>', 'Directory to save detailed reports', './stormbot-reports')
  .parse();

const options = program.opts();

// Utility functions
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomDelay() {
  return getRandomInt(1000, 5000); // 1-5 seconds
}

function getRandomScrollAmount() {
  return getRandomInt(100, 800); // 100-800 pixels
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Create report directory
function createReportDirectory() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  reportDir = path.join(options.reportDir, `test-${timestamp}`);
  
  if (!fs.existsSync(options.reportDir)) {
    fs.mkdirSync(options.reportDir, { recursive: true });
  }
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  return reportDir;
}

// Enhanced error logging with AI-powered summarization
async function logError(page, userIndex, error, context = '') {
  const errorData = {
    timestamp: new Date().toISOString(),
    userIndex,
    error: error.message,
    stack: error.stack,
    context,
    url: page.url(),
    screenshot: null,
    consoleLogs: [],
    networkErrors: [],
    aiSummary: null
  };

  try {
    // Only take screenshot if there's an actual error
    if (error && error.message) {
      const screenshotPath = path.join(reportDir, `error-user-${userIndex}-${Date.now()}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      errorData.screenshot = screenshotPath;
    }
  } catch (screenshotError) {
    errorData.screenshot = 'Failed to capture screenshot';
  }

  // Use BLACKBOX to summarize the error
  try {
    const errorContext = {
      error: error.message,
      stack: error.stack,
      context,
      url: page.url(),
      userIndex
    };
    errorData.aiSummary = await summarizeError(errorContext);
  } catch (summaryError) {
    errorData.aiSummary = 'Failed to generate AI summary';
  }

  return errorData;
}

// Enhanced console error collection
async function setupErrorMonitoring(page, userIndex, userResults) {
  // Console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const errorInfo = {
        timestamp: new Date().toISOString(),
        message: msg.text(),
        location: msg.location(),
        type: msg.type(),
        args: msg.args().map(arg => arg.toString())
      };
      userResults.consoleErrors.push(errorInfo);
    }
  });

  // Page errors
  page.on('pageerror', error => {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      type: 'pageerror'
    };
    userResults.pageErrors.push(errorInfo);
  });

  // Network errors
  page.on('requestfailed', request => {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      url: request.url(),
      method: request.method(),
      failure: request.failure(),
      headers: request.headers()
    };
    userResults.networkErrors.push(errorInfo);
  });

  // Response errors (4xx, 5xx)
  page.on('response', response => {
    if (response.status() >= 400) {
      const errorInfo = {
        timestamp: new Date().toISOString(),
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
        headers: response.headers()
      };
      userResults.responseErrors.push(errorInfo);
    }
  });
}

async function analyzePageContent(page) {
  try {
    // Wait for page to load completely
    await page.waitForLoadState('networkidle');

    // Debug: Check if page has basic content
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        bodyText: document.body ? document.body.innerText : 'No body',
        hasHeadings: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
        hasButtons: document.querySelectorAll('button, a, [role="button"]').length,
        url: window.location.href,
        readyState: document.readyState
      };
    });

    console.log('🔍 Page info:', pageInfo);

    // Extract page content for AI analysis
    const pageContent = await page.evaluate(() => {
      const text = document.body.innerText || '';
      const title = document.title || '';
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
        .map(h => h.textContent).join(' ');
      const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'))
        .map(el => el.textContent || el.getAttribute('aria-label') || '').join(' ');

      return `${title} ${headings} ${buttons} ${text.substring(0, 1000)}`;
    });

    console.log('🔍 Extracted page content for classification:', pageContent ? pageContent.substring(0, 200) + '...' : 'EMPTY');

    // Use BLACKBOX API to classify page content
    const pageType = await classifyPage(pageContent);
    return { type: pageType, confidence: 1.0 };
  } catch (error) {
    console.log(`⚠️  BLACKBOX AI analysis failed, falling back to basic interactions: ${error}`);
    return { type: 'other', confidence: 0.5 };
  }
}

// async function getAIInteractionStrategy(page, analysis) {
//   try {
//     // Use BLACKBOX to generate persona actions
//     const role = generateAgent(content); // Default role, can be made configurable
//     const actions = await generatePersonaActions(role, analysis.type);

//     console.log(`🤖 BLACKBOX AI detected: ${analysis.type} (confidence: ${(analysis.confidence * 100).toFixed(1)}%)`);
//     console.log(`🎯 Generated actions: ${actions.join(', ')}`);

//     // Return a strategy object compatible with existing code
//     return {
//       actions: actions,
//       priorities: {} // Simplified, can be enhanced if needed
//     };
//   } catch (error) {
//     console.log(`⚠️  BLACKBOX persona generation failed, falling back to basic actions ${error}`);
//     return {
//       actions: ['scroll', 'click', 'read', 'wait'],
//       priorities: { scroll: 0.3, click: 0.3, read: 0.2, wait: 0.2 }
//     };
//   }
// }

async function getAgentInteractionStrategy(page, agent, pageAnalysis) {
  try {
    // Use BLACKBOX to generate agent-specific actions based on persona and persona
    const actions = await generatePersonaActions(agent.name, pageAnalysis.type);

    console.log(`🤖 Agent ${agent.name} (${agent.persona}) detected: ${pageAnalysis.type} (confidence: ${(pageAnalysis.confidence * 100).toFixed(1)}%)`);
    console.log(`🎯 Generated agent actions: ${actions.join(', ')}`);

    // Customize priorities based on agent persona
    let priorities = {};
    switch (agent.name) {
      case 'new user':
        priorities = { scroll: 0.4, click: 0.3, read: 0.2, wait: 0.1 };
        break;
      case 'power user':
        priorities = { click: 0.4, search: 0.3, fill_form: 0.2, scroll: 0.1 };
        break;
      case 'admin':
        priorities = { click: 0.5, fill_form: 0.3, search: 0.2 };
        break;
      case 'error tester':
        priorities = { fill_form: 0.4, search: 0.3, click: 0.3 };
        break;
      default:
        priorities = { scroll: 0.3, click: 0.3, read: 0.2, wait: 0.2 };
    }

    return {
      actions: actions,
      priorities: priorities
    };
  } catch (error) {
    console.log(`⚠️  Agent ${agent.name} strategy generation failed, falling back to basic actions ${error}`);
    return {
      actions: ['scroll', 'click', 'read', 'wait'],
      priorities: { scroll: 0.3, click: 0.3, read: 0.2, wait: 0.2 }
    };
  }
}

// AI-powered element selection
async function selectAIElements(page, strategy) {
  const elements = [];
  
  try {
    // Select elements based on AI strategy
    if (strategy.actions.includes('click_products')) {
      const products = await page.$$('[data-product], .product, .item, [class*="product"], [class*="item"]');
      elements.push(...products);
    }
    
    if (strategy.actions.includes('click_cta')) {
      const ctas = await page.$$('[class*="cta"], [class*="button"], .btn-primary, .btn-cta');
      elements.push(...ctas);
    }
    
    if (strategy.actions.includes('click_articles')) {
      const articles = await page.$$('article, .article, .post, .news-item');
      elements.push(...articles);
    }
    
    // Fallback to general elements
    if (elements.length === 0) {
      const general = await page.$$('a, button, [role="button"], input[type="submit"]');
      elements.push(...general);
    }
    
    return elements;
  } catch (error) {
    // Fallback to basic element selection
    return await page.$$('a, button, [role="button"]');
  }
}

// Simulate AI-powered user interactions
async function simulateAgentInteraction(page, agentIndex, agent, pageAnalysis) {
  const agentResults = {
    agentIndex,
    agentName: agent.name,
    agentPersona: agent.persona,
    pageLoadTime: 0,
    consoleErrors: [],
    pageErrors: [],
    networkErrors: [],
    responseErrors: [],
    requests: 0,
    actions: [],
    aiAnalysis: pageAnalysis,
    performanceMetrics: {},
    errorScreenshots: [],
    modelUsed: 'blackboxai/openai/gpt-4', // Default model
    costEstimate: 0
  };

  try {
    // Set up comprehensive error monitoring
    await setupErrorMonitoring(page, agentIndex, agentResults);

    // Measure page load time
    const loadStart = Date.now();
    console.log(`🌐 Navigating to: ${options.url}`);
    const response = await page.goto(options.url, { waitUntil: 'networkidle' });
    agentResults.pageLoadTime = Date.now() - loadStart;

    console.log(`📄 Page navigation response:`, {
      status: response ? response.status() : 'No response',
      url: page.url(),
      title: await page.title()
    });

    agentResults.actions.push('Page loaded');

    // Capture performance metrics
    const performance = await page.evaluate(() => {
      const perf = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart,
        loadComplete: perf.loadEventEnd - perf.loadEventStart,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
        largestContentfulPaint: performance.getEntriesByName('largest-contentful-paint')[0]?.startTime || 0
      };
    });
    agentResults.performanceMetrics = performance;

    // Use provided page analysis and generate agent-specific strategy
    if (options.aiEnabled !== false) {
      const strategy = await getAgentInteractionStrategy(page, agent, pageAnalysis);
      agentResults.actions.push(`Agent strategy (${agent.name}): ${strategy.actions.join(', ')}`);
    }

    // Listen for network requests
    page.on('request', () => {
      agentResults.requests++;
    });

    // Get page dimensions
    const dimensions = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight
    }));

    // Agent-powered interaction loop
    while (Date.now() < endTime) {
      let action;

      if (pageAnalysis && pageAnalysis.confidence > 0.6) {
        // Use agent-specific strategy for high-confidence analysis
        const strategy = await getAgentInteractionStrategy(page, agent, pageAnalysis);
        const actions = strategy.actions;
        const priorities = strategy.priorities;

        // Weighted random selection based on agent priorities
        const rand = Math.random();
        let cumulative = 0;
        for (const [actionType, priority] of Object.entries(priorities)) {
          cumulative += priority;
          if (rand <= cumulative) {
            action = actionType;
            break;
          }
        }
      } else {
        // Fallback to random actions
        action = getRandomInt(1, 4);
      }
      
      switch (action) {
        case 1:
        case 'scroll':
          const scrollY = getRandomInt(0, Math.max(0, dimensions.height - 800));
          await page.evaluate(y => window.scrollTo(0, y), scrollY);
          agentResults.actions.push(`Agent (${agent.name})-scrolled to ${scrollY}px`);
          break;

        case 2:
        case 'click':
        case 'click_products':
        case 'click_cta':
        case 'click_articles':
          try {
            const elements = await selectAIElements(page, pageAnalysis ?
              await getAgentInteractionStrategy(page, agent, pageAnalysis) : null);

            if (elements.length > 0) {
              const randomElement = elements[getRandomInt(0, elements.length - 1)];
              const isVisible = await randomElement.isVisible();
              if (isVisible) {
                await randomElement.click();
                agentResults.actions.push(`Agent (${agent.name})-clicked: ${action}`);
                await sleep(2000);
              }
            }
          } catch (error) {
            // Log element interaction errors
            const errorData = await logError(page, agentIndex, error, `Element interaction: ${action}`);
            if (errorData.screenshot) {
              agentResults.errorScreenshots.push(errorData);
            }
          }
          break;

        case 3:
        case 'read':
        case 'read_content':
        case 'read_headlines':
          // Simulate reading behavior
          const readTime = getRandomInt(2000, 8000);
          await sleep(readTime);
          agentResults.actions.push(`Agent (${agent.name})-read for ${readTime}ms`);
          break;

        case 4:
        case 'wait':
          const waitTime = getRandomDelay();
          await sleep(waitTime);
          agentResults.actions.push(`Agent (${agent.name})-waited ${waitTime}ms`);
          break;

        case 'search':
          try {
            const searchBox = await page.$('input[type="search"], input[name*="search"], .search-input');
            if (searchBox) {
              await searchBox.fill(`${agent.name} test query`);
              await searchBox.press('Enter');
              agentResults.actions.push(`Agent (${agent.name})-searched`);
              await sleep(3000);
            }
          } catch (error) {
            const errorData = await logError(page, agentIndex, error, 'Search interaction');
            if (errorData.screenshot) {
              agentResults.errorScreenshots.push(errorData);
            }
          }
          break;

        case 'fill_form':
        case 'fill_fields':
          try {
            const inputs = await page.$$('input[type="text"], input[type="email"], textarea');
            if (inputs.length > 0) {
              const randomInput = inputs[getRandomInt(0, inputs.length - 1)];
              await randomInput.fill(`${agent.name} test data`);
              agentResults.actions.push(`Agent (${agent.name})-filled form field`);
            }
          } catch (error) {
            const errorData = await logError(page, agentIndex, error, 'Form filling');
            if (errorData.screenshot) {
              agentResults.errorScreenshots.push(errorData);
            }
          }
          break;
      }

      // Small delay between actions
      await sleep(getRandomInt(500, 2000));
    }

  } catch (error) {
    const errorData = await logError(page, agentIndex, error, 'General simulation error');
    if (errorData.screenshot) {
      agentResults.errorScreenshots.push(errorData);
    }
    agentResults.actions.push(`Error: ${error.message}`);
  }

  return agentResults;
}


async function generateAgent(content, number) {
  const data = {
    model: 'blackboxai/openai/gpt-4',
    messages: [{
      role: 'user',
      content: `Generate a list of ${number} agents with random realistic names and personas to test the webpage described by: ${content}.
        Use these persona ratios:
        - ~45% main target for the website (most relevant personas),
        - ~30% other persona with focus on forms or any other interactions,
        - ~25% random users/testers/others to examine.

        Output one agent per line in this exact format:
        {AgentName}-{Persona}

        Example:
        Bob Bobb-shopper
        Christiano Ronaldo-tester
        Elon Musk-admin`
    }]
  }
  let agents = [];
  const response = await callBlackboxApi("", data);
  console.log('\n@@@\nresponse: ', response);
  console.log('\n@@@@@\nmsg: ', response.choices[0].message.content);
  if (response.choices && response.choices.length > 0) {
    response.choices[0].message.content.split('\n').forEach((tuple) => {
      const agent = tuple.split('-');
      agents.push(new BaseAgent(
        agent[0],
        agent[1]
      ));
    });
    console.log(agents);
    return agents;
  }
}

// Main test execution
async function runLoadTest() {
  console.log('🌩️  StormBot - AI-Powered Load Testing with Multi-Agent Architecture');
  console.log('=====================================================================');
  console.log(`Target URL: ${options.url}`);
  console.log(`Agents: ${options.users}`);
  console.log(`Duration: ${options.duration} seconds`);
  console.log(`AI Enabled: ${options.aiEnabled !== false ? 'Yes' : 'No'}`);
  console.log(`Report Directory: ${createReportDirectory()}`);
  console.log('🤖 Using BLACKBOX AI for all AI tasks');
  console.log('Starting test...\n');

  startTime = Date.now();
  endTime = startTime + (parseInt(options.duration) * 1000);

  const browsers = [];
  const agentPromises = [];

  // Define agent personas
  // const agentPersonas = [
  //   { name: 'new user', persona: 'explore basic features' },
  //   { name: 'power user', persona: 'perform advanced tasks' },
  //   { name: 'admin', persona: 'manage system settings' },
  //   { name: 'error tester', persona: 'trigger error scenarios' }
  // ];

  try {
    // Initial page analysis agent
    const browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    browsers.push(browser);
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('🔍 Running initial page analysis agent...');

    // Navigate to the target URL first
    console.log(`🌐 Initial analysis: Navigating to ${options.url}`);
    const navResponse = await page.goto(options.url, { waitUntil: 'networkidle', timeout: 30000 });
    console.log(`📄 Initial navigation response:`, {
      status: navResponse ? navResponse.status() : 'No response',
      url: page.url(),
      title: await page.title()
    });

    const pageAnalysis = await analyzePageContent(page);
    console.log(`Initial page analysis result: ${JSON.stringify(pageAnalysis)}`);

    // Close initial analysis browser
    await browser.close();
    browsers.pop();

    const agents = await generateAgent(pageAnalysis.type, options.users);
    
    for (let i = 0; i < options.users; i++) {
      const browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      browsers.push(browser);

      const context = await browser.newContext();
      const page = await context.newPage();

      // Start agent simulation with persona and persona
      const agentPromise = simulateAgentInteraction(page, i + 1, agents[i], pageAnalysis);
      agentPromises.push(agentPromise);
    }

    // Wait for all agents to complete
    const results = await Promise.all(agentPromises);
    testResults = results;

  } catch (error) {
    console.error('❌ Error during test execution:', error.message);
  } finally {
    // Close all browsers
    for (const browser of browsers) {
      await browser.close();
    }
  }
}

// Generate detailed error report
function generateErrorReport() {
  const allErrors = {
    consoleErrors: [],
    pageErrors: [],
    networkErrors: [],
    responseErrors: [],
    errorScreenshots: []
  };

  testResults.forEach(result => {
    allErrors.consoleErrors.push(...result.consoleErrors);
    allErrors.pageErrors.push(...result.pageErrors);
    allErrors.networkErrors.push(...result.networkErrors);
    allErrors.responseErrors.push(...result.responseErrors);
    allErrors.errorScreenshots.push(...result.errorScreenshots);
  });

  const totalErrors = allErrors.consoleErrors.length + allErrors.pageErrors.length + 
                     allErrors.networkErrors.length + allErrors.responseErrors.length;

  // Only generate error report if there are actual errors
  if (totalErrors === 0) {
    return null;
  }

  const errorReport = {
    summary: {
      totalConsoleErrors: allErrors.consoleErrors.length,
      totalPageErrors: allErrors.pageErrors.length,
      totalNetworkErrors: allErrors.networkErrors.length,
      totalResponseErrors: allErrors.responseErrors.length,
      totalScreenshots: allErrors.errorScreenshots.length
    },
    details: allErrors
  };

  // Save detailed error report only if there are errors
  const errorReportPath = path.join(reportDir, 'error-report.json');
  fs.writeFileSync(errorReportPath, JSON.stringify(errorReport, null, 2));

  return errorReport;
}

// Generate agent-specific reports
function generateAgentReport() {
  console.log('\n🤖 Agent Performance Report');
  console.log('===========================');

  if (testResults.length === 0) {
    console.log('No agent results available');
    return;
  }

  testResults.forEach((result, index) => {
    console.log(`\nAgent ${index + 1}: ${result.agentName} (${result.agentPersona})`);
    console.log(`  - Actions performed: ${result.actions.length}`);
    console.log(`  - Page load time: ${result.pageLoadTime}ms`);
    console.log(`  - Requests made: ${result.requests}`);
    console.log(`  - Errors: ${result.consoleErrors.length + result.pageErrors.length + result.networkErrors.length + result.responseErrors.length}`);

    if (result.aiAnalysis) {
      console.log(`  - Page type detected: ${result.aiAnalysis.type}`);
    }
  });

  // Save agent report
  const agentReport = {
    timestamp: new Date().toISOString(),
    agents: testResults.map(result => ({
      name: result.agentName,
      persona: result.agentPersona,
      actions: result.actions.length,
      loadTime: result.pageLoadTime,
      requests: result.requests,
      errors: result.consoleErrors.length + result.pageErrors.length + result.networkErrors.length + result.responseErrors.length,
      pageType: result.aiAnalysis ? result.aiAnalysis.type : 'unknown'
    }))
  };

  const agentReportPath = path.join(reportDir, 'agent-report.json');
  fs.writeFileSync(agentReportPath, JSON.stringify(agentReport, null, 2));
  console.log(`\n📄 Agent report saved: ${agentReportPath}`);
}

// Generate and display report
function generateReport() {
  const totalDuration = Date.now() - startTime;
  const totalRequests = testResults.reduce((sum, result) => sum + result.requests, 0);
  const totalErrors = testResults.reduce((sum, result) => 
    sum + result.consoleErrors.length + result.pageErrors.length + 
    result.networkErrors.length + result.responseErrors.length, 0);
  const avgLoadTime = testResults.reduce((sum, result) => sum + result.pageLoadTime, 0) / testResults.length;

  // Generate detailed error report
  const errorReport = generateErrorReport();

  console.log('\n📊 Test Results Summary');
  console.log('======================');
  console.log(`Total Duration: ${(totalDuration / 1000).toFixed(2)} seconds`);
  console.log(`Total Requests: ${totalRequests}`);
  console.log(`Total Errors: ${totalErrors}`);
  console.log(`  - Console Errors: ${errorReport ? errorReport.summary.totalConsoleErrors : 0}`);
  console.log(`  - Page Errors: ${errorReport ? errorReport.summary.totalPageErrors : 0}`);
  console.log(`  - Network Errors: ${errorReport ? errorReport.summary.totalNetworkErrors : 0}`);
  console.log(`  - Response Errors: ${errorReport ? errorReport.summary.totalResponseErrors : 0}`);
  console.log(`  - Error Screenshots: ${errorReport ? errorReport.summary.totalScreenshots : 0}`);
  console.log(`Average Page Load Time: ${avgLoadTime.toFixed(2)}ms`);
  console.log(`Successful Users: ${testResults.filter(r => r.actions.length > 0).length}/${testResults.length}`);

  // AI Analysis Summary
  if (options.aiEnabled !== false) {
    const aiAnalyses = testResults.filter(r => r.aiAnalysis).map(r => r.aiAnalysis);
    if (aiAnalyses.length > 0) {
      const pageTypes = {};
      aiAnalyses.forEach(analysis => {
        pageTypes[analysis.type] = (pageTypes[analysis.type] || 0) + 1;
      });
      
      console.log('\n🤖 AI Analysis Summary:');
      console.log('======================');
      Object.entries(pageTypes).forEach(([type, count]) => {
        const percentage = ((count / aiAnalyses.length) * 100).toFixed(1);
        console.log(`${type}: ${count} users (${percentage}%)`);
      });
    }
  }

  // Performance Insights
  console.log('\n💡 Performance Insights:');
  console.log('=======================');
  if (avgLoadTime > 3000) {
    console.log('⚠️  Average page load time is high (>3s)');
  } else if (avgLoadTime < 1000) {
    console.log('✅ Page load times are excellent');
  } else {
    console.log('✅ Page load times are acceptable');
  }

  if (totalErrors > 0) {
    console.log(`⚠️  ${totalErrors} errors detected - check detailed report`);
  } else {
    console.log('✅ No errors detected');
  }

  const requestsPerSecond = totalRequests / (totalDuration / 1000);
  console.log(`📊 Average requests per second: ${requestsPerSecond.toFixed(2)}`);
  
  if (options.aiEnabled !== false) {
    console.log('🤖 AI-powered interactions provided intelligent user simulation');
  }

  // Report file locations
  console.log('\n📁 Detailed Reports Generated:');
  console.log('==============================');
  
  // Always show the main test results file
  console.log(`📊 Full Test Data: ${path.join(reportDir, 'test-results.json')}`);
  
  // Only show error-related files if there are actual errors
  if (errorReport) {
    console.log(`📄 Error Report: ${path.join(reportDir, 'error-report.json')}`);
    console.log(`📸 Error Screenshots: ${reportDir}/`);
  } else {
    console.log('✅ No errors detected - no error reports generated');
  }

  // Save complete test results
  const completeResults = {
    testInfo: {
      url: options.url,
      users: options.users,
      duration: options.duration,
      aiEnabled: options.aiEnabled !== false,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(Date.now()).toISOString()
    },
    summary: {
      totalDuration: totalDuration,
      totalRequests: totalRequests,
      totalErrors: totalErrors,
      avgLoadTime: avgLoadTime,
      successfulUsers: testResults.filter(r => r.actions.length > 0).length
    },
    results: testResults
  };

  const resultsPath = path.join(reportDir, 'test-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(completeResults, null, 2));

  // Show critical errors if any
  if (errorReport && (errorReport.summary.totalPageErrors > 0 || errorReport.summary.totalResponseErrors > 0)) {
    console.log('\n🚨 Critical Issues Detected:');
    console.log('============================');
    
    if (errorReport.summary.totalPageErrors > 0) {
      console.log('\n📄 Page Errors:');
      errorReport.details.pageErrors.slice(0, 3).forEach(error => {
        console.log(`  - ${error.message} (${error.timestamp})`);
      });
    }
    
    if (errorReport.summary.totalResponseErrors > 0) {
      console.log('\n🌐 Response Errors:');
      errorReport.details.responseErrors.slice(0, 3).forEach(error => {
        console.log(`  - ${error.status} ${error.statusText}: ${error.url} (${error.timestamp})`);
      });
    }
    
    console.log(`\n📋 View complete error details in: ${path.join(reportDir, 'error-report.json')}`);
  }
}

// Main execution
async function main() {

  // Check BLACKBOX API key
  const apiKey = BLACKBOX_API_KEY;
  if (!apiKey) {
    console.log('⚠️  BLACKBOX_API_KEY environment variable is not set');
    console.log('   AI features will fall back to basic interactions');
  } else {
    console.log('✅ BLACKBOX_API_KEY is set (length:', apiKey.length + ')');
  }

  try {
    await runLoadTest();
    await generateAgentReport();
    generateReport();
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the application
if (require.main === module) {
  main();
} 
