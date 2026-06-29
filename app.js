const TOTAL_QUESTIONS = 20;
const MIN_DIVIDEND = 10;
const MAX_DIVIDEND = 99;
const MIN_DIVISOR = 2;
const MAX_DIVISOR = 9;

const modeLabels = {
  exact: "余りなし",
  mixed: "余りありかも",
};

const state = {
  selectedMode: "exact",
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
  modeButtons: [...document.querySelectorAll("[data-mode]")],
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
  finalTimeText: document.querySelector("#finalTimeText"),
  mistakeText: document.querySelector("#mistakeText"),
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createExactQuestion() {
  const divisor = randomInt(MIN_DIVISOR, MAX_DIVISOR);
  const minQuotient = Math.ceil(MIN_DIVIDEND / divisor);
  const maxQuotient = Math.floor(MAX_DIVIDEND / divisor);
  const quotient = randomInt(minQuotient, maxQuotient);
  const dividend = quotient * divisor;

  return {
    dividend,
    divisor,
    quotient,
    remainder: 0,
  };
}

function createRemainderQuestion() {
  let dividend = randomInt(MIN_DIVIDEND, MAX_DIVIDEND);
  let divisor = randomInt(MIN_DIVISOR, MAX_DIVISOR);

  while (dividend % divisor === 0) {
    dividend = randomInt(MIN_DIVIDEND, MAX_DIVIDEND);
    divisor = randomInt(MIN_DIVISOR, MAX_DIVISOR);
  }

  return {
    dividend,
    divisor,
    quotient: Math.floor(dividend / divisor),
    remainder: dividend % divisor,
  };
}

function generateQuestions(mode) {
  const questions = [];
  const seen = new Set();

  while (questions.length < TOTAL_QUESTIONS) {
    const shouldHaveRemainder = mode === "mixed" && Math.random() < 0.7;
    const question = shouldHaveRemainder ? createRemainderQuestion() : createExactQuestion();
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

function setSelectedMode(mode) {
  state.selectedMode = mode;

  elements.modeButtons.forEach((button) => {
    const isActive = button.dataset.mode === mode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-checked", String(isActive));
  });
}

function setActiveField(field) {
  if (state.selectedMode === "exact") {
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
  const question = state.questions[state.currentIndex];
  const answeredCount = state.currentIndex;

  elements.modeLabel.textContent = modeLabels[state.selectedMode];
  elements.dividendText.textContent = question.dividend;
  elements.divisorText.textContent = question.divisor;
  elements.progressText.textContent = `${state.currentIndex + 1} / ${TOTAL_QUESTIONS}`;
  elements.progressFill.style.width = `${(answeredCount / TOTAL_QUESTIONS) * 100}%`;
  elements.remainderField.hidden = state.selectedMode === "exact";
  elements.answerArea.classList.toggle("is-single", state.selectedMode === "exact");
  elements.keypad.classList.toggle("is-exact", state.selectedMode === "exact");
  elements.nextFieldButton.disabled = state.selectedMode === "exact";
  elements.nextFieldButton.hidden = state.selectedMode === "exact";
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
  state.questions = generateQuestions(state.selectedMode);
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
  const question = state.questions[state.currentIndex];
  const quotient = getNumericAnswer("quotient");
  const remainder = state.selectedMode === "exact" ? 0 : getNumericAnswer("remainder");

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
      if (state.currentIndex >= TOTAL_QUESTIONS) {
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
  const elapsed = Date.now() - state.startedAt;
  stopTimer();
  elements.progressFill.style.width = "100%";
  elements.finalTimeText.textContent = formatTime(elapsed);
  elements.mistakeText.textContent = `${state.mistakes}回`;
  showPanel("result");
}

function appendDigit(digit) {
  const field = state.activeField;
  const maxLength = field === "remainder" ? 1 : 2;

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
  if (state.selectedMode === "mixed") {
    setActiveField(state.activeField === "quotient" ? "remainder" : "quotient");
  }
}

elements.modeButtons.forEach((button) => {
  button.addEventListener("click", () => setSelectedMode(button.dataset.mode));
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

setSelectedMode(state.selectedMode);
