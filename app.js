document.addEventListener('DOMContentLoaded', () => {
    const quizApp = document.getElementById('quiz-app');
    
    // Guard clause: Exit if we aren't on a page with the quiz widget
    if (!quizApp) return;

    // State management
    const state = {
        question: null,
        selectedIndex: null,
        isSubmitted: false
    };

    // Initialize Application
    async function initQuiz() {
        try {
            // Simulated network delay for realism (remove in production)
            const response = await fetch('/daily/questions.json');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const questions = await response.json();
            
            // Daily randomizer
            const randomIndex = Math.floor(Math.random() * questions.length);
            state.question = questions[randomIndex];
            
            renderQuiz();
        } catch (error) {
            console.error('Quiz Initialization Failed:', error);
            quizApp.innerHTML = `
                <div style="text-align: center; color: var(--text-secondary);">
                    <p>Unable to load today's quiz. Please refresh or try again later.</p>
                </div>
            `;
        }
    }

    // Render HTML structure
    function renderQuiz() {
        if (!state.question) return;

        const html = `
            <div class="quiz-question">${state.question.question}</div>
            <ul class="quiz-options" id="quiz-options" role="listbox">
                ${state.question.options.map((opt, index) => `
                    <li role="option" aria-selected="false" data-index="${index}">${opt}</li>
                `).join('')}
            </ul>
            <button id="submit-btn" class="btn" style="display: none;" disabled>Submit Answer</button>
            <div id="quiz-result" class="result-container" style="display: none;" aria-live="polite"></div>
        `;

        quizApp.innerHTML = html;
        bindEvents();
    }

    // Event Listeners setup
    function bindEvents() {
        const optionsList = document.getElementById('quiz-options');
        const options = optionsList.querySelectorAll('li');
        const submitBtn = document.getElementById('submit-btn');

        // Handle Option Selection
        optionsList.addEventListener('click', (e) => {
            if (state.isSubmitted) return;
            
            const clickedItem = e.target.closest('li');
            if (!clickedItem) return;

            // Update UI Selection state
            options.forEach(opt => {
                opt.classList.remove('selected');
                opt.setAttribute('aria-selected', 'false');
            });
            
            clickedItem.classList.add('selected');
            clickedItem.setAttribute('aria-selected', 'true');
            
            // Update Data State
            state.selectedIndex = parseInt(clickedItem.dataset.index, 10);
            
            // Reveal and enable submit button
            submitBtn.style.display = 'inline-flex';
            submitBtn.removeAttribute('disabled');
        });

        // Handle Submission
        submitBtn.addEventListener('click', () => {
            if (state.selectedIndex === null || state.isSubmitted) return;
            
            state.isSubmitted = true;
            submitBtn.style.display = 'none';
            evaluateAnswer(options);
        });
    }

    // Business Logic: Grade the answer and update UI
    function evaluateAnswer(optionNodes) {
        const isCorrect = state.selectedIndex === state.question.answer;
        const resultDiv = document.getElementById('quiz-result');

        optionNodes.forEach(node => {
            const index = parseInt(node.dataset.index, 10);
            
            // Lock all options to prevent further clicks
            node.classList.add('locked');

            // Apply validation classes instead of inline styles
            if (index === state.question.answer) {
                node.classList.add('correct');
            } else if (index === state.selectedIndex && !isCorrect) {
                node.classList.add('incorrect');
            }
        });

        // Display results
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = `
            <h3 class="result-title ${isCorrect ? 'success' : 'error'}">
                ${isCorrect ? 'Correct' : 'Incorrect'}
            </h3>
            <p>${state.question.explanation}</p>
        `;
    }

    // Boot the app
    initQuiz();
});