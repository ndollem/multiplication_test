// Global variables
let selectedNumbers = [];
let questionCount = 0;
let currentQuestion = 0;
let timer = null;
let score = 0;
let startTime = 0;
let questions = [];
let streak = 0;
let correctStreak = 0;
let questionStartTime = 0;
let averageResponseTime = 0;
let quizLevel = 'easy';
let timePerQuestion = 15; // Default for easy level

// Add these global variables
const DIFFICULTY_SETTINGS = {
    easy: {
        timePerQuestion: 15,
        easyMultiplierChance: 0.3, // 30% chance for x1, x2, x10
        consecutiveEasyLimit: 2,    // Max consecutive easy questions
        multiplierRange: {min: 1, max: 10}
    },
    medium: {
        timePerQuestion: 10,
        easyMultiplierChance: 0.15, // 15% chance for x1, x2, x10
        consecutiveEasyLimit: 1,     // Max 1 consecutive easy question
        multiplierRange: {min: 2, max: 9}
    },
    hard: {
        timePerQuestion: 5,
        easyMultiplierChance: 0.05, // 5% chance for x1, x2, x10
        consecutiveEasyLimit: 0,     // No consecutive easy questions
        multiplierRange: {min: 3, max: 9}
    }
};

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    const numberSelection = document.getElementById('number-selection');
    for (let i = 1; i <= 10; i++) {
        const div = document.createElement('div');
        div.className = 'checkbox-wrapper';
        div.innerHTML = `
            <div class="custom-checkbox" data-value="${i}">
                ${i}
            </div>
        `;
        div.querySelector('.custom-checkbox').addEventListener('click', function() {
            this.classList.toggle('selected');
        });
        numberSelection.appendChild(div);
    }

    // Load statistics from localStorage
    updateStatistics();
    
    document.getElementById('start-quiz').addEventListener('click', startQuiz);
});

function startQuiz() {
    // Reset variables for new quiz
    currentQuestion = 0;
    score = 0;
    streak = 0;
    correctStreak = 0;
    averageResponseTime = 0;

    // Get selected numbers
    selectedNumbers = Array.from(document.querySelectorAll('.custom-checkbox.selected'))
        .map(div => parseInt(div.dataset.value));
    
    if (selectedNumbers.length === 0) {
        showAlert('Please select at least one number!', 'danger');
        return;
    }

    questionCount = parseInt(document.getElementById('quiz-count').value);
    document.getElementById('total-questions').textContent = questionCount;

    // Get selected level and set time
    quizLevel = document.querySelector('input[name="level"]:checked').value;
    timePerQuestion = DIFFICULTY_SETTINGS[quizLevel].timePerQuestion;
    
    generateQuestions();
    document.getElementById('setup-section').classList.add('d-none');
    document.getElementById('quiz-section').classList.remove('d-none');
    
    startTime = Date.now();
    showQuestion();
}

function updateStatistics() {
    const bestScore = localStorage.getItem('bestScore') || '-';
    const avgTime = localStorage.getItem('averageTime') || '-';
    document.getElementById('best-score').textContent = bestScore !== '-' ? bestScore + '%' : '-';
    document.getElementById('avg-time').textContent = avgTime !== '-' ? avgTime + 's' : '-';
}


