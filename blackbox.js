const https = require('https');

const API_HOST = 'api.blackbox.ai';
const API_PATH_CHAT_COMPLETIONS = '/chat/completions';

const apiKey = process.env.API_KEY;

const url = 'https://api.blackbox.ai/chat/completions';

function callBlackboxApi(path, data) {
  return new Promise((resolve, reject) => {
    if (!apiKey) {
      console.log('❌ BLACKBOX_API_KEY is not set in environment variables');
      return reject(new Error('BLACKBOX_API_KEY is not set in environment variables'));
    }

    const postData = JSON.stringify(data);

    console.log(`🔗 Calling BLACKBOX API: ${API_HOST}${path}`);
    console.log(`📤 Request data:`, JSON.stringify(data, null, 2));

    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: postData
    })
      .then(response => {
        console.log(`📥 Response status: ${response.status}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(result => {
        console.log('✅ BLACKBOX API call successful');
        console.log('📄 Response:', JSON.stringify(result, null, 2));
        if (result.choices && result.choices.length > 0) {
          console.log('msg:', result.choices[0].message);
        }
        resolve(result);
      })
      .catch(error => {
        console.log('❌ BLACKBOX API error:', error.message);
        reject(error);
      });
  });
}

/**
 * Use chat completions endpoint to simulate classifyPage, generatePersonaActions, and summarizeError.
 */

async function callChatCompletion(messages) {
  const data = {
    model: 'blackboxai/openai/gpt-4',
    messages: messages
  };
  const response = await callBlackboxApi(API_PATH_CHAT_COMPLETIONS, data);
  if (response.choices && response.choices.length > 0) {
    return response.choices[0].message.content;
  }
  return null;
}

async function classifyPage(content) {
  const prompt = `Classify the following page content into one of the following types (but not limited to): login page, CV page, portfolio page, product page, article page, checkout page, dashboard, landing page, search engine homepage, blog, forum, or other relevant category. Provide the best fitting classification based on the page's primary purpose and content. Content:${content}`;
  const messages = [{ role: 'user', content: prompt }];
  const result = await callChatCompletion(messages);
  return result ? result.trim().toLowerCase() : 'other';
}

async function generatePersonaActions(role, pageType) {
  const prompt = `You are simulating a ${role}. Given the page type: ${pageType}, generate 3 realistic user actions as a JSON array of strings.`;
  const messages = [{ role: 'user', content: prompt }];
  const result = await callChatCompletion(messages);
  try {
    return JSON.parse(result);
  } catch {
    return [];
  }
}

async function summarizeError(errorContext) {
  const prompt = `Summarize the following error context into a human-readable summary:\n${JSON.stringify(errorContext, null, 2)}`;
  const messages = [{ role: 'user', content: prompt }];
  const result = await callChatCompletion(messages);
  return result || 'No summary available';
}

module.exports = {
  classifyPage,
  generatePersonaActions,
  summarizeError,
  callBlackboxApi
};
