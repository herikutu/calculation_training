const MIN_DIVISOR = 2;
const MAX_DIVISOR = 9;
const COUNTDOWN_VALUES = ["3", "2", "1", "スタート"];
const COUNTDOWN_STEP_MS = 800;
const WEAKNESS_QUESTION_COUNT = 20;

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
  activeLevel: null,
  questions: [],
  currentIndex: 0,
  answers: {
    quotient: "",
    remainder: "",
  },
  activeField: "quotient",
  mistakes: 0,
  questionMistakes: 0,
  questionStartedAt: 0,
  questionStats: [],
  startedAt: 0,
  timerId: null,
  countdownTimerIds: [],
  isCountingDown: false,
  dataView: "ranking",
  weaknessItems: [],
  dataRefreshTimerId: null,
};

const elements = {
  setupPanel: document.querySelector("#setupPanel"),
  gamePanel: document.querySelector("#gamePanel"),
  resultPanel: document.querySelector("#resultPanel"),
  countdownOverlay: document.querySelector("#countdownOverlay"),
  countdownText: document.querySelector("#countdownText"),
  nicknameInput: document.querySelector("#nicknameInput"),
  dataStatus: document.querySelector("#dataStatus"),
  startButton: document.querySelector("#startButton"),
  homeButton: document.querySelector("#homeButton"),
  restartButton: document.querySelector("#restartButton"),
  retryButton: document.querySelector("#retryButton"),
  backToSetupButton: document.querySelector("#backToSetupButton"),
  levelButtons: [...document.querySelectorAll("[data-level]")],
  modeLabel: document.querySelector("#modeLabel"),
  targetText: document.querySelector("#targetText"),
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
  submitButton: document.querySelector("#submitButton"),
  clearButton: document.querySelector("#clearButton"),
  dataTabs: [...document.querySelectorAll("[data-data-view]")],
  rankingPanel: document.querySelector("#rankingPanel"),
  rankingTitle: document.querySelector("#rankingTitle"),
  rankingList: document.querySelector("#rankingList"),
  refreshDataButton: document.querySelector("#refreshDataButton"),
  weaknessPanel: document.querySelector("#weaknessPanel"),
  weaknessModeButton: document.querySelector("#weaknessModeButton"),
  weaknessSummary: document.querySelector("#weaknessSummary"),
  weaknessList: document.querySelector("#weaknessList"),
  resultTitle: document.querySelector("#resultTitle"),
  gradeText: document.querySelector("#gradeText"),
  gradeLabel: document.querySelector("#gradeLabel"),
  finalTimeText: document.querySelector("#finalTimeText"),
  mistakeText: document.querySelector("#mistakeText"),
  resultSaveStatus: document.querySelector("#resultSaveStatus"),
};

function getDataStore() {
  return window.trainingDataStore;
}

function normalizeNickname(value) {
  const dataStore = getDataStore();

  if (dataStore) {
    return dataStore.normalizeNickname(value);
  }

  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 12);
}

function getNickname() {
  return normalizeNickname(elements.nicknameInput.value);
}

function updateDataStatus(message) {
  elements.dataStatus.textContent = message;
}

