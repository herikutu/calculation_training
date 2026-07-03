const COUNTDOWN_VALUES = ["3", "2", "1", "スタート"];
const COUNTDOWN_STEP_MS = 800;
const WEAKNESS_QUESTION_COUNT = 20;
const MAX_ANSWER_LENGTH = 4;

const OPERATION_ORDER = ["addition", "subtraction", "multiplication", "division"];

const state = {
  selectedOperation: getInitialOperation(),
  selectedLevel: "1",
  activeLevel: null,
  questions: [],
  currentIndex: 0,
  answers: {},
  activeField: "",
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
  appEyebrow: document.querySelector("#appEyebrow"),
  headerBadge: document.querySelector("#headerBadge"),
  setupPanel: document.querySelector("#setupPanel"),
  gamePanel: document.querySelector("#gamePanel"),
  resultPanel: document.querySelector("#resultPanel"),
  countdownOverlay: document.querySelector("#countdownOverlay"),
  countdownText: document.querySelector("#countdownText"),
  nicknameInput: document.querySelector("#nicknameInput"),
  dataStatus: document.querySelector("#dataStatus"),
  operationTabs: document.querySelector("#operationTabs"),
  levelOptions: document.querySelector("#levelOptions"),
  startButton: document.querySelector("#startButton"),
  homeButton: document.querySelector("#homeButton"),
  restartButton: document.querySelector("#restartButton"),
  retryButton: document.querySelector("#retryButton"),
  backToSetupButton: document.querySelector("#backToSetupButton"),
  modeLabel: document.querySelector("#modeLabel"),
  targetText: document.querySelector("#targetText"),
  progressText: document.querySelector("#progressText"),
  timerText: document.querySelector("#timerText"),
  progressFill: document.querySelector("#progressFill"),
  problemExpression: document.querySelector("#problemExpression"),
  answerArea: document.querySelector(".answer-area"),
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

const operations = createOperations();
state.selectedLevel = getInitialLevel(state.selectedOperation);

function getInitialOperation() {
  const operationId = new URLSearchParams(window.location.search).get("operation");
  return OPERATION_ORDER.includes(operationId) ? operationId : "addition";
}

function getInitialLevel(operationId) {
  const params = new URLSearchParams(window.location.search);
  const requestedLevel = params.get("level") || params.get("levels") || "1";
  const operation = operations?.[operationId];

  if (operation && operation.levels[requestedLevel]) {
    return requestedLevel;
  }

  return "1";
}

function createOperations() {
  const addition = createOperation("addition", "足し算", "+", [
    level(1, 36, 35000, 50000, "1桁 + 1桁", createAdditionLevel1),
    level(2, 36, 60000, 90000, "2桁 + 1桁", createAdditionLevel2),
    level(3, 36, 40000, 60000, "2桁 + 2桁。1の位だけ", createAdditionLevel3),
    level(4, 36, 50000, 60000, "2桁 + 2桁。10の位だけ", createAdditionLevel4),
    level(5, 18, 70000, 110000, "10の位 → 1の位 → 合計。繰り上がりなし", createAdditionLevel5),
    level(6, 18, 80000, 120000, "10の位 → 1の位 → 合計。繰り上がりあり", createAdditionLevel6),
    level(7, 36, 80000, 120000, "2桁 + 2桁", createAdditionLevel7),
    level(8, 18, 90000, 140000, "100/10の位 → 1の位 → 合計", createAdditionLevel8),
    level(9, 36, 110000, 160000, "3桁 + 2桁", createAdditionLevel9),
    level(10, 18, 120000, 180000, "3桁 + 3桁。100/10の位 → 1の位 → 合計", createAdditionLevel10),
    level(11, 36, 140000, 210000, "3桁 + 3桁", createAdditionLevel11),
  ]);

  const subtraction = createOperation("subtraction", "引き算", "-", [
    level(1, 36, 30000, 50000, "1桁 - 1桁", createSubtractionLevel1),
    level(2, 36, 50000, 90000, "1の位が0の2桁 - 1桁", createSubtractionLevel2),
    level(3, 36, 45000, 80000, "10の位が1の2桁 - 1桁", createSubtractionLevel3),
    level(4, 36, 45000, 80000, "2桁 - 1桁。1の位だけ", createSubtractionLevel4),
    level(5, 36, 70000, 120000, "2桁 - 1桁", createSubtractionLevel5),
    level(6, 36, 50000, 90000, "2桁 - 2桁。1の位だけ", createSubtractionLevel6),
    level(7, 18, 70000, 120000, "10の位を引く → 1の位を引く", createSubtractionLevel7),
    level(8, 36, 90000, 160000, "2桁 - 2桁", createSubtractionLevel8),
    level(9, 18, 100000, 180000, "100/10の位を引く → 1の位を引く", createSubtractionLevel9),
    level(10, 36, 120000, 200000, "3桁 - 2桁", createSubtractionLevel10),
    level(11, 18, 110000, 200000, "3桁 - 3桁。100/10の位を引く → 1の位を引く", createSubtractionLevel11),
    level(12, 36, 140000, 220000, "3桁 - 3桁", createSubtractionLevel12),
  ]);

  const multiplication = createOperation("multiplication", "掛け算", "×", [
    level(1, 36, 40000, 60000, "1桁 × 1桁", createMultiplicationLevel1),
    level(2, 36, 60000, 100000, "10倍・100倍の数 × 1桁", createMultiplicationLevel2),
    level(3, 18, 70000, 110000, "10の位 → 1の位 → 合計", createMultiplicationLevel3),
    level(4, 18, 70000, 120000, "レベル3の順序逆を含む", createMultiplicationLevel4),
    level(5, 36, 70000, 120000, "10の位が1の2桁 × 1桁", createMultiplicationLevel5),
    level(6, 18, 80000, 140000, "2桁 × 1桁。10の位 → 1の位 → 合計", createMultiplicationLevel6),
    level(7, 18, 80000, 140000, "レベル6の順序逆を含む", createMultiplicationLevel7),
    level(8, 36, 90000, 150000, "2桁 × 1桁。順序逆あり", createMultiplicationLevel8),
  ]);

  const division = createOperation("division", "割り算", "÷", [
    level(1, 36, 30000, 50000, "1〜2桁 ÷ 2〜9。余りなし", createDivisionLevel1),
    level(2, 18, 30000, 55000, "1〜2桁 ÷ 2〜9。余りあり", createDivisionLevel2),
    level(3, 36, 50000, 90000, "2〜4桁 ÷ 2〜9系の数。余りなし", createDivisionLevel3),
    level(4, 36, 35000, 60000, "2桁 ÷ 2〜9。余りなし", createDivisionLevel4),
    level(5, 18, 35000, 60000, "2桁 ÷ 2〜9。余りあり", createDivisionLevel5),
    level(6, 36, 60000, 110000, "2〜4桁 ÷ 2〜9系の数。余りなし", createDivisionLevel6),
    level(7, 36, 70000, 120000, "3桁 ÷ 2〜9。余りなし", createDivisionLevel7),
    level(8, 18, 60000, 110000, "3桁 ÷ 2〜9。余りあり", createDivisionLevel8),
    level(9, 18, 80000, 140000, "4桁 ÷ 2〜9。余りあり", createDivisionLevel9),
    level(10, 18, 90000, 150000, "4桁 ÷ 20〜900。余りあり", createDivisionLevel10),
  ]);

  return { addition, subtraction, multiplication, division };
}

function createOperation(id, label, symbol, levelList) {
  const levels = {};

  levelList.forEach((levelConfig) => {
    levels[levelConfig.id] = {
      ...levelConfig,
      operationId: id,
      operationLabel: label,
      symbol,
      taskId: createTaskId(id, levelConfig.id),
    };
  });

  return { id, label, symbol, levels };
}

function level(id, questionCount, goldMs, silverMs, summary, createQuestion) {
  return {
    id: String(id),
    label: `レベル${id}`,
    questionCount,
    goldMs,
    silverMs,
    summary,
    createQuestion,
  };
}

function createTaskId(operationId, levelId) {
  return `${operationId}:${levelId}`;
}

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

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem(items) {
  return items[randomInt(0, items.length - 1)];
}

function randomDigit() {
  return randomInt(1, 9);
}

function randomTwoDigit() {
  return randomInt(10, 99);
}

function randomThreeDigit() {
  return randomInt(100, 999);
}

function randomFourDigit() {
  return randomInt(1000, 9999);
}

function makeTwoDigit(tens = randomDigit(), ones = randomInt(0, 9)) {
  return tens * 10 + ones;
}

function makeThreeDigit(hundreds = randomDigit(), tens = randomInt(0, 9), ones = randomInt(0, 9)) {
  return hundreds * 100 + tens * 10 + ones;
}

function answer(id, label, value, maxLength = MAX_ANSWER_LENGTH) {
  return {
    id,
    label,
    value: Number(value),
    maxLength,
  };
}

function createQuestion({ operationId, levelId, left, operator, right, connector = "=", answers, key }) {
  const display = `${left} ${operator} ${right}`;
  const taskId = createTaskId(operationId, levelId);
  const normalizedAnswers = answers.map((item) => answer(item.id, item.label, item.value, item.maxLength));

  return {
    key: key || `${taskId}:${display}:${normalizedAnswers.map((item) => item.value).join(",")}`,
    display,
    connector,
    operationId,
    levelId,
    taskId,
    left,
    right,
    operator,
    answers: normalizedAnswers,
  };
}

function createSingleAnswerQuestion(operationId, levelId, left, operator, right, value, connector = "=") {
  return createQuestion({
    operationId,
    levelId,
    left,
    operator,
    right,
    connector,
    answers: [answer("answer", "答え", value)],
  });
}

function createMultiAnswerQuestion(operationId, levelId, left, operator, right, answers) {
  return createQuestion({
    operationId,
    levelId,
    left,
    operator,
    right,
    connector: "→",
    answers,
  });
}

function createDivisionQuestion(levelId, dividend, divisor, hasRemainder) {
  const quotient = Math.floor(dividend / divisor);
  const remainder = dividend % divisor;
  const answers = [answer("quotient", "商", quotient)];

  if (hasRemainder) {
    answers.push(answer("remainder", "余り", remainder));
  }

  return createQuestion({
    operationId: "division",
    levelId,
    left: dividend,
    operator: "÷",
    right: divisor,
    answers,
    key: `division:${levelId}:${dividend}/${divisor}`,
  });
}

function createQuestionFromWeakItem(item) {
  if (Array.isArray(item.answers) && item.answers.length) {
    return {
      key: item.key,
      display: item.display,
      connector: item.connector || "=",
      operationId: item.operationId || getSelectedOperation().id,
      levelId: item.levelId || getSelectedLevel().id,
      taskId: item.taskId || createTaskId(item.operationId || getSelectedOperation().id, item.levelId || getSelectedLevel().id),
      left: item.left,
      right: item.right,
      operator: item.operator || getSelectedOperation().symbol,
      answers: item.answers.map((field) => answer(field.id, field.label, field.value, field.maxLength)),
    };
  }

  if (item.dividend && item.divisor) {
    return createDivisionQuestion(String(item.levelId || getSelectedLevel().id), item.dividend, item.divisor, Number(item.remainder) > 0);
  }

  return null;
}

function createAdditionLevel1() {
  const left = randomDigit();
  const right = randomDigit();
  return createSingleAnswerQuestion("addition", "1", left, "+", right, left + right);
}

function createAdditionLevel2() {
  const left = randomTwoDigit();
  const right = randomDigit();
  return createSingleAnswerQuestion("addition", "2", left, "+", right, left + right);
}

function createAdditionLevel3() {
  const left = randomTwoDigit();
  const right = randomTwoDigit();
  return createMultiAnswerQuestion("addition", "3", left, "+", right, [answer("ones", "1の位", (left % 10) + (right % 10))]);
}

function createAdditionLevel4() {
  const left = randomTwoDigit();
  const right = randomTwoDigit();
  return createMultiAnswerQuestion("addition", "4", left, "+", right, [
    answer("tens", "10の位", Math.floor(left / 10) * 10 + Math.floor(right / 10) * 10),
  ]);
}

function createAdditionLevel5() {
  let left;
  let right;

  do {
    left = randomTwoDigit();
    right = randomTwoDigit();
  } while ((left % 10) + (right % 10) > 9);

  return createAdditionSplitQuestion("5", left, right);
}

function createAdditionLevel6() {
  return createAdditionSplitQuestion("6", randomTwoDigit(), randomTwoDigit());
}

function createAdditionLevel7() {
  const left = randomTwoDigit();
  const right = randomTwoDigit();
  return createSingleAnswerQuestion("addition", "7", left, "+", right, left + right);
}

function createAdditionLevel8() {
  return createAdditionHighLowQuestion("8", randomThreeDigit(), randomTwoDigit());
}

function createAdditionLevel9() {
  const left = randomThreeDigit();
  const right = randomTwoDigit();
  return createSingleAnswerQuestion("addition", "9", left, "+", right, left + right);
}

function createAdditionLevel10() {
  return createAdditionHighLowQuestion("10", randomThreeDigit(), randomThreeDigit());
}

function createAdditionLevel11() {
  const left = randomThreeDigit();
  const right = randomThreeDigit();
  return createSingleAnswerQuestion("addition", "11", left, "+", right, left + right);
}

function createAdditionSplitQuestion(levelId, left, right) {
  const high = Math.floor(left / 10) * 10 + Math.floor(right / 10) * 10;
  const low = (left % 10) + (right % 10);

  return createMultiAnswerQuestion("addition", levelId, left, "+", right, [
    answer("high", "10の位", high),
    answer("low", "1の位", low),
    answer("total", "合計", left + right),
  ]);
}

function createAdditionHighLowQuestion(levelId, left, right) {
  const high = Math.floor(left / 10) * 10 + Math.floor(right / 10) * 10;
  const low = (left % 10) + (right % 10);

  return createMultiAnswerQuestion("addition", levelId, left, "+", right, [
    answer("high", "100/10の位", high),
    answer("low", "1の位", low),
    answer("total", "合計", left + right),
  ]);
}

function createSubtractionLevel1() {
  const left = randomDigit();
  const right = randomInt(1, left);
  return createSingleAnswerQuestion("subtraction", "1", left, "-", right, left - right);
}

function createSubtractionLevel2() {
  const left = randomDigit() * 10;
  const right = randomDigit();
  return createSingleAnswerQuestion("subtraction", "2", left, "-", right, left - right);
}

function createSubtractionLevel3() {
  const left = randomInt(10, 19);
  const right = randomDigit();
  return createSingleAnswerQuestion("subtraction", "3", left, "-", right, left - right);
}

function createSubtractionLevel4() {
  const [left, right] = createSubtractionPair(10, 99, 1, 9, true);
  return createMultiAnswerQuestion("subtraction", "4", left, "-", right, [answer("ones", "1の位", (left - right) % 10)]);
}

function createSubtractionLevel5() {
  const [left, right] = createSubtractionPair(10, 99, 1, 9);
  return createSingleAnswerQuestion("subtraction", "5", left, "-", right, left - right);
}

function createSubtractionLevel6() {
  const [left, right] = createSubtractionPair(10, 99, 10, 99, true);
  return createMultiAnswerQuestion("subtraction", "6", left, "-", right, [answer("ones", "1の位", (left - right) % 10)]);
}

function createSubtractionLevel7() {
  const [left, right] = createSubtractionPair(10, 99, 10, 99);
  return createSubtractionSplitQuestion("7", left, right);
}

function createSubtractionLevel8() {
  const [left, right] = createSubtractionPair(10, 99, 10, 99);
  return createSingleAnswerQuestion("subtraction", "8", left, "-", right, left - right);
}

function createSubtractionLevel9() {
  const [left, right] = createSubtractionPair(100, 999, 10, 99);
  return createSubtractionSplitQuestion("9", left, right);
}

function createSubtractionLevel10() {
  const [left, right] = createSubtractionPair(100, 999, 10, 99);
  return createSingleAnswerQuestion("subtraction", "10", left, "-", right, left - right);
}

function createSubtractionLevel11() {
  const [left, right] = createSubtractionPair(100, 999, 100, 999);
  return createSubtractionSplitQuestion("11", left, right);
}

function createSubtractionLevel12() {
  const [left, right] = createSubtractionPair(100, 999, 100, 999);
  return createSingleAnswerQuestion("subtraction", "12", left, "-", right, left - right);
}

function createSubtractionPair(leftMin, leftMax, rightMin, rightMax, requireBorrow = false) {
  while (true) {
    const left = randomInt(leftMin, leftMax);
    const right = randomInt(rightMin, rightMax);

    if (left >= right && (!requireBorrow || left % 10 < right % 10)) {
      return [left, right];
    }
  }
}

function createSubtractionSplitQuestion(levelId, left, right) {
  const highPart = Math.floor(right / 10) * 10;
  const first = left - highPart;

  return createMultiAnswerQuestion("subtraction", levelId, left, "-", right, [
    answer("high", "大きい位", first),
    answer("total", "答え", left - right),
  ]);
}

function createMultiplicationLevel1() {
  const left = randomDigit();
  const right = randomDigit();
  return createSingleAnswerQuestion("multiplication", "1", left, "×", right, left * right);
}

function createMultiplicationLevel2() {
  const scaled = randomDigit() * randomItem([10, 100]);
  const digit = randomDigit();
  const reversed = Math.random() < 0.5;
  const left = reversed ? digit : scaled;
  const right = reversed ? scaled : digit;
  return createSingleAnswerQuestion("multiplication", "2", left, "×", right, left * right);
}

function createMultiplicationLevel3() {
  return createMultiplicationSplitQuestion("3", makeTwoDigit(1, randomDigit()), randomDigit(), false);
}

function createMultiplicationLevel4() {
  return createMultiplicationSplitQuestion("4", makeTwoDigit(1, randomDigit()), randomDigit(), Math.random() < 0.5);
}

function createMultiplicationLevel5() {
  const left = makeTwoDigit(1, randomDigit());
  const right = randomDigit();
  return createSingleAnswerQuestion("multiplication", "5", left, "×", right, left * right);
}

function createMultiplicationLevel6() {
  return createMultiplicationSplitQuestion("6", randomTwoDigit(), randomDigit(), false);
}

function createMultiplicationLevel7() {
  return createMultiplicationSplitQuestion("7", randomTwoDigit(), randomDigit(), Math.random() < 0.5);
}

function createMultiplicationLevel8() {
  const twoDigit = randomTwoDigit();
  const digit = randomDigit();
  const reversed = Math.random() < 0.5;
  const left = reversed ? digit : twoDigit;
  const right = reversed ? twoDigit : digit;
  return createSingleAnswerQuestion("multiplication", "8", left, "×", right, left * right);
}

function createMultiplicationSplitQuestion(levelId, twoDigit, digit, reversed) {
  const left = reversed ? digit : twoDigit;
  const right = reversed ? twoDigit : digit;
  const high = Math.floor(twoDigit / 10) * 10 * digit;
  const low = (twoDigit % 10) * digit;

  return createMultiAnswerQuestion("multiplication", levelId, left, "×", right, [
    answer("high", "10の位", high),
    answer("low", "1の位", low),
    answer("total", "合計", twoDigit * digit),
  ]);
}

function createDivisionLevel1() {
  const divisor = randomInt(2, 9);
  const quotient = randomDigit();
  return createDivisionQuestion("1", divisor * quotient, divisor, false);
}

function createDivisionLevel2() {
  const divisor = randomInt(2, 9);
  const quotient = randomDigit();
  const remainder = randomInt(0, divisor - 1);
  return createDivisionQuestion("2", divisor * quotient + remainder, divisor, true);
}

function createDivisionLevel3() {
  const divisors = createScaledNumbers([2, 3, 4, 5, 6, 7, 8, 9], 2, 9999);
  const quotients = createScaledNumbers([2, 3, 4, 5, 6, 7, 8, 9], 2, 9999);

  while (true) {
    const divisor = randomItem(divisors);
    const quotient = randomItem(quotients);
    const dividend = divisor * quotient;

    if (dividend >= 10 && dividend <= 9999) {
      return createDivisionQuestion("3", dividend, divisor, false);
    }
  }
}

function createDivisionLevel4() {
  const divisor = randomInt(2, 9);
  const minQuotient = Math.ceil(10 / divisor);
  const maxQuotient = Math.floor(99 / divisor);
  const quotient = randomInt(minQuotient, maxQuotient);
  return createDivisionQuestion("4", divisor * quotient, divisor, false);
}

function createDivisionLevel5() {
  const divisor = randomInt(2, 9);
  const quotient = randomInt(Math.ceil(10 / divisor), Math.floor(99 / divisor));
  const maxRemainder = Math.min(divisor - 1, 99 - divisor * quotient);
  const remainder = randomInt(0, maxRemainder);
  return createDivisionQuestion("5", divisor * quotient + remainder, divisor, true);
}

function createDivisionLevel6() {
  const divisors = createScaledNumbers([2, 3, 4, 5, 6, 7, 8, 9], 2, 9999);
  const quotientBases = Array.from({ length: 99 }, (_, index) => index + 1);
  const quotients = createScaledNumbers(quotientBases, 1, 9999);

  while (true) {
    const divisor = randomItem(divisors);
    const quotient = randomItem(quotients);
    const dividend = divisor * quotient;

    if (dividend >= 10 && dividend <= 9999) {
      return createDivisionQuestion("6", dividend, divisor, false);
    }
  }
}

function createDivisionLevel7() {
  const divisor = randomInt(2, 9);
  const minQuotient = Math.ceil(100 / divisor);
  const maxQuotient = Math.floor(999 / divisor);
  const quotient = randomInt(minQuotient, maxQuotient);
  return createDivisionQuestion("7", divisor * quotient, divisor, false);
}

function createDivisionLevel8() {
  return createDivisionWithRemainder("8", randomInt(2, 9), 100, 999);
}

function createDivisionLevel9() {
  return createDivisionWithRemainder("9", randomInt(2, 9), 1000, 9999);
}

function createDivisionLevel10() {
  return createDivisionWithRemainder("10", randomInt(2, 9) * randomItem([10, 100]), 1000, 9999);
}

function createDivisionWithRemainder(levelId, divisor, minDividend, maxDividend) {
  const minQuotient = Math.max(1, Math.ceil(minDividend / divisor));
  const maxQuotient = Math.floor(maxDividend / divisor);
  const quotient = randomInt(minQuotient, maxQuotient);
  const maxRemainder = Math.min(divisor - 1, maxDividend - divisor * quotient);
  const remainder = randomInt(0, Math.max(0, maxRemainder));
  return createDivisionQuestion(levelId, divisor * quotient + remainder, divisor, true);
}

function createScaledNumbers(bases, min, max) {
  const numbers = [];

  bases.forEach((base) => {
    for (let multiplier = 1; base * multiplier <= max; multiplier *= 10) {
      const value = base * multiplier;

      if (value >= min) {
        numbers.push(value);
      }
    }
  });

  return numbers;
}

function generateQuestions(levelConfig) {
  const questions = [];
  const seen = new Set();
  let attempts = 0;
  const maxAttempts = levelConfig.questionCount * 300;

  while (questions.length < levelConfig.questionCount && attempts < maxAttempts) {
    attempts += 1;
    const question = levelConfig.createQuestion();

    if (!seen.has(question.key)) {
      seen.add(question.key);
      questions.push(question);
    }
  }

  while (questions.length < levelConfig.questionCount) {
    questions.push(levelConfig.createQuestion());
  }

  return questions;
}

function getSelectedOperation() {
  return operations[state.selectedOperation];
}

function getSelectedLevel() {
  return getSelectedOperation().levels[state.selectedLevel];
}

function getCurrentLevel() {
  return state.activeLevel || getSelectedLevel();
}

function getCurrentQuestion() {
  return state.questions[state.currentIndex];
}

function getCurrentFields() {
  return getCurrentQuestion()?.answers || [];
}

function getActiveFieldConfig() {
  return getCurrentFields().find((field) => field.id === state.activeField) || getCurrentFields()[0];
}

function getActiveFieldIndex() {
  return getCurrentFields().findIndex((field) => field.id === state.activeField);
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

function setSelectedOperation(operationId) {
  if (!operations[operationId]) {
    return;
  }

  state.selectedOperation = operationId;

  if (!operations[operationId].levels[state.selectedLevel]) {
    state.selectedLevel = "1";
  }

  renderOperationTabs();
  renderLevelOptions();
  refreshDataPanels();
}

function setSelectedLevel(levelId) {
  if (!getSelectedOperation().levels[levelId]) {
    return;
  }

  state.selectedLevel = levelId;
  renderLevelOptions();
}

function setActiveField(fieldId) {
  const fields = getCurrentFields();

  if (!fields.length) {
    state.activeField = "";
    return;
  }

  state.activeField = fields.some((field) => field.id === fieldId) ? fieldId : fields[0].id;

  elements.answerArea.querySelectorAll("[data-field]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.field === state.activeField);
  });

  updateActionButtons();
}

function resetAnswer() {
  state.answers = {};
  getCurrentFields().forEach((field) => {
    state.answers[field.id] = "";
  });
  setActiveField(getCurrentFields()[0]?.id || "");
  renderAnswer();
}

function renderAnswer() {
  getCurrentFields().forEach((field) => {
    const valueElement = elements.answerArea.querySelector(`[data-value-for="${field.id}"]`);

    if (valueElement) {
      valueElement.textContent = state.answers[field.id] || "_";
    }
  });
}

function renderOperationTabs() {
  const tabs = OPERATION_ORDER.map((operationId) => {
    const operation = operations[operationId];
    const button = document.createElement("button");
    const isActive = operationId === state.selectedOperation;
    button.type = "button";
    button.dataset.operation = operationId;
    button.className = isActive ? "is-active" : "";
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", String(isActive));
    button.textContent = operation.label;
    return button;
  });

  elements.operationTabs.replaceChildren(...tabs);
  elements.appEyebrow.textContent = "4演算トレーニング";
  elements.headerBadge.textContent = getSelectedOperation().label.slice(0, 1);
  elements.headerBadge.setAttribute("aria-label", getSelectedOperation().label);
}

function renderLevelOptions() {
  const operation = getSelectedOperation();
  const cards = Object.values(operation.levels).map((levelConfig) => {
    const isActive = levelConfig.id === state.selectedLevel;
    const button = document.createElement("button");
    button.className = `mode-card${isActive ? " is-active" : ""}`;
    button.type = "button";
    button.setAttribute("role", "radio");
    button.setAttribute("aria-checked", String(isActive));
    button.dataset.level = levelConfig.id;
    button.innerHTML = `
      <span class="mode-title">${levelConfig.label}</span>
      <span class="mode-meta">${levelConfig.questionCount}問</span>
      <span class="mode-target">◎ ${formatTargetTime(levelConfig.goldMs)} / ○ ${formatTargetTime(levelConfig.silverMs)}</span>
      <span class="mode-copy">${levelConfig.summary}</span>
    `;
    return button;
  });

  elements.levelOptions.replaceChildren(...cards);
  elements.levelOptions.setAttribute("aria-label", `${operation.label}のレベル`);
}

function renderAnswerFields(question) {
  const fields = question.answers.map((field) => {
    const button = document.createElement("button");
    button.className = "answer-field";
    button.type = "button";
    button.dataset.field = field.id;
    button.setAttribute("aria-label", `${field.label}を入力`);
    button.innerHTML = `
      <span class="field-label">${field.label}</span>
      <span class="field-value" data-value-for="${field.id}">_</span>
    `;
    return button;
  });

  elements.answerArea.replaceChildren(...fields);
  elements.answerArea.classList.toggle("is-single", fields.length === 1);
  elements.answerArea.classList.toggle("is-triple", fields.length >= 3);
}

function renderQuestion() {
  const levelConfig = getCurrentLevel();
  const question = getCurrentQuestion();
  const answeredCount = state.currentIndex;

  elements.modeLabel.textContent = `${levelConfig.operationLabel} ${levelConfig.label}`;
  elements.targetText.textContent = `◎ ${formatTargetTime(levelConfig.goldMs)} / ○ ${formatTargetTime(levelConfig.silverMs)}`;
  elements.problemExpression.textContent = `${question.display} ${question.connector}`;
  elements.progressText.textContent = `${state.currentIndex + 1} / ${levelConfig.questionCount}`;
  elements.progressFill.style.width = `${(answeredCount / levelConfig.questionCount) * 100}%`;
  elements.feedbackText.textContent = "";
  elements.feedbackText.classList.remove("is-correct");
  renderAnswerFields(question);
  resetAnswer();
}

function showPanel(panel) {
  elements.setupPanel.hidden = panel !== "setup";
  elements.gamePanel.hidden = panel !== "game";
  elements.resultPanel.hidden = panel !== "result";
}

function startSession(levelConfig, questions) {
  stopTimer();
  clearCountdown();
  state.activeLevel = levelConfig;
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

  const levelConfig = getSelectedLevel();
  const sessionLevel = {
    ...levelConfig,
    sourceLevelId: levelConfig.id,
    sourceTaskId: levelConfig.taskId,
    isWeaknessMode: false,
  };

  startSession(sessionLevel, generateQuestions(levelConfig));
}

function startWeaknessGame() {
  if (!ensureNickname() || state.weaknessItems.length === 0) {
    return;
  }

  const levelConfig = getSelectedLevel();
  const questions = [];
  let attempts = 0;

  while (questions.length < WEAKNESS_QUESTION_COUNT && attempts < WEAKNESS_QUESTION_COUNT * 20) {
    attempts += 1;
    const question = createQuestionFromWeakItem(randomItem(state.weaknessItems));

    if (question) {
      questions.push(question);
    }
  }

  if (!questions.length) {
    return;
  }

  const sessionLevel = {
    ...levelConfig,
    label: `${levelConfig.label} 苦手`,
    questionCount: questions.length,
    sourceLevelId: levelConfig.id,
    sourceTaskId: levelConfig.taskId,
    isWeaknessMode: true,
  };

  startSession(sessionLevel, questions);
}

function getNumericAnswer(fieldId) {
  if (state.answers[fieldId] === "") {
    return null;
  }

  return Number(state.answers[fieldId]);
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
  const levelConfig = getCurrentLevel();
  const elapsedMs = Math.max(0, Date.now() - state.questionStartedAt);

  state.questionStats.push({
    key: question.key,
    display: question.display,
    connector: question.connector,
    operationId: question.operationId,
    taskId: question.taskId,
    levelId: levelConfig.sourceLevelId || levelConfig.id,
    left: question.left,
    right: question.right,
    operator: question.operator,
    answers: question.answers,
    dividend: question.operator === "÷" ? question.left : 0,
    divisor: question.operator === "÷" ? question.right : 0,
    quotient: question.answers.find((field) => field.id === "quotient")?.value || 0,
    remainder: question.answers.find((field) => field.id === "remainder")?.value || 0,
    elapsedMs,
    mistakes: state.questionMistakes,
  });
}

function submitAnswer() {
  if (state.isCountingDown) {
    return;
  }

  const levelConfig = getCurrentLevel();
  const question = getCurrentQuestion();

  for (const field of question.answers) {
    if (getNumericAnswer(field.id) === null) {
      showInputPrompt(`${field.label}を入力してください`);
      setActiveField(field.id);
      return;
    }
  }

  const isCorrect = question.answers.every((field) => getNumericAnswer(field.id) === field.value);

  if (isCorrect) {
    recordQuestionResult(question);
    elements.feedbackText.textContent = "正解";
    elements.feedbackText.classList.add("is-correct");
    state.currentIndex += 1;

    window.setTimeout(() => {
      if (state.currentIndex >= levelConfig.questionCount) {
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

function createFinishedResult(levelConfig, elapsed, grade) {
  return {
    nickname: getNickname(),
    operationId: levelConfig.operationId,
    operationLabel: levelConfig.operationLabel,
    taskId: levelConfig.sourceTaskId || levelConfig.taskId,
    levelId: levelConfig.sourceLevelId || levelConfig.id,
    levelLabel: `${levelConfig.operationLabel} ${levelConfig.label}`,
    isWeaknessMode: levelConfig.isWeaknessMode,
    questionCount: levelConfig.questionCount,
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
  const levelConfig = getCurrentLevel();
  const elapsed = Date.now() - state.startedAt;
  const grade = getGrade(levelConfig, elapsed, state.mistakes);
  const result = createFinishedResult(levelConfig, elapsed, grade);

  stopTimer();
  elements.progressFill.style.width = "100%";
  elements.resultTitle.textContent = `${levelConfig.operationLabel} ${levelConfig.label} 完了`;
  elements.gradeText.textContent = grade.symbol;
  elements.gradeLabel.textContent = grade.label;
  elements.finalTimeText.textContent = formatTime(elapsed);
  elements.mistakeText.textContent = `${state.mistakes}回`;
  showPanel("result");
  saveFinishedResult(result);
}

function getGrade(levelConfig, elapsed, mistakes) {
  if (levelConfig.isWeaknessMode) {
    return { symbol: "◎", label: mistakes > 0 ? "集中完了" : "ノーミス" };
  }

  if (mistakes > 0) {
    return { symbol: "▲", label: "ミスあり" };
  }

  if (elapsed <= levelConfig.goldMs) {
    return { symbol: "◎", label: "目標達成" };
  }

  if (elapsed <= levelConfig.silverMs) {
    return { symbol: "○", label: "合格" };
  }

  return { symbol: "△", label: "もう少し" };
}

function appendDigit(digit) {
  if (state.isCountingDown) {
    return;
  }

  const field = getActiveFieldConfig();

  if (!field || state.answers[field.id].length >= field.maxLength) {
    return;
  }

  state.answers[field.id] += digit;
  renderAnswer();
}

function backspace() {
  if (state.isCountingDown) {
    return;
  }

  const field = getActiveFieldConfig();

  if (!field) {
    return;
  }

  state.answers[field.id] = state.answers[field.id].slice(0, -1);
  renderAnswer();
}

function clearActiveField() {
  if (state.isCountingDown) {
    return;
  }

  const field = getActiveFieldConfig();

  if (!field) {
    return;
  }

  state.answers[field.id] = "";
  renderAnswer();
}

function toggleActiveField(direction = 1) {
  const fields = getCurrentFields();

  if (fields.length <= 1) {
    return;
  }

  const currentIndex = Math.max(0, getActiveFieldIndex());
  const nextIndex = (currentIndex + direction + fields.length) % fields.length;
  setActiveField(fields[nextIndex].id);
}

function updateActionButtons() {
  const fields = getCurrentFields();
  const activeIndex = getActiveFieldIndex();

  if (!fields.length || activeIndex < 0) {
    elements.submitButton.textContent = "答える";
    elements.clearButton.textContent = "クリア";
    return;
  }

  if (activeIndex < fields.length - 1) {
    elements.submitButton.textContent = `${fields[activeIndex + 1].label}へ進む`;
    elements.clearButton.textContent = "クリア";
    return;
  }

  elements.submitButton.textContent = "答える";
  elements.clearButton.textContent = activeIndex > 0 ? `${fields[activeIndex - 1].label}に戻る` : "クリア";
}

function handleSubmitAction() {
  if (state.isCountingDown) {
    return;
  }

  const fields = getCurrentFields();
  const activeIndex = getActiveFieldIndex();
  const activeField = fields[activeIndex];

  if (!activeField) {
    return;
  }

  if (activeIndex < fields.length - 1) {
    if (getNumericAnswer(activeField.id) === null) {
      showInputPrompt(`${activeField.label}を入力してください`);
      return;
    }

    setActiveField(fields[activeIndex + 1].id);
    elements.feedbackText.textContent = "";
    elements.feedbackText.classList.remove("is-correct");
    return;
  }

  submitAnswer();
}

function handleClearAction() {
  if (state.isCountingDown) {
    return;
  }

  const fields = getCurrentFields();
  const activeIndex = getActiveFieldIndex();

  if (activeIndex > 0) {
    setActiveField(fields[activeIndex - 1].id);
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
      createListText("weak-main", `${item.display} ${item.connector || "="}`),
      createListText("weak-meta", `${formatCompactTime(item.averageMs)} / ${item.mistakes}ミス`),
    );
    return row;
  });

  elements.weaknessList.replaceChildren(...rows);
}

async function refreshDataPanels() {
  const dataStore = getDataStore();
  const operation = getSelectedOperation();
  const levelConfig = getSelectedLevel();
  const taskId = levelConfig.taskId;

  elements.rankingTitle.textContent = `${operation.label} ${levelConfig.label} ランキング`;

  if (!dataStore) {
    updateDataStatus("端末内保存");
    renderEmptyList(elements.rankingList, "まだ記録なし");
    renderWeakness([]);
    return;
  }

  updateDataStatus(dataStore.getStatus().message);
  renderWeakness(dataStore.loadWeaknessItems(getNickname(), taskId));
  renderEmptyList(elements.rankingList, "読み込み中");

  const requestedOperation = state.selectedOperation;
  const requestedLevel = state.selectedLevel;
  const rankingResult = await dataStore.loadRankings(taskId);

  if (state.selectedOperation !== requestedOperation || state.selectedLevel !== requestedLevel) {
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

elements.operationTabs.addEventListener("click", (event) => {
  const button = event.target.closest("[data-operation]");

  if (!button) {
    return;
  }

  setSelectedOperation(button.dataset.operation);
});

elements.levelOptions.addEventListener("click", (event) => {
  const button = event.target.closest("[data-level]");

  if (!button) {
    return;
  }

  setSelectedLevel(button.dataset.level);
  refreshDataPanels();
});

elements.answerArea.addEventListener("click", (event) => {
  const button = event.target.closest("[data-field]");

  if (button) {
    setActiveField(button.dataset.field);
  }
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
  } else if (event.key === "Tab" || event.key === "ArrowRight") {
    event.preventDefault();
    toggleActiveField(1);
  } else if (event.key === "ArrowLeft") {
    event.preventDefault();
    toggleActiveField(-1);
  } else if (event.key === "Escape" || event.key === "Delete") {
    handleClearAction();
  }
});

renderOperationTabs();
renderLevelOptions();
initializeData();
