# StormBot

AI-powered load testing tool using Playwright.

## Setup

1. Create a `.env` file in the project root with the following content:

```
API_KEY=your_api_key_here
```

Replace `your_api_key_here` with your actual API key.

2. Install dependencies:

```bash
npm install
```

## Running the Project

You can run the project using Node.js:

```bash
node stormbot.js --url https://example.com --users 5 --duration 60 --ai-enabled
```

Options:

- `--url`: Target website URL (required)
- `--users`: Number of simulated users (default: 5)
- `--duration`: Test duration in seconds (default: 60)
- `--ai-enabled`: Enable AI-powered interactions (default: true)
- `--report-dir`: Directory to save detailed reports (default: ./stormbot-reports)

## Development with Docker

To avoid rebuilding the Docker image every time you change `stormbot.js`, you can run the container with a volume mount that mounts your local source code into the container. This way, changes to your local files are immediately reflected inside the container.

### Build the Docker image (only needed once or when dependencies change)

```bash
docker build -t stormbot .
```

### Run the container with volume mount for development

```bash
docker run --rm -it -v $(pwd):/app stormbot --url https://example.com
```

This command mounts the current directory (`$(pwd)`) to `/app` inside the container, so any changes you make to `stormbot.js` or other files will be reflected immediately without rebuilding the image.

### Notes

- The Dockerfile installs all dependencies and sets up the environment.
- The application code is not copied into the image but mounted at runtime.
- This setup is ideal for development. For production, you may want to build a full image with the code copied in.

## Environment Variables

- `API_KEY`: Your API key for BLACKBOX AI services. The application reads this from the `.env` file.

## Running Example

```bash
node stormbot.js --url https://42.fr --users 1 --duration 3
