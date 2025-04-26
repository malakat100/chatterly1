const socket = io();
let currentUser = null;
let selectedUser = null;
let allUsers = []; // Store all users for filtering

// Get current user from server session
async function getCurrentUser() {
    try {
        const response = await fetch('/api/current-user');
        if (response.ok) {
            currentUser = await response.json();
            if (currentUser) {
                document.getElementById('currentUser').textContent = currentUser.nickname;
                socket.emit('user_online', currentUser);
            } else {
                window.location.href = '/'; // Redirect to registration if no user
            }
        }
    } catch (error) {
        console.error('Error getting current user:', error);
        window.location.href = '/';
    }
}

// Initialize
getCurrentUser();

// Handle logout button click
document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST',
            credentials: 'include'
        });
        
        if (response.ok) {
            window.location.href = '/'; // Redirect to home page after logout
        } else {
            console.error('Logout failed:', await response.text());
        }
    } catch (error) {
        console.error('Error during logout:', error);
    }
});

// Handle socket connection
socket.on('connect', () => {
    console.log('Socket connected successfully');
    // Request online users list
    socket.emit('get_online_users');
    console.log('Requested online users list');
    
    // Start sending activity updates
    setInterval(() => {
        socket.emit('user_activity');
    }, 30000); // Send activity update every 30 seconds
});

// Handle ban notification
socket.on('banned', (data) => {
    console.log('Received ban notification:', data);
    alert(data.message);
    // Redirect to home page after a short delay
    setTimeout(() => {
        window.location.href = '/';
    }, 2000);
});

// Handle online users list
socket.on('online_users', (users) => {
    console.log('Received online users event');
    console.log('Users data:', users);
    allUsers = users; // Store all users
    updateUserList(users); // Update the user list directly
});

function getFlagEmoji(countryCode) {
    if (!countryCode || countryCode === 'unknown') return '🌐';
    
    // Extract country code from location string (e.g., "Dubai, United Arab Emirates" -> "AE")
    let code = countryCode;
    if (countryCode.includes(',')) {
        const countryName = countryCode.split(',').pop().trim();
        // Map country names to codes
        const countryMap = {
            'United Arab Emirates': 'AE',
            'United States': 'US',
            'United Kingdom': 'GB',
            'Canada': 'CA',
            'Australia': 'AU',
            'India': 'IN',
            'Germany': 'DE',
            'France': 'FR',
            'Italy': 'IT',
            'Spain': 'ES',
            'Brazil': 'BR',
            'Japan': 'JP',
            'China': 'CN',
            'Russia': 'RU',
            'South Korea': 'KR',
            'Mexico': 'MX',
            'Netherlands': 'NL',
            'Switzerland': 'CH',
            'Sweden': 'SE',
            'Norway': 'NO',
            'Denmark': 'DK',
            'Finland': 'FI',
            'Belgium': 'BE',
            'Austria': 'AT',
            'Portugal': 'PT',
            'Ireland': 'IE',
            'New Zealand': 'NZ',
            'Singapore': 'SG',
            'Malaysia': 'MY',
            'Thailand': 'TH',
            'Vietnam': 'VN',
            'Philippines': 'PH',
            'Indonesia': 'ID',
            'Saudi Arabia': 'SA',
            'Qatar': 'QA',
            'Kuwait': 'KW',
            'Oman': 'OM',
            'Bahrain': 'BH'
        };
        code = countryMap[countryName] || '🌐';
    }
    
    // Convert to uppercase and ensure it's only 2 characters
    code = code.toUpperCase().substring(0, 2);
    
    // Check if the code is valid (only letters)
    if (!/^[A-Z]{2}$/.test(code)) return '🌐';
    
    // Convert to flag emoji
    const codePoints = code
        .split('')
        .map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
}

// Handle socket disconnection
socket.on('disconnect', () => {
    console.log('Socket disconnected');
});

