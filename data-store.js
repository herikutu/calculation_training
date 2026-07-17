(function () {
  const FIREBASE_SDK_VERSION = "10.12.5";
  const NICKNAME_KEY = "calculation-training-nickname";
  const RESULTS_KEY = "calculation-training-results";
  const RANKING_SYNCED_KEY = "calculation-training-ranking-synced";
  const LOCAL_RESULT_LIMIT = 240;
  const RANKING_LIMIT = 10;
  const RANKING_FETCH_LIMIT = 20;
  const RANKING_BACKFILL_FETCH_LIMIT = 120;
  const RANKING_CACHE_MS = 5 * 60 * 1000;
  const RANKING_BOARD_COLLECTION = "rankingBoards";

  const state = {
    initPromise: null,
    remote: null,
    status: {
      mode: "local",
      message: "端末内保存",
    },
    rankingCache: new Map(),
    rankingRequests: new Map(),
  };

  function normalizeNickname(value) {
    return String(value || "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 12);
  }

  function nicknameKey(value) {
    return normalizeNickname(value).toLocaleLowerCase();
  }

  function hasFirebaseConfig() {
    const config = window.CALC_TRAINING_FIREBASE_CONFIG;

    return Boolean(
      config &&
        config.apiKey &&
        config.projectId &&
        config.appId &&
        !String(config.apiKey).includes("YOUR_") &&
        !String(config.projectId).includes("YOUR_"),
    );
  }

  function getFirebaseConfig() {
    return hasFirebaseConfig() ? window.CALC_TRAINING_FIREBASE_CONFIG : null;
  }

  function readJson(key, fallback) {
    try {
      const rawValue = window.localStorage.getItem(key);
      return rawValue ? JSON.parse(rawValue) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function getNickname() {
    try {
      return normalizeNickname(window.localStorage.getItem(NICKNAME_KEY));
    } catch (error) {
      return "";
    }
  }

  function saveNickname(value) {
    const nickname = normalizeNickname(value);

    try {
      window.localStorage.setItem(NICKNAME_KEY, nickname);
    } catch (error) {
      // Local storage can be disabled. The app still works for the current session.
    }

    return nickname;
  }

  function getLocalResults() {
    const results = readJson(RESULTS_KEY, []);
    return Array.isArray(results) ? results : [];
  }

  function saveLocalResult(result) {
    const results = getLocalResults();
    const nextResults = [result, ...results.filter((item) => item.id !== result.id)].slice(0, LOCAL_RESULT_LIMIT);
    writeJson(RESULTS_KEY, nextResults);
  }

  function isRankingSynced(resultId) {
    const syncedIds = readJson(RANKING_SYNCED_KEY, []);
    return Array.isArray(syncedIds) && syncedIds.includes(String(resultId || ""));
  }

  function markRankingSynced(resultId) {
    const normalizedId = String(resultId || "");

    if (!normalizedId) {
      return;
    }

    const syncedIds = readJson(RANKING_SYNCED_KEY, []);
    const nextIds = [normalizedId, ...(Array.isArray(syncedIds) ? syncedIds : []).filter((id) => id !== normalizedId)].slice(
      0,
      LOCAL_RESULT_LIMIT,
    );
    writeJson(RANKING_SYNCED_KEY, nextIds);
  }

  function sanitizeNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function normalizeOperationId(value) {
    const operationId = String(value || "");

    if (["addition", "subtraction", "multiplication", "division"].includes(operationId)) {
      return operationId;
    }

    return "division";
  }

  function createTaskId(operationId, levelId) {
    return `${normalizeOperationId(operationId)}:${String(levelId || "")}`;
  }

  function normalizeTaskId(value) {
    const taskId = String(value || "");

    if (taskId.includes(":")) {
      return taskId;
    }

    return createTaskId("division", taskId);
  }

  function taskParts(taskId) {
    const [operationId, levelId] = normalizeTaskId(taskId).split(":");
    return {
      operationId: normalizeOperationId(operationId),
      levelId: String(levelId || ""),
    };
  }

  function resultTaskId(result) {
    return normalizeTaskId(result.taskId || createTaskId(result.operationId || "division", result.levelId));
  }

  function sanitizeAnswerField(field) {
    return {
      id: String(field.id || "answer"),
      label: String(field.label || "答え"),
      value: sanitizeNumber(field.value),
      maxLength: sanitizeNumber(field.maxLength, 4),
    };
  }

  function legacyDivisionAnswers(stat, levelId) {
    if (!stat.dividend || !stat.divisor) {
      return [];
    }

    const answers = [
      {
        id: "quotient",
        label: "商",
        value: sanitizeNumber(stat.quotient),
        maxLength: 4,
      },
    ];
    const remainderLevelIds = ["2", "5", "8", "9", "10"];

    if (remainderLevelIds.includes(String(levelId)) || sanitizeNumber(stat.remainder) > 0) {
      answers.push({
        id: "remainder",
        label: "余り",
        value: sanitizeNumber(stat.remainder),
        maxLength: 4,
      });
    }

    return answers;
  }

  function sanitizeQuestionStat(stat, sourceResult = {}) {
    const parsedTask = taskParts(stat.taskId || sourceResult.taskId || "");
    const levelId = String(stat.levelId || sourceResult.levelId || parsedTask.levelId || "");
    const operationId = normalizeOperationId(stat.operationId || sourceResult.operationId || parsedTask.operationId);
    const taskId = normalizeTaskId(stat.taskId || sourceResult.taskId || createTaskId(operationId, levelId));
    const answers = Array.isArray(stat.answers)
      ? stat.answers.slice(0, 4).map(sanitizeAnswerField)
      : legacyDivisionAnswers(stat, levelId);

    return {
      key: String(stat.key || ""),
      display: String(stat.display || ""),
      connector: String(stat.connector || "="),
      operationId,
      taskId,
      levelId,
      left: sanitizeNumber(stat.left),
      right: sanitizeNumber(stat.right),
      operator: String(stat.operator || (operationId === "division" ? "÷" : "")),
      answers,
      dividend: sanitizeNumber(stat.dividend),
      divisor: sanitizeNumber(stat.divisor),
      quotient: sanitizeNumber(stat.quotient),
      remainder: sanitizeNumber(stat.remainder),
      elapsedMs: sanitizeNumber(stat.elapsedMs),
      mistakes: sanitizeNumber(stat.mistakes),
    };
  }

  function createResult(rawResult) {
    const nickname = normalizeNickname(rawResult.nickname);
    const elapsedMs = sanitizeNumber(rawResult.elapsedMs);
    const mistakes = sanitizeNumber(rawResult.mistakes);
    const isWeaknessMode = Boolean(rawResult.isWeaknessMode);
    const parsedTask = taskParts(rawResult.taskId || "");
    const operationId = normalizeOperationId(rawResult.operationId || parsedTask.operationId);
    const levelId = String(rawResult.levelId || parsedTask.levelId || "");
    const taskId = normalizeTaskId(rawResult.taskId || createTaskId(operationId, levelId));
    const questionStats = Array.isArray(rawResult.questionStats)
      ? rawResult.questionStats.slice(0, 40).map((stat) => sanitizeQuestionStat(stat, rawResult))
      : [];

    return {
      id: rawResult.id || createId(),
      nickname,
      nicknameKey: nicknameKey(nickname),
      operationId,
      operationLabel: String(rawResult.operationLabel || ""),
      taskId,
      levelId,
      levelLabel: String(rawResult.levelLabel || ""),
      isWeaknessMode,
      questionCount: sanitizeNumber(rawResult.questionCount),
      elapsedMs,
      mistakes,
      rankSort: mistakes > 0 ? 1000000000 + elapsedMs : elapsedMs,
      gradeSymbol: String(rawResult.gradeSymbol || ""),
      gradeLabel: String(rawResult.gradeLabel || ""),
      questionStats,
      createdAt: rawResult.createdAt || new Date().toISOString(),
      appVersion: "ops-2",
    };
  }

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function rankingCollection(taskId) {
    return `rankings_${normalizeTaskId(taskId).replace(":", "_")}`;
  }

  function rankingBoardId(taskId) {
    return normalizeTaskId(taskId).replace(":", "_");
  }

  function rankingBoardRef(remote, taskId) {
    return remote.doc(remote.db, RANKING_BOARD_COLLECTION, rankingBoardId(taskId));
  }

  function legacyRankingCollection(levelId) {
    return `rankings_level_${levelId}`;
  }

  function legacyRankingLevel(taskId) {
    const parts = taskParts(taskId);

    if (parts.operationId === "division" && ["1", "2", "3", "4", "5"].includes(parts.levelId)) {
      return parts.levelId;
    }

    return "";
  }

  function rankingCacheKey(taskId) {
    return normalizeTaskId(taskId);
  }

  function readRankingCache(taskId) {
    const cached = state.rankingCache.get(rankingCacheKey(taskId));

    if (!cached || Date.now() - cached.createdAt > RANKING_CACHE_MS) {
      return null;
    }

    return cached.value;
  }

  function writeRankingCache(taskId, value) {
    state.rankingCache.set(rankingCacheKey(taskId), {
      createdAt: Date.now(),
      value,
    });
  }

  function rankingValue(item, key) {
    const value = Number(item[key]);
    return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
  }

  function compareRanking(a, b) {
    return (
      rankingValue(a, "rankSort") - rankingValue(b, "rankSort") ||
      rankingValue(a, "mistakes") - rankingValue(b, "mistakes") ||
      rankingValue(a, "elapsedMs") - rankingValue(b, "elapsedMs")
    );
  }

  function bestRankingItems(items) {
    const bestByNickname = new Map();

    items.forEach((item) => {
      const key = nicknameKey(item.nickname);

      if (!key) {
        return;
      }

      const current = bestByNickname.get(key);

      if (!current || compareRanking(item, current) < 0) {
        bestByNickname.set(key, item);
      }
    });

    return [...bestByNickname.values()].sort(compareRanking).slice(0, RANKING_LIMIT);
  }

  function rankingItemSignature(item) {
    return [item.resultId, nicknameKey(item.nickname), item.rankSort, item.mistakes, item.elapsedMs].join("|");
  }

  function hasSameRankingItems(currentItems, nextItems) {
    return (
      currentItems.length === nextItems.length &&
      currentItems.every((item, index) => rankingItemSignature(item) === rankingItemSignature(nextItems[index]))
    );
  }

  async function initRemote() {
    if (state.initPromise) {
      return state.initPromise;
    }

    state.initPromise = (async () => {
      const config = getFirebaseConfig();

      if (!config) {
        state.status = { mode: "local", message: "端末内保存" };
        return null;
      }

      try {
        const [{ initializeApp }, firestoreModule] = await Promise.all([
          import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`),
          import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`),
        ]);
        const app = initializeApp(config);
        const db = firestoreModule.getFirestore(app);

        state.remote = {
          db,
          addDoc: firestoreModule.addDoc,
          collection: firestoreModule.collection,
          doc: firestoreModule.doc,
          getDoc: firestoreModule.getDoc,
          getDocs: firestoreModule.getDocs,
          limit: firestoreModule.limit,
          orderBy: firestoreModule.orderBy,
          query: firestoreModule.query,
          runTransaction: firestoreModule.runTransaction,
          serverTimestamp: firestoreModule.serverTimestamp,
        };
        state.status = { mode: "firebase", message: "クラウド保存" };
        return state.remote;
      } catch (error) {
        state.status = { mode: "local", message: "端末内保存" };
        return null;
      }
    })();

    return state.initPromise;
  }

  function getStatus() {
    return state.status;
  }

  function createRankingItem(result) {
    return {
      resultId: result.id,
      nickname: result.nickname,
      operationId: result.operationId,
      operationLabel: result.operationLabel,
      taskId: result.taskId,
      levelId: result.levelId,
      levelLabel: result.levelLabel,
      elapsedMs: result.elapsedMs,
      mistakes: result.mistakes,
      rankSort: result.rankSort,
      gradeSymbol: result.gradeSymbol,
      gradeLabel: result.gradeLabel,
      questionCount: result.questionCount,
      createdAtLocal: result.createdAt,
      appVersion: result.appVersion,
    };
  }

  function sanitizeRankingItem(item, fallbackTaskId = "") {
    const source = item && typeof item === "object" ? item : {};
    const parsedTask = taskParts(source.taskId || fallbackTaskId);
    const operationId = normalizeOperationId(source.operationId || parsedTask.operationId);
    const levelId = String(source.levelId || parsedTask.levelId || "");
    const taskId = normalizeTaskId(source.taskId || fallbackTaskId || createTaskId(operationId, levelId));
    const elapsedMs = sanitizeNumber(source.elapsedMs);
    const mistakes = sanitizeNumber(source.mistakes);

    return {
      resultId: String(source.resultId || source.id || ""),
      nickname: normalizeNickname(source.nickname),
      operationId,
      operationLabel: String(source.operationLabel || ""),
      taskId,
      levelId,
      levelLabel: String(source.levelLabel || ""),
      elapsedMs,
      mistakes,
      rankSort: sanitizeNumber(source.rankSort, mistakes > 0 ? 1000000000 + elapsedMs : elapsedMs),
      gradeSymbol: String(source.gradeSymbol || ""),
      gradeLabel: String(source.gradeLabel || ""),
      questionCount: sanitizeNumber(source.questionCount),
      createdAtLocal: String(source.createdAtLocal || ""),
      appVersion: String(source.appVersion || ""),
    };
  }

  function createRankingBoardDoc(result, items, serverTimestamp) {
    return {
      taskId: result.taskId,
      operationId: result.operationId,
      operationLabel: result.operationLabel,
      levelId: result.levelId,
      levelLabel: result.levelLabel,
      items,
      updatedAt: serverTimestamp(),
      updatedAtLocal: new Date().toISOString(),
      appVersion: result.appVersion,
    };
  }

  function createRankingDoc(result, serverTimestamp) {
    return {
      ...createRankingItem(result),
      createdAt: serverTimestamp(),
    };
  }

  function createDetailDoc(result, serverTimestamp) {
    return {
      ...result,
      createdAt: serverTimestamp(),
      createdAtLocal: result.createdAt,
    };
  }

  function sanitizeRankingItems(items, taskId) {
    return items
      .map((item) => sanitizeRankingItem(item, taskId))
      .filter((item) => item.nickname && resultTaskId(item) === normalizeTaskId(taskId));
  }

  function invalidateRankingCache(taskId) {
    const cacheKey = rankingCacheKey(taskId);
    state.rankingCache.delete(cacheKey);
    state.rankingRequests.delete(cacheKey);
  }

  async function saveRankingRecord(remote, result) {
    await remote.addDoc(
      remote.collection(remote.db, rankingCollection(result.taskId)),
      createRankingDoc(result, remote.serverTimestamp),
    );
  }

  async function syncBestLocalRanking(remote, taskId) {
    const normalizedTaskId = normalizeTaskId(taskId);
    const currentNicknameKey = nicknameKey(getNickname());

    if (!currentNicknameKey) {
      return;
    }

    const bestLocalResult = bestRankingItems(
      getLocalResults().filter(
        (result) =>
          !result.isWeaknessMode &&
          result.nicknameKey === currentNicknameKey &&
          resultTaskId(result) === normalizedTaskId,
      ),
    )[0];

    if (!bestLocalResult || isRankingSynced(bestLocalResult.id)) {
      return;
    }

    try {
      const normalizedResult = createResult(bestLocalResult);
      await saveRankingRecord(remote, normalizedResult);
      markRankingSynced(normalizedResult.id);
      invalidateRankingCache(normalizedTaskId);
    } catch (error) {
      console.warn("Local ranking recovery failed.", error);
    }
  }

  async function updateRankingBoard(remote, result) {
    const boardRef = rankingBoardRef(remote, result.taskId);
    const cachedRanking = readRankingCache(result.taskId);
    const seedItems = cachedRanking ? cachedRanking.items : [];
    const rankingItem = createRankingItem(result);

    const items = await remote.runTransaction(remote.db, async (transaction) => {
      const snapshot = await transaction.get(boardRef);
      const rawItems = snapshot.exists() ? snapshot.data().items || [] : seedItems;
      const currentItems = bestRankingItems(sanitizeRankingItems(rawItems, result.taskId));
      const nextItems = bestRankingItems(sanitizeRankingItems([...currentItems, rankingItem], result.taskId));

      if (!snapshot.exists() || !hasSameRankingItems(currentItems, nextItems)) {
        transaction.set(boardRef, createRankingBoardDoc(result, nextItems, remote.serverTimestamp));
      }

      return nextItems;
    });

    invalidateRankingCache(result.taskId);
    return items;
  }

  async function saveResult(rawResult) {
    const result = createResult(rawResult);
    saveLocalResult(result);

    const remote = await initRemote();

    if (!remote) {
      return { ...state.status, result };
    }

    try {
      await remote.addDoc(remote.collection(remote.db, "trainingResults"), createDetailDoc(result, remote.serverTimestamp));
    } catch (error) {
      console.error("Cloud result save failed.", error);
      return { mode: "local", message: "端末内保存", result };
    }

    if (result.isWeaknessMode || !result.taskId) {
      return { mode: "firebase", message: "クラウド保存", result };
    }

    const [rankingRecordResult, rankingBoardResult] = await Promise.allSettled([
      saveRankingRecord(remote, result),
      updateRankingBoard(remote, result),
    ]);
    const rankingRecordSaved = rankingRecordResult.status === "fulfilled";
    const rankingBoardSaved = rankingBoardResult.status === "fulfilled";

    invalidateRankingCache(result.taskId);

    if (rankingRecordSaved) {
      markRankingSynced(result.id);
    }

    if (!rankingRecordSaved) {
      console.warn("Ranking record save failed.", rankingRecordResult.reason);
    }

    if (!rankingBoardSaved) {
      console.warn("Ranking board update failed.", rankingBoardResult.reason);
    }

    if (!rankingRecordSaved && !rankingBoardSaved) {
      return { mode: "firebase", message: "クラウド保存（ランキング未反映）", result };
    }

    return { mode: "firebase", message: "クラウド保存", result };
  }

  function localRankings(taskId) {
    const normalizedTaskId = normalizeTaskId(taskId);

    return bestRankingItems(
      getLocalResults().filter((result) => !result.isWeaknessMode && resultTaskId(result) === normalizedTaskId),
    );
  }

  async function loadRankingCollection(remote, collectionName, limitSize = RANKING_FETCH_LIMIT) {
    const snapshot = await remote.getDocs(
      remote.query(
        remote.collection(remote.db, collectionName),
        remote.orderBy("rankSort", "asc"),
        remote.limit(limitSize),
      ),
    );
    const items = [];

    snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
    return items;
  }

  async function loadRankingBoard(remote, taskId) {
    const snapshot = await remote.getDoc(rankingBoardRef(remote, taskId));

    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data();
    return {
      source: "firebase",
      items: bestRankingItems(sanitizeRankingItems(Array.isArray(data.items) ? data.items : [], taskId)),
    };
  }

  async function loadRankings(taskId, options = {}) {
    const normalizedTaskId = normalizeTaskId(taskId);
    const cacheKey = rankingCacheKey(normalizedTaskId);

    if (!options.force) {
      const cached = readRankingCache(normalizedTaskId);

      if (cached) {
        return cached;
      }

      const pendingRequest = state.rankingRequests.get(cacheKey);

      if (pendingRequest) {
        return pendingRequest;
      }
    }

    const request = loadRankingsFresh(normalizedTaskId);
    state.rankingRequests.set(cacheKey, request);

    try {
      return await request;
    } finally {
      if (state.rankingRequests.get(cacheKey) === request) {
        state.rankingRequests.delete(cacheKey);
      }
    }
  }

  async function loadRankingsFresh(normalizedTaskId) {
    const remote = await initRemote();

    if (!remote) {
      return { source: "local", items: localRankings(normalizedTaskId) };
    }

    await syncBestLocalRanking(remote, normalizedTaskId);

    let boardResult = null;

    try {
      boardResult = await loadRankingBoard(remote, normalizedTaskId);
    } catch (error) {
      // Ranking boards are available after the latest Firestore rules are published.
    }

    const primaryCollection = rankingCollection(normalizedTaskId);
    const legacyLevelId = legacyRankingLevel(normalizedTaskId);
    const items = boardResult ? [...boardResult.items] : [];
    let successfulQueryCount = boardResult ? 1 : 0;
    let primaryItems = [];

    try {
      primaryItems = await loadRankingCollection(remote, primaryCollection, RANKING_FETCH_LIMIT);
      items.push(...primaryItems);
      successfulQueryCount += 1;
    } catch (error) {
      // A user may not have published the latest Firestore rules yet.
    }

    if (legacyLevelId && bestRankingItems(sanitizeRankingItems(items, normalizedTaskId)).length < RANKING_LIMIT) {
      try {
        items.push(...(await loadRankingCollection(remote, legacyRankingCollection(legacyLevelId), RANKING_BACKFILL_FETCH_LIMIT)));
        successfulQueryCount += 1;
      } catch (error) {
        // Old ranking collections are optional and only used as an empty-state fallback.
      }
    }

    if (successfulQueryCount > 0) {
      const result = { source: "firebase", items: bestRankingItems(sanitizeRankingItems(items, normalizedTaskId)) };
      writeRankingCache(normalizedTaskId, result);
      return result;
    }

    return { source: "local", items: localRankings(normalizedTaskId) };
  }

  function aggregateWeakness(nickname, taskId) {
    const key = nicknameKey(nickname);
    const normalizedTaskId = normalizeTaskId(taskId);
    const groups = new Map();

    getLocalResults()
      .filter((result) => !result.isWeaknessMode && result.nicknameKey === key && resultTaskId(result) === normalizedTaskId)
      .forEach((result) => {
        result.questionStats.forEach((stat) => {
          const item = sanitizeQuestionStat(stat, result);
          const group = groups.get(item.key) || {
            ...item,
            attempts: 0,
            totalMs: 0,
            mistakes: 0,
            worstMs: 0,
          };
          group.attempts += 1;
          group.totalMs += item.elapsedMs;
          group.mistakes += item.mistakes;
          group.worstMs = Math.max(group.worstMs, item.elapsedMs);
          groups.set(item.key, group);
        });
      });

    return [...groups.values()]
      .map((item) => {
        const averageMs = item.totalMs / item.attempts;
        return {
          ...item,
          averageMs,
          score: averageMs + item.mistakes * 3500 + item.worstMs * 0.2,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }

  window.trainingDataStore = {
    init: initRemote,
    getStatus,
    getNickname,
    saveNickname,
    saveResult,
    loadRankings,
    loadWeaknessItems: aggregateWeakness,
    normalizeNickname,
  };
})();
