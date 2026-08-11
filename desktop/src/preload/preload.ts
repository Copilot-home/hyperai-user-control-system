import { contextBridge, ipcRenderer } from 'electron';

// Expose methods to the renderer process
contextBridge.exposeInMainWorld('hyperai', {
    sendMessage: (channel: string, data: any) => {
        ipcRenderer.send(channel, data);
    },
    receiveMessage: (channel: string, func: (data: any) => void) => {
        ipcRenderer.on(channel, (event, ...args) => func(...args));
    },
    invoke: (channel: string, data: any) => {
        return ipcRenderer.invoke(channel, data);
    },
});