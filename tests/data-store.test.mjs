import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const dataStoreSource = await readFile(new URL("../data-store.js", import.meta.url), "utf8");
const instrumentedSource = dataStoreSource.replace(
  "  window.trainingDataStore = {",
  `  window.setTrainingRemoteForTests = (remote) => {
    state.remote = remote;
    state.initPromise = Promise.resolve(remote);
  };

  window.trainingDataStore = {`,
);

function createWindow(initialResults = []) {
  const values = new Map();
  values.set("calculation-training-results", JSON.stringify(initialResults));
  values.set("calculation-training-nickname", "テスト");
  const window = {
    CALC_TRAINING_FIREBASE_CONFIG: {},
    crypto: {
      randomUUID: () => "result-id",
    },
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value)),
    },
  };
  window.window = window;
  return window;
}

function createResult() {
  return {
    nickname: "テスト",
    operationId: "division",
    operationLabel: "割り算",
    taskId: "division:1",
    levelId: "1",
    levelLabel: "割り算 レベル1",
    questionCount: 36,
    elapsedMs: 40000,
    mistakes: 0,
    gradeSymbol: "○",
    gradeLabel: "合格",
    questionStats: [],
    createdAt: "2026-07-17T00:00:00.000Z",
  };
}

function rankingItem(overrides = {}) {
  return {
    resultId: overrides.resultId || "existing-result",
    nickname: overrides.nickname || "既存",
    operationId: "division",
    operationLabel: "割り算",
    taskId: "division:1",
    levelId: "1",
    levelLabel: "割り算 レベル1",
    elapsedMs: overrides.elapsedMs ?? 50000,
    mistakes: 0,
    rankSort: overrides.rankSort ?? 50000,
    gradeSymbol: "○",
    gradeLabel: "合格",
    questionCount: 36,
    createdAtLocal: "2026-07-01T00:00:00.000Z",
    appVersion: "ops-1",
  };
}

function createRemote(options = {}) {
  const calls = {
    addedCollections: [],
    queriedCollections: [],
    boardWrites: [],
  };
  const boardItems = options.boardItems || [rankingItem()];
  const primaryItems = options.primaryItems || [];
  const legacyItems = options.legacyItems || [];

  const remote = {
    db: {},
    serverTimestamp: () => "server-timestamp",
    collection: (_db, name) => ({ name }),
    doc: (_db, collectionName, id) => ({ collectionName, id }),
    addDoc: async (collectionRef) => {
      calls.addedCollections.push(collectionRef.name);

      if (collectionRef.name === "trainingResults" && options.failDetail) {
        throw new Error("detail failed");
      }

      if (collectionRef.name === "rankings_division_1" && options.failRankingRecord) {
        throw new Error("ranking record failed");
      }
    },
    runTransaction: async (_db, callback) => {
      if (options.failRankingBoard) {
        throw new Error("ranking board failed");
      }

      return callback({
        get: async () => ({
          exists: () => true,
          data: () => ({ items: boardItems }),
        }),
        set: (_ref, value) => calls.boardWrites.push(value),
      });
    },
    getDoc: async () => ({
      exists: () => true,
      data: () => ({ items: boardItems }),
    }),
    getDocs: async (querySpec) => {
      const collectionName = querySpec.collection.name;
      calls.queriedCollections.push(collectionName);
      const items = collectionName === "rankings_level_1" ? legacyItems : primaryItems;

      return {
        forEach: (callback) => items.forEach((item, index) => callback({ id: `doc-${index}`, data: () => item })),
      };
    },
    orderBy: (...args) => ({ type: "orderBy", args }),
    limit: (value) => ({ type: "limit", value }),
    query: (collection, ...constraints) => ({ collection, constraints }),
  };

  return { remote, calls };
}

function createStore(remote, initialResults = []) {
  const window = createWindow(initialResults);
  const warnings = [];
  const errors = [];
  const context = vm.createContext({
    window,
    console: {
      warn: (...args) => warnings.push(args),
      error: (...args) => errors.push(args),
    },
    Map,
    Promise,
    Date,
    Math,
    Number,
    String,
    Boolean,
    Array,
  });

  vm.runInContext(instrumentedSource, context);
  window.setTrainingRemoteForTests(remote);
  return { store: window.trainingDataStore, warnings, errors };
}

