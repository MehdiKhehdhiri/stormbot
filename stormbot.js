#!/usr/bin/env node

const { chromium } = require('playwright');
const { program } = require('commander');
const https = require('https');

// Configuration and data structures
let testResults = [];
let startTime;
let endTime;

// AI Model Configuration (using Hugging Face's free inference API)
const AI_CONFIG = {
  // Using a free text classification model for content analysis
  modelUrl: 'https://api-inference.huggingface.co/models/facebook/bart-large-mnli',
  // Alternative free models we can use:
  // - 'microsoft/DialoGPT-medium' for conversation
  // - 'distilbert-base-uncased' for text classification
  // - 'gpt2' for text generation
  headers: {
    'Content-Type': 'application/json',
  }
};

// Parse command line arguments
program
  .name('stormbot')
  .description('AI-powered load testing tool using Playwright')
  .version('1.0.0')
  .requiredOption('--url <url>', 'Target website URL')
  .option('--users <number>', 'Number of simulated users', '5')
  .option('--duration <seconds>', 'Test duration in seconds', '60')
  .option('--ai-enabled', 'Enable AI-powered interactions', true)
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

// AI-powered content analysis
async function analyzePageContent(page) {
  try {
    // Extract page content for AI analysis
    const pageContent = await page.evaluate(() => {
      const text = document.body.innerText || '';
      const title = document.title || '';
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
        .map(h => h.textContent).join(' ');
      const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'))
        .map(el => el.textContent || el.getAttribute('aria-label') || '').join(' ');
      
      return {
        title,
        headings,
        buttons,
        text: text.substring(0, 1000) // Limit text length for API
      };
    });

    // Use free AI model to analyze content
    const analysis = await callAIModel(pageContent);
    return analysis;
  } catch (error) {
    console.log('⚠️  AI analysis failed, falling back to basic interactions');
    return { type: 'general', confidence: 0.5 };
  }
}

// Call free AI model (Hugging Face inference API)
async function callAIModel(content) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      inputs: `${content.title} ${content.headings} ${content.buttons}`,
      parameters: {
        candidate_labels: [
          'e-commerce', 'blog', 'news', 'social media', 
          'portfolio', 'landing page', 'dashboard', 'form'
        ]
      }
    });

    const options = {
      hostname: 'api-inference.huggingface.co',
      path: '/models/facebook/bart-large-mnli',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'StormBot-AI/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          resolve({
            type: result.labels[0],
            confidence: result.scores[0],
            raw: result
          });
        } catch (error) {
          resolve({ type: 'general', confidence: 0.5 });
        }
      });
    });

    req.on('error', (error) => {
      resolve({ type: 'general', confidence: 0.5 });
    });

    req.write(data);
    req.end();
  });
}

