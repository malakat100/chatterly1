// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
    console.log('Checking admin status in middleware - Session:', req.session);
    console.log('User in session:', req.session.user);
    
    if (!req.session.user) {
        console.log('No user session found');
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    if (!req.session.user.is_admin) {
        console.log('User is not an admin');
        return res.status(403).json({ error: 'Unauthorized - Admin access required' });
    }
    
    console.log('Admin access granted');
    next();
};

module.exports = {
    isAdmin
}; 