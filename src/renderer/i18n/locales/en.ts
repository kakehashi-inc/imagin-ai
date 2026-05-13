export default {
    appTitle: 'ImaginAI',

    // Common
    'common.generate': 'Generate',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.close': 'Close',
    'common.confirm': 'Confirm',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.ok': 'OK',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.warning': 'Warning',
    'common.search': 'Search',
    'common.loading': 'Loading...',
    'common.settings': 'Settings',
    'common.back': 'Back',

    // Providers (user-facing names — code uses 'gemini' / 'openai' internally)
    'provider.gemini': 'Google AI Studio',
    'provider.openai': 'OpenAI',

    // Notices dialog
    'notices.button.label': 'Usage notes',
    'notices.button.tooltip': 'Usage notes',
    'notices.dialog.title': 'Usage Notes',
    'notices.dialog.close': 'Close',
    'notices.gemini.title': 'Google AI Studio',
    'notices.gemini.precautions.title': 'Free tier and commercial use',
    'notices.gemini.precautions.items': [
        "Input data and generated results may be used to improve Google's models and may be reviewed by humans.",
        'Usage data is processed in a non-personally-identifiable form, but avoid entering confidential or highly sensitive data.',
        'Providing AI-generated content to users while claiming it was "created by a human" is prohibited.',
        'When publishing an app in the European Economic Area (EEA), Switzerland, or the United Kingdom, the Paid Tier is required.',
        'You must clearly disclose that generated content is AI-produced so that users do not misidentify it.',
        'You must not intentionally remove or tamper with digital watermarks (such as SynthID) embedded in AI-generated content.',
    ],
    'notices.gemini.recommendations.title': 'Recommendations',
    'notices.gemini.recommendations.items': [
        'When handling customer data or privacy-sensitive information, subscribe to the Paid Tier (data is not used for training).',
        'Use the free tier for prototyping and processing of public information, and switch to the Paid Tier for production releases.',
        'To avoid disputes with users, include a disclaimer stating that the content is AI-generated and that accuracy is not guaranteed.',
    ],
    'notices.openai.title': 'OpenAI',
    'notices.openai.precautions.title': 'Standard API usage and commercial use',
    'notices.openai.precautions.items': [
        'On the Standard API, input prompts and generated outputs are not used to train OpenAI models by default (March 2023 policy change). Customer Content is used only to provide the Service, comply with applicable law, and enforce OpenAI policies.',
        'For abuse monitoring, API inputs and outputs may be retained server-side for up to 30 days unless a Zero Data Retention (ZDR) contract is in place. Avoid entering confidential or highly sensitive data because the data passes through and may be temporarily retained by OpenAI servers.',
        'Per the OpenAI Sharing & Publication Policy, you must not represent API-generated content as wholly created by a human, and you must clearly disclose AI involvement when you publish.',
        'A human must take ultimate responsibility for any content you publish that includes API-generated output (review, edit, and accept responsibility for accuracy).',
        'Per the OpenAI Usage Policies, the API will refuse requests that violate the content policy (e.g. sexual content involving minors, content that promotes violence or illegal activity, election interference, etc.).',
    ],
    'notices.openai.recommendations.title': 'Recommendations',
    'notices.openai.recommendations.items': [
        'When handling customer data or privacy-sensitive information, review the latest OpenAI Data Usage policy and contract terms before sending it through the API. Consider applying for a Zero Data Retention (ZDR) arrangement if your workload requires it.',
        'You own the output you generate (OpenAI assigns its rights in Output to you), but similar outputs may be produced for other customers — do not assume the output is unique.',
        'To avoid disputes with users, include a disclaimer stating that the content is AI-generated and that accuracy is not guaranteed.',
    ],

    // Title bar
    'titleBar.apiKey.default': 'Default',
    'titleBar.apiKey.freeTier': 'Free tier',
    'titleBar.apiKey.untitled': '(untitled)',
    'titleBar.apiKey.freeTierBadge': 'Free',
    'titleBar.apiKey.noKey': '(empty)',
    'titleBar.apiKey.group.gemini': 'Google AI Studio',
    'titleBar.apiKey.group.openai': 'OpenAI',

    // Model selection
    'model.label': 'Model',
    'model.freeTierUnavailable': 'No free tier',
    'gemini.model.note.lyriaClip': 'Fixed 30-second clip',
    'gemini.model.note.lyriaPro': 'Up to 3 min (specify duration in prompt)',
    'gemini.model.note.imagenShutdown': 'Shutdown: 2026/6/24',
    'gemini.model.note.nanoBananaShutdown': 'Shutdown: 2026/10/2',
    'gemini.model.freeTier.ttsFlash':
        'Free tier:\n3 RPM / 10K TPM\nUp to 3 requests/min, ~6 minutes of audio per minute total',

    // Gemini TTS style / voice
    'gemini.tts.style.label': 'Style',
    'gemini.tts.style.instructionLabel': 'Style instruction (English)',
    'gemini.tts.style.custom': 'Custom',
    'gemini.tts.style.presets': [
        {
            name: 'Enthusiastic',
            effect: 'Crisp high-pitched, energetic delivery',
            instruction: 'Enthusiastic, upbeat, and energetic',
        },
        {
            name: 'Calm & professional',
            effect: 'Lower tone, stable and persuasive',
            instruction: 'Calm, professional, and authoritative',
        },
        {
            name: 'Apologetic',
            effect: 'Reserved and polite, sounding sincerely sorry',
            instruction: 'Apologetic, sincere, and humble',
        },
        {
            name: 'Soft whisper',
            effect: 'Airy, gentle voice like sharing a secret',
            instruction: 'Soft, gentle, and whispering tone',
        },
        {
            name: 'Urgent',
            effect: 'Very fast, breathless, high tension',
            instruction: 'Urgent, breathless, and rapid-fire',
        },
        {
            name: 'Cold & flat',
            effect: 'Completely emotionless, mechanical tone',
            instruction: 'Cold, flat, and emotionless',
        },
        { name: 'Sarcastic', effect: 'Distinctive mocking intonation', instruction: 'Sarcastic and slightly arrogant' },
        {
            name: 'Storytelling',
            effect: 'Strong dynamic inflection matching scenes',
            instruction: 'Dramatic, expressive, and storytelling',
        },
        { name: 'Sleepy', effect: 'Extremely slow, soothing voice', instruction: 'Sleepy, soothing, and very gentle' },
    ],
    'gemini.tts.voice.label': 'Voice',
    'gemini.tts.voice.presets': [
        { name: 'Aoede', gender: 'Female', characteristic: 'Fresh, neutral' },
        { name: 'Charon', gender: 'Male', characteristic: 'Sincere, informative' },
        { name: 'Kore', gender: 'Female', characteristic: 'Strong, decisive' },
        { name: 'Puck', gender: 'Male', characteristic: 'Bright, cheerful' },
        { name: 'Fenrir', gender: 'Male', characteristic: 'Excited, powerful' },
        { name: 'Zephyr', gender: 'Female', characteristic: 'Bright, lively' },
        { name: 'Leda', gender: 'Female', characteristic: 'Youthful, light' },
        { name: 'Orus', gender: 'Male', characteristic: 'Solid, dependable' },
        { name: 'Callirrhoe', gender: 'Female', characteristic: 'Casual, relaxed' },
        { name: 'Autonoe', gender: 'Female', characteristic: 'Bright, spirited' },
        { name: 'Enceladus', gender: 'Male', characteristic: 'Whispery, breathy' },
        { name: 'Iapetus', gender: 'Male', characteristic: 'Clear, crisp' },
        { name: 'Umbriel', gender: 'Male', characteristic: 'Relaxed, natural' },
        { name: 'Erinome', gender: 'Female', characteristic: 'Clear, quiet' },
        { name: 'Despina', gender: 'Female', characteristic: 'Smooth, fluent' },
        { name: 'Algieba', gender: 'Male', characteristic: 'Smooth, composed' },
        { name: 'Algenib', gender: 'Male', characteristic: 'Mature, slightly husky' },
        { name: 'Rasalgethi', gender: 'Male', characteristic: 'Intelligent, composed' },
        { name: 'Laomedeia', gender: 'Female', characteristic: 'Positive, active' },
        { name: 'Achernar', gender: 'Female', characteristic: 'Soft, gentle' },
        { name: 'Alnilam', gender: 'Male', characteristic: 'Resolute, strong' },
        { name: 'Schedar', gender: 'Male', characteristic: 'Calm, flat' },
        { name: 'Gacrux', gender: 'Female', characteristic: 'Mature, deep' },
        { name: 'Pulcherrima', gender: 'Female', characteristic: 'Clear, articulate' },
        { name: 'Achird', gender: 'Male', characteristic: 'Friendly, approachable' },
        { name: 'Zubenelgenubi', gender: 'Male', characteristic: 'Casual, everyday' },
        { name: 'Vindemiatrix', gender: 'Female', characteristic: 'Gentle, kind' },
        { name: 'Sadachbia', gender: 'Male', characteristic: 'Vivid, lively' },
        { name: 'Sadaltager', gender: 'Male', characteristic: 'Knowledgeable, composed' },
        { name: 'Sulafat', gender: 'Female', characteristic: 'Warm, embracing' },
    ],

    // Audio Tags dialog
    'audioTags.button.label': 'Audio Tags reference',
    'audioTags.button.tooltip': 'Show the Audio Tags reference',

    // Audio player window
    'audioPlayer.section.spokenText': 'Read-aloud text',
    'audioPlayer.section.apiText': 'Text returned by the API',
    'audioTags.dialog.title': 'Audio Tags reference',
    'audioTags.dialog.close': 'Close',
    'audioTags.dialog.description':
        'Tags embedded in the prompt that control speech delivery. Supported only by Gemini 3.1 Flash TTS.',
    'audioTags.section.expressions.title': 'Expressions',
    'audioTags.section.expressions.items': [
        { tag: '[laughing]', desc: 'Inserts natural laughter or blends laughter into the tone.' },
        { tag: '[sigh]', desc: 'Inserts a deep sigh that expresses disappointment or relief.' },
        { tag: '[uhm]', desc: 'Inserts a natural filler word (e.g., "um", "uh").' },
        { tag: '[whispering]', desc: 'Switches to a whispered voice with reduced volume and more breath.' },
        { tag: '[shouting]', desc: 'Switches to a louder, shouting-like delivery.' },
    ],
    'audioTags.section.prosody.title': 'Prosody',
    'audioTags.section.prosody.items': [
        { tag: '[extremely fast] / [extremely slow]', desc: 'Speaks the marked segment very quickly or very slowly.' },
        { tag: '[pitch:high] / [pitch:low]', desc: 'Temporarily raises or lowers the pitch of the voice.' },
    ],
    'audioTags.section.pause.title': 'Pause',
    'audioTags.section.pause.items': [
        { tag: '[short pause]', desc: 'Inserts a natural ~0.2-0.5 sec pause.' },
        { tag: '[medium pause]', desc: 'Inserts a clear ~1 sec pause as a sentence break.' },
        { tag: '[long pause]', desc: 'Inserts a 2+ sec dramatic pause before scene changes or key moments.' },
    ],

    // Gemini aspect ratio
    'gemini.aspectRatio.label': 'Aspect Ratio',
    'gemini.aspectRatio.group.square': 'Square',
    'gemini.aspectRatio.group.landscape': 'Landscape',
    'gemini.aspectRatio.group.portrait': 'Portrait',
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
    'gemini.quality.label': 'Resolution',
    'gemini.quality.512px': '512px',
    'gemini.quality.1k': '1K (Standard)',
    'gemini.quality.2k': '2K (High)',
    'gemini.quality.4k': '4K (Ultra)',

    // Gemini Duration (video)
    'gemini.duration.label': 'Duration',
    'gemini.duration.4s': '4 seconds',
    'gemini.duration.6s': '6 seconds',
    'gemini.duration.8s': '8 seconds',

    // Gemini Resolution (video)
    'gemini.resolution.label': 'Video Resolution',
    'gemini.resolution.720p': '720p (HD)',
    'gemini.resolution.1080p': '1080p (Full HD)',
    'gemini.resolution.4k': '4K (Ultra HD)',

    // OpenAI parameters
    'openai.parameter.size.label': 'Size',
    'openai.parameter.quality.label': 'Quality',
    'openai.parameter.outputFormat.label': 'Output format',
    'openai.parameter.background.label': 'Background',
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
    'openai.background.opaque': 'Opaque',
    'openai.background.transparent': 'Transparent',

    // Image edit mode (shared toggle, both providers)
    'parameter.editMode.label': 'Image Edit Mode',

    // Number of images/videos
    'numberOfImages.label': 'Number of Images',
    'numberOfImages.warning': 'More images increase API usage.',
    'numberOfVideos.label': 'Number of Videos',
    'numberOfVideos.warning': 'More videos increase API usage and generation time.',

    // API key banner
    'apiKeyBanner.message': 'API key is not set. Please configure it in Settings.',

    // Prompt
    'prompt.label': 'Prompt',
    'prompt.labelTts': 'Text to read aloud',
    'prompt.placeholder': 'Describe the image you want to generate...',
    'prompt.placeholderMusic':
        'Describe the music you want to create (genre, mood, instruments, BPM, etc.). Include lyrics instructions to generate vocals.',
    'prompt.placeholderTts': 'Enter the text you want read aloud.',
    'prompt.required': 'Prompt is required',
    'prompt.charCount': '{{count}} characters',
    'prompt.startingFrame': 'Starting frame (video uses 1 image)',

    // Negative prompt
    'negativePrompt.label': 'Negative Prompt',
    'negativePrompt.placeholder': 'text, blurry, low quality, distorted hands',

    // Reference images
    'referenceImages.selectFiles': 'Attach Images',
    'referenceImages.removeTooltip': 'Remove',
    'referenceImages.unsupportedModel': 'This model does not support image input.',

    // Generation
    'common.generateVideo': 'Generate Video',
    'common.generateMusic': 'Generate Music',
    'common.generateSpeech': 'Generate Speech',
    'generation.generating': 'Generating...',
    'generation.generatingVideo': 'Generating video...',
    'generation.generatingMusic': 'Generating music...',
    'generation.generatingSpeech': 'Generating speech...',
    'generation.generatingVideoProgress': 'Generating video... ({{elapsed}}s)',
    'generation.videoDurationConstraint': '1080p/4K resolution requires a duration of 8 seconds.',
    'generation.historyLimitExceeded':
        'History limit ({{limit}} entries) exceeded. Please clean up history before generating.',
    'generation.error': 'Generation failed: {{message}}',
    'generation.errorRetry': 'Retry',
    'generation.errorDetails': 'Details',
    'generation.errorHideDetails': 'Hide',
    'generation.networkError': 'A network error occurred. Please check your connection and try again.',
    'generation.diskSpaceWarning':
        'Low disk space on history drive. Please free up space or change the history save location.',
    'generation.success': 'Image generated successfully!',
    'generation.freeTierBlocked':
        'The selected model is not available on the free tier. Switch to a non-free-tier API key or choose a different model.',

    // History
    'history.title': 'Generation History',
    'history.empty': 'No entries found.',
    'history.allModels': 'All Models',
    'history.searchPlaceholder': 'Search by prompt...',
    'history.deleteConfirm': 'Are you sure you want to delete this entry? This action cannot be undone.',
    'history.deleteAllConfirm': 'All history will be permanently deleted. This action cannot be undone. Are you sure?',
    'history.exportConfirm': 'Export all history as a ZIP archive?',
    'history.exportSuccess': 'History exported successfully.',
    'history.exportFailed': 'Failed to export history.',
    'history.exporting': 'Exporting history...',
    'history.exportProgress': 'Compressing: {{percent}}%',
    'history.editBadge': 'Edit',
    'history.filter.all': 'All',
    'history.filter.allProviders': 'All providers',
    'history.filter.allMediaTypes': 'All media types',
    'history.filter.mediaType.image': 'Image',
    'history.filter.mediaType.video': 'Video',
    'history.filter.mediaType.music': 'Music',
    'history.filter.mediaType.voice': 'Voice',

    // Context menu
    'contextMenu.addToPrompt': 'Add to Prompt',
    'contextMenu.saveAs': 'Save As...',
    'contextMenu.restoreParams': 'Restore Parameters',
    'contextMenu.delete': 'Delete',

    // History menu
    'historyMenu.exportAll': 'Export All',
    'historyMenu.deleteAll': 'Delete All',

    // Settings
    'settings.title': 'Settings',
    'settings.language': 'Language',
    'settings.theme': 'Theme',
    'settings.theme.light': 'Light',
    'settings.theme.dark': 'Dark',
    'settings.theme.system': 'System',
    'settings.apiKey': 'API Key',
    'settings.apiKey.label': 'API Keys',
    'settings.apiKey.gemini.title': 'Google AI Studio API Keys',
    'settings.apiKey.openai.title': 'OpenAI API Keys',
    'settings.apiKey.hintPrefix': 'You can get a Gemini API key from ',
    'settings.apiKey.hintGeminiLink': 'Google AI Studio',
    'settings.apiKey.hintMiddle': ' and an OpenAI API key from ',
    'settings.apiKey.hintOpenaiLink': 'OpenAI Platform',
    'settings.apiKey.hintSuffix': '.',
    'settings.apiKey.hintTierRequirement':
        'Gemini: Default / custom (non-free-tier) keys must be on billing tier 1 or higher. Free-tier keys may only be used with models that offer free tier access. OpenAI: usage is metered per request — no free-tier flag applies.',
    'settings.apiKey.placeholder': 'Enter your API key',
    'settings.apiKey.default.title': 'Default key',
    'settings.apiKey.default.label': 'API key',
    'settings.apiKey.freeTier.title': 'Free-tier key',
    'settings.apiKey.freeTier.label': 'API key (free tier)',
    'settings.apiKey.customs.title': 'Custom keys ({{count}} / {{max}})',
    'settings.apiKey.customs.add': 'Add',
    'settings.apiKey.customs.titleLabel': 'Title',
    'settings.apiKey.customs.remove': 'Remove',
    'settings.apiKey.customs.isFreeTier': 'Treat as free-tier key',
    'settings.apiKey.customs.titleRequired': 'Title is required.',
    'settings.apiKey.customs.keyRequired': 'API key is required.',
    'settings.apiKey.customs.validationError': 'Custom keys require both a title and an API key.',
    'settings.apiKey.isFreeTierShort': 'Free tier',
    'settings.apiKey.saveAll': 'Save API keys',
    'settings.apiKey.test': 'Test Connection',
    'settings.apiKey.testing': 'Testing...',
    'settings.apiKey.valid': 'API key is valid.',
    'settings.apiKey.invalid': 'API key is invalid.',
    'settings.apiKey.notSet': 'API key is not set.',
    'settings.apiKey.testError': 'Failed to test the API key. Please try again.',
    'settings.apiKey.encryptionUnavailable': 'Encryption is not available. Cannot store API keys securely.',
    'settings.apiKey.saved': 'API key saved.',
    'settings.historyDir': 'History Save Location',
    'settings.historyDir.change': 'Change',
    'settings.historyDir.moveConfirm': 'Move existing history to the new location?',
    'settings.language.ja': 'Japanese',
    'settings.language.en': 'English',

    // API key status
    'api.keyNotSet': 'API key is not set.',
    'api.keyValid': 'API key is valid.',
    'api.keyInvalid': 'API key is invalid.',
    'api.encryptionUnavailable': 'Encryption is not available. Cannot store API keys securely.',

    // API errors - mapped from gRPC status codes
    'api.error.invalidArgument': 'The request is invalid. Please review your parameters.',
    'api.error.failedPrecondition':
        'This feature is not available in the current state. A paid plan or additional configuration may be required.',
    'api.error.outOfRange': 'A parameter value is out of the valid range. Please review your settings.',
    'api.error.unauthenticated': 'Invalid or missing API key. Please check your API key in Settings.',
    'api.error.permissionDenied':
        'Access denied. Your API key may lack permissions, or this model may not be available on your plan.',
    'api.error.notFound': 'The specified model was not found. It may have been removed or renamed.',
    'api.error.alreadyExists': 'A resource conflict occurred. Please try again.',
    'api.error.resourceExhausted':
        'API quota or rate limit exceeded. Please wait and try again later, or check your billing settings.',
    'api.error.cancelled': 'The request was cancelled.',
    'api.error.internal': 'An internal server error occurred. Please try again later.',
    'api.error.unimplemented': 'This feature is not supported by the selected model.',
    'api.error.unavailable': 'The service is temporarily unavailable due to high demand. Please try again later.',
    'api.error.deadlineExceeded': 'The request timed out on the server. Please try again.',
    'api.error.payloadTooLarge': 'The request data is too large. Please reduce the input size.',
    'api.error.unknown': 'An unexpected error occurred. Please try again.',

    // Application-level errors
    'api.error.keyNotSet': 'API key is not set. Please configure it in Settings.',
    'api.error.noImagesGenerated': 'No images were produced. See details for the reason.',
    'api.error.noVideoGenerated': 'No video was produced. See details for the reason.',
    'api.error.noMusicGenerated': 'No music was produced. See details for the reason.',
    'api.error.noVoiceGenerated': 'No speech was produced. See details for the reason.',
    'api.error.noResponse': 'The API responded but did not include a generation result. See details for the reason.',
    'api.error.historyLimitExceeded':
        'History limit ({{limit}} entries) exceeded. Please clean up history before generating.',

    // Auto-updater
    'updater.confirm': 'A new version v{{version}} is available. Update now?',
    'updater.update': 'Update',
    'updater.later': 'Later',
    'updater.downloading': 'Downloading... {{progress}}%',
    'updater.installing': 'Applying update...',
};
