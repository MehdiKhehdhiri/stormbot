
# StormBot

AI-powered load testing tool using Playwright.

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
