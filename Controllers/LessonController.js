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



module.exports = {
    getAllLessons,
    getLessonQuestions,
    updateLessonProgress
}