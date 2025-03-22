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
        timePerQuestion: 15    // 15 seconds per question
    },
    medium: {
        timePerQuestion: 10    // 10 seconds per question
    },
    hard: {
        timePerQuestion: 5     // 5 seconds per question
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


async function startQuiz() {
    try {
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
            showAlert('Silakan pilih minimal satu angka!', 'danger');
            return;
        }

        questionCount = parseInt(document.getElementById('quiz-count').value);
        
        // Show loading indicator
        document.getElementById('start-quiz').disabled = true;
        document.getElementById('start-quiz').innerHTML = `
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            Mempersiapkan Kuis...
        `;

        document.getElementById('total-questions').textContent = questionCount;

        quizLevel = document.querySelector('input[name="level"]:checked').value;
        timePerQuestion = DIFFICULTY_SETTINGS[quizLevel].timePerQuestion;
        
        // Generate questions asynchronously with timeout
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Generation timeout')), 5000));
        
        const generationPromise = generateQuestionsAsync();
        
        await Promise.race([generationPromise, timeoutPromise]);
        
        if (questions.length === questionCount) {
            document.getElementById('setup-section').classList.add('d-none');
            document.getElementById('quiz-section').classList.remove('d-none');
            
            startTime = Date.now();
            showQuestion();
        } else {
            throw new Error('Not enough questions generated');
        }
    } catch (error) {
        console.error('Quiz preparation error:', error);
        let errorMessage = 'Terjadi kesalahan saat menyiapkan kuis. ';
        
        if (error.message === 'Generation timeout') {
            errorMessage += 'Silakan coba dengan jumlah pertanyaan lebih sedikit atau pilih lebih banyak angka.';
        } else if (error.message === 'Not enough questions generated') {
            errorMessage += 'Silakan pilih lebih banyak angka atau kurangi jumlah pertanyaan.';
        } else {
            errorMessage += 'Silakan coba lagi.';
        }
        
        showAlert(errorMessage, 'danger');
        document.getElementById('start-quiz').disabled = false;
        document.getElementById('start-quiz').innerHTML = 'Mulai Kuis';
    }
}

function updateStatistics() {
    const bestScore = localStorage.getItem('bestScore') || '-';
    const avgTime = localStorage.getItem('averageTime') || '-';
    document.getElementById('best-score').textContent = bestScore !== '-' ? bestScore + '%' : '-';
    document.getElementById('avg-time').textContent = avgTime !== '-' ? avgTime + ' detik' : '-';
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
        status = 'Sempurna!';
        alertClass = 'alert-success';
        emoji = '🏆';
    } else if (finalScore >= 71) {
        status = 'Bagus';
        alertClass = 'alert-info';
        emoji = '👍';
    } else if (finalScore >= 61) {
        status = 'Cukup';
        alertClass = 'alert-warning';
        emoji = '😊';
    } else {
        status = 'Gagal';
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
                <h4>Statistik Kuis</h4>
                <p>Tabel Perkalian: ${selectedNumbersText}</p>
                <p>Tingkat Kesulitan: ${translateDifficulty(quizLevel)}</p>
                <p>Waktu per pertanyaan: ${timePerQuestion} detik</p>
                <p>Waktu yang digunakan: ${timeTaken} detik</p>
                <p>Waktu respons rata-rata: ${Math.round(averageResponseTime)} detik per pertanyaan</p>
                <p>Jawaban benar: ${Math.round(score / (100 / questionCount))} dari ${questionCount}</p>
                <p>Rentetan terpanjang: ${correctStreak} benar berturut-turut</p>
            </div>
            <button class="btn btn-primary btn-lg mt-4" onclick="location.reload()">Coba Lagi</button>
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

async function generateQuestionsAsync() {
    questions = [];
    const usedCombinations = new Set();
    let totalAttempts = 0;
    const maxTotalAttempts = questionCount * 10;
    
    const generateChunk = () => {
        const startLength = questions.length;
        let chunkAttempts = 0;
        const maxChunkAttempts = 20;

        while (questions.length < questionCount && chunkAttempts < maxChunkAttempts && totalAttempts < maxTotalAttempts) {
            chunkAttempts++;
            totalAttempts++;
            
            const baseNumber = selectedNumbers[Math.floor(Math.random() * selectedNumbers.length)];
            const multiplier = Math.floor(Math.random() * 10) + 1; // Random number 1-10
            const combination = `${baseNumber}x${multiplier}`;

            // Check if this combination hasn't been used
            if (!usedCombinations.has(combination)) {
                const correctAnswer = baseNumber * multiplier;
                
                // Generate wrong answers
                const options = [correctAnswer];
                const mistakes = [
                    baseNumber * (multiplier + 1),
                    baseNumber * (multiplier - 1),
                    (baseNumber + 1) * multiplier,
                    (baseNumber - 1) * multiplier,
                    baseNumber + multiplier,
                    correctAnswer + 1,
                    correctAnswer - 1
                ];

                // Shuffle and select unique wrong answers
                while (options.length < 4) {
                    const wrongAnswer = mistakes[Math.floor(Math.random() * mistakes.length)];
                    if (wrongAnswer > 0 && !options.includes(wrongAnswer)) {
                        options.push(wrongAnswer);
                    }
                }

                const questionObj = {
                    question: `${baseNumber} × ${multiplier} = ?`,
                    options: options.sort(() => Math.random() - 0.5),
                    correctAnswer: correctAnswer,
                    baseNumber: baseNumber,
                    multiplier: multiplier
                };

                usedCombinations.add(combination);
                questions.push(questionObj);
            }
        }

        return questions.length - startLength;
    };

    while (questions.length < questionCount && totalAttempts < maxTotalAttempts) {
        const questionsGenerated = generateChunk();
        if (questionsGenerated === 0) {
            usedCombinations.clear();
        }
        await new Promise(resolve => setTimeout(resolve, 10));
    }

    if (questions.length < questionCount) {
        throw new Error('Not enough questions generated');
    }

    return questions;
}

// Tambahkan fungsi untuk menerjemahkan tingkat kesulitan
function translateDifficulty(level) {
    switch(level) {
        case 'easy': return 'Mudah';
        case 'medium': return 'Sedang';
        case 'hard': return 'Sulit';
        default: return level;
    }
}
