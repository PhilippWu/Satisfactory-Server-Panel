const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const bcrypt = require('bcryptjs');
const JSONdb = require('simple-json-db');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// User database setup
const dbPath = path.join(__dirname, '..', 'users.json');
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify({}));
}
const userDb = new JSONdb(dbPath);

// If no admin user exists, create one with default credentials
if (!userDb.has('admin')) {
  const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'satisfactory';
  const hashedPassword = bcrypt.hashSync(defaultPassword, 10);
  userDb.set('admin', {
    password: hashedPassword,
    role: 'admin'
  });
  console.log(`Created default admin user with password: ${defaultPassword}`);
}

// Middleware setup
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'satisfactory-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if using HTTPS
}));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  res.redirect('/login');
};

// Routes
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!userDb.has(username)) {
    return res.render('login', { error: 'Invalid username or password' });
  }
  
  const user = userDb.get(username);
  const passwordIsValid = bcrypt.compareSync(password, user.password);
  
  if (!passwordIsValid) {
    return res.render('login', { error: 'Invalid username or password' });
  }
  
  req.session.user = {
    username,
    role: user.role
  };
  
  res.redirect('/');
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

app.get('/', requireAuth, async (req, res) => {
  try {
    // Get server status
    const serverStatus = await getServerStatus();
    
    // Get server logs
    const logs = await getServerLogs();
    
    // Get players online
    const players = await getOnlinePlayers();

    // Get save files
    const saves = await getSaveFiles();
    
    res.render('dashboard', { 
      user: req.session.user,
      serverStatus,
      logs,
      players,
      saves
    });
  } catch (error) {
    res.render('dashboard', { 
      user: req.session.user,
      serverStatus: { running: false, error: error.message },
      logs: [],
      players: [],
      saves: []
    });
  }
});

// API Endpoints

app.post('/server/action', requireAuth, async (req, res) => {
  const { action } = req.body;
  let result = { success: false, message: 'Unknown action' };
  
  switch (action) {
    case 'start':
      result = await startServer();
      break;
    case 'stop':
      result = await stopServer();
      break;
    case 'restart':
      result = await restartServer();
      break;
    default:
      break;
  }
  
  res.json(result);
});

app.post('/server/save', requireAuth, async (req, res) => {
  const result = await saveServer();
  res.json(result);
});

app.post('/server/backup', requireAuth, async (req, res) => {
  const result = await backupServer();
  res.json(result);
});

// Add a new API endpoint to get server information
app.get('/api/server/info', requireAuth, async (req, res) => {
  try {
    const serverStatus = await getServerStatus();
    const logs = await getServerLogs(20); // Get last 20 logs
    const players = await getOnlinePlayers();
    const saves = await getSaveFiles();
    
    res.json({
      success: true,
      data: {
        serverStatus,
        logs,
        players,
        saves
      }
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message
    });
  }
});

// Add new API endpoint for getting logs
app.get('/api/server/logs', requireAuth, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 100;
    const logs = await getServerLogs(limit);
    
    res.json({
      success: true,
      data: {
        logs
      }
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message
    });
  }
});

// Add new API endpoint for getting save files
app.get('/api/server/saves', requireAuth, async (req, res) => {
  try {
    const saves = await getSaveFiles();
    
    res.json({
      success: true,
      data: {
        saves
      }
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message
    });
  }
});

// Add a new API endpoint to get server configuration
app.get('/api/server/config', requireAuth, async (req, res) => {
  try {
    const config = await getServerConfig();
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message
    });
  }
});

// Add a new API endpoint to get backups
app.get('/api/server/backups', requireAuth, async (req, res) => {
  try {
    const backups = await getBackups();
    res.json({
      success: true,
      data: {
        backups
      }
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message
    });
  }
});

