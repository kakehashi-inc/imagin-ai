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

    // プロバイダ (ユーザー向け表示名 — コードでは 'gemini' / 'openai' を使用)
    'provider.gemini': 'Google AI Studio',
    'provider.openai': 'OpenAI',

    // 注意事項ダイアログ
    'notices.button.label': '利用上の注意',
    'notices.button.tooltip': '利用上の注意',
    'notices.dialog.title': '利用上の注意',
    'notices.dialog.close': '閉じる',
    'notices.gemini.title': 'Google AI Studio',
    'notices.gemini.precautions.title': '無料枠および商用利用時の注意点',
    'notices.gemini.precautions.items': [
        '入力データと生成結果はGoogleのモデル改善や人間によるレビューに利用される可能性がある。',
        '利用データは個人を特定できない形で処理されるが、機密情報や秘匿性の高いデータの入力は避ける。',
        'AIが生成した内容を「人間が作成した」と偽って利用者に提供することは禁止されている。',
        '欧州経済領域（EEA）、スイス、英国でアプリを公開する場合は支払い枠（Paid Tier）の使用が義務付けられている。',
        '生成したコンテンツがAIによるものであることを、利用者が誤認しないよう適切に開示する必要がある。',
        'AI生成物に含まれる電子透かし（SynthID等）を意図的に削除したり改ざんしたりしてはならない。',
    ],
    'notices.gemini.recommendations.title': '推奨事項',
    'notices.gemini.recommendations.items': [
        '顧客データやプライバシーに関わる情報を扱う場合は、データが学習に使用されない支払い枠を契約する。',
        'プロトタイプ開発や公開情報の処理には無料枠を使い、本番リリース時に支払い枠へ切り替えて運用する。',
        '利用者とのトラブルを防ぐため、サービス内に「AI生成物であり正確性を保証しない」旨の免責事項を明記する。',
    ],
    'notices.openai.title': 'OpenAI',
    'notices.openai.precautions.title': 'Standard API利用および商用利用時の注意点',
    'notices.openai.precautions.items': [
        'Standard APIでは、入力プロンプトと生成結果はOpenAIのモデル学習に既定で使用されない（2023年3月のポリシー変更による）。Customer Contentはサービス提供・適用法令の遵守・OpenAIポリシーの執行のためにのみ使用される。',
        '不正利用監視のため、APIの入出力は通常最大30日間サーバ側に保持される（Zero Data Retention契約締結時を除く）。プロンプトと生成結果はOpenAIサーバを経由し一時的に保持されるため、機密情報や秘匿性の高いデータの入力は避ける。',
        'OpenAIのSharing & Publication Policyに基づき、APIで生成したコンテンツを「すべて人間が作成した」と偽って公開することは禁止されている。公開時はAIの関与を明示的に開示する必要がある。',
        'API生成物を含むコンテンツを公開する場合、最終的な責任は人間が負うものとされる（人間が内容をレビューし、編集し、正確性について責任を持つ）。',
        'OpenAI Usage Policiesに反するリクエスト（未成年者を含む性的コンテンツ、暴力や違法行為の助長、選挙干渉等）はAPI側で拒否される。',
    ],
    'notices.openai.recommendations.title': '推奨事項',
    'notices.openai.recommendations.items': [
        '顧客データやプライバシーに関わる情報を扱う場合は、最新のOpenAI Data Usageポリシーと契約条件を確認した上でAPIに送信する。必要に応じてZero Data Retention（ZDR）契約の申請を検討する。',
        '生成物の権利はユーザーに帰属する（OpenAIはOutputに対する権利をユーザーに譲渡する）が、他の利用者にも類似の生成物が出力される可能性があるため、生成物が一意であるとは限らない点に留意する。',
        '利用者とのトラブルを防ぐため、サービス内に「AI生成物であり正確性を保証しない」旨の免責事項を明記する。',
    ],

    // タイトルバー
    'titleBar.apiKey.default': 'デフォルト',
    'titleBar.apiKey.freeTier': '無料枠',
    'titleBar.apiKey.untitled': '（タイトルなし）',
    'titleBar.apiKey.freeTierBadge': '無料',
    'titleBar.apiKey.noKey': '（未設定）',
    'titleBar.apiKey.group.gemini': 'Google AI Studio',
    'titleBar.apiKey.group.openai': 'OpenAI',

    // モデル選択
    'model.label': 'モデル',
    'model.freeTierUnavailable': '無料枠不可',
    'gemini.model.note.lyriaClip': '30秒固定',
    'gemini.model.note.lyriaPro': 'プロンプトで3分までの長さを指示可能',
    'gemini.model.note.imagenShutdown': 'サポート終了: 2026/6/24',
    'gemini.model.note.nanoBananaShutdown': 'サポート終了: 2026/10/2',
    'gemini.model.freeTier.ttsFlash':
        '無料枠:\n3 RPM / 10K TPM\n1分あたり最大3リクエスト、合計で約6分程度の音声生成が目安',

    // Gemini TTS スタイル / ボイス
    'gemini.tts.style.label': 'スタイル',
    'gemini.tts.style.instructionLabel': 'スタイル内容（英語で記述）',
    'gemini.tts.style.custom': 'カスタム',
    'gemini.tts.style.presets': [
        {
            name: '明るく元気に',
            effect: 'ハキハキとした高いトーンで活発に',
            instruction: 'Enthusiastic, upbeat, and energetic',
        },
        {
            name: '落ち着いた信頼感',
            effect: '低めのトーンで説得力のある安定した発声',
            instruction: 'Calm, professional, and authoritative',
        },
        {
            name: '謝罪・誠実',
            effect: '申し訳なさを感じさせる控えめで丁寧なトーン',
            instruction: 'Apologetic, sincere, and humble',
        },
        {
            name: '優しくささやく',
            effect: '内緒話のような空気を含んだ柔らかな声',
            instruction: 'Soft, gentle, and whispering tone',
        },
        {
            name: '緊急・切迫',
            effect: '非常に早口で緊迫感のある話し方',
            instruction: 'Urgent, breathless, and rapid-fire',
        },
        {
            name: '冷徹・淡々と',
            effect: '感情を完全に排除した機械的なトーン',
            instruction: 'Cold, flat, and emotionless',
        },
        {
            name: '皮肉・冷笑',
            effect: '相手を小馬鹿にするような独特な抑揚',
            instruction: 'Sarcastic and slightly arrogant',
        },
        {
            name: '物語の朗読',
            effect: '場面展開に合わせて抑揚が大きく動く',
            instruction: 'Dramatic, expressive, and storytelling',
        },
        {
            name: 'おやすみ前',
            effect: '極めてゆっくりとした安らぎを与える声',
            instruction: 'Sleepy, soothing, and very gentle',
        },
    ],
    'gemini.tts.voice.label': 'ボイス',
    'gemini.tts.voice.presets': [
        { name: 'Aoede', gender: '女性', characteristic: 'さわやか、中性的' },
        { name: 'Charon', gender: '男性', characteristic: '誠実、情報伝達的' },
        { name: 'Kore', gender: '女性', characteristic: '芯が強い、きっぱり' },
        { name: 'Puck', gender: '男性', characteristic: '明るい、陽気' },
        { name: 'Fenrir', gender: '男性', characteristic: '興奮気味、力強い' },
        { name: 'Zephyr', gender: '女性', characteristic: '明るい、快活' },
        { name: 'Leda', gender: '女性', characteristic: '若々しい、軽やか' },
        { name: 'Orus', gender: '男性', characteristic: '芯がある、しっかり' },
        { name: 'Callirrhoe', gender: '女性', characteristic: '気さく、リラックス' },
        { name: 'Autonoe', gender: '女性', characteristic: '明るい、はつらつ' },
        { name: 'Enceladus', gender: '男性', characteristic: 'ささやき、息漏れ' },
        { name: 'Iapetus', gender: '男性', characteristic: 'クリア、明快' },
        { name: 'Umbriel', gender: '男性', characteristic: 'リラックス、自然体' },
        { name: 'Erinome', gender: '女性', characteristic: 'クリア、静か' },
        { name: 'Despina', gender: '女性', characteristic: 'スムーズ、流暢' },
        { name: 'Algieba', gender: '男性', characteristic: 'スムーズ、落ち着き' },
        { name: 'Algenib', gender: '男性', characteristic: '渋い、少しハスキー' },
        { name: 'Rasalgethi', gender: '男性', characteristic: '知性的、落ち着き' },
        { name: 'Laomedeia', gender: '女性', characteristic: '前向き、活発' },
        { name: 'Achernar', gender: '女性', characteristic: '柔らかい、優しい' },
        { name: 'Alnilam', gender: '男性', characteristic: '毅然とした、強い' },
        { name: 'Schedar', gender: '男性', characteristic: '落ち着いた、フラット' },
        { name: 'Gacrux', gender: '女性', characteristic: '成熟した、深い' },
        { name: 'Pulcherrima', gender: '女性', characteristic: 'はっきりした、明瞭' },
        { name: 'Achird', gender: '男性', characteristic: 'フレンドリー、親しみ' },
        { name: 'Zubenelgenubi', gender: '男性', characteristic: 'カジュアル、日常的' },
        { name: 'Vindemiatrix', gender: '女性', characteristic: '穏やか、優しい' },
        { name: 'Sadachbia', gender: '男性', characteristic: '生き生きした、活気' },
        { name: 'Sadaltager', gender: '男性', characteristic: '博識、落ち着き' },
        { name: 'Sulafat', gender: '女性', characteristic: '温かい、包容力' },
    ],

    // Audio Tags ダイアログ
    'audioTags.button.label': 'Audio Tags の使い方',
    'audioTags.button.tooltip': 'Audio Tags の詳細を表示',

    // オーディオプレイヤー
    'audioPlayer.section.spokenText': '読み上げテキスト',
    'audioPlayer.section.apiText': 'APIから返されたテキスト',
    'audioTags.dialog.title': 'Audio Tags 詳細解説',
    'audioTags.dialog.close': '閉じる',
    'audioTags.dialog.description':
        'Gemini 3.1 Flash TTS でのみ利用可能な、プロンプト内に埋め込んで発声を制御するタグです。',
    'audioTags.section.expressions.title': '感情・表現タグ (Expressions)',
    'audioTags.section.expressions.items': [
        { tag: '[laughing]', desc: '自然な笑い声を挿入、または笑いを含んだトーンに変えます。' },
        { tag: '[sigh]', desc: '失望や安堵を示す、深いため息（排気音）を挿入します。' },
        { tag: '[uhm]', desc: '「ええと」「あのー」といった自然な言い淀み（フィラー）を挿入します。' },
        { tag: '[whispering]', desc: '音量を下げ、息漏れを増やした「ささやき声」に切り替えます。' },
        { tag: '[shouting]', desc: '声量を上げ、張りのある「叫び声」に近い発声にします。' },
    ],
    'audioTags.section.prosody.title': '話速・ピッチ制御タグ (Prosody)',
    'audioTags.section.prosody.items': [
        { tag: '[extremely fast] / [extremely slow]', desc: '指定した箇所のスピードを極端に速く、または遅くします。' },
        { tag: '[pitch:high] / [pitch:low]', desc: '声のトーンを一時的に高く、または低く調整します。' },
    ],
    'audioTags.section.pause.title': '間 (Pause) タグ',
    'audioTags.section.pause.items': [
        { tag: '[short pause]', desc: '約 0.2〜0.5 秒の自然な句切りを入れます。' },
        { tag: '[medium pause]', desc: '文の区切りとして明確な約 1 秒の間を置きます。' },
        { tag: '[long pause]', desc: '場面転換や重要な発言の前に、約 2 秒以上の長い溜めを作ります。' },
    ],

    // Gemini アスペクト比
    'gemini.aspectRatio.label': 'アスペクト比',
    'gemini.aspectRatio.group.square': '正方形',
    'gemini.aspectRatio.group.landscape': '横長',
    'gemini.aspectRatio.group.portrait': '縦長',
    'gemini.aspectRatio.1:1': '1:1',
    'gemini.aspectRatio.9:16': '9:16',
    'gemini.aspectRatio.16:9': '16:9',
    'gemini.aspectRatio.3:4': '3:4',
    'gemini.aspectRatio.4:3': '4:3',
    'gemini.aspectRatio.2:3': '2:3',
    'gemini.aspectRatio.3:2': '3:2',
    'gemini.aspectRatio.4:5': '4:5',
    'gemini.aspectRatio.5:4': '5:4',
    'gemini.aspectRatio.21:9': '21:9',
    'gemini.aspectRatio.4:1': '4:1',
    'gemini.aspectRatio.8:1': '8:1',
    'gemini.aspectRatio.1:4': '1:4',
    'gemini.aspectRatio.1:8': '1:8',

    // Gemini Quality
    'gemini.quality.label': '出力解像度',
    'gemini.quality.512px': '512px',
    'gemini.quality.1k': '1K (標準)',
    'gemini.quality.2k': '2K (高精細)',
    'gemini.quality.4k': '4K (最高品質)',

    // Gemini Duration (video)
    'gemini.duration.label': '長さ',
    'gemini.duration.4s': '4秒',
    'gemini.duration.6s': '6秒',
    'gemini.duration.8s': '8秒',

    // Gemini Resolution (video)
    'gemini.resolution.label': '動画解像度',
    'gemini.resolution.720p': '720p (HD)',
    'gemini.resolution.1080p': '1080p (Full HD)',
    'gemini.resolution.4k': '4K (Ultra HD)',

    // OpenAI パラメータ
    'openai.parameter.size.label': 'サイズ',
    'openai.parameter.quality.label': '品質',
    'openai.parameter.outputFormat.label': '出力フォーマット',
    'openai.parameter.background.label': '背景',
    'openai.size.square': 'Square (1024x1024) 1:1',
    'openai.size.portrait': 'Portrait (1024x1536) 2:3',
    'openai.size.landscape': 'Landscape (1536x1024) 3:2',
    'openai.size.square2k': '2K Square (2048x2048) 1:1',
    'openai.size.landscape2k': '2K Landscape (2048x1152) 16:9',
    'openai.size.landscape4k': '4K Landscape (3840x2160) 16:9',
    'openai.size.portrait4k': '4K Portrait (2160x3840) 9:16',
    'openai.quality.low': 'Low',
    'openai.quality.medium': 'Medium',
    'openai.quality.high': 'High',
    'openai.background.opaque': 'Opaque (不透過)',
    'openai.background.transparent': 'Transparent (透過)',

    // 画像編集モード (両プロバイダ共通トグル)
    'parameter.editMode.label': '画像編集モード',

    // 参考料金の折りたたみリンク
    'parameter.cost.expand': '展開',
    'parameter.cost.collapse': '折りたたむ',

    // 生成枚数
    'numberOfImages.label': '生成枚数',
    'numberOfImages.warning': '枚数が多いほどAPI消費量が増加します。',
    'numberOfVideos.label': '生成本数',
    'numberOfVideos.warning': '本数が多いほどAPI消費量と生成時間が増加します。',

    // API key banner
    'apiKeyBanner.message': 'APIキーが設定されていません。設定画面で設定してください。',

    // プロンプト
    'prompt.label': 'プロンプト',
    'prompt.labelTts': '読み上げテキスト',
    'prompt.placeholder': '生成したい画像を説明してください...',
    'prompt.placeholderMusic':
        '作成したい音楽を説明してください（ジャンル、雰囲気、楽器、BPMなど）。歌詞についての指示を含めると歌詞付きで生成されます。',
    'prompt.placeholderTts': '読み上げたいテキストを入力してください。',
    'prompt.required': 'プロンプトは必須です',
    'prompt.charCount': '{{count}}文字',
    'prompt.startingFrame': '開始フレーム（動画は1枚のみ）',

    // ネガティブプロンプト
    'negativePrompt.label': 'ネガティブプロンプト',
    'negativePrompt.placeholder': 'text, blurry, low quality, distorted hands',

    // 参考画像
    'referenceImages.selectFiles': '画像を添付',
    'referenceImages.removeTooltip': '削除',
    'referenceImages.unsupportedModel': 'このモデルは画像入力に対応していません。',

    // 生成
    'common.generateVideo': '動画を生成',
    'common.generateMusic': '音楽を生成',
    'common.generateSpeech': '読み上げを生成',
    'generation.generating': '生成中...',
    'generation.generatingVideo': '動画を生成中...',
    'generation.generatingMusic': '音楽を生成中...',
    'generation.generatingSpeech': '読み上げを生成中...',
    'generation.generatingVideoProgress': '動画を生成中... ({{elapsed}}秒)',
    'generation.videoDurationConstraint': '1080p/4K解像度では長さは8秒のみ指定できます。',
    'generation.historyLimitExceeded': '履歴が上限({{limit}}件)を超えています。履歴を整理してください。',
    'generation.error': '生成に失敗しました: {{message}}',
    'generation.errorRetry': 'リトライ',
    'generation.errorDetails': '詳細',
    'generation.errorHideDetails': '閉じる',
    'generation.networkError': 'ネットワークエラーが発生しました。接続を確認してもう一度お試しください。',
    'generation.diskSpaceWarning':
        '履歴保存先のディスク容量が不足しています。空き容量を確保するか、保存先を変更してください。',
    'generation.success': '画像を生成しました！',
    'generation.freeTierBlocked':
        '選択中のモデルは無料枠では利用できません。無料枠キー以外に切り替えるか、別のモデルを選択してください。',

    // 履歴
    'history.title': '生成履歴',
    'history.empty': '該当する履歴がありません。',
    'history.allModels': '全モデル',
    'history.searchPlaceholder': 'プロンプトで検索...',
    'history.deleteConfirm': 'この履歴を削除しますか？この操作は元に戻せません。',
    'history.deleteAllConfirm': 'すべての履歴が完全に削除されます。この操作は元に戻せません。よろしいですか？',
    'history.exportConfirm': 'すべての履歴をZIPアーカイブとしてエクスポートしますか？',
    'history.exportSuccess': '履歴をエクスポートしました。',
    'history.exportFailed': '履歴のエクスポートに失敗しました。',
    'history.exporting': '履歴をエクスポート中...',
    'history.exportProgress': '圧縮中: {{percent}}%',
    'history.editBadge': '編集',
    'history.filter.all': 'すべて',
    'history.filter.allProviders': '全プロバイダ',
    'history.filter.allMediaTypes': '全メディア種別',
    'history.filter.mediaType.image': '画像',
    'history.filter.mediaType.video': '動画',
    'history.filter.mediaType.music': '音楽',
    'history.filter.mediaType.voice': '音声',

    // コンテキストメニュー
    'contextMenu.addToPrompt': 'プロンプトに追加',
    'contextMenu.saveAs': '名前をつけて保存...',
    'contextMenu.restoreParams': 'パラメータ復元',
    'contextMenu.delete': '削除',

    // 履歴メニュー
    'historyMenu.exportAll': 'すべて圧縮して保存',
    'historyMenu.deleteAll': 'すべて削除',

    // 設定
    'settings.title': '設定',
    'settings.language': '言語',
    'settings.theme': 'テーマ',
    'settings.theme.light': 'ライト',
    'settings.theme.dark': 'ダーク',
    'settings.theme.system': 'システム',
    'settings.apiKey': 'APIキー',
    'settings.apiKey.label': 'APIキー',
    'settings.apiKey.gemini.title': 'Google AI Studio APIキー',
    'settings.apiKey.openai.title': 'OpenAI APIキー',
    'settings.apiKey.hintPrefix': 'Gemini APIキーは ',
    'settings.apiKey.hintGeminiLink': 'Google AI Studio',
    'settings.apiKey.hintMiddle': '、OpenAI APIキーは ',
    'settings.apiKey.hintOpenaiLink': 'OpenAI Platform',
    'settings.apiKey.hintSuffix': ' から取得できます。',
    'settings.apiKey.hintTierRequirement':
        'Gemini: デフォルトキー・カスタムキー（非無料枠）は請求階層がTier 1以上である必要があります。無料枠キーは、無料利用枠が用意されているモデルのみ利用可能です。OpenAI: 従量課金制のため、無料枠の概念はありません。',
    'settings.apiKey.placeholder': 'APIキーを入力してください',
    'settings.apiKey.default.title': 'デフォルトキー',
    'settings.apiKey.default.label': 'APIキー',
    'settings.apiKey.freeTier.title': '無料枠キー',
    'settings.apiKey.freeTier.label': 'APIキー（無料枠）',
    'settings.apiKey.customs.title': 'カスタムキー ({{count}} / {{max}})',
    'settings.apiKey.customs.add': '追加',
    'settings.apiKey.customs.titleLabel': 'タイトル',
    'settings.apiKey.customs.remove': '削除',
    'settings.apiKey.customs.isFreeTier': '無料枠キーとして扱う',
    'settings.apiKey.customs.titleRequired': 'タイトルは必須です。',
    'settings.apiKey.customs.keyRequired': 'APIキーは必須です。',
    'settings.apiKey.customs.validationError': 'カスタムキーはタイトルとAPIキーの両方が必須です。',
    'settings.apiKey.isFreeTierShort': '無料枠',
    'settings.apiKey.saveAll': 'APIキーを保存',
    'settings.apiKey.test': '接続テスト',
    'settings.apiKey.testing': 'テスト中...',
    'settings.apiKey.valid': 'APIキーは有効です。',
    'settings.apiKey.invalid': 'APIキーが無効です。',
    'settings.apiKey.notSet': 'APIキーが設定されていません。',
    'settings.apiKey.testError': 'APIキーのテストに失敗しました。もう一度お試しください。',
    'settings.apiKey.encryptionUnavailable': '暗号化が利用できません。APIキーを安全に保存できません。',
    'settings.apiKey.saved': 'APIキーを保存しました。',
    'settings.historyDir': '履歴保存先',
    'settings.historyDir.change': '変更',
    'settings.historyDir.moveConfirm': '既存の履歴を新しい場所に移動しますか？',
    'settings.language.ja': '日本語',
    'settings.language.en': '英語',

    // APIキーステータス
    'api.keyNotSet': 'APIキーが設定されていません。',
    'api.keyValid': 'APIキーは有効です。',
    'api.keyInvalid': 'APIキーが無効です。',
    'api.encryptionUnavailable': '暗号化が利用できません。APIキーを安全に保存できません。',

    // APIエラー - gRPCステータスコード別
    'api.error.invalidArgument': 'リクエストが無効です。パラメータを確認してください。',
    'api.error.failedPrecondition':
        'この機能は現在の状態では利用できません。有料プランへのアップグレードまたは追加設定が必要な場合があります。',
    'api.error.outOfRange': 'パラメータの値が有効範囲外です。設定を確認してください。',
    'api.error.unauthenticated': 'APIキーが無効または未設定です。設定画面でAPIキーを確認してください。',
    'api.error.permissionDenied':
        'アクセスが拒否されました。APIキーの権限が不足しているか、このモデルがご利用のプランでは利用できない可能性があります。',
    'api.error.notFound': '指定されたモデルが見つかりません。削除または名前が変更された可能性があります。',
    'api.error.alreadyExists': 'リソースの競合が発生しました。もう一度お試しください。',
    'api.error.resourceExhausted':
        'APIのクォータまたはレート制限に達しました。しばらく待ってから再試行するか、課金設定をご確認ください。',
    'api.error.cancelled': 'リクエストがキャンセルされました。',
    'api.error.internal': 'サーバー内部エラーが発生しました。しばらくしてから再試行してください。',
    'api.error.unimplemented': 'この機能は選択されたモデルではサポートされていません。',
    'api.error.unavailable': 'サービスが一時的に利用できません（高負荷のため）。しばらくしてから再試行してください。',
    'api.error.deadlineExceeded': 'サーバー側でリクエストがタイムアウトしました。もう一度お試しください。',
    'api.error.payloadTooLarge': 'リクエストデータが大きすぎます。入力サイズを小さくしてください。',
    'api.error.unknown': '予期しないエラーが発生しました。もう一度お試しください。',

    // アプリケーションレベルのエラー
    'api.error.keyNotSet': 'APIキーが設定されていません。設定画面で設定してください。',
    'api.error.noImagesGenerated': '画像が生成されませんでした。詳細を確認してください。',
    'api.error.noVideoGenerated': '動画が生成されませんでした。詳細を確認してください。',
    'api.error.noMusicGenerated': '音楽が生成されませんでした。詳細を確認してください。',
    'api.error.noVoiceGenerated': '音声が生成されませんでした。詳細を確認してください。',
    'api.error.noResponse': 'APIから応答がありましたが、生成結果が含まれていませんでした。詳細を確認してください。',
    'api.error.historyLimitExceeded': '履歴が上限({{limit}}件)を超えています。履歴を整理してから生成してください。',

    // Auto-updater
    'updater.confirm': '新しいバージョン v{{version}} が利用可能です。アップデートしますか？',
    'updater.update': 'アップデート',
    'updater.later': '後で',
    'updater.downloading': 'ダウンロード中… {{progress}}%',
    'updater.installing': 'アップデートを適用しています…',
};
