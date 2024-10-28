const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const lessonQuestionSchema = new Schema({
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true }, // Link to the Lesson
    title: { type: String, required: true },
    questionText: { type: String, required: true },
    questionImage: { type: String }, // Optional field
    explanationAudio: { type: String }, // Optional field
    answerOptions: { // Array of answer options with a correct flag
        type: [
            {
                optionText: { type: String, required: true },
                isCorrect: { type: Boolean, required: true }
            }
        ],
        validate: v => Array.isArray(v) && v.length === 4 // Ensure there are always 4 answer options
    },
}, { timestamps: true });

module.exports = mongoose.model('LessonQuestion', lessonQuestionSchema);