test("ランキングボードが失敗しても追記記録が成功すればクラウド保存になる", async () => {
  const { remote, calls } = createRemote({ failRankingBoard: true });
  const { store, warnings } = createStore(remote);
  const result = await store.saveResult(createResult());

  assert.equal(result.message, "クラウド保存");
  assert.deepEqual(calls.addedCollections, ["trainingResults", "rankings_division_1"]);
  assert.equal(warnings.length, 1);
});

test("追記記録が失敗してもランキングボードが成功すればクラウド保存になる", async () => {
  const { remote } = createRemote({ failRankingRecord: true });
  const { store, warnings } = createStore(remote);
  const result = await store.saveResult(createResult());

  assert.equal(result.message, "クラウド保存");
  assert.equal(warnings.length, 1);
});

test("ランキングの両方が失敗しても結果本体のクラウド保存を維持する", async () => {
  const { remote } = createRemote({ failRankingRecord: true, failRankingBoard: true });
  const { store, warnings } = createStore(remote);
  const result = await store.saveResult(createResult());

  assert.equal(result.mode, "firebase");
  assert.equal(result.message, "クラウド保存（ランキング未反映）");
  assert.equal(warnings.length, 2);
});

test("結果本体の保存失敗だけを端末内保存として扱う", async () => {
  const { remote } = createRemote({ failDetail: true });
  const { store, errors } = createStore(remote);
  const result = await store.saveResult(createResult());

  assert.equal(result.mode, "local");
  assert.equal(result.message, "端末内保存");
  assert.equal(errors.length, 1);
});

test("ボードが10件あっても追記記録を読み込み、最新順位を反映する", async () => {
  const boardItems = Array.from({ length: 10 }, (_, index) =>
    rankingItem({
      resultId: `board-${index}`,
      nickname: `既存${index}`,
      elapsedMs: 50000 + index,
      rankSort: 50000 + index,
    }),
  );
  const primaryItems = [
    rankingItem({
      resultId: "new-winner",
      nickname: "新記録",
      elapsedMs: 30000,
      rankSort: 30000,
    }),
  ];
  const { remote, calls } = createRemote({ boardItems, primaryItems });
  const { store } = createStore(remote);
  const result = await store.loadRankings("division:1", { force: true });

  assert.equal(result.items[0].resultId, "new-winner");
  assert.ok(calls.queriedCollections.includes("rankings_division_1"));
});

test("既存ボード更新には旧ランキングのキャッシュを混ぜない", async () => {
  const boardItems = [rankingItem({ nickname: "ボード", rankSort: 50000 })];
  const legacyItems = [
    rankingItem({ resultId: "legacy", nickname: "旧記録", rankSort: 40000 }),
  ];
  const setup = createRemote({ boardItems, legacyItems });
  const { store } = createStore(setup.remote);

  await store.loadRankings("division:1", { force: true });
  await store.saveResult(createResult());

  assert.equal(setup.calls.boardWrites.length, 1);
  assert.equal(
    JSON.stringify(setup.calls.boardWrites[0].items.map((item) => item.nickname).sort()),
    JSON.stringify(["テスト", "ボード"].sort()),
  );
});

test("端末に残った自己ベストを一度だけ追記ランキングへ回復する", async () => {
  const localResult = {
    ...createResult(),
    id: "local-best",
    nicknameKey: "テスト",
    rankSort: 40000,
    appVersion: "ops-1",
  };
  const setup = createRemote({ boardItems: [], primaryItems: [] });
  const { store } = createStore(setup.remote, [localResult]);

  await store.loadRankings("division:1", { force: true });
  await store.loadRankings("division:1", { force: true });

  assert.equal(
    setup.calls.addedCollections.filter((collectionName) => collectionName === "rankings_division_1").length,
    1,
  );
});
