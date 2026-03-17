export default {
    appTitle: 'ImaginAI',

    // Common
    'common.generate': '生成',
    'common.cancel': 'キャンセル',
    'common.save': '保存',
    'common.delete': '削除',
    'common.close': '閉じる',
    'common.confirm': '確認',
    'common.yes': 'はい',
    'common.no': 'いいえ',
    'common.ok': 'OK',
    'common.error': 'エラー',
    'common.success': '成功',
    'common.warning': '警告',
    'common.search': '検索',
    'common.loading': '読み込み中...',
    'common.settings': '設定',
    'common.back': '戻る',

    // Model selection
    'model.label': 'モデル',

    // Aspect ratio
    'aspectRatio.label': 'アスペクト比',
    'aspectRatio.1:1': '1:1 (正方形)',
    'aspectRatio.9:16': '9:16 (縦長)',
    'aspectRatio.16:9': '16:9 (横長)',
    'aspectRatio.3:4': '3:4 (縦長)',
    'aspectRatio.4:3': '4:3 (横長)',
    'aspectRatio.2:3': '2:3 (縦長)',
    'aspectRatio.3:2': '3:2 (横長)',
    'aspectRatio.4:5': '4:5 (縦長)',
    'aspectRatio.5:4': '5:4 (横長)',
    'aspectRatio.21:9': '21:9 (ウルトラワイド)',

    // Quality
    'quality.label': '出力解像度',
    'quality.1k': '1K (標準)',
    'quality.2k': '2K (高精細)',
    'quality.4k': '4K (最高品質)',

    // Output format
    'outputFormat.label': '出力フォーマット',
    'outputFormat.png': 'PNG (ロスレス)',
    'outputFormat.jpeg': 'JPEG (軽量)',

    // Safety
    'safety.label': 'セーフティフィルター',
    'safety.blockNone': '制限なし',
    'safety.blockFew': '低制限',
    'safety.blockSome': '中制限',
    'safety.blockMost': '高制限',

    // Number of images
    'numberOfImages.label': '生成枚数',
    'numberOfImages.warning': '枚数が多いほどAPI消費量が増加します。',

    // Prompt
    'prompt.label': 'プロンプト',
    'prompt.placeholder': '生成したい画像を説明してください...',
    'prompt.required': 'プロンプトは必須です',
    'prompt.charCount': '{{count}}文字',

    // Negative prompt
    'negativePrompt.label': 'ネガティブプロンプト',
    'negativePrompt.placeholder': 'text, blurry, low quality, distorted hands',

    // Reference images
    'referenceImages.selectFiles': '画像を添付',
    'referenceImages.removeTooltip': '削除',
    'referenceImages.unsupportedModel': 'このモデルは画像入力に対応していません。',

    // Generation
    'generation.generating': '生成中...',
    'generation.historyLimitExceeded': '履歴が上限({{limit}}件)を超えています。履歴を整理してください。',
    'generation.error': '生成に失敗しました: {{message}}',
    'generation.errorRetry': 'リトライ',
    'generation.networkError': 'ネットワークエラーが発生しました。接続を確認してもう一度お試しください。',
    'generation.diskSpaceWarning': '履歴保存先のディスク容量が不足しています。空き容量を確保するか、保存先を変更してください。',
    'generation.success': '画像を生成しました！',

    // History
    'history.title': '生成履歴',
    'history.empty': '履歴がありません。最初の画像を生成しましょう！',
    'history.searchPlaceholder': 'プロンプトで検索...',
    'history.deleteConfirm': 'この履歴を削除しますか？この操作は元に戻せません。',
    'history.deleteAllConfirm': 'すべての履歴が完全に削除されます。この操作は元に戻せません。よろしいですか？',
    'history.exportAndDeleteConfirm': 'すべての履歴を圧縮保存してから削除します。続行しますか？',
    'history.exportSuccess': '履歴をエクスポートしました。',
    'history.exportFailed': '履歴のエクスポートに失敗しました。',
    'history.exporting': '履歴をエクスポート中...',
    'history.exportProgress': '圧縮中: {{percent}}%',

    // Context menu
    'contextMenu.addToPrompt': 'プロンプトに追加',
    'contextMenu.saveAs': '名前をつけて保存...',
    'contextMenu.restoreParams': 'パラメータ復元',
    'contextMenu.delete': '削除',

    // History menu
    'historyMenu.deleteAll': 'すべて削除',
    'historyMenu.exportAndDelete': 'すべて圧縮保存して削除',

    // Settings
    'settings.title': '設定',
    'settings.language': '言語',
    'settings.theme': 'テーマ',
    'settings.theme.light': 'ライト',
    'settings.theme.dark': 'ダーク',
    'settings.theme.system': 'システム',
    'settings.apiKey': 'APIキー',
    'settings.apiKey.label': 'Gemini APIキー',
    'settings.apiKey.placeholder': 'APIキーを入力してください',
    'settings.apiKey.test': '接続テスト',
    'settings.apiKey.testing': 'テスト中...',
    'settings.apiKey.valid': 'APIキーは有効です。',
    'settings.apiKey.invalid': 'APIキーが無効です。',
    'settings.apiKey.saved': 'APIキーを保存しました。',
    'settings.historyDir': '履歴保存先',
    'settings.historyDir.change': '変更',
    'settings.historyDir.moveConfirm': '既存の履歴を新しい場所に移動しますか？',
    'settings.language.ja': '日本語',
    'settings.language.en': '英語',
};
