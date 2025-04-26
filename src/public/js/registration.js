document.getElementById('registrationForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
        nickname: document.getElementById('nickname').value,
        age: parseInt(document.getElementById('age').value),
        sex: document.getElementById('sex').value
    };

    console.log('Form data:', formData);

    try {
        // Default values for IP and location
        let ip = '127.0.0.1';
        let location = 'Unknown';

        try {
            // Try to get IP and location data
            const ipResponse = await fetch('https://api.ipify.org?format=json');
            if (ipResponse.ok) {
                const ipData = await ipResponse.json();
                ip = ipData.ip;
                console.log('Got IP:', ip);
                
                // Try to get location data
                const locationResponse = await fetch(`https://ipapi.co/${ip}/json/`);
                if (locationResponse.ok) {
                    const locationData = await locationResponse.json();
                    location = `${locationData.city || 'Unknown'}, ${locationData.country_name || 'Unknown'}`;
                    console.log('Got location:', location);
                }
            }
        } catch (error) {
            console.warn('Could not fetch IP/location data:', error);
        }

        const userData = {
            ...formData,
            ip: ip,
            location: location
        };

        console.log('Sending registration data:', userData);

        // Send registration data to server
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });

        console.log('Response status:', response.status);
        
        if (response.ok) {
            // Redirect to chat page - user data is stored in server session
            window.location.href = '/chat';
        } else {
            const errorData = await response.json();
            console.log('Error response:', errorData);
            throw new Error(errorData.error || 'Registration failed');
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert(`Registration failed: ${error.message}`);
    }
}); 