// Handle beforeunload event (when user closes browser/tab)
window.addEventListener('beforeunload', async () => {
    try {
        // Send logout request
        await fetch('/api/logout', {
            method: 'POST',
            credentials: 'include'
        });
    } catch (error) {
        console.error('Error during logout:', error);
    }
});

// Request online users list periodically
setInterval(() => {
    if (socket.connected) {
        socket.emit('get_online_users');
        console.log('Requested online users list');
    }
}, 5000); // Request every 5 seconds

// Handle socket errors
socket.on('error', (error) => {
    console.error('Socket error:', error);
});

socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
});

// Handle private messages
socket.on('private message', (data) => {
    if (data.from === selectedUser?.id) {
        appendMessage(data.message, false);
    } else {
        // If message is from someone else, update inbox count
        updateInboxBadge();
    }
});

// Select user to chat with
function selectUser(user) {
    // Remove active class from all user items
    document.querySelectorAll('.user-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to selected user
    const selectedElement = Array.from(document.querySelectorAll('.user-item'))
        .find(item => item.textContent === user.nickname);
    if (selectedElement) {
        selectedElement.classList.add('active');
    }
    
    selectedUser = user;
    document.getElementById('messages').innerHTML = '';
    document.getElementById('messageInput').disabled = false;
    document.getElementById('messageInput').placeholder = `Message ${user.nickname}...`;
    document.getElementById('chatWith').textContent = `Chatting with ${user.nickname}`;
    document.getElementById('reportBtn').style.display = 'block';
    loadConversation(user.id);
}

// Load conversation history
async function loadConversation(userId) {
    try {
        const response = await fetch(`/api/conversation/${userId}`);
        if (!response.ok) {
            throw new Error('Failed to load conversation');
        }
        const messages = await response.json();
        
        messages.forEach(message => {
            appendMessage(message.content, message.sender_id === currentUser.id);
        });
    } catch (error) {
        console.error('Error loading conversation:', error);
        appendMessage('Error loading conversation history', false);
    }
}

// Send message
document.getElementById('messageForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    if (!selectedUser) {
        alert('Please select a user to chat with');
        return;
    }

    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (message) {
        socket.emit('private message', {
            to: selectedUser.id,
            message: message
        });
        
        appendMessage(message, true);
        messageInput.value = '';
    }
});

