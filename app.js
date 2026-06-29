const MIN_DIVISOR = 2;
const MAX_DIVISOR = 9;

const levels = {
  1: {
    id: "1",
    label: "レベル1",
    questionCount: 36,
    hasRemainderInput: false,
    goldMs: 30000,
    silverMs: 50000,
    quotientMaxLength: 1,
    createQuestion: createLevel1Question,
  },
  2: {
    id: "2",
    label: "レベル2",
    questionCount: 18,
    hasRemainderInput: true,
    goldMs: 30000,
    silverMs: 55000,
    quotientMaxLength: 1,
    createQuestion: createLevel2Question,
  },
  3: {
    id: "3",
    label: "レベル3",
    questionCount: 36,
    hasRemainderInput: false,
    goldMs: 50000,
    silverMs: 90000,
    quotientMaxLength: 4,
    createQuestion: createLevel3Question,
  },
  4: {
    id: "4",
    label: "レベル4",
    questionCount: 36,
    hasRemainderInput: false,
    goldMs: 35000,
    silverMs: 60000,
    quotientMaxLength: 2,
    createQuestion: createLevel4Question,
  },
  5: {
    id: "5",
    label: "レベル5",
    questionCount: 18,
    hasRemainderInput: true,
    goldMs: 35000,
    silverMs: 60000,
    quotientMaxLength: 2,
    createQuestion: createLevel5Question,
  },
};

const state = {
  selectedLevel: "1",
  questions: [],
  currentIndex: 0,
  answers: {
    quotient: "",
    remainder: "",
  },
  activeField: "quotient",
  mistakes: 0,
  startedAt: 0,
  timerId: null,
};

