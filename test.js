const { https } = require('https');

const url = 'https://api.blackbox.ai/chat/completions';
const API_KEY="sk-koWMbDA1TzWYzMa7NIQN_Q"

const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`
};

const data = {
    model: 'blackboxai/openai/gpt-4',
    messages: [
        {
            role: 'user',
            content: 'Say hi'
        }
    ]
};

fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(data)
}).then(response => response.json())
    .then(result => console.log(result))//.choices[0].message))
    .catch(error => console.error('Eererer: ', error));

