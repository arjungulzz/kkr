import './style.css'
import confetti from 'canvas-confetti';

let winProbability = 0;

const trackerFill = document.getElementById('tracker-fill');
const probabilityText = document.getElementById('probability-text');
const winModal = document.getElementById('win-modal');
const restartBtn = document.getElementById('restart-btn');
const bonusModal = document.getElementById('bonus-modal');
const unlockBonusBtn = document.getElementById('unlock-bonus-btn');
const failModal = document.getElementById('fail-modal');
const failMessage = document.getElementById('fail-message');
const retryBtn = document.getElementById('retry-btn');

const startQuizBtn = document.getElementById('start-quiz-btn');
const nextBtn = document.getElementById('next-btn');
const quizContainer = document.getElementById('quiz-container');

// Engine State
let correctAnswersCount = 0;
let decoySum = 0;
let currentQuestionIndex = 0;
let isAnswered = false; // block multiple clicks per question

const questions = [
  {
    title: "What is the most critical management decision left to make?",
    options: ["Sack Venky mama", "Sack CSK agent", "Change the support staff", "Change the coach"],
    correctText: "Sack CSK agent"
  },
  {
    title: "Which tactical player move is absolutely essential?",
    options: ["Drop Varun Chakravarthy", "Drop Vaibhav Arora", "Drop Cameron Green", "Drop Ajinkya Rahane"],
    correctText: "Drop Ajinkya Rahane"
  },
  {
    title: "What should be the regular opening combination?",
    options: ["Finn Allen & Sunil Narine", "Finn Allen & Ajinkya Rahane", "Finn Allen & Angkrish Raghuvanshi", "Ajinkya Rahane & Sunil Narine"],
    correctText: "Finn Allen & Sunil Narine"
  },
  {
    title: "Who should be the regular number 3?",
    options: ["Ajinkya Rahane", "Angkrish Raghuvanshi", "Cameron Green", "Rinku Singh"],
    correctText: "Angkrish Raghuvanshi"
  },
  {
    title: "What miscallaneous off-the-field action can motivate the team?",
    options: ["Playing Golf", "Shooting more advertisements", "An SRK speech before matches", "Lower ticket prices for home games"],
    correctText: "An SRK speech before matches"
  }
];

// Ensure 6th Bonus Question
const bonusQuestion = {
  title: "BONUS UNLOCKED: To guarantee the Cup, what is the ultimate masterstroke?",
  options: ["Change the team logo", "Bring Back Gautam Gambhir", "Change the home ground", "Change the team name"],
  correctText: "Bring Back Gautam Gambhir"
};

startQuizBtn.addEventListener('click', () => {
  startQuizBtn.classList.add('hidden'); // Hide totally
  startQuizBtn.style.display = 'none';
  quizContainer.classList.remove('hidden');

  // Auto-remove mobile class because we no longer need the space constraints!
  document.querySelector('.app-container').classList.remove('playing-mobile');

  loadQuestion(0);
});

function updateTrackerForSelection(displayProb) {
  let boundedProb = displayProb;
  if (boundedProb < 0) boundedProb = 0;

  // Strict Cap on normal questions, but permit exactly 90 if achieving the perfect sweep securely.
  if (currentQuestionIndex < 5 && boundedProb > 89) {
    if (currentQuestionIndex === 4 && correctAnswersCount === 5) {
      boundedProb = 90;
    } else {
      boundedProb = 89;
    }
  }

  if (currentQuestionIndex === 5 && correctAnswersCount === 5 && boundedProb !== 100) boundedProb = 90;
  if (boundedProb >= 100) boundedProb = 100;

  trackerFill.style.width = `${boundedProb}%`;
  probabilityText.innerText = `${boundedProb}%`;
}