function generateQuestions() {
    questions = [];
    let previousQuestion = null;
    let consecutiveEasyQuestions = 0;
    const settings = DIFFICULTY_SETTINGS[quizLevel];

    const isEasyMultiplier = (num) => [1, 2, 10].includes(num);
    const usedCombinations = new Set(); // Track used number combinations

    for (let i = 0; i < questionCount; i++) {
        let baseNumber, multiplier, correctAnswer;
        let isValidQuestion = false;

        while (!isValidQuestion) {
            baseNumber = selectedNumbers[Math.floor(Math.random() * selectedNumbers.length)];
            
            // Determine if this should be an easy multiplication
            const allowEasy = Math.random() < settings.easyMultiplierChance && 
                            consecutiveEasyQuestions < settings.consecutiveEasyLimit;

            if (allowEasy) {
                // Generate easy multiplier (1, 2, or 10)
                const easyMultipliers = [1, 2, 10];
                multiplier = easyMultipliers[Math.floor(Math.random() * easyMultipliers.length)];
            } else {
                // Generate multiplier within difficulty range, excluding easy multipliers
                let validMultipliers = [];
                for (let m = settings.multiplierRange.min; m <= settings.multiplierRange.max; m++) {
                    if (!isEasyMultiplier(m)) {
                        validMultipliers.push(m);
                    }
                }
                multiplier = validMultipliers[Math.floor(Math.random() * validMultipliers.length)];
            }

            correctAnswer = baseNumber * multiplier;
            const combination = `${baseNumber}x${multiplier}`;

            // Check if this is a valid question
            isValidQuestion = 
                // Not used before
                !usedCombinations.has(combination) &&
                // Not the same as previous question
                (!previousQuestion || 
                    previousQuestion.baseNumber !== baseNumber || 
                    previousQuestion.multiplier !== multiplier) &&
                // Not the reverse of previous question (e.g., 3x4 after 4x3)
                (!previousQuestion ||
                    !(previousQuestion.baseNumber === multiplier && 
                      previousQuestion.multiplier === baseNumber));
        }

        // Update tracking variables
        usedCombinations.add(`${baseNumber}x${multiplier}`);
        consecutiveEasyQuestions = isEasyMultiplier(multiplier) ? consecutiveEasyQuestions + 1 : 0;

        // Generate wrong answers with improved strategy
        let options = [correctAnswer];
        while (options.length < 4) {
            let wrongAnswer;
            const randomStrategy = Math.random();
            
            if (randomStrategy < 0.4) {
                // Common multiplication mistakes
                const mistakes = [
                    baseNumber * (multiplier + 1),    // Next multiplier
                    baseNumber * (multiplier - 1),    // Previous multiplier
                    (baseNumber + 1) * multiplier,    // Next base number
                    (baseNumber - 1) * multiplier,    // Previous base number
                    baseNumber + multiplier,          // Addition instead of multiplication
                    Math.abs(baseNumber - multiplier) // Subtraction instead of multiplication
                ];
                wrongAnswer = mistakes[Math.floor(Math.random() * mistakes.length)];
            } else if (randomStrategy < 0.7) {
                // Close to correct answer
                const offset = Math.floor(Math.random() * 3) + 1;
                wrongAnswer = correctAnswer + (Math.random() < 0.5 ? offset : -offset);
            } else {
                // Reversed digits of correct answer
                wrongAnswer = parseInt(correctAnswer.toString().split('').reverse().join(''));
                if (wrongAnswer === correctAnswer) {
                    wrongAnswer = correctAnswer + (Math.random() < 0.5 ? 1 : -1);
                }
            }
            
            // Ensure wrong answer is positive and not already in options
            if (wrongAnswer > 0 && !options.includes(wrongAnswer)) {
                options.push(wrongAnswer);
            }
        }
        
        // Shuffle options
        options = options.sort(() => Math.random() - 0.5);
        
        const questionObj = {
            question: `${baseNumber} × ${multiplier} = ?`,
            options: options,
            correctAnswer: correctAnswer,
            baseNumber: baseNumber,
            multiplier: multiplier
        };

        previousQuestion = questionObj;
        questions.push(questionObj);
    }
}

function showQuestion() {
    if (currentQuestion >= questionCount) {
        showResults();
        return;
    }

    questionStartTime = Date.now();
    const question = questions[currentQuestion];
    
    // Update progress
    const progress = (currentQuestion / questionCount) * 100;
    document.getElementById('quiz-progress').style.width = `${progress}%`;
    
    // Show question with animation
    const questionContainer = document.getElementById('question-container');
    questionContainer.innerHTML = `
        <div class="question-text fade-in">
            ${question.question}
        </div>
    `;
    
    // Show options with staggered animation
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';
    question.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'btn btn-outline-primary btn-lg option-button fade-in';
        button.style.animationDelay = `${index * 0.1}s`;
        button.textContent = option;
        button.onclick = () => checkAnswer(option);
        optionsContainer.appendChild(button);
    });

    resetTimer();
}

function resetTimer() {
    clearInterval(timer);
    let timeLeft = timePerQuestion;
    const timerElement = document.getElementById('timer');
    timerElement.textContent = timeLeft;
    timerElement.classList.remove('timer-warning');
    
    timer = setInterval(() => {
        timeLeft--;
        timerElement.textContent = timeLeft;
        
        // Add warning color when time is running low
        if (timeLeft <= Math.ceil(timePerQuestion * 0.3)) { // Warning at 30% time remaining
            timerElement.classList.add('timer-warning');
        }
        
        if (timeLeft <= 0) {
            clearInterval(timer);
            checkAnswer(null); // Time's up, move to next question
        }
    }, 1000);
}

