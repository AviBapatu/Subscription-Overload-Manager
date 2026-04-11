const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'som_secret_key_123';

const auth = (req, res, next) => {
    // Expected header: 'Authorization: Bearer <token>'
    const authHeader = req.header('Authorization');
    if (!authHeader) return res.status(401).json({ error: 'Access denied. No token provided.' });

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access denied. Malformed token.' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // attach decoded user payload containing 'id'
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid or expired token.' });
    }
};

module.exports = auth;