function loadQuestion(index) {
  isAnswered = false;
  nextBtn.classList.add('hidden');
  document.getElementById('quiz-feedback').innerText = '';

  let qData;
  if (index < 5) {
    qData = questions[index];
    document.getElementById('q-counter').innerText = `Q: ${index + 1}/5`;
  } else {
    qData = bonusQuestion;
    document.getElementById('q-counter').innerText = `👑 BONUS STAGE 👑`;
    document.getElementById('q-counter').style.color = 'var(--kkr-gold-bright)';
  }

  document.getElementById('question-text').innerText = qData.title;

  const grid = document.getElementById('options-grid');
  grid.innerHTML = '';

  [...qData.options].sort(() => Math.random() - 0.5).forEach(optText => {
    const btn = document.createElement('button');
    btn.classList.add('option-btn');
    btn.innerText = optText;

    btn.addEventListener('click', () => {
      if (isAnswered) return;
      isAnswered = true;
      btn.classList.add('selected');
      btn.classList.add('correct'); // visually color every choice as green uniformly

      // Lock everything visually
      Array.from(grid.children).forEach(b => b.setAttribute('disabled', 'true'));

      if (optText === qData.correctText) {
        if (index < 5) {
          correctAnswersCount++;
        } else {
          // BONUS SUCCESS
          updateTrackerForSelection(100);
          setTimeout(() => {
            triggerConfetti();
            winModal.classList.remove('hidden');
          }, 800);
          return; // DO not show next btn
        }
      } else {
        if (index < 5) {
          // Random negative penalty math
          const fluct = Math.floor(Math.random() * 26) - 5;
          decoySum += fluct;
        } else {
          // Failed the bonus
          document.getElementById('quiz-feedback').className = 'quiz-feedback feedback-wrong';
          document.getElementById('quiz-feedback').innerText = `You missed the masterstroke... Game Over!`;
        }
      }

      // Calculate math organically immediately after grading
      winProbability = (correctAnswersCount * 18) + decoySum;
      updateTrackerForSelection(winProbability);

      // Next Question Routing seamlessly
      if (index === 4) { // User just finished Q5 securely
        if (correctAnswersCount === 5) { // Perfect sweep
          updateTrackerForSelection(90);
          nextBtn.classList.add('hidden'); // Hide the standard button
          setTimeout(() => {
            bonusModal.classList.remove('hidden');
          }, 500);
        } else { // Bad sweep
          nextBtn.classList.add('hidden'); // Hide standard button
          setTimeout(() => {
            failMessage.innerText = `Chances of winning are ${winProbability}%. Try again`;
            failModal.classList.remove('hidden');
          }, 500);
        }
      } else if (index < 4) {
        nextBtn.innerText = "Next Question";
        nextBtn.classList.remove('hidden');
      } else if (index === 5 && optText !== qData.correctText) {
        // Failed bonus completely!
        nextBtn.innerText = "Restart Quiz";
        nextBtn.classList.remove('hidden');
      }
    });

    grid.appendChild(btn);
  });
}

unlockBonusBtn.addEventListener('click', () => {
  bonusModal.classList.add('hidden');
  currentQuestionIndex++;
  loadQuestion(currentQuestionIndex);
});

retryBtn.addEventListener('click', () => {
  failModal.classList.add('hidden');
  restartQuiz();
});

nextBtn.addEventListener('click', () => {
  // Determine dynamic behaviour cleanly
  if (nextBtn.innerText === "Restart Quiz") {
    restartQuiz();
    return;
  }

  currentQuestionIndex++;
  loadQuestion(currentQuestionIndex);
});

function restartQuiz() {
  winProbability = 0;
  correctAnswersCount = 0;
  currentQuestionIndex = 0;
  decoySum = 0;

  updateTrackerForSelection(0);
  document.getElementById('q-counter').style.color = 'var(--kkr-gold)';

  loadQuestion(0);
}

let confettiAnimationId = null;
let stopConfetti = false;

function triggerConfetti() {
  var duration = 5000;
  var end = Date.now() + duration;
  stopConfetti = false;

  (function frame() {
    if (stopConfetti) return;

    confetti({ particleCount: 7, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#3a225d', '#b3a123', '#ffffff'] });
    confetti({ particleCount: 7, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#3a225d', '#b3a123', '#ffffff'] });

    if (Date.now() < end) {
      confettiAnimationId = requestAnimationFrame(frame);
    }
  }());
}

restartBtn.addEventListener('click', () => {
  winModal.classList.add('hidden');
  stopConfetti = true;
  if (confettiAnimationId) cancelAnimationFrame(confettiAnimationId);
  confetti.reset();
  restartQuiz();
});
