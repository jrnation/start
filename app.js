// app.js

// ==========================================
// 1. Firebase Native Browser Imports
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { 
    getAuth, 
    signInWithPopup, 
    GoogleAuthProvider, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ==========================================
// 2. Firebase Configuration
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyALDrNEDq3n0ZjKNzIMIOCN5IVB3DtisFI",
    authDomain: "jrnation-f0956.firebaseapp.com",
    projectId: "jrnation-f0956",
    storageBucket: "jrnation-f0956.firebasestorage.app",
    messagingSenderId: "466925585163",
    appId: "1:466925585163:web:2aab30ddad83f59a48d80e",
    measurementId: "G-Y0MQ9MVPZQ"
};

// Initialize Firebase & Auth
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Global State
let currentUser = null;

// ==========================================
// 3. Authentication & DOM Initialization
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('login-btn');
    const userProfile = document.getElementById('user-profile');
    const logoutBtn = document.getElementById('logout-btn');

    // Listen for login/logout state changes
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            
            // Update UI for logged-in user
            if(loginBtn) loginBtn.style.display = 'none';
            if(userProfile) {
                userProfile.style.display = 'flex';
                // Grab just the first name for a cleaner UI
                const firstName = user.displayName ? user.displayName.split(' ')[0] : 'Aspirant';
                
                userProfile.innerHTML = `
                    <a href="/profile/" style="display: flex; align-items: center; gap: 0.5rem; text-decoration: none; color: inherit;">
                        <img src="${user.photoURL}" alt="Profile" style="width:32px; height:32px; border-radius:50%; border: 2px solid var(--accent);">
                        <span style="font-weight: 500; font-size: 0.95rem;">${firstName}</span>
                    </a>
                `;
            }
            if(logoutBtn) logoutBtn.style.display = 'block';

        } else {
            currentUser = null;
            
            // Update UI for logged-out user
            if(loginBtn) loginBtn.style.display = 'block';
            if(userProfile) userProfile.style.display = 'none';
            if(logoutBtn) logoutBtn.style.display = 'none';
        }

        // Show auth controls once state is determined
        const authControls = document.querySelector('.auth-controls');
        if (authControls) {
            authControls.style.opacity = '1';
            authControls.style.pointerEvents = 'auto';
        }
    });

    // Trigger Google Sign-In
    loginBtn?.addEventListener('click', async () => {
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Authentication Error:", error.message);
        }
    });

    // Trigger Logout
    logoutBtn?.addEventListener('click', async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Logout Error:", error);
        }
    });

    // Initialize the Quiz Widget if it exists on the page
    const quizApp = document.getElementById('quiz-app');
    if (quizApp) {
        new QuizWidget(quizApp);
    }
});

// ==========================================
// 4. Interactive Quiz Widget Class
// ==========================================
class QuizWidget {
    constructor(container) {
        this.container = container;
        this.state = {
            question: null,
            questionIndex: null,
            selectedIndex: null,
            isSubmitted: false
        };
        this.init();
    }

    updateLocalStorage() {
        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem('jrnation_quiz_state', JSON.stringify({
            date: today,
            questionIndex: this.state.questionIndex,
            isSubmitted: this.state.isSubmitted,
            selectedIndex: this.state.selectedIndex
        }));
    }