function checkAnswer(answer) {
    clearInterval(timer);
    const correct = answer === questions[currentQuestion].correctAnswer;
    const responseTime = (Date.now() - questionStartTime) / 1000;
    averageResponseTime = (averageResponseTime * currentQuestion + responseTime) / (currentQuestion + 1);

    if (correct) {
        correctStreak++;
        score += (100 / questionCount);
        if (correctStreak >= 3) {
            showStreak();
        }
    } else {
        correctStreak = 0;
        hideStreak();
    }

    // Show feedback with icons
    const options = document.querySelectorAll('.option-button');
    options.forEach(button => {
        button.disabled = true;
        const buttonValue = parseInt(button.textContent);
        
        if (buttonValue === questions[currentQuestion].correctAnswer) {
            button.classList.add('btn-success');
            // Add correct icon
            const icon = document.createElement('span');
            icon.className = 'answer-icon pop-in';
            icon.innerHTML = '✅';
            button.appendChild(icon);
        } 
        
        if (buttonValue === answer && !correct) {
            button.classList.add('btn-danger');
            // Add wrong icon
            const icon = document.createElement('span');
            icon.className = 'answer-icon pop-in';
            icon.innerHTML = '❌';
            button.appendChild(icon);
        }
    });

    // Play sound based on answer correctness
    playSound(correct);

    // Wait a moment before moving to next question
    setTimeout(() => {
        currentQuestion++;
        showQuestion();
    }, 1500); // Increased delay to 1.5s to better see the feedback
}

// Add this new function for playing sounds
function playSound(correct) {
    const audio = new Audio();
    if (correct) {
        audio.src = 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3'; // Success sound
    } else {
        audio.src = 'https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3'; // Error sound
    }
    audio.play().catch(error => console.log('Sound play failed:', error));
}

function showStreak() {
    const streakBadge = document.getElementById('streak-badge');
    streakBadge.classList.remove('d-none');
    document.getElementById('streak-count').textContent = correctStreak;
}

function hideStreak() {
    document.getElementById('streak-badge').classList.add('d-none');
}

function showResults() {
    const timeTaken = Math.round((Date.now() - startTime) / 1000);
    const finalScore = Math.round(score);

    // Format selected numbers for display
    const selectedNumbersText = selectedNumbers
        .sort((a, b) => a - b) // Sort numbers in ascending order
        .join(', ');
    
    // Update best score
    const currentBest = localStorage.getItem('bestScore') || 0;
    if (finalScore > currentBest) {
        localStorage.setItem('bestScore', finalScore);
    }
    
    // Update average time
    localStorage.setItem('averageTime', Math.round(averageResponseTime));

    let status, alertClass, emoji;
    if (finalScore >= 91) {
        status = 'Excellent!';
        alertClass = 'alert-success';
        emoji = '🏆';
    } else if (finalScore >= 71) {
        status = 'Good';
        alertClass = 'alert-info';
        emoji = '👍';
    } else if (finalScore >= 61) {
        status = 'Fair';
        alertClass = 'alert-warning';
        emoji = '😊';
    } else {
        status = 'Failed';
        alertClass = 'alert-danger';
        emoji = '😢';
    }

    document.getElementById('quiz-section').classList.add('d-none');
    document.getElementById('results-section').classList.remove('d-none');
    
    document.getElementById('results-section').innerHTML = `
        <div class="text-center fade-in">
            <h1 class="display-1 mb-4">${emoji}</h1>
            <div class="alert ${alertClass}">
                <h2 class="display-4">${finalScore}%</h2>
                <h3 class="mb-3">${status}</h3>
            </div>
            <div class="stats-container">
                <h4>Quiz Statistics</h4>
                <p>Multiplication Tables: ${selectedNumbersText}</p>
                <p>Difficulty Level: ${quizLevel.charAt(0).toUpperCase() + quizLevel.slice(1)}</p>
                <p>Time per question: ${timePerQuestion} seconds</p>
                <p>Time taken: ${timeTaken} seconds</p>
                <p>Average response time: ${Math.round(averageResponseTime)} seconds per question</p>
                <p>Correct answers: ${Math.round(score / (100 / questionCount))} out of ${questionCount}</p>
                <p>Longest streak: ${correctStreak} correct in a row</p>
            </div>
            <button class="btn btn-primary btn-lg mt-4" onclick="location.reload()">Try Again</button>
        </div>
    `;
}

function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.querySelector('.container').insertBefore(alertDiv, document.querySelector('.card'));
    setTimeout(() => alertDiv.remove(), 3000);
}
