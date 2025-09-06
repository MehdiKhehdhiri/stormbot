# StormBot Refactor to BLACKBOX.AI

## Tasks
- [x] Create blackbox.js helper module with classifyPage, generatePersonaActions, summarizeError functions
- [x] Update stormbot.js to import blackbox.js functions
- [x] Replace Hugging Face classification in analyzePageContent with classifyPage from blackbox.js
- [x] Replace static AI interaction strategies with generatePersonaActions from blackbox.js
- [x] Add AI-powered error reporting using summarizeError in error handling
- [x] Ensure all BLACKBOX calls use process.env.BLACKBOX_API_KEY
- [ ] Test the refactored code for functionality
