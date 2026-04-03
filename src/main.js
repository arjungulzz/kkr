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
const deckContainer = document.getElementById('deck-container');
const slotsDock = document.getElementById('slots-dock');
const slots = document.querySelectorAll('.slot');

// State flags
let isEscaping = true;
let hasJumped = false;
let chipsShown = false;
let cardDeck = [];
let equippedSlots = [null, null, null, null, null];
let decoyVals = [0, 0, 0, 0, 0];

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

  const isMobile = window.innerWidth <= 768;
  const appContainer = document.querySelector('.app-container');
  if (isMobile) {
    appContainer.classList.add('playing-mobile');
  }

  // Engage Tinder Framework Views
  deckContainer.classList.remove('hidden');
  slotsDock.classList.remove('hidden');

  cardDeck = [...rightPathChips, ...decoyChips];
  cardDeck.sort(() => Math.random() - 0.5);

  drawNextCard();
});

function calculateProbability() {
  let correctHits = 0;
  let decoySumTotal = 0;
  let totalEquipped = 0;
  
  equippedSlots.forEach((text, i) => {
    if(text) {
      totalEquipped++;
      if (rightPathChips.includes(text)) {
        correctHits++;
      } else {
        decoySumTotal += decoyVals[i];
      }
    }
  });

  winProbability = (correctHits * 18) + decoySumTotal;
  if (winProbability < 0) winProbability = 0;
  
  if (totalEquipped < MAX_CLICKS && winProbability > 89) {
    winProbability = 89;
  } else if (totalEquipped === MAX_CLICKS && correctHits === 5) {
      winProbability = 90;
  } else if (totalEquipped === MAX_CLICKS) {
      winProbability = Math.min(89, winProbability);
  }

  updateTrackerForSelection(winProbability);
  clickCount = totalEquipped;
  
  if (totalEquipped === MAX_CLICKS && winProbability < 90) {
    spawnBtn.innerText = "Deck locked. Eject a slot to draw more.";
  } else if (totalEquipped === MAX_CLICKS) {
    spawnBtn.innerText = "Puzzle solved! Take the hint if needed.";
  } else {
    spawnBtn.innerText = `Select best options (${clickCount}/${MAX_CLICKS})`;
  }
}

function ejectSlot(index) {
  const text = equippedSlots[index];
  if (!text) return;
  
  // Revert Slot logic
  equippedSlots[index] = null;
  decoyVals[index] = 0;
  slots[index].innerText = '';
  slots[index].classList.remove('filled');
  
  // Only push back into deck if we don't already have it (safety mechanic)
  if(!cardDeck.includes(text)) {
      cardDeck.push(text);
      cardDeck.sort(() => Math.random() - 0.5);
  }
  
  calculateProbability();
  
  // If the deck layout was empty because slots were full, immediately pop the next card!
  if(deckContainer.children.length === 0) {
      drawNextCard();
  }
}

slots.forEach((slot, idx) => {
  slot.addEventListener('click', () => {
    ejectSlot(idx);
  });
});

function drawNextCard() {
  deckContainer.innerHTML = '';
  if (cardDeck.length === 0) return;
  if (clickCount >= MAX_CLICKS) return; 
  
  const text = cardDeck.shift(); // Pull from the top
  const card = document.createElement('div');
  card.classList.add('swipe-card');
  card.innerText = text;
  
  if (text === goldenChipText) {
    card.classList.add('golden-card');
  }
  
  deckContainer.appendChild(card);
  
  let isDragging = false;
  let startX = 0;
  let currentX = 0;
  
  // Native absolute pointer tracking securely merges Mouse/Touch
  card.addEventListener('pointerdown', (e) => {
    isDragging = true;
    startX = e.clientX;
    card.classList.add('dragging');
    card.setPointerCapture(e.pointerId);
  });
  
  card.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    currentX = e.clientX - startX;
    let rotate = currentX * 0.05; 
    card.style.transform = `translate(${currentX}px, 0) rotate(${rotate}deg)`;
  });
  
  card.addEventListener('pointerup', (e) => {
    if (!isDragging) return;
    isDragging = false;
    card.classList.remove('dragging');
    card.releasePointerCapture(e.pointerId);
    
    // Evaluate physics vectors
    if (currentX > 80) { // Equip Threshold
      card.style.opacity = '0'; // instantly dissolve visually
      equipCard(text);
    } else if (currentX < -80) { // Discard Threshold
      card.style.opacity = '0';
      discardCard(text);
    } else { // Snap logic
      card.style.transform = `translate(0px, 0) rotate(0deg)`;
    }
  });
  
  card.addEventListener('pointercancel', () => {
      isDragging = false;
      card.classList.remove('dragging');
      card.style.transform = `translate(0px, 0) rotate(0deg)`;
  });
}

function equipCard(text) {
  let slotIdx = equippedSlots.indexOf(null);
  if (slotIdx === -1) {
    discardCard(text); // Safety belt
    return;
  }
  
  if (text === goldenChipText) {
     isEscaping = false;
     updateTrackerForSelection(100);
     deckContainer.innerHTML = ''; // wipe clear
     return;
  }
  
  equippedSlots[slotIdx] = text;
  if (!rightPathChips.includes(text)) {
    decoyVals[slotIdx] = Math.floor(Math.random() * 26) - 5;
  }
  
  slots[slotIdx].innerText = text;
  slots[slotIdx].classList.add('filled');
  
  calculateProbability();
  setTimeout(drawNextCard, 100);
}

function discardCard(text) {
   cardDeck.push(text);
   setTimeout(drawNextCard, 100);
}

// Map the Hint precisely to the deck injection physics
hintBtn.addEventListener('click', () => {
  if (isEscaping) {
    hintBtn.innerText = "Check your deck!!";
    cardDeck.unshift(goldenChipText); // Inject directly into front slot!
    if(deckContainer.children.length === 0) drawNextCard();
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
  cardDeck = [];
  equippedSlots = [null, null, null, null, null];
  decoyVals = [0, 0, 0, 0, 0];
  
  slots.forEach((s) => {
      s.innerText = '';
      s.classList.remove('filled');
  });

  document.querySelector('.app-container').classList.remove('playing-mobile');

  stopConfetti = true;
  if (confettiAnimationId) cancelAnimationFrame(confettiAnimationId);
  confetti.reset();

  updateTrackerForSelection(0);

  deckContainer.innerHTML = '';
  deckContainer.classList.add('hidden');
  slotsDock.classList.add('hidden');
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
