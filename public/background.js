/* global chrome */
chrome.runtime.onInstalled.addListener(() => {
    console.log("Background: Extension installed, creating context menu");

    chrome.contextMenus.create({
        id: "ask-gemini",
        title: "✨ Ask Gemini: \"%s\"",
        contexts: ["selection"],
        visible: true
    });

    console.log("Background: Context menu created");
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "ask-gemini" && info.selectionText) {
        console.log("Background: Context menu clicked with text:", info.selectionText.substring(0, 50) + "...");
        handleAskGemini(info.selectionText.trim());
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Background: Message received:", message.type);

    if (message.type === "ASK_GEMINI") {
        handleAskGemini(message.text);
        sendResponse({ status: "processing" });
        return true;
    }

    if (message.type === "GET_RECENT_TEXTS") {
        chrome.storage.local.get(["recentTexts"], (result) => {
            sendResponse({ recentTexts: result.recentTexts || [] });
        });
        return true;
    }

    if (message.type === "UPDATE_CONTEXT_MENU") {
        updateContextMenuTitle(message.text);
        sendResponse({ status: "updated" });
        return true;
    }
});

function updateContextMenuTitle(selectedText) {
    let title = "✨ Gemini'ye Sor";

    if (selectedText && selectedText.trim().length > 0) {
        const truncatedText = selectedText.length > 30
            ? selectedText.substring(0, 30) + "..."
            : selectedText;
        title = `✨ Ask Gemini: "${truncatedText}"`;
    }

    chrome.contextMenus.update("ask-gemini", {
        title: title
    });
}

async function handleAskGemini(text) {
    if (!text || text.trim().length === 0) {
        console.error("Background: No text provided");
        return;
    }

    console.log("Background: Opening Gemini with text:", text.substring(0, 50) + "...");

    try {
        updateRecentTexts(text);

        const tab = await chrome.tabs.create({
            url: "https://gemini.google.com",
            active: true
        });

        console.log("Background: Tab created with ID:", tab.id);

        await waitForCompleteLoad(tab.id);

        await injectTextToGemini(tab.id, text);

    } catch (error) {
        console.error("Background Error:", error);
    }
}

function waitForCompleteLoad(tabId) {
    return new Promise((resolve, reject) => {
        let timeoutId;

        const onUpdated = (updatedTabId, changeInfo) => {
            if (updatedTabId === tabId && changeInfo.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(onUpdated);
                clearTimeout(timeoutId);

                console.log("Background: Page loaded, waiting for Gemini to initialize...");

                setTimeout(() => {
                    console.log("Background: Gemini should be ready now");
                    resolve();
                }, 2500);
            }
        };

        const onMessage = (message, sender) => {
            if (sender.tab && sender.tab.id === tabId && message.type === 'GEMINI_READY') {
                chrome.runtime.onMessage.removeListener(onMessage);
                clearTimeout(timeoutId);
                console.log("Background: Gemini ready signal received");
                resolve();
            }
        };

        chrome.tabs.onUpdated.addListener(onUpdated);
        chrome.runtime.onMessage.addListener(onMessage);

        timeoutId = setTimeout(() => {
            chrome.tabs.onUpdated.removeListener(onUpdated);
            chrome.runtime.onMessage.removeListener(onMessage);
            console.warn("Background: Timeout waiting for Gemini to load");
            resolve();
        }, 45000);

        chrome.tabs.get(tabId, (tab) => {
            if (tab.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(onUpdated);
                console.log("Background: Tab already complete");
                setTimeout(resolve, 2500);
            }
        });
    });
}

async function injectTextToGemini(tabId, text) {
    try {
        console.log("Background: Attempting to inject text to Gemini...");

        const [result] = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => {
                return {
                    readyState: document.readyState,
                    hasTextarea: !!document.querySelector('textarea'),
                    hasContentEditable: !!document.querySelector('[contenteditable="true"]'),
                    title: document.title
                };
            }
        });

        console.log("Background: Page status:", result.result);

        console.log("Background: Injecting geminiInject.js...");
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: (textToInject) => {
                window._geminiText = textToInject;
            },
            args: [text]
        });

        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['geminiInject.js']
        });

        console.log("Background: geminiInject.js injected successfully");

        setTimeout(async () => {
            try {
                console.log("Background: Trying direct injection as fallback...");
                await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    func: (textToInject) => {
                        const input = document.querySelector('textarea, [contenteditable="true"]');
                        if (input) {
                            console.log("Direct injection: Found input element");
                            if (input.tagName === 'TEXTAREA') {
                                input.value = textToInject;
                            } else {
                                input.textContent = textToInject;
                            }
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                            input.focus();
                            return true;
                        }
                        return false;
                    },
                    args: [text]
                });
            } catch (fallbackError) {
                console.log("Background: Direct injection failed, but geminiInject.js should handle it");
            }
        }, 3000);

    } catch (error) {
        console.error("Background: Injection error:", error);

        try {
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: (textToInject) => {
                    alert(`Ask Gemini: Text copied to clipboard: "${textToInject.substring(0, 100)}..."\n\n`);

                    navigator.clipboard.writeText(textToInject).then(() => {
                        console.log("Text copied to clipboard as fallback");
                    });
                },
                args: [text]
            });
        } catch (alertError) {
            console.error("Background: Alert fallback failed:", alertError);
        }
    }
}

function updateRecentTexts(text) {
    chrome.storage.local.get(["recentTexts"], (result) => {
        const recentTexts = result.recentTexts || [];
        const updated = [text, ...recentTexts.filter(t => t !== text)].slice(0, 10);

        chrome.storage.local.set({ recentTexts: updated }, () => {
            console.log("Background: Recent texts updated");
        });
    });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tab.url && tab.url.includes('gemini.google.com')) {
        console.log(`Gemini tab updated: ${tabId} - ${changeInfo.status} - ${tab.url}`);
    }
});