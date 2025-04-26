// Handle admin login
async function handleAdminLogin(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password }),
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                // Login successful, redirect to admin dashboard
                window.location.href = '/admin';
            }
        } else {
            const error = await response.json();
            alert(error.error || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed. Please try again.');
    }
}

// Get current admin
async function getCurrentAdmin() {
    try {
        console.log('Getting current admin...');
        const response = await fetch('/api/admin/current-user', {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Current admin response:', response.status);
        
        if (response.status === 401) {
            console.log('Not authenticated, redirecting to admin login');
            window.location.href = '/admin-login';
            return;
        }
        
        if (response.status === 403) {
            console.log('Not an admin, redirecting to home');
            window.location.href = '/';
            return;
        }
        
        if (!response.ok) {
            throw new Error('Failed to get current user');
        }
        
        const user = await response.json();
        console.log('Current admin user:', user);
        
        if (user && user.is_admin) {
            // Admin is authenticated, proceed with initialization
            const adminName = document.getElementById('adminName');
            if (adminName) {
                adminName.textContent = user.username;
            }
            await loadUsers();
            await loadReports();
        } else {
            console.log('Not an admin, redirecting to home');
            window.location.href = '/';
        }
    } catch (error) {
        console.error('Error getting current admin:', error);
        window.location.href = '/admin-login';
    }
}

// Handle logout
async function handleLogout(event) {
    event.preventDefault(); // Prevent the default link behavior
    try {
        console.log('Attempting to logout...');
        const response = await fetch('/api/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        console.log('Logout response:', response);
        if (response.ok) {
            console.log('Logout successful, redirecting to admin login...');
            window.location.href = '/admin-login';
        } else {
            const error = await response.json();
            console.error('Logout failed:', error);
            alert('Logout failed. Please try again.');
        }
    } catch (error) {
        console.error('Error during logout:', error);
        alert('Logout failed. Please try again.');
    }
}

// Handle navigation
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all buttons
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        // Add active class to clicked button
        btn.classList.add('active');
        
        // Show/hide appropriate section
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(`${btn.dataset.section}Section`).classList.add('active');
    });
});

// Global variables
let currentAction = null;
let currentUserId = null;

// Chat functionality
let selectedUserId = null;
let socket = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the login page
    const loginForm = document.getElementById('adminLoginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleAdminLogin);
        return;
    }

    // Otherwise, we're on the admin dashboard
    getCurrentAdmin();

    // Set up logout link
    const logoutLink = document.querySelector('a[href="/logout"]');
    if (logoutLink) {
        console.log('Logout link found, adding event listener');
        logoutLink.addEventListener('click', handleLogout);
    } else {
        console.error('Logout link not found');
    }

    // Navigation handling
    const navLinks = document.querySelectorAll('.nav-link[data-section]');
    const sections = document.querySelectorAll('.section-content');
    
    console.log('Found nav links:', navLinks.length);
    console.log('Found sections:', sections.length);
    
    if (navLinks.length > 0 && sections.length > 0) {
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetSection = link.getAttribute('data-section');
                console.log('Clicked section:', targetSection);
                
                // Update active states
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                
                // Show/hide sections
                sections.forEach(section => {
                    if (section.id === `${targetSection}-section`) {
                        section.style.display = 'block';
                        section.classList.add('active');
                        // Initialize chat if chat section is selected
                        if (targetSection === 'chat') {
                            console.log('Initializing chat...');
                            initializeChat();
                        }
                    } else {
                        section.style.display = 'none';
                        section.classList.remove('active');
                    }
                });
            });
        });
    }

    // Set up action confirmation modal
    const modal = document.getElementById('userActionModal');
    const confirmBtn = document.getElementById('confirm-action');
    
    if (modal && confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            if (currentAction && currentUserId) {
                performUserAction(currentAction, currentUserId);
            }
            const modalInstance = bootstrap.Modal.getInstance(modal);
            if (modalInstance) {
                modalInstance.hide();
            }
        });
    }

    // Add filter controls and setup event listeners
    addFilterControls();
    setupFilterControls();

    // Add report filter controls and setup event listeners
    addReportFilterControls();
    setupReportFilterControls();

    // Refresh data periodically
    setInterval(() => {
        loadUsers();
        loadReports();
    }, 30000);

    // Add cleanup button
    addCleanupButton();
});

