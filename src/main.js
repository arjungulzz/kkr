import './style.css'
import confetti from 'canvas-confetti';

let winProbability = 0;
let clickCount = 0;
const MAX_CLICKS = 5;

const trackerFill = document.getElementById('tracker-fill');
const probabilityText = document.getElementById('probability-text');
const winBtn = document.getElementById('win-btn');
const winModal = document.getElementById('win-modal');
const restartBtn = document.getElementById('restart-btn');

const spawnBtn = document.getElementById('spawn-actions-btn');
const hintBtn = document.getElementById('hint-btn');
const chipsContainer = document.getElementById('chips-container');

// State flags
let isEscaping = true;
let goldenChipElement = null;
let chipsShown = false;
let correctCount = 0;
let decoySum = 0;
let hasJumped = false;

const rightPathChips = [
  "Sack Coach", "Promote Narine", "Use data analytics", "Sign a spinner", "Focus on fielding"
];

const decoyChips = [
  "Sack Rahane", "Sack Venky Mama", "Sack CSK Agent", "Change Home Ground",
  "Kidnap Sujan Mukerjee", "Sell the team", "SRK Speech in Dressing Room", "Practice Hard",
  "Make Rinku as Captain", "Perform Puja", "Play Rovman Powell", "Play Prathirana",
  "Narine & Allen to Open", "Seifert & Allen to Open", "Sack Rinku, Ramandeep", "Make Angkrish as Captain",
  "Drop Varun", "Play Tejasvi", "Bring Back Russel", "",
  "Sell entire squad", "Make memes", "Change team name", "Blame owners", "Hire new scout"
];

const goldenChipText = "Bring Back GG";

// Initialize
winBtn.removeAttribute('disabled');
winBtn.classList.add('escaping');
spawnBtn.classList.add('hidden-initial');

function positionWinBtnOverSpawnBtn() {
  const spawnRect = spawnBtn.getBoundingClientRect();
  const winRect = winBtn.getBoundingClientRect();
  winBtn.style.left = `${spawnRect.left + (spawnRect.width/2) - (winRect.width/2)}px`;
  winBtn.style.top = `${spawnRect.top + (spawnRect.height/2) - (winRect.height/2)}px`;
}

function updateTrackerForSelection(displayProb) {
  let boundedProb = displayProb;
  if (boundedProb < 0) boundedProb = 0;
  if (boundedProb > 99 && isEscaping) boundedProb = 99; // cap naturally below 100
  if (boundedProb >= 100 && !isEscaping) boundedProb = 100; // actual win

  trackerFill.style.width = `${boundedProb}%`;
  probabilityText.innerText = `${boundedProb}%`;

  // Reveal hint ONLY if hit 90+ while 5 items are fully selected
  if (boundedProb >= 90 && isEscaping && clickCount === MAX_CLICKS) {
    hintBtn.classList.remove('hidden');
  } else {
    hintBtn.classList.add('hidden');
    // Also re-hide golden chip if user unselected something after taking hint
    if (goldenChipElement && goldenChipElement.style.pointerEvents === 'auto') {
      goldenChipElement.style.opacity = '0';
      goldenChipElement.style.pointerEvents = 'none';
      goldenChipElement.classList.remove('highlight');
    }
  }

  if (boundedProb >= 100 && !isEscaping) {
    const allChips = document.querySelectorAll('.chip');
    allChips.forEach(c => {
      c.classList.add('selected'); // Just to stop interactions visually
      c.style.pointerEvents = 'none';
    });
    hintBtn.classList.add('hidden');
  }
}

function moveButton() {
  if (!isEscaping) return;
  
  if (!hasJumped) {
    hasJumped = true;
    spawnBtn.classList.remove('hidden-initial');
    spawnBtn.classList.add('glow-pulse');
  }

  const btnRect = winBtn.getBoundingClientRect();
  let targetX, targetY;

  if (!chipsShown) {
    const maxX = window.innerWidth - btnRect.width - 20;
    const maxY = window.innerHeight - btnRect.height - 20;
    targetX = Math.max(10, Math.floor(Math.random() * maxX));
    targetY = Math.max(10, Math.floor(Math.random() * maxY));
  } else {
    // Escaping bounded to strict top/bottom channels directly above/below the central box
    const containerRect = document.querySelector('.app-container').getBoundingClientRect();

    // Conditionally check if mobile screen
    if (window.innerWidth <= 768) {
      // Mobile escape: Jump exclusively WITHIN the central box because outer areas are saturated by the tight matrix
      targetX = containerRect.left + 5 + Math.random() * Math.max(0, containerRect.width - btnRect.width - 10);
      targetY = containerRect.top + 5 + Math.random() * Math.max(0, containerRect.height - btnRect.height - 10);
    } else {
      // Constrain X strictly to the bounds of the central block
      const minX = containerRect.left;
      const maxX = containerRect.right - btnRect.width;
      targetX = minX + Math.floor(Math.random() * Math.max(0, maxX - minX));
  
      const spaceAbove = containerRect.top;
      const spaceBelow = window.innerHeight - containerRect.bottom;
  
      let goAbove = Math.random() > 0.5;
      if (spaceAbove < btnRect.height + 20) goAbove = false;
      if (spaceBelow < btnRect.height + 80) goAbove = true;
  
      if (goAbove) {
        targetY = Math.max(10, Math.floor(Math.random() * Math.max(0, containerRect.top - btnRect.height - 10)));
      } else {
        // Offset by 80px to safely clear the hidden golden chip which rendered at +15
        targetY = containerRect.bottom + 80 + Math.floor(Math.random() * Math.max(0, window.innerHeight - containerRect.bottom - 80 - btnRect.height - 20));
      }
    }
  }

  winBtn.style.left = `${targetX}px`;
  winBtn.style.top = `${targetY}px`;
}

