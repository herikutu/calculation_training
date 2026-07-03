# 計算力トレーニング

GitHub Pages で公開できる、ビルド不要の静的な計算トレーニングアプリです。

## 現在の内容

- 足し算、引き算、掛け算、割り算のトレーニングを出題
- 足し算はレベル1〜11、引き算はレベル1〜12、掛け算はレベル1〜8、割り算はレベル1〜10
- レベルごとに18問または36問を出題
- 全問正解するまでのタイムを計測
- タイムとミス数に応じて成果を表示
- 画面内の専用数字キーボードで入力
- ニックネームごとの結果保存
- 種目・レベル別ランキング表示
- 問題ごとの所要時間とミスをもとにした苦手トレーニング

## 使い方

`index.html` をブラウザで開くと起動します。

## Firebase でクラウド保存する場合

Firebase を設定しない場合でも、結果は端末内に保存されます。
複数端末でランキングを共有したい場合は、Firebase の無料枠で Firestore を有効にして設定します。

1. Firebase でプロジェクトを作成する
2. Web アプリを追加する
3. Firestore Database を作成する
4. `firestore.rules` の内容を Firebase Console の Rules に貼り付けて公開する
5. Firebase の Web アプリ設定を `firebase-config.js` に貼り付ける

`firebase-config.js` の例:

```js
window.CALC_TRAINING_FIREBASE_CONFIG = {
  apiKey: "xxxxxxxx",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:xxxxxxxx",
};
```

Firestore に接続できると、画面の保存状態が「クラウド保存」になります。

## 保存されるデータ

- ランキング用: ニックネーム、種目、レベル、タイム、ミス数、成果
- 苦手判定用: 各問題の式、所要時間、ミス数

苦手トレーニングは、同じ端末に保存されたニックネーム別の履歴から作ります。
ランキングと苦手判定は、種目とレベルの組み合わせごとに分かれます。