// Function to show action modal
function showActionModal(action, userId) {
    const modal = document.getElementById('userActionModal');
    const modalMessage = document.getElementById('modal-message');
    currentAction = action;
    currentUserId = userId;

    modalMessage.textContent = `Are you sure you want to ${action} this user?`;
    
    // Show the modal
    const modalInstance = new bootstrap.Modal(modal);
    modalInstance.show();
}

// Function to perform user action
async function performUserAction(action, userId) {
    try {
        console.log(`Performing ${action} action on user ${userId}`);
        const endpoint = action === 'ban' ? 'ban' : 'unban';
        const response = await fetch(`/api/admin/${endpoint}/${userId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to ${action} user`);
        }

        console.log(`Successfully ${action}ed user ${userId}`);
        
        // Reload data
        await loadUsers();
        await loadReports();
        
        // Show success message
        alert(`User has been ${action}ed successfully`);
    } catch (error) {
        console.error(`Error ${action}ing user:`, error);
        alert(`Failed to ${action} user: ${error.message}`);
    }
}

// Add filter controls to the users section
function addFilterControls() {
    const usersSection = document.getElementById('users-section');
    const filterControls = document.createElement('div');
    filterControls.className = 'mb-3';
    filterControls.innerHTML = `
        <div class="row g-3">
            <div class="col-md-3">
                <input type="text" class="form-control" id="searchInput" placeholder="Search users...">
            </div>
            <div class="col-md-3">
                <select class="form-select" id="statusFilter">
                    <option value="">All Status</option>
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                </select>
            </div>
            <div class="col-md-3">
                <select class="form-select" id="banStatusFilter">
                    <option value="">All Users</option>
                    <option value="banned">Banned</option>
                    <option value="active">Active</option>
                </select>
            </div>
            <div class="col-md-3">
                <select class="form-select" id="sortBy">
                    <option value="id">Sort by ID</option>
                    <option value="nickname">Sort by Name</option>
                    <option value="age">Sort by Age</option>
                    <option value="location">Sort by Location</option>
                </select>
            </div>
        </div>
    `;
    usersSection.insertBefore(filterControls, usersSection.querySelector('h2').nextSibling);
}