// Add a download endpoint for save files
app.get('/api/server/download/:filename', requireAuth, async (req, res) => {
  try {
    const filename = req.params.filename;
    const savePath = path.join('/app/data', 'saved', filename);
    
    // Check if file exists and is a .sav file
    if (!fs.existsSync(savePath) || !filename.endsWith('.sav')) {
      return res.status(404).json({
        success: false,
        error: 'File not found or invalid file type'
      });
    }
    
    res.download(savePath, filename);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add a download endpoint for logs
app.get('/api/server/download-logs', requireAuth, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 1000;
    let logs;
    
    // Use different command for full logs (when limit is 0)
    if (limit === 0) {
      logs = await getFullServerLogs();
    } else {
      logs = await getServerLogs(limit);
    }
    
    // Create a text file with the logs
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logContent = logs.join('\n');
    
    // Set headers for file download
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename=server-logs-${timestamp}.txt`);
    
    // Send the log content
    res.send(logContent);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Server helper functions
async function getServerStatus() {
  return new Promise((resolve, reject) => {
    exec('docker ps --filter "name=satisfactory-server" --format "{{.Status}}"', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error checking server status: ${error}`);
        return reject(error);
      }
      
      const isRunning = stdout.trim() !== '';
      let status = 'stopped';
      
      if (isRunning) {
        if (stdout.toLowerCase().includes('unhealthy')) {
          status = 'unhealthy';
        } else if (stdout.toLowerCase().includes('starting')) {
          status = 'starting';
        } else {
          status = 'running';
        }
      }
      
      // Get more detailed container information
      exec('docker inspect --format "{{json .}}" satisfactory-server', (inspectError, inspectStdout, inspectStderr) => {
        let containerInfo = {};
        
        if (!inspectError) {
          try {
            const data = JSON.parse(inspectStdout);
            containerInfo = {
              id: data.Id,
              name: data.Name,
              image: data.Config.Image,
              created: data.Created,
              platform: data.Platform,
              restartCount: data.RestartCount || 0,
              networkMode: data.HostConfig.NetworkMode,
              ports: data.NetworkSettings.Ports
            };
          } catch (e) {
            console.error('Error parsing docker inspect output:', e);
          }
        }
        
        resolve({ 
          running: isRunning, 
          status,
          uptime: isRunning ? stdout.trim() : 'N/A',
          containerInfo
        });
      });
    });
  });
}

async function getServerLogs(limit = 50) {
  return new Promise((resolve, reject) => {
    exec(`docker logs --tail ${limit} satisfactory-server`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error getting server logs: ${error}`);
        return resolve([]); // Return empty logs on error
      }
      
      const logs = stdout.trim().split('\n').filter(Boolean);
      resolve(logs);
    });
  });
}

// Add function to get full server logs without limit
async function getFullServerLogs() {
  return new Promise((resolve, reject) => {
    // Docker command to get all logs without limit
    exec('docker logs satisfactory-server', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error getting full server logs: ${error}`);
        return resolve([]); // Return empty logs on error
      }
      
      const logs = stdout.trim().split('\n').filter(Boolean);
      resolve(logs);
    });
  });
}

async function getOnlinePlayers() {
  // Try to parse server logs to extract connected players
  try {
    const logs = await getServerLogs(500); // Get more logs to find player connections
    const playerConnections = [];
    
    // Pattern to match player connection messages in logs
    const connectionPattern = /.*Connection established for user: ([^,]+)/i;
    const disconnectionPattern = /.*Connection closed for user: ([^,]+)/i;
    
    // Track connected players
    const connectedPlayers = new Map();
    
    logs.forEach(log => {
      const connectionMatch = log.match(connectionPattern);
      const disconnectionMatch = log.match(disconnectionPattern);
      
      if (connectionMatch) {
        const playerName = connectionMatch[1].trim();
        connectedPlayers.set(playerName, {
          name: playerName,
          connectTime: new Date(),
          playTime: '00:00:00'
        });
      }
      
      if (disconnectionMatch) {
        const playerName = disconnectionMatch[1].trim();
        connectedPlayers.delete(playerName);
      }
    });
    
    return Array.from(connectedPlayers.values());
  } catch (error) {
    console.error('Error getting online players:', error);
    return [];
  }
}

async function getSaveFiles() {
  return new Promise((resolve, reject) => {
    // Use direct host path instead of Docker path since we're mounting it
    const savePath = path.join('/app/data', 'saved');
    
    fs.readdir(savePath, (err, files) => {
      if (err) {
        console.error(`Error reading save files: ${err}`);
        return resolve([]);
      }
      
      const saveFiles = [];
      
      try {
        // Process each file in the directory
        files.forEach(file => {
          // Only include .sav files
          if (file.endsWith('.sav')) {
            const filePath = path.join(savePath, file);
            const stats = fs.statSync(filePath);
            
            saveFiles.push({
              name: file,
              path: filePath,
              size: stats.size,
              modified: stats.mtime,
              isActive: file.includes('ServerSettings.7777')  // Mark as active if it's the main save
            });
          }
        });
        
        // Sort by modification date, newest first
        saveFiles.sort((a, b) => b.modified - a.modified);
        
        resolve(saveFiles);
      } catch (error) {
        console.error(`Error processing save files: ${error}`);
        resolve([]);
      }
    });
  });
}