winBtn.addEventListener('mouseover', () => {
  if (isEscaping && hasJumped) {
    moveButton();
  }
});

winBtn.addEventListener('touchstart', (e) => {
  if (isEscaping) {
    e.preventDefault(); // Prevents ghost clicks
    moveButton(); // Immediately launch dodge sequence on tap
  }
});

winBtn.addEventListener('click', () => {
  if (isEscaping) {
    // If it's the very first interaction, click triggers the first movement
    moveButton();
    return;
  }
  winModal.classList.remove('hidden');
  triggerConfetti();
});

spawnBtn.addEventListener('click', () => {
  spawnBtn.innerText = `Select best options (0/${MAX_CLICKS})`;
  spawnBtn.setAttribute('disabled', 'true');
  spawnBtn.classList.remove('glow-pulse');
  chipsShown = true;

  const allTexts = [...rightPathChips, ...decoyChips];
  allTexts.sort(() => Math.random() - 0.5);

  const centerBox = document.querySelector('.app-container').getBoundingClientRect();
  const spawnRect = spawnBtn.getBoundingClientRect();
  const startX = spawnRect.left + spawnRect.width / 2;
  const startY = spawnRect.top + spawnRect.height / 2;
  const isMobile = window.innerWidth <= 768;

  // Render Golden Chip specifically below the center box, hidden completely
  goldenChipElement = document.createElement('div');
  goldenChipElement.classList.add('chip', 'golden-chip');
  if (isMobile) goldenChipElement.classList.add('mobile');
  goldenChipElement.innerText = goldenChipText;
  goldenChipElement.style.opacity = '0';
  goldenChipElement.style.pointerEvents = 'none';
  goldenChipElement.style.left = `${centerBox.left + centerBox.width / 2}px`;
  goldenChipElement.style.top = `${centerBox.bottom + 15}px`; // hugged smoothly under the container

  goldenChipElement.addEventListener('click', () => {
    goldenChipElement.classList.add('selected');
    isEscaping = false;
    updateTrackerForSelection(100);
  });
  chipsContainer.appendChild(goldenChipElement);

  // Calculate strict layout globally resolving 0 overlap
  let positions = [];
  
  if (isMobile) {
    // Ultra-dense 5-column Mobile Matrix folded securely across Top and Bottom to completely avoid Viewport Vertical Overflow
    const chipW_m = 70; 
    const chipH_m = 35;
    const gap_m = 4;
    const matrixW = 5 * chipW_m + 4 * gap_m;
    const startX_m = (window.innerWidth - matrixW) / 2 + chipW_m / 2;
    const colsX_m = [
      startX_m, 
      startX_m + chipW_m + gap_m, 
      startX_m + 2 * (chipW_m + gap_m),
      startX_m + 3 * (chipW_m + gap_m),
      startX_m + 4 * (chipW_m + gap_m)
    ];
    
    // Y Offsets: Safely bounding inwards to prevent bottom/top clipping
    const startTopY_m = centerBox.top - 10 - chipH_m/2;
    const startBottomY_m = centerBox.bottom + 65 + chipH_m/2; // Safe clearing for scaled golden chip
    
    for(let i=0; i<15; i++) { // Stack top 15 propagating aggressively upwards (3 rows of 5)
      const row = Math.floor(i / 5);
      const col = i % 5;
      positions.push({ x: colsX_m[col], y: startTopY_m - (row * (chipH_m + gap_m)) });
    }
    for(let i=0; i<15; i++) { // Stack bottom 15 pushing cleanly downwards (3 rows of 5)
      const row = Math.floor(i / 5);
      const col = i % 5;
      positions.push({ x: colsX_m[col], y: startBottomY_m + (row * (chipH_m + gap_m)) });
    }
  } else {
    // Strict 4-column layout (2 left, 2 right) explicitly guaranteeing zero overlaps for Desktop
    const chipW = 130; 
    const chipH = 45;  
    const gapX = 15;
    const gapY = 15;
    
    const colCentersX = [
      centerBox.left - chipW - gapX * 2 - chipW / 2,
      centerBox.left - chipW / 2 - gapX,
      centerBox.right + chipW / 2 + gapX,
      centerBox.right + chipW + gapX * 2 + chipW / 2
    ];
    
    const colCounts = [8, 7, 7, 8]; 
    
    for (let c = 0; c < 4; c++) {
      let rows = colCounts[c];
      let totalH = rows * chipH + (rows - 1) * gapY;
      let startY = (window.innerHeight / 2) - (totalH / 2);
  
      for (let r = 0; r < rows; r++) {
        let alignY = startY + r * (chipH + gapY) + chipH / 2;
        positions.push({ x: colCentersX[c], y: alignY });
      }
    }
  }

  // Shuffle positions so random chips go to random strict slots
  positions.sort(() => Math.random() - 0.5);

  allTexts.forEach((text, i) => {
    const chip = document.createElement('div');
    chip.classList.add('chip');
    if (isMobile) chip.classList.add('mobile');
    chip.innerText = text;

    chip.style.left = `${startX}px`;
    chip.style.top = `${startY}px`;

    chip.addEventListener('click', () => {
      // Logic for selectable/unselectable toggling
      if (!chip.classList.contains('selected')) {
        // Enforce max click
        if (clickCount >= MAX_CLICKS) return;

        chip.classList.add('selected');
        clickCount++;

        if (rightPathChips.includes(text)) {
          correctCount++;
        } else {
          // Generate a more visible random fluctuation between -5% and +20%
          const fluct = Math.floor(Math.random() * 26) - 5;
          chip.dataset.probVal = fluct;
          decoySum += fluct;
        }
      } else {
        // Revert selection
        chip.classList.remove('selected');
        clickCount--;

        if (rightPathChips.includes(text)) {
          correctCount--;
        } else {
          decoySum -= parseInt(chip.dataset.probVal, 10);
        }
      }

      // Calculate dynamic probability securely insulated from edge cases
      winProbability = correctCount * 18 + decoySum;
      if (winProbability < 0) winProbability = 0;

      // CRITICAL LOGIC CAP: Never exceed 89% under any random decoy formulation
      if (correctCount < MAX_CLICKS && winProbability > 89) {
        winProbability = 89;
      } else if (correctCount === MAX_CLICKS) {
        winProbability = 90; // Strictly ensure exact 90 lock
      }

      updateTrackerForSelection(winProbability);

      // Update main button instructional text
      if (clickCount === MAX_CLICKS && winProbability < 90) {
        spawnBtn.innerText = "Max picks reached. Unselect a chip or Restart.";
      } else if (clickCount === MAX_CLICKS) {
        spawnBtn.innerText = "You solved the puzzle!";
      } else {
        spawnBtn.innerText = `Select best options (${clickCount}/${MAX_CLICKS})`;
      }
    });

    chipsContainer.appendChild(chip);

    let targetX, targetY;
    if (i < positions.length) {
      targetX = positions[i].x + (Math.random() - 0.5) * 6;
      targetY = positions[i].y + (Math.random() - 0.5) * 6;
    } else {
      targetX = Math.max(50, Math.floor(Math.random() * (window.innerWidth - 100)));
      targetY = Math.max(50, Math.floor(Math.random() * (window.innerHeight - 50)));
    }

    setTimeout(() => {
      chip.style.left = `${targetX}px`;
      chip.style.top = `${targetY}px`;
    }, 10 * i + 10);
  });
});

