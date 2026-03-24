# ImaginAI

**[English version here](README.md)**

## 1. システム概要

ImaginAIは、AI画像・動画生成APIを専用GUIで操作するデスクトップアプリケーションです。Google Gemini API（Image Generation）およびVeo 3.1（Video Generation）に対応し、将来的に他のAI生成APIの追加にも対応できる拡張性を備えています。

主な機能:

- **画像生成**: モデル選択、アスペクト比、解像度、生成枚数、出力フォーマット、セーフティフィルターなどのパラメータをGUIで設定し、テキストプロンプトから画像を生成
- **動画生成**: Veo 3.1モデルによるテキストまたは画像からの動画生成。長さ、解像度、アスペクト比を設定可能
- **参照画像添付**: ファイル選択・ドラッグ＆ドロップ・履歴からの追加による画像参照生成（Image-to-Image / Image-to-Video）
- **生成履歴管理**: 生成した画像・動画のサムネイル一覧表示、検索、パラメータ復元、名前をつけて保存、一括ZIP圧縮エクスポート
- **画像・動画ビューア**: モードレスウィンドウで画像の閲覧や動画の再生が可能
- **設定**: 言語（日本語/英語）、テーマ（ライト/ダーク/システム追従）、APIキー管理（暗号化保存・接続テスト）、履歴保存先の変更
- **セキュリティ**: APIキーはElectron safeStorageで暗号化保存、Rendererプロセスから直接アクセスさせないIPC通信設計

## 2. 対応OS

- Windows 10/11
- macOS 10.15+
- Linux (Debian系/RHEL系)

注記: 本プロジェクトは Windows ではコード署名を行っていません。SmartScreen が警告を表示する場合は「詳細情報」→「実行」を選択してください。

## 3. 開発者向けリファレンス

### 開発ルール

- 開発者の参照するドキュメントは`README.md`および`README-ja.md`を除き`Documents`に配置すること。
- 対応後は必ずリンターで確認を行い適切な修正を行うこと。故意にリンターエラーを許容する際は、その旨をコメントで明記すること。 **ビルドはリリース時に行うものでデバックには不要なのでリンターまでで十分**
- 一時的なスクリプトなど（例:調査用スクリプト）は`scripts`ディレクトリに配置すること。
- データモデルの実装時は、テーブル単位でファイルを配置すること。
- データモデルを作成および変更を加えた場合は、`Documents/テーブル定義.md`を更新すること。テーブル定義はテーブルごとに表で表現し、カラム名や型およびリレーションを表内で表現すること。
- システムの動作などに変更があった場合は、`Documents/システム仕様.md`を更新すること。

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

開発時のDevTools:

- DevTools はデタッチ表示で自動的に開きます
- F12 または Ctrl+Shift+I（macOSは Cmd+Option+I）でトグル可能

### ビルド/配布

- 全プラットフォーム: `yarn dist`
- Windows: `yarn dist:win`
- macOS: `yarn dist:mac`
- Linux: `yarn dist:linux`

開発時は BrowserRouter で `<http://localhost:3001>` を、配布ビルドでは HashRouter で `dist/renderer/index.html` を読み込みます。

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
- **React (MUI v7)**
- **TypeScript**
- **Zustand**
- **i18next**
- **Vite**

### Windows用アイコンの作成

```exec
magick public/icon.png -define icon:auto-resize=256,128,96,64,48,32,24,16 public/icon.ico
```