function formatCompactTime(milliseconds) {
  const totalSeconds = Math.max(0, Math.round(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}秒`;
  }

  if (seconds === 0) {
    return `${minutes}分`;
  }

  return `${minutes}分${seconds}秒`;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem(items) {
  return items[randomInt(0, items.length - 1)];
}

function createQuestion(dividend, divisor) {
  return {
    key: `${dividend}/${divisor}`,
    display: `${dividend} ÷ ${divisor}`,
    dividend,
    divisor,
    quotient: Math.floor(dividend / divisor),
    remainder: dividend % divisor,
  };
}

function createQuestionFromWeakItem(item) {
  return createQuestion(item.dividend, item.divisor);
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
    const key = question.key;

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

function formatTargetTime(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}秒`;
  }

  if (seconds === 0) {
    return `${minutes}分`;
  }

  return `${minutes}分${seconds}秒`;
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

function beginQuestionTiming() {
  state.questionStartedAt = Date.now();
  state.questionMistakes = 0;
}

function clearCountdown() {
  state.countdownTimerIds.forEach((timerId) => window.clearTimeout(timerId));
  state.countdownTimerIds = [];
  state.isCountingDown = false;
  elements.countdownOverlay.hidden = true;
  elements.gamePanel.classList.remove("is-counting-down");
}

function startCountdown() {
  clearCountdown();
  state.isCountingDown = true;
  elements.countdownText.textContent = COUNTDOWN_VALUES[0];
  elements.countdownOverlay.hidden = false;
  elements.gamePanel.classList.add("is-counting-down");
  elements.timerText.textContent = "00:00.0";

  COUNTDOWN_VALUES.slice(1).forEach((value, index) => {
    const timerId = window.setTimeout(() => {
      elements.countdownText.textContent = value;
    }, COUNTDOWN_STEP_MS * (index + 1));

    state.countdownTimerIds.push(timerId);
  });

  const startTimerId = window.setTimeout(() => {
    state.countdownTimerIds = [];
    state.isCountingDown = false;
    elements.countdownOverlay.hidden = true;
    elements.gamePanel.classList.remove("is-counting-down");
    startTimer();
    beginQuestionTiming();
  }, COUNTDOWN_STEP_MS * COUNTDOWN_VALUES.length);

  state.countdownTimerIds.push(startTimerId);
}

function getCurrentLevel() {
  return state.activeLevel || levels[state.selectedLevel];
}

function getSelectedLevel() {
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

  updateActionButtons();
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
  elements.targetText.textContent = `◎ ${formatTargetTime(level.goldMs)} / ○ ${formatTargetTime(level.silverMs)}`;
  elements.dividendText.textContent = question.dividend;
  elements.divisorText.textContent = question.divisor;
  elements.progressText.textContent = `${state.currentIndex + 1} / ${level.questionCount}`;
  elements.progressFill.style.width = `${(answeredCount / level.questionCount) * 100}%`;
  elements.remainderField.hidden = !level.hasRemainderInput;
  elements.answerArea.classList.toggle("is-single", !level.hasRemainderInput);
  elements.keypad.classList.toggle("is-exact", !level.hasRemainderInput);
  elements.feedbackText.textContent = "";
  elements.feedbackText.classList.remove("is-correct");
  resetAnswer();
}

function showPanel(panel) {
  elements.setupPanel.hidden = panel !== "setup";
  elements.gamePanel.hidden = panel !== "game";
  elements.resultPanel.hidden = panel !== "result";
}

function startSession(level, questions) {
  stopTimer();
  clearCountdown();
  state.activeLevel = level;
  state.questions = questions;
  state.currentIndex = 0;
  state.mistakes = 0;
  state.questionMistakes = 0;
  state.questionStartedAt = 0;
  state.questionStats = [];
  showPanel("game");
  renderQuestion();
  startCountdown();
}

function ensureNickname() {
  const nickname = getNickname();

  if (nickname) {
    const dataStore = getDataStore();

    if (dataStore) {
      dataStore.saveNickname(nickname);
    }

    return nickname;
  }

  updateDataStatus("ニックネームを入力してください");
  elements.nicknameInput.focus();
  return "";
}

function startGame() {
  if (!ensureNickname()) {
    return;
  }

  const level = getSelectedLevel();
  const sessionLevel = {
    ...level,
    sourceLevelId: level.id,
    isWeaknessMode: false,
  };

  startSession(sessionLevel, generateQuestions(level));
}

function startWeaknessGame() {
  if (!ensureNickname() || state.weaknessItems.length === 0) {
    return;
  }

  const level = getSelectedLevel();
  const questions = [];

  while (questions.length < WEAKNESS_QUESTION_COUNT) {
    const item = randomItem(state.weaknessItems);
    questions.push(createQuestionFromWeakItem(item));
  }

  const sessionLevel = {
    ...level,
    label: `${level.label} 苦手`,
    questionCount: questions.length,
    sourceLevelId: level.id,
    isWeaknessMode: true,
  };

  startSession(sessionLevel, questions);
}

function getNumericAnswer(field) {
  if (state.answers[field] === "") {
    return null;
  }

  return Number(state.answers[field]);
}

function markWrong(message) {
  state.mistakes += 1;
  state.questionMistakes += 1;
  elements.feedbackText.textContent = message;
  elements.feedbackText.classList.remove("is-correct");
}

function showInputPrompt(message) {
  elements.feedbackText.textContent = message;
  elements.feedbackText.classList.remove("is-correct");
}

function recordQuestionResult(question) {
  const level = getCurrentLevel();
  const elapsedMs = Math.max(0, Date.now() - state.questionStartedAt);

  state.questionStats.push({
    key: question.key,
    display: question.display,
    levelId: level.sourceLevelId || level.id,
    dividend: question.dividend,
    divisor: question.divisor,
    quotient: question.quotient,
    remainder: question.remainder,
    elapsedMs,
    mistakes: state.questionMistakes,
  });
}

function submitAnswer() {
  if (state.isCountingDown) {
    return;
  }

  const level = getCurrentLevel();
  const question = state.questions[state.currentIndex];
  const quotient = getNumericAnswer("quotient");
  const remainder = level.hasRemainderInput ? getNumericAnswer("remainder") : 0;

  if (quotient === null) {
    showInputPrompt("商を入力してください");
    return;
  }

  if (remainder === null) {
    showInputPrompt("余りを入力してください。余りなしは 0 です");
    setActiveField("remainder");
    return;
  }

  if (quotient === question.quotient && remainder === question.remainder) {
    recordQuestionResult(question);
    elements.feedbackText.textContent = "正解";
    elements.feedbackText.classList.add("is-correct");
    state.currentIndex += 1;

    window.setTimeout(() => {
      if (state.currentIndex >= level.questionCount) {
        finishGame();
      } else {
        renderQuestion();
        beginQuestionTiming();
      }
    }, 180);
  } else {
    markWrong("もう一度");
  }
}

function createFinishedResult(level, elapsed, grade) {
  return {
    nickname: getNickname(),
    levelId: level.sourceLevelId || level.id,
    levelLabel: level.label,
    isWeaknessMode: level.isWeaknessMode,
    questionCount: level.questionCount,
    elapsedMs: elapsed,
    mistakes: state.mistakes,
    gradeSymbol: grade.symbol,
    gradeLabel: grade.label,
    questionStats: state.questionStats,
    createdAt: new Date().toISOString(),
  };
}

async function saveFinishedResult(result) {
  const dataStore = getDataStore();

  elements.resultSaveStatus.textContent = "保存中";

  if (!dataStore) {
    elements.resultSaveStatus.textContent = "端末内保存";
    return;
  }

  const saveResult = await dataStore.saveResult(result);
  elements.resultSaveStatus.textContent = saveResult.message;
  refreshDataPanels();
}

function finishGame() {
  const level = getCurrentLevel();
  const elapsed = Date.now() - state.startedAt;
  const grade = getGrade(level, elapsed, state.mistakes);
  const result = createFinishedResult(level, elapsed, grade);

  stopTimer();
  elements.progressFill.style.width = "100%";
  elements.resultTitle.textContent = `${level.label} 完了`;
  elements.gradeText.textContent = grade.symbol;
  elements.gradeLabel.textContent = grade.label;
  elements.finalTimeText.textContent = formatTime(elapsed);
  elements.mistakeText.textContent = `${state.mistakes}回`;
  showPanel("result");
  saveFinishedResult(result);
}

function getGrade(level, elapsed, mistakes) {
  if (level.isWeaknessMode) {
    return { symbol: "◎", label: mistakes > 0 ? "集中完了" : "ノーミス" };
  }

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
  if (state.isCountingDown) {
    return;
  }

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
  if (state.isCountingDown) {
    return;
  }

  const field = state.activeField;
  state.answers[field] = state.answers[field].slice(0, -1);
  renderAnswer();
}

function clearActiveField() {
  if (state.isCountingDown) {
    return;
  }

  state.answers[state.activeField] = "";
  renderAnswer();
}

function toggleActiveField() {
  if (getCurrentLevel().hasRemainderInput) {
    setActiveField(state.activeField === "quotient" ? "remainder" : "quotient");
  }
}

function updateActionButtons() {
  const level = getCurrentLevel();

  if (level.hasRemainderInput && state.activeField === "quotient") {
    elements.submitButton.textContent = "余りに進む";
    elements.clearButton.textContent = "クリア";
  } else if (level.hasRemainderInput && state.activeField === "remainder") {
    elements.submitButton.textContent = "答える";
    elements.clearButton.textContent = "商に戻る";
  } else {
    elements.submitButton.textContent = "答える";
    elements.clearButton.textContent = "クリア";
  }
}

function handleSubmitAction() {
  const level = getCurrentLevel();

  if (state.isCountingDown) {
    return;
  }

  if (level.hasRemainderInput && state.activeField === "quotient") {
    if (getNumericAnswer("quotient") === null) {
      showInputPrompt("商を入力してください");
      return;
    }

    setActiveField("remainder");
    elements.feedbackText.textContent = "";
    elements.feedbackText.classList.remove("is-correct");
    return;
  }

  submitAnswer();
}

function handleClearAction() {
  const level = getCurrentLevel();

  if (state.isCountingDown) {
    return;
  }

  if (level.hasRemainderInput && state.activeField === "remainder") {
    setActiveField("quotient");
    elements.feedbackText.textContent = "";
    elements.feedbackText.classList.remove("is-correct");
    return;
  }

  clearActiveField();
}

function backToSetup() {
  stopTimer();
  clearCountdown();
  state.activeLevel = null;
  showPanel("setup");
  refreshDataPanels();
}

function createListText(className, text) {
  const span = document.createElement("span");
  span.className = className;
  span.textContent = text;
  return span;
}

function renderEmptyList(listElement, message) {
  const item = document.createElement("li");
  item.className = "empty-row";
  item.textContent = message;
  listElement.replaceChildren(item);
}

function setDataView(view) {
  state.dataView = view;
  elements.rankingPanel.hidden = view !== "ranking";
  elements.weaknessPanel.hidden = view !== "weakness";

  elements.dataTabs.forEach((button) => {
    const isActive = button.dataset.dataView === view;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
}

function renderRanking(items) {
  if (!items.length) {
    renderEmptyList(elements.rankingList, "まだ記録なし");
    return;
  }

  const rows = items.map((item, index) => {
    const row = document.createElement("li");
    row.append(
      createListText("rank-number", `${index + 1}`),
      createListText("rank-main", item.nickname || "名無し"),
      createListText("rank-meta", `${formatTime(item.elapsedMs)} / ${item.mistakes || 0}ミス`),
    );
    return row;
  });

  elements.rankingList.replaceChildren(...rows);
}

function renderWeakness(items) {
  state.weaknessItems = items;
  elements.weaknessModeButton.disabled = items.length === 0;

  if (!getNickname()) {
    elements.weaknessSummary.textContent = "ニックネーム未入力";
    renderEmptyList(elements.weaknessList, "まだ記録なし");
    return;
  }

  if (!items.length) {
    elements.weaknessSummary.textContent = "まだ記録なし";
    renderEmptyList(elements.weaknessList, "まだ記録なし");
    return;
  }

  elements.weaknessSummary.textContent = `${items.length}件`;
  const rows = items.slice(0, 20).map((item, index) => {
    const row = document.createElement("li");
    row.append(
      createListText("rank-number", `${index + 1}`),
      createListText("weak-main", item.display),
      createListText("weak-meta", `${formatCompactTime(item.averageMs)} / ${item.mistakes}ミス`),
    );
    return row;
  });

  elements.weaknessList.replaceChildren(...rows);
}

async function refreshDataPanels() {
  const dataStore = getDataStore();
  const level = getSelectedLevel();

  elements.rankingTitle.textContent = `${level.label} ランキング`;

  if (!dataStore) {
    updateDataStatus("端末内保存");
    renderEmptyList(elements.rankingList, "まだ記録なし");
    renderWeakness([]);
    return;
  }

  updateDataStatus(dataStore.getStatus().message);
  renderWeakness(dataStore.loadWeaknessItems(getNickname(), level.id));
  renderEmptyList(elements.rankingList, "読み込み中");

  const requestedLevelId = level.id;
  const rankingResult = await dataStore.loadRankings(requestedLevelId);

  if (state.selectedLevel !== requestedLevelId) {
    return;
  }

  updateDataStatus(dataStore.getStatus().message);
  renderRanking(rankingResult.items);
}

function scheduleDataRefresh() {
  window.clearTimeout(state.dataRefreshTimerId);
  state.dataRefreshTimerId = window.setTimeout(refreshDataPanels, 250);
}

function initializeData() {
  const dataStore = getDataStore();

  if (!dataStore) {
    updateDataStatus("端末内保存");
    return;
  }

  elements.nicknameInput.value = dataStore.getNickname();
  updateDataStatus(dataStore.getStatus().message);
  refreshDataPanels();
  dataStore.init().then(refreshDataPanels);
}

elements.levelButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setSelectedLevel(button.dataset.level);
    refreshDataPanels();
  });
});

