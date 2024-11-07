const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const QuizResultSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    section: { type: String, enum: ['A', 'B', 'C'], required: true },
    attempt: { type: Number, required: true },
    correctAnswers: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    score: { type: Number, required: true }, // Score percentage
    totalTime: { type: Number, required: true }, // Total time taken in seconds
    passed: { type: Boolean, required: true }, // Whether the user passed or not
    dateAttempted: { type: Date, default: Date.now }
});

module.exports = mongoose.model('QuizResult', QuizResultSchema);
