# Deployment Guide for NAS

This guide will help you deploy Gear Tracker on your Synology NAS (or similar NAS with Docker support).

## Prerequisites

1. Docker and Docker Compose installed on your NAS
2. SSH access to your NAS
3. Port 80 and 3000 available (or modify docker-compose.yml for different ports)

## Step-by-Step Deployment

### 1. Transfer Files to NAS

```bash
# From your local machine, copy the project to your NAS
scp -r gear-tracker your-nas-user@your-nas-ip:/volume1/docker/gear-tracker
```

Or use your NAS file manager to upload the entire project folder.

### 2. SSH into Your NAS

```bash
ssh your-nas-user@your-nas-ip
cd /volume1/docker/gear-tracker
```

### 3. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.docker .env

# Edit the file with your settings
nano .env
```

Update these critical values:

```env
# Use a strong, random password for the database
DB_PASSWORD=generate_a_strong_random_password_here

# Use a strong, random secret for JWT (at least 32 characters)
JWT_SECRET=generate_a_strong_random_secret_key_here

# Replace with your NAS IP address
CORS_ORIGIN=http://192.168.1.100
VITE_API_URL=http://192.168.1.100:3000/api
```

**Security tip:** Generate random secrets using:
```bash
openssl rand -base64 32
```

### 4. Make Scripts Executable

```bash
chmod +x database/backup.sh
chmod +x database/restore.sh
```

### 5. Build and Start the Application

```bash
# Build the Docker images (this may take several minutes)
docker-compose build

# Start all services
docker-compose up -d

# Check the logs to ensure everything started correctly
docker-compose logs -f
```

Wait for the message "Server running on port 3000" from the backend.

### 6. Access the Application

Open your web browser and navigate to:
```
http://your-nas-ip
```

You should see the login page. Create a new account to get started!

## Troubleshooting

### Backend won't start

Check the logs:
```bash
docker-compose logs backend
```

Common issues:
- Database not ready: Wait 30 seconds and restart
  ```bash
  docker-compose restart backend
  ```

### Frontend shows "Network Error"

1. Check that VITE_API_URL in .env matches your NAS IP
2. Rebuild the frontend:
   ```bash
   docker-compose build frontend
   docker-compose up -d frontend
   ```

### Database connection errors

1. Check database is running:
   ```bash
   docker-compose ps
   ```

2. Check database logs:
   ```bash
   docker-compose logs postgres
   ```

## Updating the Application

To update after making changes:

```bash
# Pull latest changes (if using git)
git pull

# Rebuild and restart
docker-compose build
docker-compose up -d

# View logs
docker-compose logs -f
```

## Backup and Restore

### Automatic Backups

Set up a cron job to backup regularly:

```bash
# Edit crontab
crontab -e

# Add this line to backup daily at 2 AM
0 2 * * * cd /volume1/docker/gear-tracker && ./database/backup.sh
```

### Manual Backup

```bash
cd /volume1/docker/gear-tracker
./database/backup.sh
```

Backups are stored in `./backups/` directory.

### Restore from Backup

```bash
cd /volume1/docker/gear-tracker
./database/restore.sh backups/gear_tracker_backup_YYYYMMDD_HHMMSS.sql
```

## Performance Optimization

### For Synology NAS

1. **Allocate sufficient resources** in Docker settings:
   - At least 512MB RAM for backend
   - At least 256MB RAM for frontend
   - At least 512MB RAM for database

2. **Use SSD cache** if available for Docker volumes

3. **Enable logging to reduce disk writes:**
   Edit `docker-compose.yml` and add to each service:
   ```yaml
   logging:
     driver: "json-file"
     options:
       max-size: "10m"
       max-file: "3"
   ```

## Security Recommendations

1. **Change default ports** if needed (edit docker-compose.yml)

2. **Use HTTPS** with a reverse proxy:
   - Synology: Use built-in reverse proxy in DSM
   - Add SSL certificate
   - Forward port 443 to port 80 of the container

3. **Firewall rules:**
   - Only expose port 80 (or 443) to your local network
   - Don't expose port 3000 or 5432 externally

4. **Regular updates:**
   - Keep Docker images updated
   - Monitor for security advisories

## Accessing from Outside Your Network

### Option 1: VPN (Recommended)
Set up a VPN on your NAS and connect remotely.

### Option 2: Reverse Proxy with SSL
1. Set up a domain name with Dynamic DNS
2. Configure your router to forward port 443
3. Use Synology's built-in reverse proxy with Let's Encrypt SSL
4. Point domain to your NAS's port 80

**Never expose the database port (5432) to the internet!**

## Monitoring

View real-time logs:
```bash
docker-compose logs -f
```

Check resource usage:
```bash
docker stats
```

View running containers:
```bash
docker-compose ps
```

## Uninstalling

To completely remove the application:

```bash
# Stop and remove containers
docker-compose down

# Remove volumes (THIS DELETES ALL DATA!)
docker-compose down -v

# Remove images
docker rmi gear-tracker-backend gear-tracker-frontend

# Remove project files
cd ..
rm -rf gear-tracker
```

---

Need help? Check the main README.md or open an issue on GitHub.
