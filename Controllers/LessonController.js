const Lesson = require('../Models/Lesson');
const LessonQuestion = require('../Models/LessonQuestion');
const LessonProgress = require('../Models/LessonProgress');




// Controller function to get all lessons
async function getAllLessons(req, res) {
    try {
        const lessons = await Lesson.find(); // Retrieve all lessons from DB
        res.status(200).json({
            message: 'Lessons retrieved successfully',
            totalLessons: lessons.length,
            lessons,
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error fetching lessons',
            error,
        });
    }
}


// Controller function to get questions of a specific lesson
async function getLessonQuestions(req, res) {
    const { lessonId } = req.params;

    try {
        const lesson = await Lesson.findById(lessonId);
        if (!lesson) {
            return res.status(404).json({ message: 'Lesson not found' });
        }

        const questions = await LessonQuestion.find({ lessonId }); // Find all questions for the lesson
        res.status(200).json({
            message: `Questions for lesson ${lesson.title} retrieved successfully`,
            totalQuestions: questions.length,
            questions,
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error fetching questions',
            error,
        });
    }
}

// Controller function to update user's progress in a lesson
async function updateLessonProgress(req, res) {
    const { userId, lessonId, completedQuestions } = req.body;

    try {
        let progress = await LessonProgress.findOne({ userId, lessonId });

        if (!progress) {
            // If no progress record exists for the user in this lesson, create one
            progress = new LessonProgress({ userId, lessonId, completedQuestions });
        } else {
            // Update the completed questions
            progress.completedQuestions = completedQuestions;
        }

        await progress.save();
        res.status(200).json({
            message: 'Progress updated successfully',
            progress,
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error updating progress',
            error,
        });
    }
}

// Controller function to get user's completed questions and the next question to answer
async function getUserProgressAndNextQuestion(req, res) {
    const { userId, lessonId } = req.query;

    try {
        // Find the user's progress for this lesson
        const progress = await LessonProgress.findOne({ userId, lessonId });

        // Find all questions for this lesson
        const questions = await LessonQuestion.find({ lessonId }).sort('questionNumber');

        let completedQuestions = [];
        let nextQuestion = null;

        if (progress) {
            completedQuestions = questions.slice(0, progress.completedQuestions);
            nextQuestion = questions[progress.completedQuestions];
        } else {
            // If no progress found, start from the first question
            nextQuestion = questions[0];
        }

        res.status(200).json({
            message: 'User progress and next question retrieved successfully',
            completedQuestions,
            nextQuestion,
            totalQuestions: questions.length
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error fetching user progress and next question',
            error: error.message
        });
    }
}







module.exports = {
    getAllLessons,
    getLessonQuestions,
    updateLessonProgress,
    getUserProgressAndNextQuestion
}