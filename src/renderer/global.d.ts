import type { IpcApi } from '@shared/ipc';

declare global {
    interface Window {
        imaginai: IpcApi;
    }

    // Electron adds `path` property to File objects from drag-and-drop
    interface File {
        readonly path: string;
    }
}
