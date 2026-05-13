# ImaginAI

**[English version here](README.md)**

## 1. システム概要

ImaginAIは、AI画像・動画・音楽・音声生成APIを専用GUIで操作するデスクトップアプリケーションです。**Google AI Studio**（画像: Nano Banana / Imagen 4、動画: Veo 3.1、音楽: Lyria 3、音声: Gemini TTS）と **OpenAI**（画像: GPT Image 2 / 1.5 / 1）の両プロバイダに対応し、将来的に他のAI生成APIの追加にも対応できる拡張性を備えています。

主な機能:

- **画像生成**: 両プロバイダでテキストプロンプトから画像を生成（Nano Banana / Imagen 4 / GPT Image）
- **画像編集モード**: 添付した参照画像に対するプロンプトを編集指示として扱います（Nano Banana と GPT Image で対応）
- **動画生成**: Veo 3.1 によるテキストまたは画像からの動画生成
- **音楽生成**: Lyria 3 によるテキストまたは画像からの音楽生成
- **音声生成（TTS）**: Gemini TTS によるテキスト読み上げ。スタイルプリセットと事前定義ボイス選択あり
- **参照画像添付**: ファイル選択・ドラッグ＆ドロップ・履歴の過去の生成結果から添付
- **APIキー管理**: プロバイダごとにデフォルトキー + 名前付きカスタムキーを Electron safeStorage で暗号化保存。タイトルバーからワンクリックで切替可能
- **生成履歴管理**: プロバイダ混在のサムネイル一覧、フィルタ、プロンプト検索、パラメータ復元、名前をつけて保存、一括ZIP圧縮エクスポート
- **画像・動画・音声ビューア**: モードレスウィンドウで画像の閲覧、動画の再生、音楽・音声の再生が可能
- **設定**: 言語（日本語/英語）、テーマ（ライト/ダーク/システム追従）、APIキー管理（接続テスト付き）、履歴保存先の変更
- **アプリ内自動更新**（インストーラ版のみ）
- **セキュリティ**: APIキーはElectron safeStorageで暗号化保存、Rendererプロセスから直接アクセスさせないIPC通信設計

## 2. 対応OS

- Windows 10/11
- macOS 10.15+
- Linux (Debian系/RHEL系)

注記: 本プロジェクトは Windows ではコード署名を行っていません。SmartScreen が警告を表示する場合は「詳細情報」→「実行」を選択してください。

## 3. 開発者向けリファレンス

### 必要要件

- Node.js 22.x以上
- yarn 4
- Git

### インストール

```bash
# リポジトリのクローン
git clone <repository-url>
cd <repository-name>

# 依存関係のインストール
yarn install

# 開発起動
yarn dev
```

DevTools:

- 開発時は DevTools がデタッチ表示で自動的に開きます
- F12 または Ctrl+Shift+I（macOSは Cmd+Option+I）で開発・製品ビルドの両方でトグル可能

### ビルド/配布

- Windows: `yarn dist:win`
- macOS: `yarn dist:mac`
- Linux: `yarn dist:linux`

開発時は BrowserRouter で `<http://localhost:3001>` を、配布ビルドでは HashRouter で `dist/renderer/index.html` を読み込みます。

### GitHub への直接リリース (自動アップデート用)

`electron-builder.yml` の `publish:` に設定した GitHub リポジトリに、ビルド成果物と `latest*.yml` (自動アップデート用メタデータ) を直接アップロードするコマンドです。`releaseType: draft` 設定のため、各コマンドは GitHub 上の **同一バージョンのドラフトリリースに集約** されます。全プラットフォーム揃ってから GitHub UI で「Publish release」を押すとユーザーへ配信されます。

- Windows: `yarn release:win`
- macOS: `yarn release:mac`
- Linux: `yarn release:linux`

実行前に GitHub Personal Access Token (`public_repo` スコープ) を環境変数 `GH_TOKEN` に設定してください。

```bash
export GH_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxx"
```

複数台で各プラットフォームをビルドする場合は、`package.json` の `version` を全マシンで一致させた上で、各マシンで該当する `release:*` を順に実行してください。

### macOS 事前準備: 署名・公証用の環境変数

macOS 向けに署名・公証付きビルドを行う場合は、`yarn dist:mac` の実行前に以下の環境変数を設定してください。

```bash
export APPLE_ID="your-apple-id@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="XXXXXXXXXX"
```

### Windows 事前準備: 開発者モード

Windows で署名なしのローカルビルド/配布物を実行・テストする場合は、OSの開発者モードを有効にしてください。

1. 設定 → プライバシーとセキュリティ → 開発者向け
2. 「開発者モード」をオンにする
3. OSを再起動

### プロジェクト構造 (抜粋)

```text
src/
├── main/                  # Electron メイン: IPC/各種マネージャ
│   ├── index.ts           # 起動・ウィンドウ生成・サービス初期化
│   ├── ipc/               # IPCハンドラ
│   ├── services/          # 各種サービス
│   └── utils/             # 各種ユーティリティ
├── preload/               # renderer へ安全にAPIをブリッジ
├── renderer/              # React + MUI UI
├── shared/                # 型定義・定数・モデル定義
└── public/                # アイコン等
```

### 使用技術

- **Electron**
- **React 19 (MUI v9)**
- **TypeScript**
- **Zustand**
- **i18next**
- **Vite**

### Windows用アイコンの作成

```exec
magick public/icon.png -define icon:auto-resize=256,128,96,64,48,32,24,16 public/icon.ico
```
