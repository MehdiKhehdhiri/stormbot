# Use official Node.js LTS image
FROM node:18-bullseye

# Install dependencies for Playwright browsers
RUN apt-get update && apt-get install -y \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libpango-1.0-0 \
    libgtk-3-0 \
    libxss1 \
    libxcb-dri3-0 \
    libdrm2 \
    libxshmfence1 \
    ca-certificates \
    fonts-liberation \
    wget \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (if exists)
COPY package*.json ./

# Install node dependencies
RUN npm install

# Install Playwright browsers (chromium)
RUN npx playwright install chromium

COPY . .

# Note: Application code will be mounted via volume at runtime to avoid rebuilding on changes
# Expose any ports if needed (StormBot is CLI, so usually none)

# Default command to run StormBot CLI (can be overridden)
CMD ["node", "stormbot.js"]