// Load users list
async function loadUsers() {
    try {
        console.log('Loading users...');
        const response = await fetch('/api/admin/users', {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Users response:', response.status);
        
        if (response.status === 403) {
            console.log('Not authorized, redirecting to admin login');
            window.location.href = '/admin-login';
            return;
        }
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch users');
        }
        
        const users = await response.json();
        console.log('Users loaded:', users);
        displayUsers(users);
    } catch (error) {
        console.error('Error loading users:', error);
        const usersTableBody = document.getElementById('users-table-body');
        if (usersTableBody) {
            usersTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-danger">
                        Error loading users: ${error.message}
                    </td>
                </tr>
            `;
        }
    }
}

// Display users in the table
function displayUsers(users) {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) {
        console.error('Users table body not found');
        return;
    }

    tbody.innerHTML = users.map(user => {
        const genderSymbol = user.sex === 'male' ? '♂' : '♀';
        const genderColor = user.sex === 'male' ? 'bg-blue-400' : 'bg-pink-400';
        const countryCode = user.location ? user.location.toLowerCase() : 'unknown';
        const flagEmoji = getFlagEmoji(countryCode);
        
        return `
            <tr>
                <td colspan="4" style="padding: 0;">
                    <div style="display: block; padding: 5px; padding-left: 25px; border-bottom: 1px solid #CCC; text-decoration: none; color: #000; font-size: 16px; line-height: 30px; ${user.sex === 'male' ? 'background-color: #E3F2FD;' : 'background-color: #FCE4EC;'}">
                        <div style="display: flex; align-items: center;">
                            <span style="margin-right: 10px;">${flagEmoji} ${genderSymbol}</span>
                            <span style="flex-grow: 1;">${user.nickname} (${user.age || 'N/A'})</span>
                            <span style="margin-right: 10px; font-size: 14px;">${user.is_online ? 'Online' : 'Offline'}</span>
                            <button onclick="toggleBan(${user.id}, ${!user.is_banned})" 
                                    style="padding: 2px 5px; font-size: 12px; border-radius: 3px; border: none; ${user.is_banned ? 'background-color: #4CAF50;' : 'background-color: #F44336;'} color: white;">
                                ${user.is_banned ? 'Unban' : 'Ban'}
                            </button>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function getFlagEmoji(countryCode) {
    if (!countryCode || countryCode === 'unknown') return '🌐';
    
    // Convert country code to uppercase and ensure it's only 2 characters
    const code = countryCode.toUpperCase().substring(0, 2);
    
    // Check if the code is valid (only letters)
    if (!/^[A-Z]{2}$/.test(code)) return '🌐';
    
    // Convert to flag emoji
    const codePoints = code
        .split('')
        .map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
}

// Toggle user ban status
async function toggleBan(userId, shouldBan) {
    try {
        const endpoint = shouldBan ? 'ban' : 'unban';
        const response = await fetch(`/api/admin/users/${userId}/${endpoint}`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error(`Failed to ${endpoint} user`);
        }
        
        await loadUsers(); // Refresh the users list
        showSuccess(`User ${shouldBan ? 'banned' : 'unbanned'} successfully`);
    } catch (error) {
        console.error(`Error ${shouldBan ? 'banning' : 'unbanning'} user:`, error);
        showError(`Failed to ${shouldBan ? 'ban' : 'unban'} user`);
    }
}

// Add event listeners for filter controls
function setupFilterControls() {
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const banStatusFilter = document.getElementById('banStatusFilter');
    const sortBy = document.getElementById('sortBy');
    
    if (searchInput) searchInput.addEventListener('input', loadUsers);
    if (statusFilter) statusFilter.addEventListener('change', loadUsers);
    if (banStatusFilter) banStatusFilter.addEventListener('change', loadUsers);
    if (sortBy) sortBy.addEventListener('change', loadUsers);
}

// Add filter controls to the reports section
function addReportFilterControls() {
    const reportsSection = document.getElementById('reports-section');
    const filterControls = document.createElement('div');
    filterControls.className = 'mb-3';
    filterControls.innerHTML = `
        <div class="row g-3">
            <div class="col-md-3">
                <input type="text" class="form-control" id="reportSearchInput" placeholder="Search reports...">
            </div>
            <div class="col-md-3">
                <select class="form-select" id="reportStatusFilter">
                    <option value="">All Reports</option>
                    <option value="pending">Pending</option>
                    <option value="resolved">Resolved</option>
                </select>
            </div>
            <div class="col-md-3">
                <select class="form-select" id="reportTypeFilter">
                    <option value="">All Types</option>
                    <option value="inappropriate_content">Inappropriate Content</option>
                    <option value="harassment">Harassment</option>
                    <option value="spam">Spam</option>
                    <option value="other">Other</option>
                </select>
            </div>
            <div class="col-md-3">
                <select class="form-select" id="reportSortBy">
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                </select>
            </div>
        </div>
    `;
    reportsSection.insertBefore(filterControls, reportsSection.querySelector('h2').nextSibling);
}

// Load reports list
async function loadReports() {
    try {
        const response = await fetch('/api/admin/reports');
        if (!response.ok) {
            throw new Error('Failed to fetch reports');
        }
        const reports = await response.json();
        displayReports(reports);
    } catch (error) {
        console.error('Error loading reports:', error);
        showError('Failed to load reports list');
    }
}

// Display reports in the table
function displayReports(reports) {
    const tbody = document.getElementById('reports-table-body');
    if (!tbody) {
        console.error('Reports table body not found');
        return;
    }
    
    tbody.innerHTML = '';
    
    reports.forEach(report => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${report.reported_nickname || report.reported_id}</td>
            <td>${report.reporter_nickname || report.reporter_id}</td>
            <td>${report.report_reason || report.reason || 'No reason provided'}</td>
            <td>${new Date(report.created_at).toLocaleString()}</td>
            <td>
                <div class="btn-group" role="group">
                    ${report.message_id ? `
                        <button type="button" class="btn btn-sm btn-primary" onclick="viewReportedMessage(${report.message_id})">
                            View Message
                        </button>
                    ` : ''}
                    ${!report.resolved ? `
                        <button type="button" class="btn btn-sm btn-success" onclick="resolveReport(${report.id})">
                            Resolve
                        </button>
                    ` : ''}
                    <button type="button" class="btn btn-sm btn-danger" onclick="toggleBan(${report.reported_id}, true)">
                        Ban User
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// View reported message
async function viewReportedMessage(messageId) {
    try {
        const response = await fetch(`/api/admin/messages/${messageId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch message');
        }
        const message = await response.json();
        
        // Show message in a modal
        const modal = new bootstrap.Modal(document.getElementById('messageModal'));
        document.getElementById('messageContent').textContent = message.content;
        modal.show();
    } catch (error) {
        console.error('Error viewing message:', error);
        showError('Failed to load message');
    }
}

// Resolve a report
async function resolveReport(reportId) {
    try {
        const response = await fetch(`/api/admin/reports/${reportId}/resolve`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error('Failed to resolve report');
        }
        
        await loadReports(); // Refresh the reports list
        showSuccess('Report resolved successfully');
    } catch (error) {
        console.error('Error resolving report:', error);
        showError('Failed to resolve report');
    }
}

// Add event listeners for report filter controls
function setupReportFilterControls() {
    const searchInput = document.getElementById('reportSearchInput');
    const statusFilter = document.getElementById('reportStatusFilter');
    const typeFilter = document.getElementById('reportTypeFilter');
    const sortBy = document.getElementById('reportSortBy');
    
    if (searchInput) searchInput.addEventListener('input', loadReports);
    if (statusFilter) statusFilter.addEventListener('change', loadReports);
    if (typeFilter) typeFilter.addEventListener('change', loadReports);
    if (sortBy) sortBy.addEventListener('change', loadReports);
}

// Initialize
getCurrentAdmin(); 

// Utility functions for showing notifications
function showError(message) {
    const container = document.querySelector('.main-content');
    if (!container) {
        console.error('Main content container not found');
        return;
    }
    
    const alert = document.createElement('div');
    alert.className = 'alert alert-danger alert-dismissible fade show';
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    container.prepend(alert);
    setTimeout(() => alert.remove(), 5000);
}

function showSuccess(message) {
    const container = document.querySelector('.main-content');
    if (!container) {
        console.error('Main content container not found');
        return;
    }
    
    const alert = document.createElement('div');
    alert.className = 'alert alert-success alert-dismissible fade show';
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    container.prepend(alert);
    setTimeout(() => alert.remove(), 5000);
}

// Initialize chat
function initializeChat() {
    console.log('Starting chat initialization...');
    loadChatUsers();
}

// Load chat users
async function loadChatUsers() {
    try {
        const response = await fetch('/api/admin/chat/users');
        if (!response.ok) throw new Error('Failed to fetch users');
        
        const users = await response.json();
        updateUserList(users);
    } catch (error) {
        console.error('Error loading chat users:', error);
        showError('Failed to load users');
    }
}

// Update user list
function updateUserList(users) {
    const userList = document.getElementById('chat-user-list');
    if (!userList) {
        console.error('User list container not found');
        return;
    }

    console.log('Updating user list with:', users);
    userList.innerHTML = '';
    
    if (users.length === 0) {
        userList.innerHTML = '<div class="text-center text-muted">No users found</div>';
        return;
    }

    users.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = `user-item ${user.id === selectedUserId ? 'active' : ''}`;
        userItem.setAttribute('data-user-id', user.id);
        userItem.style.backgroundColor = user.sex === 'male' ? '#E3F2FD' : '#FCE4EC';
        userItem.style.padding = '5px';
        userItem.style.marginBottom = '5px';
        userItem.style.borderRadius = '3px';
        userItem.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <span class="fw-bold">${user.nickname} (${user.age || 'N/A'})</span>
                    ${user.message_count > 0 ? `<small class="text-muted">(${user.message_count} messages)</small>` : ''}
                </div>
                <span class="badge ${user.is_online ? 'bg-success' : 'bg-secondary'}">
                    ${user.is_online ? 'Online' : 'Offline'}
                </span>
            </div>
        `;
        userItem.addEventListener('click', () => selectUser(user.id, user.nickname));
        userList.appendChild(userItem);
    });
}

// Select a user to view their messages
async function selectUser(userId, nickname) {
    selectedUserId = userId;
    
    // Update UI
    document.querySelectorAll('.user-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`.user-item[data-user-id="${userId}"]`)?.classList.add('active');
    
    // Clear and update messages
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) {
        console.error('Messages container not found');
        showError('UI Error: Messages container not found');
        return;
    }

    messagesContainer.innerHTML = `
        <div class="text-center mb-3">
            <h4>Messages for ${nickname}</h4>
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;

    // Load messages
    try {
        console.log('Fetching messages for user:', userId);
        const response = await fetch(`/api/admin/messages/user/${userId}`, {
            credentials: 'include' // Include credentials for session cookie
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch messages');
        }
        
        const messages = await response.json();
        console.log('Received messages:', messages.length);
        
        // Clear loading spinner
        messagesContainer.innerHTML = `
            <div class="text-center mb-3">
                <h4>Messages for ${nickname}</h4>
            </div>
        `;

        if (messages.length === 0) {
            messagesContainer.innerHTML += '<div class="text-center text-muted">No messages found</div>';
            return;
        }
        
        // Group messages by conversation
        const conversations = {};
        messages.forEach(message => {
            const otherParticipantId = message.sender_id === userId ? message.receiver_id : message.sender_id;
            const otherParticipantName = message.participants[otherParticipantId];
            
            if (!conversations[otherParticipantId]) {
                conversations[otherParticipantId] = {
                    name: otherParticipantName,
                    messages: []
                };
            }
            conversations[otherParticipantId].messages.push(message);
        });

        // Display conversations
        Object.entries(conversations).forEach(([participantId, conversation]) => {
            const conversationDiv = document.createElement('div');
            conversationDiv.className = 'conversation mb-4';
            conversationDiv.innerHTML = `
                <h5 class="mb-3">Conversation with ${conversation.name}</h5>
                <div class="messages">
                    ${conversation.messages.map(msg => `
                        <div class="message ${msg.sender_id === userId ? 'received' : 'sent'}">
                            <div class="message-header">
                                <strong>${msg.participants[msg.sender_id]}</strong>
                                <small>${new Date(msg.created_at).toLocaleString()}</small>
                            </div>
                            <div class="message-content">${msg.content}</div>
                        </div>
                    `).join('')}
                </div>
            `;
            messagesContainer.appendChild(conversationDiv);
        });

        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } catch (error) {
        console.error('Error loading messages:', error);
        messagesContainer.innerHTML = `
            <div class="text-center mb-3">
                <h4>Messages for ${nickname}</h4>
                <div class="alert alert-danger">
                    Failed to load messages: ${error.message}
                </div>
            </div>
        `;
        showError(`Failed to load messages: ${error.message}`);
    }
}

// Add event listener for the cleanup button
document.addEventListener('DOMContentLoaded', () => {
    const cleanupButton = document.getElementById('cleanupButton');
    if (cleanupButton) {
        cleanupButton.addEventListener('click', async () => {
            const button = document.getElementById('cleanupButton');
            const resultDiv = document.getElementById('cleanupResult');
            
            try {
                // Disable button and show loading state
                button.disabled = true;
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cleaning...';
                resultDiv.innerHTML = '';

                const response = await fetch('/api/admin/cleanup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to cleanup inactive users');
                }

                const result = await response.json();
                
                // Show results
                resultDiv.innerHTML = `
                    <div class="alert alert-success">
                        <h5>Cleanup Results:</h5>
                        <ul class="mb-0">
                            <li>Deleted Users: ${result.deletedUsers}</li>
                            <li>Deleted Messages: ${result.deletedMessages}</li>
                            <li>Deleted Reports: ${result.deletedReports}</li>
                            <li>Remaining Users: ${result.remainingUsers}</li>
                        </ul>
                    </div>
                `;

                // Refresh the users list
                loadUsers();
            } catch (error) {
                console.error('Cleanup error:', error);
                resultDiv.innerHTML = `
                    <div class="alert alert-danger">
                        Error: ${error.message}
                    </div>
                `;
            } finally {
                // Reset button state
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-broom"></i> Clean Inactive Users (1 hour)';
            }
        });
    }
}); 