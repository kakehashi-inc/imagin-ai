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

    // Model selection
    'model.label': 'Model',

    // Aspect ratio
    'aspectRatio.label': 'Aspect Ratio',
    'aspectRatio.1:1': '1:1 (Square)',
    'aspectRatio.9:16': '9:16 (Portrait)',
    'aspectRatio.16:9': '16:9 (Landscape)',
    'aspectRatio.3:4': '3:4 (Portrait)',
    'aspectRatio.4:3': '4:3 (Landscape)',
    'aspectRatio.2:3': '2:3 (Portrait)',
    'aspectRatio.3:2': '3:2 (Landscape)',
    'aspectRatio.4:5': '4:5 (Portrait)',
    'aspectRatio.5:4': '5:4 (Landscape)',
    'aspectRatio.21:9': '21:9 (Ultra Wide)',

    // Quality
    'quality.label': 'Resolution',
    'quality.1k': '1K (Standard)',
    'quality.2k': '2K (High)',
    'quality.4k': '4K (Ultra)',

    // Number of images
    'numberOfImages.label': 'Number of Images',
    'numberOfImages.warning': 'More images increase API usage.',

    // API key banner
    'apiKeyBanner.message': 'API key is not set. Please configure it in Settings.',

    // Prompt
    'prompt.label': 'Prompt',
    'prompt.placeholder': 'Describe the image you want to generate...',
    'prompt.required': 'Prompt is required',
    'prompt.charCount': '{{count}} characters',

    // Negative prompt
    'negativePrompt.label': 'Negative Prompt',
    'negativePrompt.placeholder': 'text, blurry, low quality, distorted hands',

    // Reference images
    'referenceImages.selectFiles': 'Attach Images',
    'referenceImages.removeTooltip': 'Remove',
    'referenceImages.unsupportedModel': 'This model does not support image input.',

    // Generation
    'generation.generating': 'Generating...',
    'generation.historyLimitExceeded':
        'History limit ({{limit}} entries) exceeded. Please clean up history before generating.',
    'generation.error': 'Generation failed: {{message}}',
    'generation.errorRetry': 'Retry',
    'generation.networkError': 'A network error occurred. Please check your connection and try again.',
    'generation.diskSpaceWarning':
        'Low disk space on history drive. Please free up space or change the history save location.',
    'generation.success': 'Image generated successfully!',

    // History
    'history.title': 'Generation History',
    'history.empty': 'No history yet. Generate your first image!',
    'history.searchPlaceholder': 'Search by prompt...',
    'history.deleteConfirm': 'Are you sure you want to delete this entry? This action cannot be undone.',
    'history.deleteAllConfirm': 'All history will be permanently deleted. This action cannot be undone. Are you sure?',
    'history.exportConfirm': 'Export all history as a ZIP archive?',
    'history.exportSuccess': 'History exported successfully.',
    'history.exportFailed': 'Failed to export history.',
    'history.exporting': 'Exporting history...',
    'history.exportProgress': 'Compressing: {{percent}}%',

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
    'settings.apiKey.label': 'Gemini API Key',
    'settings.apiKey.hintPrefix': 'You can get an API key from ',
    'settings.apiKey.hintPrefixLink': 'Google AI Studio',
    'settings.apiKey.hintPrefixSuffix': '.',
    'settings.apiKey.placeholder': 'Enter your API key',
    'settings.apiKey.test': 'Test Connection',
    'settings.apiKey.testing': 'Testing...',
    'settings.apiKey.valid': 'API key is valid.',
    'settings.apiKey.invalid': 'API key is invalid.',
    'settings.apiKey.saved': 'API key saved.',
    'settings.historyDir': 'History Save Location',
    'settings.historyDir.change': 'Change',
    'settings.historyDir.moveConfirm': 'Move existing history to the new location?',
    'settings.language.ja': 'Japanese',
    'settings.language.en': 'English',

    // Main process - API
    'api.keyNotSet': 'API key is not set.',
    'api.keyValid': 'API key is valid.',
    'api.keyInvalid': 'API key is invalid.',
    'api.encryptionUnavailable': 'Encryption is not available. Cannot store API keys securely.',
    'api.error.quotaExceeded': 'API quota exceeded. Please wait and try again later, or check your billing settings.',
    'api.error.invalidKey': 'Invalid API key. Please check your API key in Settings.',
    'api.error.accessDenied': 'Access denied. Your API key does not have permission for this operation.',
    'api.error.modelNotFound': 'The specified model was not found. It may have been removed or renamed.',
    'api.error.serverError': 'An internal server error occurred. Please try again later.',
    'api.error.serviceUnavailable': 'The service is temporarily unavailable. Please try again later.',
    'api.error.invalidRequest': 'Invalid request: {{detail}}',
    'api.error.invalidRequestGeneric': 'The request was invalid. Please review your parameters and try again.',
    'api.error.paidPlanRequired': 'This model is only available on paid plans. Please upgrade your Google AI account.',

    'api.error.billingRequired': 'Billing or quota issue. Please check your Google AI billing settings.',
    'api.error.noImagesGenerated': 'No images were generated. Please try a different prompt.',
    'api.error.noResponse': 'No response received from the API.',

    // Main process - IPC
    'ipc.historyLimitExceeded':
        'History limit ({{limit}} entries) exceeded. Please clean up history before generating.',
};
