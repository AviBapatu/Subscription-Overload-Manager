require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { initCronJobs } = require('./jobs/scheduler');

const app = express();
app.use(cors());
app.use(express.json());

// Main DB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB connection error:', err));



// API Routes
// NOTE: /users/login must be mounted before generic user routes
// to prevent Express matching "login" as an :id param.
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/users', require('./routes/users'));
app.post('/api/users/google', require('./controllers/userController').googleLogin);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    initCronJobs();
});