hintBtn.addEventListener('click', () => {
  if (goldenChipElement && isEscaping) {
    goldenChipElement.style.opacity = '1';
    goldenChipElement.style.pointerEvents = 'auto'; // allow clicking explicitly now
    goldenChipElement.classList.add('highlight');
    hintBtn.innerText = "Click the glowing chip!";
  }
});

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
  winProbability = 0;
  clickCount = 0;
  isEscaping = true;
  goldenChipElement = null;
  chipsShown = false;
  correctCount = 0;
  decoySum = 0;
  hasJumped = false;

  stopConfetti = true;
  if (confettiAnimationId) cancelAnimationFrame(confettiAnimationId);
  confetti.reset();

  updateTrackerForSelection(0);

  chipsContainer.innerHTML = '';
  spawnBtn.removeAttribute('disabled');
  spawnBtn.innerText = "Not able to win it? Take action.";
  spawnBtn.classList.add('hidden-initial');
  spawnBtn.classList.remove('glow-pulse');
  
  hintBtn.innerText = "Take Hint";
  hintBtn.classList.add('hidden');

  winBtn.classList.add('escaping');
  winBtn.style.background = 'linear-gradient(45deg, #e52d27, #b31217)';
  winBtn.style.color = 'white';
  winBtn.innerText = '🏆 WIN THE IPL 2026';

  winModal.classList.add('hidden');
  
  setTimeout(positionWinBtnOverSpawnBtn, 50);
});

// Initial Anchor Sequence
setTimeout(positionWinBtnOverSpawnBtn, 200);

// Window resizes dynamically break layout. Readjust anchor naturally prior to first launch.
window.addEventListener('resize', () => {
   if (!hasJumped) {
       positionWinBtnOverSpawnBtn();
   }
});