// AI-powered interaction strategy
async function getAIInteractionStrategy(page, analysis) {
  const strategies = {
    'e-commerce': {
      actions: ['scroll', 'click_products', 'search', 'add_to_cart'],
      priorities: { scroll: 0.3, click_products: 0.4, search: 0.2, add_to_cart: 0.1 }
    },
    'blog': {
      actions: ['scroll', 'read_content', 'click_links', 'share'],
      priorities: { scroll: 0.4, read_content: 0.3, click_links: 0.2, share: 0.1 }
    },
    'news': {
      actions: ['scroll', 'read_headlines', 'click_articles', 'search'],
      priorities: { scroll: 0.3, read_headlines: 0.3, click_articles: 0.3, search: 0.1 }
    },
    'social media': {
      actions: ['scroll', 'like', 'comment', 'share', 'follow'],
      priorities: { scroll: 0.4, like: 0.2, comment: 0.2, share: 0.1, follow: 0.1 }
    },
    'landing page': {
      actions: ['scroll', 'click_cta', 'fill_form', 'read_content'],
      priorities: { scroll: 0.3, click_cta: 0.3, fill_form: 0.2, read_content: 0.2 }
    },
    'dashboard': {
      actions: ['navigate', 'click_buttons', 'view_data', 'settings'],
      priorities: { navigate: 0.3, click_buttons: 0.3, view_data: 0.2, settings: 0.2 }
    },
    'form': {
      actions: ['fill_fields', 'submit', 'validation', 'reset'],
      priorities: { fill_fields: 0.4, submit: 0.3, validation: 0.2, reset: 0.1 }
    },
    'general': {
      actions: ['scroll', 'click', 'read', 'wait'],
      priorities: { scroll: 0.3, click: 0.3, read: 0.2, wait: 0.2 }
    }
  };

  const strategy = strategies[analysis.type] || strategies.general;
  console.log(`🤖 AI detected: ${analysis.type} (confidence: ${(analysis.confidence * 100).toFixed(1)}%)`);
  console.log(`🎯 Using strategy: ${strategy.actions.join(', ')}`);
  
  return strategy;
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
async function simulateUserInteraction(page, userIndex) {
  const userResults = {
    userIndex,
    pageLoadTime: 0,
    consoleErrors: [],
    requests: 0,
    actions: [],
    aiAnalysis: null
  };

  try {
    // Measure page load time
    const loadStart = Date.now();
    await page.goto(options.url, { waitUntil: 'networkidle' });
    userResults.pageLoadTime = Date.now() - loadStart;
    userResults.actions.push('Page loaded');

    // AI-powered content analysis
    if (options.aiEnabled !== false) {
      userResults.aiAnalysis = await analyzePageContent(page);
      const strategy = await getAIInteractionStrategy(page, userResults.aiAnalysis);
      userResults.actions.push(`AI strategy: ${strategy.actions.join(', ')}`);
    }

    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        userResults.consoleErrors.push({
          message: msg.text(),
          timestamp: Date.now()
        });
      }
    });

    // Listen for network requests
    page.on('request', () => {
      userResults.requests++;
    });

    // Get page dimensions
    const dimensions = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight
    }));

    // AI-powered interaction loop
    while (Date.now() < endTime) {
      let action;
      
      if (userResults.aiAnalysis && userResults.aiAnalysis.confidence > 0.6) {
        // Use AI strategy for high-confidence analysis
        const strategy = await getAIInteractionStrategy(page, userResults.aiAnalysis);
        const actions = strategy.actions;
        const priorities = strategy.priorities;
        
        // Weighted random selection based on AI priorities
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
          userResults.actions.push(`AI-scrolled to ${scrollY}px`);
          break;

        case 2:
        case 'click':
        case 'click_products':
        case 'click_cta':
        case 'click_articles':
          try {
            const elements = await selectAIElements(page, userResults.aiAnalysis ? 
              await getAIInteractionStrategy(page, userResults.aiAnalysis) : null);
            
            if (elements.length > 0) {
              const randomElement = elements[getRandomInt(0, elements.length - 1)];
              const isVisible = await randomElement.isVisible();
              if (isVisible) {
                await randomElement.click();
                userResults.actions.push(`AI-clicked: ${action}`);
                await sleep(2000);
              }
            }
          } catch (error) {
            // Element might not be clickable, continue
          }
          break;

        case 3:
        case 'read':
        case 'read_content':
        case 'read_headlines':
          // Simulate reading behavior
          const readTime = getRandomInt(2000, 8000);
          await sleep(readTime);
          userResults.actions.push(`AI-read for ${readTime}ms`);
          break;

        case 4:
        case 'wait':
          const waitTime = getRandomDelay();
          await sleep(waitTime);
          userResults.actions.push(`AI-waited ${waitTime}ms`);
          break;

        case 'search':
          try {
            const searchBox = await page.$('input[type="search"], input[name*="search"], .search-input');
            if (searchBox) {
              await searchBox.fill('test query');
              await searchBox.press('Enter');
              userResults.actions.push('AI-searched');
              await sleep(3000);
            }
          } catch (error) {
            // Search not available
          }
          break;

        case 'fill_form':
        case 'fill_fields':
          try {
            const inputs = await page.$$('input[type="text"], input[type="email"], textarea');
            if (inputs.length > 0) {
              const randomInput = inputs[getRandomInt(0, inputs.length - 1)];
              await randomInput.fill('test data');
              userResults.actions.push('AI-filled form field');
            }
          } catch (error) {
            // Form filling failed
          }
          break;
      }

      // Small delay between actions
      await sleep(getRandomInt(500, 2000));
    }

  } catch (error) {
    userResults.actions.push(`Error: ${error.message}`);
  }

  return userResults;
}

