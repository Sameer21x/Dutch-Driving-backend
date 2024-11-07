const Quiz = require('../Models/Quiz');
const QuizResult = require('../Models/QuizResult');

// Controller function to get quiz questions for a specific section
async function getQuizQuestions(req, res) {
    const { section } = req.params;

    try {
        // Fetch the quiz for the specific section
        const quiz = await Quiz.findOne({ section: section });

        if (!quiz) {
            return res.status(404).json({ message: `No questions found for section ${section}` });
        }

        res.status(200).json({
            message: `Quiz questions for section ${section} retrieved successfully`,
            quiz: quiz.toObject() // Ensure all fields, including _id, are preserved
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error fetching quiz questions',
            error,
        });
    }
}







// Controller function to submit quiz answers for a specific section
async function submitQuizAnswers(req, res) {
    console.log('Submit quiz answers called');
    const { userId, section, answers, totalTime } = req.body;

    try {
        // Fetch the quiz based on the section
        const quiz = await Quiz.findOne({ section: section });

        // Check if the quiz exists and has questions
        if (!quiz) {
            console.error(`No quiz found for section ${section}`);
            return res.status(404).json({ message: `No quiz found for section ${section}` });
        }
        if (!quiz.questions || quiz.questions.length === 0) {
            console.error(`No questions found in quiz for section ${section}`);
            return res.status(404).json({ message: `No questions found for section ${section}` });
        }

        console.log(`Quiz for section ${section} fetched successfully with ${quiz.questions.length} questions.`);

        let correctAnswers = 0;
        const totalQuestions = quiz.questions.length;

        // Loop through the user's answers and match with the correct answers
        answers.forEach((userAnswer, index) => {
            if (!userAnswer._id || !/^q[A-Z]\d+$/.test(userAnswer._id)) {
                console.error(`Invalid question ID format: ${userAnswer._id}`);
                return;
            }

            const questionIndex = parseInt(userAnswer._id.replace(`q${section}`, '')) - 1;

            if (isNaN(questionIndex) || questionIndex < 0 || questionIndex >= quiz.questions.length) {
                console.error(`Invalid question index: ${questionIndex} for section ${section}`);
                return;
            }

            const question = quiz.questions[questionIndex];
            console.log(`Processing question:`, question);

            if (question) {
                const correctOption = question.answerOptions.find(option => option.isCorrect);
                console.log(`Checking question ID: ${question._id}`);
                console.log(`User selected option: ${userAnswer.selectedOption}`);
                console.log(`Correct option: ${correctOption ? correctOption.optionText : 'None'}`);

                if (correctOption && correctOption.optionText === userAnswer.selectedOption) {
                    correctAnswers++;
                }
            } else {
                console.error(`Question not found at index ${questionIndex} for section ${section}`);
            }
        });

        // Define passing criteria based on section
        const passingCriteria = { A: 1, B: 1, C: 1 };
        const passed = correctAnswers >= passingCriteria[section];

        // Calculate the score percentage
        const score = Math.round((correctAnswers / totalQuestions) * 100);

        // Get the highest attempt number for the user in the given section
        const previousAttempts = await QuizResult.find({ userId, section }).sort({ attempt: -1 }).limit(1);
        const attempt = previousAttempts.length > 0 ? previousAttempts[0].attempt + 1 : 1;

        // Save the quiz result with the new attempt number
        const quizResult = new QuizResult({
            userId,
            section,
            attempt,
            correctAnswers,
            totalQuestions,
            score,
            totalTime,
            passed,
        });

        await quizResult.save();

        res.status(200).json({
            message: 'Quiz submitted successfully',
            result: quizResult,
        });
    } catch (error) {
        console.error('Error in submitQuizAnswers:', error);
        res.status(500).json({
            message: 'Error submitting quiz',
            error,
        });
    }
}






// Controller function to fetch quiz results for a user
async function getQuizResults(req, res) {
    const { userId } = req.params;

    try {
        const quizResults = await QuizResult.find({ userId });

        if (!quizResults || quizResults.length === 0) {
            return res.status(404).json({ message: 'No quiz results found for this user' });
        }

        res.status(200).json({
            message: 'Quiz results for user retrieved successfully',
            results: quizResults,
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error fetching quiz results',
            error,
        });
    }
}


module.exports = {
    getQuizQuestions,
    submitQuizAnswers,
    getQuizResults
};
