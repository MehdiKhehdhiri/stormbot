const https = require('https');

const API_HOST = 'api.blackbox.ai';
const API_PATH_CHAT_COMPLETIONS = '/chat/completions';

const BLACKBOX_API_KEY="API_KEY_HERE";
const url = 'https://api.blackbox.ai/chat/completions';

function callBlackboxApi(path, data) {
  return new Promise((resolve, reject) => {
    const apiKey = BLACKBOX_API_KEY;
    if (!apiKey) {
      console.log('❌ BLACKBOX_API_KEY is not set in environment variables');
      return reject(new Error('BLACKBOX_API_KEY is not set in environment variables'));
    }

    const postData = JSON.stringify(data);

    const options = {
      hostname: API_HOST,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
     //   'Content-Length': Buffer.byteLength(postData)
      },
      body: postData
    };

    console.log(`🔗 Calling BLACKBOX API: ${API_HOST}${path}`);
    console.log(`📤 Request data:`, JSON.stringify(data, null, 2));

    fetch(url, {
      ...options
    })
      .then(response => response.json())
      .then(result => console.log(result, '\n\nmsg: ', result.choices[0].message))
      .catch(error => console.error('Error: ', error));

    // const req = https.request(options, (res) => {
    //   let responseData = '';

    //   console.log(`📥 Response status: ${res.statusCode}`);

    //   res.on('data', (chunk) => {
    //     responseData += chunk;
    //   });

    //   res.on('end', () => {
    //     console.log(`📄 Raw response:`, responseData);
    //     try {
    //       const parsed = JSON.parse(responseData);
    //       if (res.statusCode >= 200 && res.statusCode < 300) {
    //         console.log('✅ BLACKBOX API call successful');
    //         resolve(parsed);
    //       } else {
    //         console.log('❌ BLACKBOX API error response:', parsed);
    //         reject(new Error(parsed.error || `BLACKBOX API error: ${res.statusCode}`));
    //       }
    //     } catch (err) {
    //       console.log('❌ Failed to parse BLACKBOX API response:', err.message);
    //       reject(new Error('Failed to parse BLACKBOX API response: ' + err.message));
    //     }
    //   });
    // });

    // req.on('error', (err) => {
    //   console.log('❌ BLACKBOX API network error:', err.message);
    //   reject(err);
    // });

    // // req.write(postData);
    // req.end();
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
  summarizeError
};
