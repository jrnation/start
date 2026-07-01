document.addEventListener('DOMContentLoaded', () => {
    const quizApp = document.getElementById('quiz-app');
    
    // Only run if we are on the quiz page
    if (!quizApp) return;

    let currentQuestion = null;
    let selectedOptionIndex = null;
    let questions = [];

    // Fetch the quiz data
    fetch('/daily/questions.json')
        .then(response => response.json())
        .then(data => {
            questions = data;
            // For now, randomly pick a question to simulate a "daily" quiz
            const randomIndex = Math.floor(Math.random() * questions.length);
            currentQuestion = questions[randomIndex];
            renderQuiz();
        })
        .catch(err => {
            quizApp.innerHTML = '<p>Error loading the quiz. Please try again later.</p>';
            console.error(err);
        });

    function renderQuiz() {
        if (!currentQuestion) return;

        let html = `
            <div class="quiz-question">${currentQuestion.question}</div>
            <ul class="quiz-options" id="quiz-options">
                ${currentQuestion.options.map((opt, index) => `
                    <li data-index="${index}">${opt}</li>
                `).join('')}
            </ul>
            <button id="submit-btn" class="btn" style="display:none;">Submit Answer</button>
            <div id="quiz-result" style="margin-top: 1.5rem; display:none;"></div>
        `;

        quizApp.innerHTML = html;

        const options = document.querySelectorAll('.quiz-options li');
        const submitBtn = document.getElementById('submit-btn');

        options.forEach(option => {
            option.addEventListener('click', (e) => {
                // Remove selected class from all
                options.forEach(opt => opt.classList.remove('selected'));
                
                // Add to clicked
                e.target.classList.add('selected');
                selectedOptionIndex = parseInt(e.target.getAttribute('data-index'));
                
                // Show submit button
                submitBtn.style.display = 'inline-block';
            });
        });

        submitBtn.addEventListener('click', () => {
            const resultDiv = document.getElementById('quiz-result');
            
            // Disable further clicks
            options.forEach(opt => {
                opt.style.pointerEvents = 'none';
                const optIndex = parseInt(opt.getAttribute('data-index'));
                
                if (optIndex === currentQuestion.answer) {
                    opt.style.background = '#e6f4ea'; // Correct Green
                    opt.style.borderColor = '#137333';
                } else if (optIndex === selectedOptionIndex) {
                    opt.style.background = '#fce8e6'; // Incorrect Red
                    opt.style.borderColor = '#c5221f';
                }
            });

            submitBtn.style.display = 'none';
            resultDiv.style.display = 'block';

            if (selectedOptionIndex === currentQuestion.answer) {
                resultDiv.innerHTML = `<h3 style="color:#137333; margin-bottom:0.5rem;">Correct!</h3><p>${currentQuestion.explanation}</p>`;
            } else {
                resultDiv.innerHTML = `<h3 style="color:#c5221f; margin-bottom:0.5rem;">Incorrect.</h3><p>${currentQuestion.explanation}</p>`;
            }
        });
    }
});
