# 20時間逃げ切れ！カーチェイスゲーム（仮）

ブラウザで遊べる、ハリボテ3Dカーチェイスゲームのプロトタイプです。

## 遊び方

- PC: `W` / `S` でアクセル・ブレーキ、`A` / `D` で旋回、`Space` で煽り
- `P` / `Esc` でポーズ
- スマホ: 画面下のボタンで操作

煽るたびにパトカーが1台増えます。逮捕ゲージが最大になる前に、残り時間がゼロになるまで逃げ切ってください。
時間は現実の時間で進み、進行状況はブラウザに保存されます。再読み込みしても途中から再開できます。

## ローカル実行

`index.html` をブラウザで直接開いて遊べます。

ローカルサーバーで確認したい場合は、以下でも起動できます。

```sh
python3 -m http.server 5173
```

その後、ブラウザで `http://localhost:5173` を開きます。

## 開発メモ

`index.html` は直開き対応のため、`src/bundle.js` を読み込みます。
`src/*.js` を編集した後は、以下でバンドルを作り直してください。

```sh
npm install --no-save three@0.164.1 esbuild
npx esbuild src/main.js --bundle --format=iife --global-name=CarChaseGame --minify --outfile=src/bundle.js
rm -rf node_modules
```

## GitHub Pages公開

このフォルダをGitHubリポジトリへpushし、GitHub Pagesの公開元をリポジトリのルートに設定すれば公開できます。
