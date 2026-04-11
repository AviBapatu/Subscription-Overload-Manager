require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { agenda } = require('./agenda');
const { createExpressMiddleware: Agendash } = require('agendash');

const app = express();
app.use(cors());
app.use(express.json());

// Main DB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected - Main Connection'))
  .catch(err => console.error(err));

// Agenda Dashboard
app.use('/dash', Agendash(agenda));

// Routes
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/users', require('./routes/users'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
