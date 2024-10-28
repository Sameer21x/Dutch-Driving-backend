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

        // Send the quiz questions for that section
        res.status(200).json({
            message: `Quiz questions for section ${section} retrieved successfully`,
            // totalQuestions: quiz.questions.length,
            // questions: quiz._id
            quiz,
            questions:quiz.questions._id
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
        if (!quiz || !quiz.questions || quiz.questions.length === 0) {
            return res.status(404).json({ message: `No questions found for section ${section}` });
        }

        let correctAnswers = 0;
        const totalQuestions = quiz.questions.length;

        // Loop through the user's answers and match with the correct answers
        answers.forEach((userAnswer) => {
            // Access the question using the index from the userAnswer
            const questionIndex = parseInt(userAnswer._id.replace('qA', '')) - 1; // Assuming question IDs are like 'qA1', 'qA2', etc.
            const question = quiz.questions[questionIndex];

            console.log(question, "questions printed here");

            if (question) {
                const correctOption = question.answerOptions.find(option => option.isCorrect);

                console.log(`Checking question ID: ${question._id}`);
                console.log(`User selected option: ${userAnswer.selectedOption}`);
                console.log(`Correct option: ${correctOption ? correctOption.optionText : 'None'}`);

                // Compare the user's selected option with the correct option
                if (correctOption && correctOption.optionText === userAnswer.selectedOption) {
                    correctAnswers++;
                }
            }
        });

        // Define passing criteria based on section
        const passingCriteria = { A: 1, B: 1, C: 1 }; // Adjust these values as needed
        const passed = correctAnswers >= passingCriteria[section];

        // Calculate the score percentage
        const score = Math.round((correctAnswers / totalQuestions) * 100);

        // Save the quiz result
        const quizResult = new QuizResult({
            userId,
            section,
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
        console.error('Error in submitQuizAnswers:', error); // Log the error for debugging
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