// Append message to chat
function appendMessage(message, isSent) {
    const messagesDiv = document.getElementById('messages');
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isSent ? 'sent' : 'received'}`;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.textContent = message;
    
    messageElement.appendChild(messageContent);
    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Handle tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all tabs
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        // Add active class to clicked tab
        btn.classList.add('active');
        
        // Show/hide appropriate list
        if (btn.dataset.tab === 'online') {
            document.getElementById('usersList').style.display = 'block';
            document.getElementById('inboxList').style.display = 'none';
        } else {
            document.getElementById('usersList').style.display = 'none';
            document.getElementById('inboxList').style.display = 'block';
            loadInbox();
        }
    });
});

// Update inbox badge
async function updateInboxBadge() {
    try {
        const response = await fetch('/api/inbox');
        if (!response.ok) {
            throw new Error('Failed to load inbox');
        }
        const conversations = await response.json();
        
        // Update inbox tab badge
        const totalUnread = conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
        const inboxTab = document.querySelector('.tab-btn[data-tab="inbox"]');
        if (totalUnread > 0) {
            inboxTab.innerHTML = `Inbox <span class="badge">${totalUnread}</span>`;
        } else {
            inboxTab.innerHTML = 'Inbox';
        }
    } catch (error) {
        console.error('Error updating inbox badge:', error);
    }
}

// Load inbox
async function loadInbox() {
    try {
        const response = await fetch('/api/inbox');
        if (!response.ok) {
            throw new Error('Failed to load inbox');
        }
        const conversations = await response.json();
        
        const inboxList = document.getElementById('inboxList');
        inboxList.innerHTML = '<h2>Inbox</h2>';
        
        // Update inbox tab badge
        const totalUnread = conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
        const inboxTab = document.querySelector('.tab-btn[data-tab="inbox"]');
        if (totalUnread > 0) {
            inboxTab.innerHTML = `Inbox <span class="badge">${totalUnread}</span>`;
        } else {
            inboxTab.innerHTML = 'Inbox';
        }
        
        conversations.forEach(conversation => {
            const conversationElement = document.createElement('div');
            conversationElement.className = 'conversation-item';
            if (conversation.unread_count > 0) {
                conversationElement.classList.add('unread');
            }
            
            const time = new Date(conversation.last_message_time).toLocaleString();
            conversationElement.innerHTML = `
                <div class="conversation-header">
                    <div class="conversation-info">
                        <span class="nickname">${conversation.nickname}</span>
                        ${conversation.unread_count > 0 ? `<span class="unread-badge">${conversation.unread_count}</span>` : ''}
                    </div>
                    <span class="time">${time}</span>
                </div>
                <div class="last-message">${conversation.last_message || 'No messages yet'}</div>
            `;
            
            conversationElement.onclick = () => {
                selectUser({
                    id: conversation.user_id,
                    nickname: conversation.nickname
                });
                // Mark messages as read when opening conversation
                if (conversation.unread_count > 0) {
                    markMessagesAsRead(conversation.user_id);
                }
            };
            
            inboxList.appendChild(conversationElement);
        });
    } catch (error) {
        console.error('Error loading inbox:', error);
        const inboxList = document.getElementById('inboxList');
        inboxList.innerHTML = '<h2>Inbox</h2><div class="error">Error loading conversations</div>';
    }
}

// Mark messages as read
async function markMessagesAsRead(userId) {
    try {
        await fetch(`/api/mark-read/${userId}`, {
            method: 'POST'
        });
        // Reload inbox to update unread counts
        loadInbox();
    } catch (error) {
        console.error('Error marking messages as read:', error);
    }
}

// Handle report button click
document.getElementById('reportBtn').addEventListener('click', () => {
    if (!selectedUser) return;
    
    const modal = document.getElementById('reportModal');
    modal.style.display = 'block';
});

// Handle report form submission
document.getElementById('reportForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!selectedUser) return;
    
    const reason = document.getElementById('reportReason').value.trim();
    if (!reason) return;
    
    try {
        const response = await fetch('/api/report-user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                reportedId: selectedUser.id,
                reason: reason
            })
        });
        
        if (response.ok) {
            alert('User reported successfully');
            document.getElementById('reportModal').style.display = 'none';
            document.getElementById('reportReason').value = '';
        } else {
            throw new Error('Failed to report user');
        }
    } catch (error) {
        console.error('Error reporting user:', error);
        alert('Failed to report user. Please try again.');
    }
});

// Handle modal close buttons
document.querySelector('.cancel-btn').addEventListener('click', () => {
    document.getElementById('reportModal').style.display = 'none';
    document.getElementById('reportReason').value = '';
});

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    const modal = document.getElementById('reportModal');
    if (e.target === modal) {
        modal.style.display = 'none';
        document.getElementById('reportReason').value = '';
    }
});

function updateUserList(users) {
    const userList = document.getElementById('usersList');
    if (!userList) return;
    
    // Keep the h2 heading
    const h2 = userList.querySelector('h2');
    userList.innerHTML = '';
    if (h2) userList.appendChild(h2);
    
    if (users && users.length > 0) {
        users.forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'user-item';
            userItem.style.cssText = `
                display: flex;
                align-items: center;
                padding: 5px 10px;
                margin-bottom: 5px;
                border-radius: 4px;
                cursor: pointer;
                background-color: ${user.sex === 'male' ? '#E3F2FD' : '#FCE4EC'};
            `;
            
            // Get gender symbol
            const genderSymbol = user.sex === 'male' ? '♂' : '♀';
            
            // Extract country code from location
            let countryCode = '🌐';
            if (user.location && user.location.includes(',')) {
                const countryName = user.location.split(',').pop().trim();
                const countryMap = {
                    'United Arab Emirates': '🇦🇪',
                    'United States': '🇺🇸',
                    'United Kingdom': '🇬🇧',
                    'Canada': '🇨🇦',
                    'Australia': '🇦🇺',
                    'India': '🇮🇳',
                    'Germany': '🇩🇪',
                    'France': '🇫🇷',
                    'Italy': '🇮🇹',
                    'Spain': '🇪🇸',
                    'Brazil': '🇧🇷',
                    'Japan': '🇯🇵',
                    'China': '🇨🇳',
                    'Russia': '🇷🇺',
                    'South Korea': '🇰🇷',
                    'Mexico': '🇲🇽',
                    'Netherlands': '🇳🇱',
                    'Switzerland': '🇨🇭',
                    'Sweden': '🇸🇪',
                    'Norway': '🇳🇴',
                    'Denmark': '🇩🇰',
                    'Finland': '🇫🇮',
                    'Belgium': '🇧🇪',
                    'Austria': '🇦🇹',
                    'Portugal': '🇵🇹',
                    'Ireland': '🇮🇪',
                    'New Zealand': '🇳🇿',
                    'Singapore': '🇸🇬',
                    'Malaysia': '🇲🇾',
                    'Thailand': '🇹🇭',
                    'Vietnam': '🇻🇳',
                    'Philippines': '🇵🇭',
                    'Indonesia': '🇮🇩',
                    'Saudi Arabia': '🇸🇦',
                    'Qatar': '🇶🇦',
                    'Kuwait': '🇰🇼',
                    'Oman': '🇴🇲',
                    'Bahrain': '🇧🇭'
                };
                countryCode = countryMap[countryName] || '🌐';
            }
            
            userItem.innerHTML = `
                <span style="margin-right: 10px;">${countryCode} ${genderSymbol}</span>
                <span style="flex-grow: 1;">${user.nickname} (${user.age || 'N/A'})</span>
                <span style="margin-left: 10px;">${user.is_online ? '🟢' : '⚪'}</span>
            `;
            
            userItem.onclick = () => selectUser(user);
            userList.appendChild(userItem);
        });
    } else {
        const noUsersItem = document.createElement('div');
        noUsersItem.className = 'user-item';
        noUsersItem.textContent = 'No online users';
        userList.appendChild(noUsersItem);
    }
}

// Filter users based on search term
function filterUsers(searchTerm) {
    if (!searchTerm) {
        updateUserList(allUsers);
        return;
    }

    const filteredUsers = allUsers.filter(user => {
        const nickname = user.nickname.toLowerCase();
        const sex = user.sex.toLowerCase();
        const location = user.location ? user.location.toLowerCase() : '';
        
        return nickname.includes(searchTerm) || 
               sex.includes(searchTerm) || 
               location.includes(searchTerm);
    });

    updateUserList(filteredUsers);
}

// Search Panel Functionality
document.getElementById('searchBtn').addEventListener('click', () => {
    const searchPanel = document.getElementById('searchPanel');
    searchPanel.classList.add('active');
});

document.getElementById('closeSearchBtn').addEventListener('click', () => {
    const searchPanel = document.getElementById('searchPanel');
    searchPanel.classList.remove('active');
});

document.getElementById('searchSubmitBtn').addEventListener('click', () => {
    const filters = {
        nickname: document.getElementById('searchNickname').value,
        sex: document.getElementById('searchSex').value,
        country: document.getElementById('searchCountry').value,
        minAge: document.getElementById('minAge').value,
        maxAge: document.getElementById('maxAge').value
    };

    // Emit search event to server
    socket.emit('searchUsers', filters);
});

socket.on('searchResults', (users) => {
    updateUserList(users);
    const searchPanel = document.getElementById('searchPanel');
    searchPanel.classList.remove('active');
});