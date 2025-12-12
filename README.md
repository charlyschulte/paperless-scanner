# Paperless Scanner

A web-based scanner bridge for Paperless-ngx that provides a simple interface to scan documents and automatically upload them to your Paperless-ngx instance.

## Features

- 📄 **Web-based scanning interface** - Simple, clean UI to trigger scans
- ⚙️ **Persistent settings** - Configure and save your Paperless-ngx connection settings
- 🔧 **Connection testing** - Test your Paperless-ngx connection before scanning
- 📜 **Real-time logging** - Live updates of scan and upload progress
- 🏷️ **Configurable tags** - Set default tags for scanned documents
- 📱 **Mobile-friendly** - Responsive design works on all devices

## Setup

### Prerequisites

- [Bun](https://bun.sh/) runtime installed
- A scanner compatible with `scanimage` (SANE)
- A running Paperless-ngx instance

### Installation

1. Clone or download this project
2. Install dependencies:
   ```bash
   bun install
   ```

3. Start the application:
   ```bash
   bun run index.ts
   ```

4. Open your browser and go to `http://localhost:3000`

### Configuration

1. Click on **Settings** in the navigation
2. Configure your Paperless-ngx connection:
   - **API URL**: The base URL of your Paperless-ngx instance (e.g., `http://192.168.1.100:8000`)
   - **API Token**: Your Paperless-ngx API token (get this from your profile page)
   - **Scan Output Directory**: Temporary directory for scanned files (default: `/tmp`)
   - **Scan Resolution**: DPI setting for scanning (150, 300, or 600)
   - **Default Tags**: Tags automatically applied to scanned documents

3. Click **Test Connection** to verify your settings
4. Click **Save Settings** to persist your configuration

## Usage

1. Make sure your scanner is connected and powered on
2. Go to the main interface (`http://localhost:3000`)
3. Click **Start Scan** to scan a document
4. Watch the real-time log for progress updates
5. The document will be automatically uploaded to Paperless-ngx after scanning

## API Endpoints

The application provides a REST API:

- `GET /` - Main scanner interface
- `GET /settings` - Settings page
- `GET /api/settings` - Get current settings (JSON)
- `POST /api/settings` - Update settings (JSON)
- `POST /api/settings/reset` - Reset settings to defaults
- `POST /scan` - Trigger a scan
- `POST /test-connection` - Test Paperless-ngx connection
- `GET /logs` - Server-sent events for real-time logs

## File Structure

```
paperless-scanner/
├── index.ts              # Main application server
├── settings.ts           # Settings management
├── paperless-api.ts      # Paperless-ngx API client
├── templates/
│   ├── index.html        # Main scanner interface
│   └── settings.html     # Settings page
├── config.json           # Persistent settings (created automatically)
├── package.json
├── tsconfig.json
└── README.md
```

## Configuration File

Settings are automatically saved to `config.json` in the project directory. This file is created automatically when you first save settings through the web interface.

Example `config.json`:
```json
{
  "paperlessApiUrl": "http://192.168.1.100:8000",
  "paperlessApiToken": "your-api-token-here",
  "scanOutputDir": "/tmp",
  "scanResolution": 300,
  "defaultTags": ["scanned", "automated"]
}
```

## Troubleshooting

### Scanner Issues
- Ensure `scanimage` is installed and your scanner is detected: `scanimage -L`
- Check scanner permissions and connectivity
- Try different resolution settings if scans fail

### Paperless-ngx Connection Issues
- Verify the API URL is correct and accessible
- Check that the API token is valid
- Ensure Paperless-ngx is running and reachable from the scanner machine
- Check firewall settings if connecting to a remote Paperless-ngx instance

### File Permission Issues
- Ensure the scan output directory is writable
- Check that the application has permission to create and delete files in the scan directory

## Development

The application uses:
- **Bun** as the runtime and HTTP server
- **TypeScript** for type safety
- **Server-sent events** for real-time logging
- **JSON** for persistent settings storage
- **Modern web APIs** for the frontend

To modify the interface:
- Edit `templates/index.html` for the main scanner page
- Edit `templates/settings.html` for the settings page
- Modify `settings.ts` to add new configuration options
- Update `paperless-api.ts` for Paperless-ngx integration changes

## License

This project is provided as-is for personal use. Modify and distribute as needed.

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts

## Docker

### Build locally

Build from the repository root:
```bash
docker build -t paperless-scanner:local .
```

Run with the scan output and template directories mounted and give the container access to USB devices for scanners:
```bash
docker run --rm -it \
   -p 3000:3000 \
   --device /dev/bus/usb:/dev/bus/usb \
   -v $(pwd)/scans:/tmp \
   -v $(pwd)/config.json:/usr/src/app/config.json:ro \
   -v $(pwd)/templates:/usr/src/app/templates:ro \
   --privileged \
   paperless-scanner:local
```

Alternatively, use the included `docker-compose.yml` during development:
```bash
docker-compose up --build
```

### GitHub Actions and Docker Hub

This repository contains a GitHub Actions workflow at `.github/workflows/docker-publish.yml` that builds and publishes a Docker image to Docker Hub (tags: `latest` and commit SHA) when a push occurs to the `main` or `master` branches.

To enable publishing, create the following secrets in your GitHub repository settings:
- `DOCKERHUB_USERNAME` - Docker Hub username
- `DOCKERHUB_ACCESS_TOKEN` - A Docker Hub access token (or password). Personal access tokens are recommended.

The workflow uses `docker/login-action` to authenticate and `docker/build-push-action` to build and push the container image.

### Publish manually to Docker Hub

You can also build and push an image from your local machine using Docker CLI:

```bash
# Build the image (replace USERNAME accordingly)
docker build -t yourusername/paperless-scanner:latest .

# Log in to Docker Hub
docker login --username yourusername

# Push the image
docker push yourusername/paperless-scanner:latest
```


```

This project was created using `bun init` in bun v1.2.13. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
