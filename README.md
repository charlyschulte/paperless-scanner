# Paperless Scanner

A lightweight web-based scanner bridge for Paperless-ngx — runs as a Docker container.

## Features

- 📄 Web-based scanning interface to trigger scans
- ⚙️ Persistent settings (saved to `config.json`)
 - ⚙️ Persistent settings (saved to `config/config.json`)
- 🔧 Connection testing to verify Paperless-ngx access
- 📜 Real-time logs (server-sent events)
- 🏷️ Configurable default tags for uploads
- 📱 Mobile-friendly UI

## Quick start

```bash
docker pull fakeridoo/paperless-scanner:latest
```

### Run (example)

```bash
docker run --rm -it \
   -p 3000:3000 \
   --device /dev/bus/usb:/dev/bus/usb \
   -v $(pwd)/scans:/tmp \
   -v $(pwd)/config:/usr/src/app/config:rw \
   --privileged \
   fakeridoo/paperless-scanner:latest
```

Note: The template HTML files are baked into the Docker image at `/usr/share/paperless-scanner/templates` and are used by the application at runtime. Avoid mounting an external `templates` folder over `/usr/src/app` because that can mask the files from the image. If you're developing with a host bind mounting the project into `/usr/src/app`, make sure the host copy includes `templates/` or omit the bind mount so the container uses the built-in templates.

## Docker Compose (example)

```yaml
version: '3.8'
services:
   scanner:
      image: fakeridoo/paperless-scanner:latest
      container_name: paperless-scanner
      ports:
         - "3000:3000"
      volumes:
         - ./scans:/tmp
         - ./config:/usr/src/app/config:rw
      devices:
         - "/dev/bus/usb:/dev/bus/usb"
      network_mode: host
      restart: unless-stopped
      privileged: true
