const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const AnswerOptionSchema = new mongoose.Schema({
    optionText: { type: String, required: true },
    isCorrect: { type: Boolean, required: true }
});

const QuestionSchema = new Schema({
    section: { type: String, enum: ['A', 'B', 'C'], required: true }, // Section A, B, or C
    questionText: { type: String, required: true },
    questionImage: { type: String, default: null }, // Optional image URL
    timer: { type: Number, required: true }, // Time limit in seconds for each question
    answerOptions: [AnswerOptionSchema], // Four answer options
    correctAnswer: { type: Number, required: true }, // Index of the correct answer (0-3)
}, { _id: true });

const QuizSchema = new mongoose.Schema({
    questions: [QuestionSchema]
});

module.exports = mongoose.model('Quiz', QuizSchema);
