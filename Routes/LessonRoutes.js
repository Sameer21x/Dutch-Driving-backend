const express = require('express');
const router = express.Router();
const lessonController = require('../Controllers/LessonController');

// Middleware for logging requests (optional)
router.use((req, res, next) => {
    console.log(`Request Type: ${req.method}, Request URL: ${req.originalUrl}`);
    next();
});

// Lesson Routes
router.get('/', lessonController.getAllLessons); // Fetch all lessons
router.get('/:lessonId/questions', lessonController.getLessonQuestions); // Fetch questions for a specific lesson
router.post('/progress', lessonController.updateLessonProgress);
router.get('/progress', lessonController.getUserProgressAndNextQuestion);

module.exports = router;