    async init() {
        try {
            // Simulated network latency for the UI skeleton loader (looks premium)
            await new Promise(resolve => setTimeout(resolve, 600));
            
            // Fetch questions from your local JSON file
            const response = await fetch('/daily/questions.json');
            if (!response.ok) throw new Error('Network response was not ok');
            
            const questions = await response.json();
            
            const today = new Date().toISOString().split('T')[0];
            const savedStateStr = localStorage.getItem('jrnation_quiz_state');
            let savedState = null;
            
            if (savedStateStr) {
                try {
                    savedState = JSON.parse(savedStateStr);
                } catch(e) {}
            }

            let questionIdx = 0; // Default to the first question for a brand new user
            
            if (savedState) {
                if (savedState.date === today) {
                    // Same day: load exact state
                    questionIdx = savedState.questionIndex;
                    this.state.selectedIndex = savedState.selectedIndex;
                    this.state.isSubmitted = savedState.isSubmitted;
                } else {
                    // New day for a returning user: increment their personal index
                    let prevIdx = savedState.questionIndex !== undefined ? savedState.questionIndex : -1;
                    questionIdx = (prevIdx + 1) % questions.length;
                    // Note: selectedIndex and isSubmitted are already null/false from the constructor
                }
            }
            
            this.state.questionIndex = questionIdx;
            this.state.question = questions[questionIdx];
            
            if (!savedState || savedState.date !== today) {
                this.updateLocalStorage();
            }

            this.render();
            
            // If it was already submitted, evaluate immediately
            if (this.state.isSubmitted) {
                const options = this.container.querySelectorAll('li');
                this.container.querySelector('.submit-btn').style.display = 'none';
                this.evaluate(options);
            }
        } catch (error) {
            console.error("Quiz load failed:", error);
            this.container.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <h3 style="margin-bottom: 1rem;">System Update</h3>
                    <p style="color: var(--text-muted);">Today's challenge is currently being updated. Please check back shortly.</p>
                </div>
            `;
        }
    }

    render() {
        const { question, selectedIndex } = this.state;
        
        // Render the UI
        this.container.innerHTML = `
            <div class="quiz-question">${question.question}</div>
            <ul class="quiz-options" role="listbox">
                ${question.options.map((opt, i) => {
                    const isSelected = selectedIndex === i;
                    return `<li role="option" aria-selected="${isSelected}" data-index="${i}" class="${isSelected ? 'selected' : ''}">${opt}</li>`;
                }).join('')}
            </ul>
            
            <div id="auth-warning" style="display:none; color: var(--error-text); margin-top: 1.5rem; font-size: 0.95rem; text-align: center; font-weight: 500;">
                You must sign in with Google to submit your answer and save your score.
            </div>
            
            <button class="btn submit-btn" style="${selectedIndex !== null && !this.state.isSubmitted ? 'display: block;' : 'display: none;'}" ${selectedIndex !== null ? '' : 'disabled'}>Submit Answer</button>
            
            <div class="result-container" style="display: none;" aria-live="polite"></div>
        `;

        this.bindEvents();
    }

    bindEvents() {
        const options = this.container.querySelectorAll('li');
        const submitBtn = this.container.querySelector('.submit-btn');
        const authWarning = this.container.querySelector('#auth-warning');

        // Handle Option Selection
        options.forEach(option => {
            option.addEventListener('click', (e) => {
                if (this.state.isSubmitted) return;

                // Reset all options
                options.forEach(opt => {
                    opt.classList.remove('selected');
                    opt.setAttribute('aria-selected', 'false');
                });

                // Set clicked option as active
                const target = e.currentTarget;
                target.classList.add('selected');
                target.setAttribute('aria-selected', 'true');
                this.state.selectedIndex = parseInt(target.dataset.index);

                // Save selected option to local storage
                this.updateLocalStorage();

                // Reveal submit button, hide warning if they are trying again
                submitBtn.style.display = 'block';
                submitBtn.removeAttribute('disabled');
                authWarning.style.display = 'none'; 
            });
        });

        // Handle Submission
        submitBtn.addEventListener('click', async () => {
            if (this.state.selectedIndex === null || this.state.isSubmitted) return;
            
            // GATEKEEPER: Prevent submission if the user is not logged in
            if (!currentUser) {
                authWarning.style.display = 'block';
                
                // Optional: Scroll to the top to show the login button
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

            // Lock the quiz
            this.state.isSubmitted = true;
            this.updateLocalStorage();
            submitBtn.style.display = 'none';
            this.evaluate(options);
            
            // Generate the secure token and send to Cloudflare Worker
            try {
                const token = await currentUser.getIdToken();
                this.saveScoreToCloudflare(token, this.state.selectedIndex === this.state.question.answer);
            } catch (error) {
                console.error("Failed to generate auth token:", error);
            }
        });
    }

    evaluate(options) {
        const { selectedIndex, question } = this.state;
        const isCorrect = selectedIndex === question.answer;
        const resultDiv = this.container.querySelector('.result-container');

        // Apply correct/incorrect CSS classes
        options.forEach(node => {
            const index = parseInt(node.dataset.index);
            node.classList.add('locked'); // Prevent further clicking

            if (index === question.answer) {
                node.classList.add('correct');
            } else if (index === selectedIndex && !isCorrect) {
                node.classList.add('incorrect');
            }
        });

        // Reveal the explanation
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = `
            <h3 class="result-title ${isCorrect ? 'success' : 'error'}">
                ${isCorrect ? 'Correct.' : 'Incorrect.'}
            </h3>
            <p style="color: var(--text-muted); margin-top: 0.5rem;">${question.explanation}</p>
        `;
    }

    async saveScoreToCloudflare(token, isCorrect) {
        // Prepare payload with Firebase user details
        const payload = {
            uid: currentUser.uid,
            displayName: currentUser.displayName,
            email: currentUser.email,
            photoUrl: currentUser.photoURL,
            score: isCorrect ? 1 : 0,
            date: new Date().toISOString().split('T')[0] // YYYY-MM-DD format
        };

        try {
            const workerUrl = 'https://api.jrnation.cc/submit'; 
            
            const response = await fetch(workerUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                // Data submitted successfully
                hasSubmittedScore = true;
            } else {
                console.error("Failed to save score. Status:", response.status);
            }
        } catch (error) {
            console.error("Network error while saving score:", error);
        }
    }
}

// ==========================================
// Leaderboard & Profile Logic
// ==========================================

async function initLeaderboard() {
    const tbody = document.getElementById('leaderboard-body');
    const loading = document.getElementById('leaderboard-loading');
    const wrapper = document.getElementById('leaderboard-table-wrapper');
    
    if (!tbody) return;

    try {
        // Attempt to fetch from real API, fallback to mock data if it fails (or if not built yet)
        let data = [];
        try {
            const res = await fetch('https://api.jrnation.cc/leaderboard');
            if (res.ok) {
                data = await res.json();
            } else {
                throw new Error("Backend not ready");
            }
        } catch(e) {
            console.log("Using mock leaderboard data");
            // Mock Data Fallback
            await new Promise(resolve => setTimeout(resolve, 800));
            data = [
                { rank: 1, name: "Arjun Reddy", score: 1420, img: "https://ui-avatars.com/api/?name=Arjun+Reddy&background=random" },
                { rank: 2, name: "Priya Sharma", score: 1350, img: "https://ui-avatars.com/api/?name=Priya+Sharma&background=random" },
                { rank: 3, name: "Vikram Singh", score: 1280, img: "https://ui-avatars.com/api/?name=Vikram+Singh&background=random" },
                { rank: 4, name: "Anjali Gupta", score: 1150, img: "https://ui-avatars.com/api/?name=Anjali+Gupta&background=random" },
                { rank: 5, name: "Rahul Patel", score: 1090, img: "https://ui-avatars.com/api/?name=Rahul+Patel&background=random" }
            ];
        }

        loading.style.display = 'none';
        wrapper.style.display = 'block';

        data.forEach(user => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid var(--border-color)';
            tr.innerHTML = `
                <td style="padding: 1rem 0; font-family: var(--font-serif); font-size: 1.25rem;">#${user.rank}</td>
                <td style="padding: 1rem 0;">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <img src="${user.img || user.photoUrl}" alt="Avatar" style="width: 40px; height: 40px; border-radius: 50%;">
                        <span style="font-weight: 500;">${user.name || user.displayName}</span>
                    </div>
                </td>
                <td style="padding: 1rem 0; text-align: right; font-family: var(--font-serif); font-size: 1.25rem; font-weight: 500; color: var(--accent);">${user.score}</td>
            `;
            tbody.appendChild(tr);
        });

    } catch (error) {
        console.error("Leaderboard Error:", error);
    }
}

function initProfile() {
    const unauthDiv = document.getElementById('profile-unauth');
    const profileDiv = document.getElementById('profile-container');
    
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            unauthDiv.style.display = 'block';
            profileDiv.style.display = 'none';
        } else {
            unauthDiv.style.display = 'none';
            profileDiv.style.display = 'block';
            
            document.getElementById('prof-img').src = user.photoURL;
            document.getElementById('prof-name').textContent = user.displayName;
            document.getElementById('prof-email').textContent = user.email;

            try {
                const token = await user.getIdToken();
                const res = await fetch(`https://api.jrnation.cc/profile?uid=${user.uid}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    document.getElementById('stat-score').textContent = data.totalScore || 0;
                    document.getElementById('stat-streak').textContent = data.currentStreak || 0;
                    document.getElementById('stat-accuracy').textContent = data.accuracy ? data.accuracy + '%' : '0%';
                } else {
                    throw new Error("Backend not ready");
                }
            } catch(e) {
                console.log("Using mock profile data");
                document.getElementById('stat-score').textContent = "120";
                document.getElementById('stat-streak').textContent = "14";
                document.getElementById('stat-accuracy').textContent = "86%";
            }
        }
    });
}

// Initialize New Pages
if (document.getElementById('leaderboard-container')) {
    initLeaderboard();
}
if (document.getElementById('profile-container') || document.getElementById('profile-unauth')) {
    initProfile();
}