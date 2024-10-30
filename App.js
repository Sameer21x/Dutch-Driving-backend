const express = require('express');
const mongoose = require('mongoose');
const userRoutes = require('./Routes/UserRoutes');
const lessonRoutes = require('./Routes/LessonRoutes')
const quizRoutes= require('./Routes/QuizRoutes') // Importing  routes
const dotenv = require('dotenv');
const cors = require('cors'); // Import CORS middleware

dotenv.config();
const app = express();

// Middleware
app.use(express.json()); // To parse JSON request bodies
// Configure CORS to allow specific origin
app.use(cors({
  origin: ['https://dutch-driving-backend.vercel.app','http://localhost:3001','https://dutch-driving.vercel.app']
}));
// Database connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => console.error('MongoDB connection error:', err));


  // Root route
app.get('/', (req, res) => {
    res.send('You are connected with Dutch Driving WebApp API');
});

// Routes
app.use('/user', userRoutes);
app.use('/lessons', lessonRoutes); 
app.use('/quiz',quizRoutes);

// Error handling middleware (optional)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'An unexpected error occurred!' });
});

module.exports = app;
