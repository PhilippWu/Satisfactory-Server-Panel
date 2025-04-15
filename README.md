# Satisfactory Server Docker Setup

This project provides a complete Docker Compose setup for hosting a Satisfactory dedicated server with an easy-to-use web admin panel. It allows for simple management of savegames and blueprints.

## Features

- **Satisfactory Dedicated Server**: Run your own Satisfactory server using Docker
- **Web Admin Panel**: Custom administrative interface for server management
- **File Management**: Easy upload and management of savegames and blueprints
- **Resource Control**: Configurable memory limits for server performance

## Prerequisites

- Docker and Docker Compose
- 6GB+ RAM recommended for server operation
- Open UDP ports 7777, 15000, and 15777 on your firewall/router

## Quick Start

1. Clone this repository:
   ```bash
   git clone https://your-repository-url/satisfactory-server.git
   cd satisfactory-server
   ```

2. Start the server:
   ```bash
   docker-compose up -d
   ```

3. Access the admin panel:
   - URL: http://YOUR_SERVER_IP:3000
   - Default login:
     - Username: admin
     - Password: satisfactory

## Server Access

- **Satisfactory Server**: Connect via the game using port 7777 (UDP)
- **Admin Panel**: http://YOUR_SERVER_IP:3000

## File Management

### Savegames
Admin panel provides an interface for:
- Uploading savegames
- Switching between different saves
- Creating backups

Savegame files are stored in `./satisfactory-data/saved/SaveGames/`

### Blueprints
You can manage blueprints through the admin panel or by directly placing files in:
`./satisfactory-data/saved/Blueprints/`

## Configuration

### Server Configuration
Edit the `docker-compose.yml` file to modify:

- `MAXPLAYERS`: Maximum number of concurrent players (default: 4)
- `TZ`: Timezone setting (default: Europe/Berlin)
- `STEAMBETA`: Enable beta versions (default: false)
- Memory limits (default: 6GB limit, 4GB reservation)

### Admin Panel Security

**Important**: The default admin configuration is defined in the `.env` file (copy from `.env.example`):
```
PORT=3000
SESSION_SECRET=satisfactory-secret-change-this-in-production
DEFAULT_ADMIN_PASSWORD=satisfactory
```

**For production use, you should change these values.**

To set up your environment:
1. Copy the `.env.example` file to `.env` in the satisfactory-admin-panel directory
2. Modify the values to secure your installation
3. Restart the admin panel container to apply changes

## Project Structure

```
├── docker-compose.yml       # Docker Compose configuration
├── satisfactory-admin-panel/
│   ├── Dockerfile          # Admin panel Docker configuration
│   ├── package.json        # Node.js dependencies
│   ├── src/                # Server source code
│   └── public/             # Web assets
└── satisfactory-data/      # Game data (mounted into container)
    ├── saved/              # Savegames and blueprints
    ├── logs/               # Server logs
    └── backups/            # Automated backups
```

## Maintenance

### Backups
Regular backups are stored in the `./satisfactory-data/backups/` directory.

### Updates
To update the server:

```bash
docker-compose pull
docker-compose up -d
```

## Troubleshooting

Common issues:

1. **Server not visible in-game**
   - Verify UDP ports 7777, 15000, and 15777 are properly forwarded
   - Check server logs: `docker-compose logs satisfactory-server`

2. **Performance issues**
   - Increase memory allocation in docker-compose.yml
   - Monitor server resource usage

## License

This project is distributed under the MIT license.