const elements = {
  setupPanel: document.querySelector("#setupPanel"),
  gamePanel: document.querySelector("#gamePanel"),
  resultPanel: document.querySelector("#resultPanel"),
  startButton: document.querySelector("#startButton"),
  restartButton: document.querySelector("#restartButton"),
  retryButton: document.querySelector("#retryButton"),
  backToSetupButton: document.querySelector("#backToSetupButton"),
  levelButtons: [...document.querySelectorAll("[data-level]")],
  modeLabel: document.querySelector("#modeLabel"),
  progressText: document.querySelector("#progressText"),
  timerText: document.querySelector("#timerText"),
  progressFill: document.querySelector("#progressFill"),
  dividendText: document.querySelector("#dividendText"),
  divisorText: document.querySelector("#divisorText"),
  quotientValue: document.querySelector("#quotientValue"),
  remainderValue: document.querySelector("#remainderValue"),
  answerArea: document.querySelector(".answer-area"),
  remainderField: document.querySelector("#remainderField"),
  answerFields: [...document.querySelectorAll("[data-field]")],
  feedbackText: document.querySelector("#feedbackText"),
  keypad: document.querySelector(".keypad"),
  nextFieldButton: document.querySelector("#nextFieldButton"),
  resultTitle: document.querySelector("#resultTitle"),
  gradeText: document.querySelector("#gradeText"),
  gradeLabel: document.querySelector("#gradeLabel"),
  finalTimeText: document.querySelector("#finalTimeText"),
  mistakeText: document.querySelector("#mistakeText"),
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem(items) {
  return items[randomInt(0, items.length - 1)];
}

function createQuestion(dividend, divisor) {
  return {
    dividend,
    divisor,
    quotient: Math.floor(dividend / divisor),
    remainder: dividend % divisor,
  };
}

function createLevel1Question() {
  const divisor = randomInt(MIN_DIVISOR, MAX_DIVISOR);
  const quotient = randomInt(1, 9);

  return createQuestion(divisor * quotient, divisor);
}

function createLevel2Question() {
  const divisor = randomInt(MIN_DIVISOR, MAX_DIVISOR);
  const quotient = randomInt(1, 9);
  const remainder = randomInt(0, divisor - 1);

  return createQuestion(divisor * quotient + remainder, divisor);
}

function createLevel3Question() {
  const divisors = createPowerOfTenNumbers(2, 9999);
  const quotients = createPowerOfTenNumbers(1, 9999);

  while (true) {
    const divisor = randomItem(divisors);
    const quotient = randomItem(quotients);
    const dividend = divisor * quotient;

    if (dividend >= 10 && dividend <= 9999) {
      return createQuestion(dividend, divisor);
    }
  }
}

function createLevel4Question() {
  const divisor = randomInt(MIN_DIVISOR, MAX_DIVISOR);
  const minQuotient = Math.ceil(10 / divisor);
  const maxQuotient = Math.floor(99 / divisor);
  const quotient = randomInt(minQuotient, maxQuotient);

  return createQuestion(divisor * quotient, divisor);
}

function createLevel5Question() {
  const divisor = randomInt(MIN_DIVISOR, MAX_DIVISOR);
  const quotient = randomInt(Math.ceil(10 / divisor), Math.floor(99 / divisor));
  const maxRemainder = Math.min(divisor - 1, 99 - divisor * quotient);
  const remainder = randomInt(0, maxRemainder);

  return createQuestion(divisor * quotient + remainder, divisor);
}

function createPowerOfTenNumbers(min, max) {
  const numbers = [];

  for (let base = MIN_DIVISOR; base <= MAX_DIVISOR; base += 1) {
    for (let multiplier = 1; base * multiplier <= max; multiplier *= 10) {
      const value = base * multiplier;

      if (value >= min) {
        numbers.push(value);
      }
    }
  }

  return numbers;
}

function generateQuestions(level) {
  const questions = [];
  const seen = new Set();

  while (questions.length < level.questionCount) {
    const question = level.createQuestion();
    const key = `${question.dividend}/${question.divisor}`;

    if (!seen.has(key)) {
      seen.add(key);
      questions.push(question);
    }
  }

  return questions;
}

function formatTime(milliseconds) {
  const totalTenths = Math.floor(milliseconds / 100);
  const minutes = Math.floor(totalTenths / 600);
  const seconds = Math.floor((totalTenths % 600) / 10);
  const tenths = totalTenths % 10;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${tenths}`;
}

function updateTimer() {
  elements.timerText.textContent = formatTime(Date.now() - state.startedAt);
}

function startTimer() {
  stopTimer();
  state.startedAt = Date.now();
  elements.timerText.textContent = "00:00.0";
  state.timerId = window.setInterval(updateTimer, 100);
}

function stopTimer() {
  if (state.timerId) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
}

function getCurrentLevel() {
  return levels[state.selectedLevel];
}

function setSelectedLevel(levelId) {
  state.selectedLevel = levelId;

  elements.levelButtons.forEach((button) => {
    const isActive = button.dataset.level === levelId;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-checked", String(isActive));
  });
}

function setActiveField(field) {
  if (!getCurrentLevel().hasRemainderInput) {
    state.activeField = "quotient";
  } else {
    state.activeField = field;
  }

  elements.answerFields.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.field === state.activeField);
  });
}

function resetAnswer() {
  state.answers.quotient = "";
  state.answers.remainder = "";
  setActiveField("quotient");
  renderAnswer();
}

function renderAnswer() {
  elements.quotientValue.textContent = state.answers.quotient || "_";
  elements.remainderValue.textContent = state.answers.remainder || "_";
}

function renderQuestion() {
  const level = getCurrentLevel();
  const question = state.questions[state.currentIndex];
  const answeredCount = state.currentIndex;

  elements.modeLabel.textContent = level.label;
  elements.dividendText.textContent = question.dividend;
  elements.divisorText.textContent = question.divisor;
  elements.progressText.textContent = `${state.currentIndex + 1} / ${level.questionCount}`;
  elements.progressFill.style.width = `${(answeredCount / level.questionCount) * 100}%`;
  elements.remainderField.hidden = !level.hasRemainderInput;
  elements.answerArea.classList.toggle("is-single", !level.hasRemainderInput);
  elements.keypad.classList.toggle("is-exact", !level.hasRemainderInput);
  elements.nextFieldButton.disabled = !level.hasRemainderInput;
  elements.nextFieldButton.hidden = !level.hasRemainderInput;
  elements.feedbackText.textContent = "";
  elements.feedbackText.classList.remove("is-correct");
  resetAnswer();
}

function showPanel(panel) {
  elements.setupPanel.hidden = panel !== "setup";
  elements.gamePanel.hidden = panel !== "game";
  elements.resultPanel.hidden = panel !== "result";
}

function startGame() {
  const level = getCurrentLevel();

  state.questions = generateQuestions(level);
  state.currentIndex = 0;
  state.mistakes = 0;
  showPanel("game");
  renderQuestion();
  startTimer();
}

function getNumericAnswer(field) {
  if (state.answers[field] === "") {
    return null;
  }

  return Number(state.answers[field]);
}

function markWrong(message) {
  state.mistakes += 1;
  elements.feedbackText.textContent = message;
  elements.feedbackText.classList.remove("is-correct");
}

function submitAnswer() {
  const level = getCurrentLevel();
  const question = state.questions[state.currentIndex];
  const quotient = getNumericAnswer("quotient");
  const remainder = level.hasRemainderInput ? getNumericAnswer("remainder") : 0;

  if (quotient === null) {
    markWrong("商を入力してください");
    return;
  }

  if (remainder === null) {
    markWrong("余りを入力してください。余りなしは 0 です");
    setActiveField("remainder");
    return;
  }

  if (quotient === question.quotient && remainder === question.remainder) {
    elements.feedbackText.textContent = "正解";
    elements.feedbackText.classList.add("is-correct");
    state.currentIndex += 1;

    window.setTimeout(() => {
      if (state.currentIndex >= level.questionCount) {
        finishGame();
      } else {
        renderQuestion();
      }
    }, 180);
  } else {
    markWrong("もう一度");
  }
}

function finishGame() {
  const level = getCurrentLevel();
  const elapsed = Date.now() - state.startedAt;
  const grade = getGrade(level, elapsed, state.mistakes);

  stopTimer();
  elements.progressFill.style.width = "100%";
  elements.resultTitle.textContent = `${level.label} 完了`;
  elements.gradeText.textContent = grade.symbol;
  elements.gradeLabel.textContent = grade.label;
  elements.finalTimeText.textContent = formatTime(elapsed);
  elements.mistakeText.textContent = `${state.mistakes}回`;
  showPanel("result");
}

function getGrade(level, elapsed, mistakes) {
  if (mistakes > 0) {
    return { symbol: "▲", label: "ミスあり" };
  }

  if (elapsed <= level.goldMs) {
    return { symbol: "◎", label: "目標達成" };
  }

  if (elapsed <= level.silverMs) {
    return { symbol: "○", label: "合格" };
  }

  return { symbol: "△", label: "もう少し" };
}

function appendDigit(digit) {
  const level = getCurrentLevel();
  const field = state.activeField;
  const maxLength = field === "remainder" ? 1 : level.quotientMaxLength;

  if (state.answers[field].length >= maxLength) {
    return;
  }

  state.answers[field] += digit;
  renderAnswer();
}

function backspace() {
  const field = state.activeField;
  state.answers[field] = state.answers[field].slice(0, -1);
  renderAnswer();
}

function clearActiveField() {
  state.answers[state.activeField] = "";
  renderAnswer();
}

function toggleActiveField() {
  if (getCurrentLevel().hasRemainderInput) {
    setActiveField(state.activeField === "quotient" ? "remainder" : "quotient");
  }
}

elements.levelButtons.forEach((button) => {
  button.addEventListener("click", () => setSelectedLevel(button.dataset.level));
});

elements.answerFields.forEach((button) => {
  button.addEventListener("click", () => setActiveField(button.dataset.field));
});

elements.startButton.addEventListener("click", startGame);
elements.restartButton.addEventListener("click", startGame);
elements.retryButton.addEventListener("click", startGame);

elements.backToSetupButton.addEventListener("click", () => {
  stopTimer();
  showPanel("setup");
});

elements.keypad.addEventListener("click", (event) => {
  const button = event.target.closest("button");

  if (!button) {
    return;
  }

  if (button.dataset.key) {
    appendDigit(button.dataset.key);
    return;
  }

  if (button.dataset.action === "backspace") {
    backspace();
  } else if (button.dataset.action === "clear") {
    clearActiveField();
  } else if (button.dataset.action === "next") {
    toggleActiveField();
  } else if (button.dataset.action === "submit") {
    submitAnswer();
  }
});

document.addEventListener("keydown", (event) => {
  if (elements.gamePanel.hidden) {
    return;
  }

  if (/^[0-9]$/.test(event.key)) {
    appendDigit(event.key);
  } else if (event.key === "Backspace") {
    backspace();
  } else if (event.key === "Enter") {
    submitAnswer();
  } else if (event.key === "Tab" || event.key === "ArrowRight" || event.key === "ArrowLeft") {
    event.preventDefault();
    toggleActiveField();
  } else if (event.key === "Escape" || event.key === "Delete") {
    clearActiveField();
  }
});

setSelectedLevel(state.selectedLevel);
