const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const latencyTracker = require('./middleware/latencyMiddleware');
const errorHandler = require('./middleware/errorMiddleware');

// Load env variables
dotenv.config();

const app = express();

// Enable CORS
app.use(cors());

// Parse JSON and URL encoded payloads
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Observability: Measure request latencies
app.use(latencyTracker);

// Import Routes
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const markEntryRoutes = require('./routes/markEntryRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const importRoutes = require('./routes/importRoutes');
const metricRoutes = require('./routes/metricRoutes');
const draftRoutes = require('./routes/draftRoutes');
const userRoutes = require('./routes/userRoutes');

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/mark-entries', markEntryRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/import', importRoutes);
app.use('/api/drafts', draftRoutes);
app.use('/api/users', userRoutes);
app.use('/metrics', metricRoutes);

// Base route health check
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Student Report Card Portal API' });
});

// Centralized Error Handling
app.use(errorHandler);

module.exports = app;
