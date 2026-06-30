(function () {
  const FIREBASE_SDK_VERSION = "10.12.5";
  const NICKNAME_KEY = "calculation-training-nickname";
  const RESULTS_KEY = "calculation-training-results";
  const LOCAL_RESULT_LIMIT = 240;
  const RANKING_LIMIT = 10;
  const RANKING_FETCH_LIMIT = 80;

  const state = {
    initPromise: null,
    remote: null,
    status: {
      mode: "local",
      message: "端末内保存",
    },
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

  function sanitizeNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function sanitizeQuestionStat(stat) {
    return {
      key: String(stat.key || ""),
      display: String(stat.display || ""),
      levelId: String(stat.levelId || ""),
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
    const levelId = String(rawResult.levelId || "");
    const questionStats = Array.isArray(rawResult.questionStats)
      ? rawResult.questionStats.slice(0, 40).map(sanitizeQuestionStat)
      : [];

    return {
      id: rawResult.id || createId(),
      nickname,
      nicknameKey: nicknameKey(nickname),
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
      appVersion: "data-1",
    };
  }

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function rankingCollection(levelId) {
    return `rankings_level_${levelId}`;
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
          getDocs: firestoreModule.getDocs,
          limit: firestoreModule.limit,
          orderBy: firestoreModule.orderBy,
          query: firestoreModule.query,
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

  function createRankingDoc(result, serverTimestamp) {
    return {
      resultId: result.id,
      nickname: result.nickname,
      levelId: result.levelId,
      levelLabel: result.levelLabel,
      elapsedMs: result.elapsedMs,
      mistakes: result.mistakes,
      rankSort: result.rankSort,
      gradeSymbol: result.gradeSymbol,
      gradeLabel: result.gradeLabel,
      questionCount: result.questionCount,
      createdAt: serverTimestamp(),
      createdAtLocal: result.createdAt,
      appVersion: result.appVersion,
    };
  }

  function createDetailDoc(result, serverTimestamp) {
    return {
      ...result,
      createdAt: serverTimestamp(),
      createdAtLocal: result.createdAt,
    };
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

      if (!result.isWeaknessMode && result.levelId) {
        await remote.addDoc(
          remote.collection(remote.db, rankingCollection(result.levelId)),
          createRankingDoc(result, remote.serverTimestamp),
        );
      }

      return { mode: "firebase", message: "クラウド保存", result };
    } catch (error) {
      return { mode: "local", message: "端末内保存", result };
    }
  }

  function localRankings(levelId) {
    return bestRankingItems(
      getLocalResults().filter((result) => !result.isWeaknessMode && result.levelId === String(levelId)),
    );
  }

  async function loadRankings(levelId) {
    const remote = await initRemote();

    if (!remote) {
      return { source: "local", items: localRankings(levelId) };
    }

    try {
      const snapshot = await remote.getDocs(
        remote.query(
          remote.collection(remote.db, rankingCollection(levelId)),
          remote.orderBy("rankSort", "asc"),
          remote.limit(RANKING_FETCH_LIMIT),
        ),
      );
      const items = [];
      snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
      return { source: "firebase", items: bestRankingItems(items) };
    } catch (error) {
      return { source: "local", items: localRankings(levelId) };
    }
  }

  function aggregateWeakness(nickname, levelId) {
    const key = nicknameKey(nickname);
    const groups = new Map();

    getLocalResults()
      .filter((result) => result.nicknameKey === key && result.levelId === String(levelId))
      .forEach((result) => {
        result.questionStats.forEach((stat) => {
          const item = sanitizeQuestionStat(stat);
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
