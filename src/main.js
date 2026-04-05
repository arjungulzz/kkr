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
const quizCountDisplay = document.getElementById('quiz-count-display');

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

// Supabase Configuration
const SUPABASE_URL = "https://qfmwxiwrzocwhzorsdtx.supabase.co";
const SUPABASE_KEY = "sb_publishable_CraTJvQ91f6NfsmRxrsU5Q_bSA5_psn";

// Global cache for all option stats
let globalStatsCache = {};

// Atomic Increment via RPC
async function supabaseRPC(fnName, params) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fnName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify(params)
    });
    return response.ok;
  } catch (err) {
    console.error(`Supabase RPC ${fnName} failed:`, err);
    return false;
  }
}

async function loadGlobalCount() {
  try {
    // 1. Try to load from localStorage first for instant display
    const localSavedCount = localStorage.getItem('kkr_global_count');
    const localSaved90 = localStorage.getItem('kkr_reached_90_count');
    const localSavedWon = localStorage.getItem('kkr_cup_won_count');
    
    if (localSavedCount) quizCountDisplay.innerText = localSavedCount;

    // 2. Fetch the latest from Supabase (All three stats in one query)
    const response = await fetch(`${SUPABASE_URL}/rest/v1/kkr_stats?id=in.(total_quizzes,reached_90,cup_won)&select=id,count`, {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      const statsMap = data.reduce((acc, row) => ({...acc, [row.id]: row.count}), {});
      
      const total = statsMap['total_quizzes'] || 0;
      const reached90 = statsMap['reached_90'] || 0;
      const cupWon = statsMap['cup_won'] || 0;

      const pct90 = total > 0 ? Math.round((reached90 / total) * 100) : 0;
      const pctWon = total > 0 ? Math.round((cupWon / total) * 100) : 0;

      quizCountDisplay.innerText = total;
      
      // Update local cache
      localStorage.setItem('kkr_global_count', total);
      localStorage.setItem('kkr_reached_90_count', reached90);
      localStorage.setItem('kkr_cup_won_count', cupWon);
      
      // Update modal stats ONLY (keep landing page clean)
      const bonusStat = document.getElementById('bonus-reach-stat');
      if (bonusStat) bonusStat.innerText = `${pct90}%`;
      const finalStat = document.getElementById('final-win-stat');
      if (finalStat) finalStat.innerText = `${pctWon}%`;
    }
  } catch (err) {
    console.error("Supabase loadGlobalCount failed:", err);
  }
}

async function incrementGlobalCount() {
  await supabaseRPC('increment_stat', { row_id: 'total_quizzes' });
  loadGlobalCount();
}

/**
 * NEW: Fetches ALL selection statistics for ALL options in a single request.
 * Required for upfront rendering of community results.
 */
async function fetchAllStats() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/kkr_stats?select=id,count`, {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      globalStatsCache = data.reduce((acc, row) => {
        acc[row.id] = parseInt(row.count) || 0;
        return acc;
      }, {});
    }
  } catch (err) {
    console.error("Supabase fetchAllStats failed:", err);
  }
}

async function incrementOptionStat(qIdx, oIdx) {
  const rowId = `q${qIdx}_o${oIdx}`;
  // Fire and forget update to database
  supabaseRPC('increment_stat', { row_id: rowId });
}

// Initial load
loadGlobalCount();

startQuizBtn.addEventListener('click', async () => {
  startQuizBtn.classList.add('hidden'); // Hide totally
  startQuizBtn.style.display = 'none';
  quizContainer.classList.remove('hidden');

  // Auto-remove mobile class
  document.querySelector('.app-container').classList.remove('playing-mobile');

  // Load everything upfront
  document.getElementById('stats-header').classList.remove('hidden');
  incrementGlobalCount();
  await fetchAllStats(); // High performance single request
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
    // Find the original index for this option to keep stats consistent despite shuffling
    const originalOptIndex = qData.options.indexOf(optText);

    const btn = document.createElement('button');
    btn.classList.add('option-btn');
    
    const textSpan = document.createElement('span');
    textSpan.classList.add('btn-text');
    textSpan.innerText = optText;
    btn.appendChild(textSpan);

    const fillDiv = document.createElement('div');
    fillDiv.classList.add('percentage-fill');
    btn.appendChild(fillDiv);

    const labelSpan = document.createElement('span');
    labelSpan.classList.add('percentage-label');
    
    /** 
     * NEW: Upfront Stats Display
     * Calculate percentage from pre-fetched cache immediately
     */
    const counts = [0, 1, 2, 3].map(oIdx => globalStatsCache[`q${index}_o${oIdx}`] || 0);
    const totalVotes = counts.reduce((a, b) => a + b, 0);
    const myCount = globalStatsCache[`q${index}_o${originalOptIndex}`] || 0;
    const percent = totalVotes > 0 ? Math.round((myCount / totalVotes) * 100) : 0;
    
    labelSpan.innerHTML = `<span>👤 ${percent}%</span>`;
    
    fillDiv.style.width = `${percent}%`;
    
    // Add show-stats class upfront to reveal labels/bars before click
    btn.classList.add('show-stats');
    
    labelSpan.setAttribute('data-opt-idx', originalOptIndex);
    btn.appendChild(labelSpan);

    btn.addEventListener('click', async () => {
      if (isAnswered) return;
      isAnswered = true;
      
      // Instantly disable all options to lock the UI and prevent hover overrides
      Array.from(grid.children).forEach(b => b.disabled = true);
      
      btn.classList.add('selected');
      btn.classList.add('correct'); // visually color every choice as green uniformly

      // Selection Distribution Logic (SILENT DB UPDATE ONLY)
      incrementOptionStat(index, originalOptIndex);

      // 1. INSTANT UI FEEDBACK & TRACKER
      if (optText === qData.correctText) {
        if (index < 5) {
          correctAnswersCount++;
          // Increment probability by 18% per correct answer (5 * 18 = 90%)
          updateTrackerForSelection(correctAnswersCount * 18);
        } else {
          // Bonus Question Win! (CUP WON)
          supabaseRPC('increment_stat', { row_id: 'cup_won' });
          
          updateTrackerForSelection(100);
          setTimeout(() => {
            triggerConfetti();
            
            // Re-fetch global counts to update the final percentage before showing the and modal
            loadGlobalCount();
            winModal.classList.remove('hidden');
          }, 1000);
          return; 
        }
      } else {
        if (index < 5) {
          // Deduct some probability for wrong answer
          const currentProb = parseInt(probabilityText.innerText) || 0;
          const penalty = Math.floor(Math.random() * 15) + 5;
          updateTrackerForSelection(currentProb - penalty);
        } else {
          // Failed the bonus
          document.getElementById('quiz-feedback').className = 'quiz-feedback feedback-wrong';
          document.getElementById('quiz-feedback').innerText = `You missed the masterstroke... Game Over!`;
          nextBtn.innerText = "Restart Quiz";
          nextBtn.classList.remove('hidden');
          return;
        }
      }

      // Next Question Routing seamlessly
      if (index === 4) { // Finished Q5
        setTimeout(() => {
          if (correctAnswersCount === 5) {
            // FIRE AND FORGET: Mark that this user joined the 90% club
            supabaseRPC('increment_stat', { row_id: 'reached_90' });
            
            updateTrackerForSelection(90);
            bonusModal.classList.remove('hidden');
            
            // Re-fetch global count to update the community stat in the modal
            loadGlobalCount();
          } else {
            failMessage.innerText = `Chances of winning are ${probabilityText.innerText}. Try again`;
            failModal.classList.remove('hidden');
          }
        }, 800);
      } else if (index < 4) {
        nextBtn.innerText = "Next Question";
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

async function restartQuiz() {
  winProbability = 0;
  correctAnswersCount = 0;
  currentQuestionIndex = 0;
  decoySum = 0;

  updateTrackerForSelection(0);
  document.getElementById('q-counter').style.color = 'var(--kkr-gold)';

  document.getElementById('stats-header').classList.remove('hidden');
  await fetchAllStats(); // Refresh community stats on restart
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
