/* global chrome */
document.addEventListener('selectionchange', () => {
    const selection = window.getSelection();

    if (selection.type === 'Range') {
        const text = selection.toString().trim();

        if (text && text.length >= 2) {
            chrome.runtime.sendMessage({
                type: 'UPDATE_CONTEXT_MENU',
                text: text
            });
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    console.log("Content Script: Initialized");

    document.addEventListener('contextmenu', (event) => {
        const selection = window.getSelection().toString().trim();
        if (selection && selection.length >= 2) {
            chrome.runtime.sendMessage({
                type: 'SELECTION_MADE',
                text: selection,
                x: event.clientX,
                y: event.clientY
            });
        }
    }, true);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_SELECTION') {
        const selection = window.getSelection().toString().trim();
        sendResponse({ selection: selection || '' });
        return true;
    }
});