async function getBackups() {
  return new Promise((resolve, reject) => {
    const backupPath = path.join('/app/data', 'backups');

    if (!fs.existsSync(backupPath)) {
      fs.mkdirSync(backupPath, { recursive: true });
    }
    
    fs.readdir(backupPath, (err, files) => {
      if (err) {
        console.error(`Error reading backup files: ${err}`);
        return resolve([]);
      }
      
      const backups = [];
      
      try {
        // Process each directory in the backups folder
        files.forEach(file => {
          const filePath = path.join(backupPath, file);
          const stats = fs.statSync(filePath);
          
          if (stats.isDirectory() && file.startsWith('backup-')) {
            backups.push({
              name: file,
              path: filePath,
              created: stats.mtime,
              size: getDirSize(filePath)
            });
          }
        });
        
        // Sort by creation date, newest first
        backups.sort((a, b) => b.created - a.created);
        
        resolve(backups);
      } catch (error) {
        console.error(`Error processing backup files: ${error}`);
        resolve([]);
      }
    });
  });
}

// Helper function to get directory size
function getDirSize(dirPath) {
  let size = 0;
  
  try {
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        size += getDirSize(filePath);
      } else {
        size += stats.size;
      }
    }
  } catch (error) {
    console.error(`Error calculating directory size: ${error}`);
  }
  
  return size;
}

async function getServerConfig() {
  return new Promise((resolve, reject) => {
    // Extract configuration from environment variables
    exec('docker inspect --format "{{json .Config.Env}}" satisfactory-server', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error getting server configuration: ${error}`);
        return reject(error);
      }
      
      try {
        const envVars = JSON.parse(stdout);
        const config = {};
        
        // Parse environment variables
        envVars.forEach(envVar => {
          const [key, value] = envVar.split('=');
          config[key] = value;
        });
        
        resolve(config);
      } catch (error) {
        console.error(`Error parsing server configuration: ${error}`);
        reject(error);
      }
    });
  });
}

async function startServer() {
  return new Promise((resolve, reject) => {
    exec('docker start satisfactory-server', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error starting server: ${error}`);
        return resolve({ success: false, message: error.message });
      }
      
      resolve({ success: true, message: 'Server started successfully' });
    });
  });
}

async function stopServer() {
  return new Promise((resolve, reject) => {
    exec('docker stop satisfactory-server', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error stopping server: ${error}`);
        return resolve({ success: false, message: error.message });
      }
      
      resolve({ success: true, message: 'Server stopped successfully' });
    });
  });
}

async function restartServer() {
  return new Promise((resolve, reject) => {
    exec('docker restart satisfactory-server', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error restarting server: ${error}`);
        return resolve({ success: false, message: error.message });
      }
      
      resolve({ success: true, message: 'Server restarted successfully' });
    });
  });
}

async function saveServer() {
  // Ideally, we would use RCON to properly trigger a save command in the game
  // For now, this is a placeholder as we don't have direct game API access
  return new Promise((resolve, reject) => {
    // This command would need to be customized for actual RCON implementation
    exec('docker exec satisfactory-server echo "Saving game..." > /dev/null', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error sending save command: ${error}`);
        return resolve({ 
          success: false, 
          message: 'Failed to save game. Game save functionality requires RCON setup.'
        });
      }
      
      resolve({ 
        success: true, 
        message: 'Save command sent to server. Note: actual save depends on RCON implementation.' 
      });
    });
  });
}

async function backupServer() {
  return new Promise((resolve, reject) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join('/app/data', 'backups', `backup-${timestamp}`);
    const sourceDir = path.join('/app/data', 'saved');
    
    // Create backup directory structure
    exec(`mkdir -p "${backupDir}"`, (mkdirError) => {
      if (mkdirError) {
        console.error(`Error creating backup directory: ${mkdirError}`);
        return resolve({ success: false, message: 'Failed to create backup directory' });
      }
      
      // Copy files using cp (Docker container runs on Linux)
      exec(`cp -R "${sourceDir}"/* "${backupDir}" 2>/dev/null || cp -R "${sourceDir}"/* "${backupDir}"`, (cpError, stdout, stderr) => {
        if (cpError) {
          console.error(`Error creating backup: ${cpError}`);
          return resolve({ success: false, message: 'Failed to create backup files' });
        }
        
        resolve({ 
          success: true, 
          message: `Backup created successfully at ${timestamp}` 
        });
      });
    });
  });
}

// Start the server
app.listen(PORT, () => {
  console.log(`Satisfactory Admin Panel running at http://localhost:${PORT}`);
});