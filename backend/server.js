const cookieParser = require('cookie-parser');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const carsRoutes = require('./routes/car');
const app = express();
const PORT = process.env.PORT;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api', carsRoutes);

app.get('/', (req, res) => {
  res.send('API is running');
});

app.listen(PORT, () => {
  console.log(`Server running on PORT ${PORT}`);
  console.log(`CORS Origin: ${process.env.CORS_ORIGIN}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV === 'production'}`);
});