elements.answerFields.forEach((button) => {
  button.addEventListener("click", () => setActiveField(button.dataset.field));
});

elements.dataTabs.forEach((button) => {
  button.addEventListener("click", () => setDataView(button.dataset.dataView));
});

elements.nicknameInput.addEventListener("input", () => {
  const dataStore = getDataStore();

  if (dataStore) {
    dataStore.saveNickname(elements.nicknameInput.value);
  }

  scheduleDataRefresh();
});

elements.refreshDataButton.addEventListener("click", refreshDataPanels);
elements.weaknessModeButton.addEventListener("click", startWeaknessGame);
elements.startButton.addEventListener("click", startGame);
elements.homeButton.addEventListener("click", backToSetup);
elements.restartButton.addEventListener("click", startGame);
elements.retryButton.addEventListener("click", startGame);

elements.backToSetupButton.addEventListener("click", backToSetup);

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
    handleClearAction();
  } else if (button.dataset.action === "next") {
    toggleActiveField();
  } else if (button.dataset.action === "submit") {
    handleSubmitAction();
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
    handleSubmitAction();
  } else if (event.key === "Tab" || event.key === "ArrowRight" || event.key === "ArrowLeft") {
    event.preventDefault();
    toggleActiveField();
  } else if (event.key === "Escape" || event.key === "Delete") {
    handleClearAction();
  }
});

setSelectedLevel(state.selectedLevel);
initializeData();
