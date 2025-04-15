// Satisfactory Admin Panel Dashboard JS
document.addEventListener('DOMContentLoaded', function() {
  // Auto-refresh functionality
  const AUTO_REFRESH_INTERVAL = 30000; // 30 seconds
  let autoRefreshTimer = null;
  let autoRefreshEnabled = true;

  // Initialize auto-refresh
  startAutoRefresh();

  // Setup event listeners for server control buttons
  setupServerControls();
  
  // Setup event listeners for refresh buttons
  setupRefreshButtons();

  // Setup event listeners for tabs
  setupTabFunctionality();

  // Initialize tooltips
  initializeTooltips();

  // Auto-scroll logs to bottom
  scrollLogsToBottom();
  
  // Setup log download functionality
  setupLogDownload();
  
  // Function to start the auto-refresh timer
  function startAutoRefresh() {
    if (autoRefreshTimer) {
      clearInterval(autoRefreshTimer);
    }
    
    if (autoRefreshEnabled) {
      autoRefreshTimer = setInterval(refreshCurrentView, AUTO_REFRESH_INTERVAL);
      updateRefreshStatus(true);
    }
  }
  
  // Function to stop auto-refresh
  function stopAutoRefresh() {
    if (autoRefreshTimer) {
      clearInterval(autoRefreshTimer);
      autoRefreshTimer = null;
    }
    updateRefreshStatus(false);
  }
  
  // Update refresh status indicator
  function updateRefreshStatus(isEnabled) {
    const statusEl = document.getElementById('auto-refresh-status');
    if (statusEl) {
      statusEl.textContent = isEnabled ? 'Auto-refresh: ON' : 'Auto-refresh: OFF';
      statusEl.className = isEnabled ? 'text-success' : 'text-warning';
    }
    
    const toggleBtn = document.getElementById('toggle-refresh');
    if (toggleBtn) {
      toggleBtn.textContent = isEnabled ? 'Disable Auto-refresh' : 'Enable Auto-refresh';
      toggleBtn.className = isEnabled ? 
        'btn btn-sm btn-outline-warning' : 
        'btn btn-sm btn-outline-success';
    }
  }
  
  // Function to refresh current view based on active tab
  function refreshCurrentView() {
    const activeTab = document.querySelector('.nav-link.active');
    if (activeTab) {
      if (activeTab.getAttribute('href') === '#overview') {
        refreshServerInfo();
      } else if (activeTab.getAttribute('href') === '#server-logs') {
        refreshServerLogs();
      } else if (activeTab.getAttribute('href') === '#save-files') {
        refreshSaveFiles();
      } else if (activeTab.getAttribute('href') === '#backup') {
        // Nothing to auto-refresh on backup tab
      }
    }
  }
  
  // Function to refresh server information
  function refreshServerInfo() {
    fetchWithLoadingIndicator('/api/server/info', 'overview-loader', function(data) {
      if (data.success) {
        // Update server status
        updateServerStatus(data.data.serverStatus);
        
        // Update player list
        updatePlayerList(data.data.players);
        
        // Update recent logs
        updateRecentLogs(data.data.logs);
      } else {
        showErrorNotification('Error refreshing server info: ' + (data.error || 'Unknown error'));
      }
    });
  }
  
  // Function to refresh server logs
  function refreshServerLogs() {
    fetchWithLoadingIndicator('/api/server/logs', 'logs-loader', function(data) {
      if (data.success) {
        updateFullLogs(data.data.logs);
      } else {
        showErrorNotification('Error refreshing logs: ' + (data.error || 'Unknown error'));
      }
    });
  }
  
  // Function to refresh save files
  function refreshSaveFiles() {
    fetchWithLoadingIndicator('/api/server/saves', 'saves-loader', function(data) {
      if (data.success) {
        updateSaveFiles(data.data.saves);
      } else {
        showErrorNotification('Error refreshing save files: ' + (data.error || 'Unknown error'));
      }
    });
  }
  
  // Helper function to fetch with a loading indicator
  function fetchWithLoadingIndicator(url, loaderId, callback) {
    const loader = document.getElementById(loaderId);
    if (loader) {
      loader.style.display = 'inline-block';
    }
    
    fetch(url)
      .then(response => response.json())
      .then(data => {
        if (loader) {
          loader.style.display = 'none';
        }
        callback(data);
      })
      .catch(error => {
        if (loader) {
          loader.style.display = 'none';
        }
        console.error('Error:', error);
        showErrorNotification('Network error: ' + error.message);
      });
  }
  
  // Update server status display
  function updateServerStatus(status) {
    // Update status indicator
    const statusIndicator = document.querySelector('.status-indicator');
    if (statusIndicator) {
      statusIndicator.className = 'status-indicator';
      if (status.running) {
        if (status.status === 'running') {
          statusIndicator.classList.add('status-running');
        } else if (status.status === 'unhealthy') {
          statusIndicator.classList.add('status-unhealthy');
        } else {
          statusIndicator.classList.add('status-starting');
        }
      } else {
        statusIndicator.classList.add('status-stopped');
      }
    }
    
    // Update status text
    const statusText = document.querySelector('.server-status .fw-bold');
    if (statusText) {
      if (status.running) {
        if (status.status === 'running') {
          statusText.textContent = 'Running';
        } else if (status.status === 'unhealthy') {
          statusText.textContent = 'Unhealthy';
        } else {
          statusText.textContent = 'Starting';
        }
      } else {
        statusText.textContent = 'Stopped';
      }
    }
    
    // Update uptime text
    const uptimeText = document.querySelector('.server-status p strong');
    if (uptimeText && uptimeText.nextSibling) {
      uptimeText.nextSibling.textContent = ' ' + status.uptime;
    }
    
    // Update server control buttons
    document.getElementById('start-server').disabled = status.running;
    document.getElementById('stop-server').disabled = !status.running;
    document.getElementById('restart-server').disabled = !status.running;
    document.getElementById('save-server').disabled = !status.running;
  }
  
  // Update player list
  function updatePlayerList(players) {
    const playerList = document.querySelector('.server-status:nth-of-type(2)');
    if (playerList) {
      if (players && players.length > 0) {
        let html = '<h4>Players Online</h4><ul class="list-group">';
        
        players.forEach(player => {
          html += `<li class="list-group-item d-flex justify-content-between align-items-center">
            ${player.name}
            <span class="badge bg-primary rounded-pill">${player.playTime}</span>
          </li>`;
        });
        
        html += '</ul>';
        playerList.innerHTML = html;
      } else {
        playerList.innerHTML = '<h4>Players Online</h4><p>No players online</p>';
      }
    }
  }
  
  // Update recent logs
  function updateRecentLogs(logs) {
    const logsContainer = document.querySelector('#overview .logs-container');
    if (logsContainer) {
      if (logs && logs.length > 0) {
        let html = '';
        logs.slice(-20).forEach(log => {
          html += `<div>${log}</div>`;
        });
        logsContainer.innerHTML = html;
        logsContainer.scrollTop = logsContainer.scrollHeight;
      } else {
        logsContainer.innerHTML = '<div>No logs available</div>';
      }
    }
  }
  
  // Update full logs
  function updateFullLogs(logs) {
    const logsContainer = document.querySelector('#server-logs .logs-container');
    if (logsContainer) {
      if (logs && logs.length > 0) {
        let html = '';
        logs.forEach(log => {
          html += `<div>${log}</div>`;
        });
        logsContainer.innerHTML = html;
        logsContainer.scrollTop = logsContainer.scrollHeight;
      } else {
        logsContainer.innerHTML = '<div>No logs available</div>';
      }
    }
  }
  
  // Update save files
  function updateSaveFiles(saves) {
    const tableBody = document.querySelector('#save-files table tbody');
    if (tableBody) {
      if (saves && saves.length > 0) {
        let html = '';
        
        saves.forEach(save => {
          html += `<tr>
            <td>${save.name} ${save.isActive ? '<span class="badge bg-success">Active</span>' : ''}</td>
            <td>${Math.round(save.size / 1024)} KB</td>
            <td>${new Date(save.modified).toLocaleString()}</td>
            <td>
              <button class="btn btn-sm btn-outline-secondary download-save" data-path="${save.path}">
                <i class="bi bi-download"></i> Download
              </button>
            </td>
          </tr>`;
        });
        
        tableBody.innerHTML = html;
      } else {
        tableBody.innerHTML = '<tr><td colspan="4" class="text-center">No save files found</td></tr>';
      }
    }
  }
  
  // Setup server control buttons
  function setupServerControls() {
    document.getElementById('start-server').addEventListener('click', function() {
      serverAction('start');
    });
    
    document.getElementById('stop-server').addEventListener('click', function() {
      if (confirm('Are you sure you want to stop the server?')) {
        serverAction('stop');
      }
    });
    
    document.getElementById('restart-server').addEventListener('click', function() {
      if (confirm('Are you sure you want to restart the server?')) {
        serverAction('restart');
      }
    });
    
    document.getElementById('save-server').addEventListener('click', function() {
      serverSave();
    });
    
    document.getElementById('create-backup').addEventListener('click', function() {
      serverBackup();
    });
  }
  
  // Setup refresh buttons
  function setupRefreshButtons() {
    // Add auto-refresh toggle button
    const refreshBtnGroup = document.querySelector('#overview .btn-toolbar .btn-group');
    if (refreshBtnGroup) {
      // Create status indicator
      const statusSpan = document.createElement('span');
      statusSpan.id = 'auto-refresh-status';
      statusSpan.className = 'text-success me-2';
      statusSpan.textContent = 'Auto-refresh: ON';
      
      // Create toggle button
      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = 'btn btn-sm btn-outline-warning';
      toggleBtn.id = 'toggle-refresh';
      toggleBtn.textContent = 'Disable Auto-refresh';
      
      // Insert elements
      refreshBtnGroup.parentNode.insertBefore(statusSpan, refreshBtnGroup);
      refreshBtnGroup.appendChild(toggleBtn);
      
      // Add event listener
      toggleBtn.addEventListener('click', function() {
        autoRefreshEnabled = !autoRefreshEnabled;
        if (autoRefreshEnabled) {
          startAutoRefresh();
        } else {
          stopAutoRefresh();
        }
      });
    }
    
    // Manual refresh buttons
    document.getElementById('refresh-overview').addEventListener('click', function() {
      refreshServerInfo();
    });
    
    document.getElementById('refresh-logs').addEventListener('click', function() {
      refreshServerLogs();
    });
    
    document.getElementById('refresh-saves').addEventListener('click', function() {
      refreshSaveFiles();
    });
  }
  
  // Setup tab functionality
  function setupTabFunctionality() {
    document.querySelectorAll('.nav-link').forEach(tab => {
      tab.addEventListener('click', function() {
        // Refresh content when tab is activated
        setTimeout(() => {
          refreshCurrentView();
        }, 100);
      });
    });
  }
  
  // Initialize Bootstrap tooltips
  function initializeTooltips() {
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl);
    });
  }
  
  // Scroll logs to bottom
  function scrollLogsToBottom() {
    document.querySelectorAll('.logs-container').forEach(container => {
      container.scrollTop = container.scrollHeight;
    });
  }
  
  // Setup log download functionality
  function setupLogDownload() {
    const downloadCustomLogsBtn = document.getElementById('downloadCustomLogs');
    if (downloadCustomLogsBtn) {
      downloadCustomLogsBtn.addEventListener('click', function() {
        const customLogLines = document.getElementById('customLogLines');
        let lines = 100; // Default value
        
        if (customLogLines && customLogLines.value) {
          lines = parseInt(customLogLines.value);
          
          // Validate input
          if (isNaN(lines) || lines < 1) {
            lines = 100;
          } else if (lines > 10000) {
            lines = 10000; // Cap at 10000 lines
          }
        }
        
        // Open log download in new window
        window.open(`/api/server/download-logs?limit=${lines}`, '_blank');
      });
    }
  }
  
  // Show error notification
  function showErrorNotification(message) {
    // Create notification div
    const notification = document.createElement('div');
    notification.className = 'alert alert-danger alert-dismissible fade show';
    notification.setAttribute('role', 'alert');
    notification.innerHTML = `
      <strong>Error!</strong> ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Find a good spot for the notification
    const container = document.querySelector('main') || document.body;
    container.insertBefore(notification, container.firstChild);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.remove();
      }, 150);
    }, 5000);
  }
  
  // Server action function
  function serverAction(action) {
    fetch('/server/action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action }),
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        showNotification('success', data.message);
        setTimeout(() => {
          refreshServerInfo();
        }, 1000);
      } else {
        showNotification('danger', data.message);
      }
    })
    .catch(error => {
      console.error('Error:', error);
      showNotification('danger', 'An error occurred while performing the action');
    });
  }
  
  // Server save function
  function serverSave() {
    fetch('/server/save', {
      method: 'POST',
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        showNotification('success', data.message);
        setTimeout(() => {
          refreshSaveFiles();
        }, 1000);
      } else {
        showNotification('danger', data.message);
      }
    })
    .catch(error => {
      console.error('Error:', error);
      showNotification('danger', 'An error occurred while saving the server');
    });
  }
  
  // Server backup function
  function serverBackup() {
    showNotification('info', 'Creating backup... Please wait.');
    
    fetch('/server/backup', {
      method: 'POST',
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        showNotification('success', data.message);
      } else {
        showNotification('danger', data.message);
      }
    })
    .catch(error => {
      console.error('Error:', error);
      showNotification('danger', 'An error occurred while creating a backup');
    });
  }
  
  // Show notification
  function showNotification(type, message) {
    // Create notification div
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show`;
    notification.setAttribute('role', 'alert');
    notification.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Find a good spot for the notification
    const container = document.querySelector('main') || document.body;
    container.insertBefore(notification, container.firstChild);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.remove();
      }, 150);
    }, 5000);
  }
});