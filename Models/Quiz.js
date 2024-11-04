const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AnswerOptionSchema = new Schema({
    optionText: { type: String, required: true },
    isCorrect: { type: Boolean, required: true }
});

const QuestionSchema = new Schema({
    _id: { type: String, required: true }, // Custom ID like "qC1", "qC2", etc.
    section: { type: String, enum: ['A', 'B', 'C'], required: true }, // Section A, B, or C
    questionText: { type: String, required: true },
    questionImage: { type: String, default: null }, // Optional image URL
    timer: { type: Number, required: true }, // Time limit in seconds for each question
    answerOptions: [AnswerOptionSchema], // Array of answer options
    correctAnswer: { type: Number, required: true } // Index of the correct answer (0-3)
});

const QuizSchema = new Schema({
    questions: [QuestionSchema]
});

module.exports = mongoose.model('Quiz', QuizSchema);
