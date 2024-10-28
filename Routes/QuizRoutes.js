
const express = require('express');
const router = express.Router();
const quizController = require('../Controllers/QuizController');

// Fetch quiz questions for a specific section
router.get('/:section/questions', quizController.getQuizQuestions);

// Submit quiz answers for a specific section
router.post('/submit', quizController.submitQuizAnswers);

// Fetch quiz results for a user
router.get('/results/:userId', quizController.getQuizResults);

module.exports = router;