// Main test execution
async function runLoadTest() {
  console.log('🌩️  StormBot - AI-Powered Load Testing');
  console.log('=====================================');
  console.log(`Target URL: ${options.url}`);
  console.log(`Users: ${options.users}`);
  console.log(`Duration: ${options.duration} seconds`);
  console.log(`AI Enabled: ${options.aiEnabled !== false ? 'Yes' : 'No'}`);
  console.log('🤖 Using free AI model: Hugging Face BART-large-mnli');
  console.log('Starting test...\n');

  startTime = Date.now();
  endTime = startTime + (parseInt(options.duration) * 1000);

  const browsers = [];
  const userPromises = [];

  try {
    // Launch browsers for each user
    for (let i = 0; i < parseInt(options.users); i++) {
      const browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      browsers.push(browser);

      const context = await browser.newContext();
      const page = await context.newPage();

      // Start user simulation
      const userPromise = simulateUserInteraction(page, i + 1);
      userPromises.push(userPromise);
    }

    // Wait for all users to complete
    const results = await Promise.all(userPromises);
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

// Generate and display report
function generateReport() {
  const totalDuration = Date.now() - startTime;
  const totalRequests = testResults.reduce((sum, result) => sum + result.requests, 0);
  const totalErrors = testResults.reduce((sum, result) => sum + result.consoleErrors.length, 0);
  const avgLoadTime = testResults.reduce((sum, result) => sum + result.pageLoadTime, 0) / testResults.length;

  console.log('\n📊 Test Results Summary');
  console.log('======================');
  console.log(`Total Duration: ${(totalDuration / 1000).toFixed(2)} seconds`);
  console.log(`Total Requests: ${totalRequests}`);
  console.log(`Total Console Errors: ${totalErrors}`);
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

  console.log('\n📈 Per-User Breakdown:');
  console.log('=====================');
  testResults.forEach((result, index) => {
    console.log(`\nUser ${result.userIndex}:`);
    console.log(`  Page Load Time: ${result.pageLoadTime}ms`);
    console.log(`  Requests: ${result.requests}`);
    console.log(`  Console Errors: ${result.consoleErrors.length}`);
    console.log(`  Actions Performed: ${result.actions.length}`);
    
    if (result.aiAnalysis) {
      console.log(`  AI Detected: ${result.aiAnalysis.type} (${(result.aiAnalysis.confidence * 100).toFixed(1)}% confidence)`);
    }
    
    if (result.consoleErrors.length > 0) {
      console.log('  Errors:');
      result.consoleErrors.forEach(error => {
        console.log(`    - ${error.message}`);
      });
    }
  });

  // Performance insights
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
    console.log(`⚠️  ${totalErrors} console errors detected`);
  } else {
    console.log('✅ No console errors detected');
  }

  const requestsPerSecond = totalRequests / (totalDuration / 1000);
  console.log(`📊 Average requests per second: ${requestsPerSecond.toFixed(2)}`);
  
  if (options.aiEnabled !== false) {
    console.log('🤖 AI-powered interactions provided intelligent user simulation');
  }
}

// Main execution
async function main() {
  try {
    await runLoadTest();
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