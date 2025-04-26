// Add event listener for the Add Test Users button
document.getElementById('addTestUsersButton').addEventListener('click', async () => {
    const resultDiv = document.getElementById('addTestUsersResult');
    resultDiv.innerHTML = '<div class="alert alert-info">Adding test users...</div>';
    
    try {
        const response = await fetch('/admin/add-test-users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            resultDiv.innerHTML = '<div class="alert alert-success">Test users added successfully!</div>';
            // Refresh the users list
            loadUsers();
        } else {
            resultDiv.innerHTML = `<div class="alert alert-danger">Error: ${data.error}</div>`;
        }
    } catch (error) {
        resultDiv.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
    }
}); 