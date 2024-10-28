const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const lessonProgressSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // Reference to the user
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true }, // Reference to the lesson
    completedQuestions: { type: Number, default: 0 }, // Tracks the number of completed questions
}, { timestamps: true });

module.exports = mongoose.model('LessonProgress', lessonProgressSchema);
