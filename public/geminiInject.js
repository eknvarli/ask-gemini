(function (text) {
    'use strict';

    console.log('🔍 Gemini Inject: Starting injection with text:', text ? text.substring(0, 50) + '...' : 'No text');

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        console.error('❌ Gemini Inject: Invalid text provided');
        return;
    }

    const cleanText = text.trim();
    console.log('✅ Gemini Inject: Clean text ready:', cleanText.substring(0, 100) + '...');

    const strategies = [
        () => {
            console.log('🔍 Trying Strategy 1: New Gemini UI');
            const input = document.querySelector('textarea[placeholder*="Enter a prompt here"], textarea[placeholder*="Prompt"], textarea[aria-label*="prompt"]');
            if (input) {
                console.log('✅ Found input with Strategy 1');
                input.value = cleanText;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.focus();
                return true;
            }
            return false;
        },

        () => {
            console.log('🔍 Trying Strategy 2: Contenteditable div');
            const editable = document.querySelector('div[contenteditable="true"], [contenteditable="true"]');
            if (editable) {
                console.log('✅ Found editable div with Strategy 2');
                editable.textContent = cleanText;
                editable.dispatchEvent(new Event('input', { bubbles: true }));
                editable.focus();
                return true;
            }
            return false;
        },

        () => {
            console.log('🔍 Trying Strategy 3: Rich text editor');
            const editor = document.querySelector('.ql-editor, .ProseMirror, .editor-container');
            if (editor) {
                console.log('✅ Found editor with Strategy 3');
                editor.textContent = cleanText;
                editor.dispatchEvent(new Event('input', { bubbles: true }));
                editor.focus();
                return true;
            }
            return false;
        },

        () => {
            console.log('🔍 Trying Strategy 4: Data attributes');
            const inputs = document.querySelectorAll('textarea, input[type="text"]');
            for (const input of inputs) {
                const attrs = input.getAttributeNames();
                if (attrs.some(attr =>
                    attr.includes('prompt') ||
                    attr.includes('message') ||
                    attr.includes('input')
                )) {
                    console.log('✅ Found input with data attributes');
                    input.value = cleanText;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.focus();
                    return true;
                }
            }
            return false;
        },

        () => {
            console.log('🔍 Trying Strategy 5: First textarea');
            const textarea = document.querySelector('textarea');
            if (textarea) {
                console.log('✅ Found textarea with Strategy 5');
                textarea.value = cleanText;
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                textarea.focus();
                return true;
            }
            return false;
        },

        () => {
            console.log('🔍 Trying Strategy 6: Via send button');
            const sendButtons = document.querySelectorAll('button, [role="button"]');
            for (const button of sendButtons) {
                const ariaLabel = button.getAttribute('aria-label') || '';
                const innerText = button.textContent || '';
                if (ariaLabel.toLowerCase().includes('send') ||
                    ariaLabel.toLowerCase().includes('submit') ||
                    innerText.toLowerCase().includes('send') ||
                    button.innerHTML.includes('send-icon') ||
                    button.querySelector('svg')) {

                    const form = button.closest('form');
                    const container = button.closest('div, form, section');
                    const inputs = container ? container.querySelectorAll('textarea, input, [contenteditable="true"]') : [];

                    for (const input of inputs) {
                        console.log('✅ Found input near send button');
                        if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
                            input.value = cleanText;
                        } else {
                            input.textContent = cleanText;
                        }
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.focus();
                        return true;
                    }
                }
            }
            return false;
        }
    ];

    function attemptInjection() {
        console.log('🎯 Attempting injection strategies...');

        for (let i = 0; i < strategies.length; i++) {
            console.log(`🔄 Trying strategy ${i + 1}/${strategies.length}`);
            const success = strategies[i]();
            if (success) {
                console.log('🎉 SUCCESS: Text injected successfully!');

                setTimeout(() => {
                    attemptToSend();
                }, 800);

                return true;
            }
        }

        console.log('❌ All strategies failed');
        return false;
    }

    function attemptToSend() {
        console.log('📤 Attempting to send message...');

        const sendSelectors = [
            'button[aria-label*="send"]',
            'button[aria-label*="Send"]',
            'button svg[aria-label*="send"]',
            'button[type="submit"]',
            'button:has(svg)',
            'button[data-testid*="send"]',
            'button:contains("Send")',
            'button:contains("Gönder")'
        ];

        for (const selector of sendSelectors) {
            try {
                const buttons = document.querySelectorAll('button');
                for (const button of buttons) {
                    const ariaLabel = button.getAttribute('aria-label') || '';
                    const innerText = button.textContent || '';

                    if (ariaLabel.toLowerCase().includes('send') ||
                        innerText.toLowerCase().includes('send') ||
                        button.innerHTML.includes('send') ||
                        button.querySelector('svg[aria-label*="send"]')) {

                        console.log('✅ Found send button:', button);

                        setTimeout(() => {
                            button.click();
                            console.log('🚀 Send button clicked!');
                        }, 1000);

                        return true;
                    }
                }
            } catch (e) {
                console.log('⚠️ Error with selector:', selector, e);
            }
        }

        console.log('⌨️ Trying Enter key...');
        setTimeout(() => {
            const activeElement = document.activeElement;
            if (activeElement) {
                const enterEvent = new KeyboardEvent('keydown', {
                    key: 'Enter',
                    code: 'Enter',
                    keyCode: 13,
                    bubbles: true
                });
                activeElement.dispatchEvent(enterEvent);
                console.log('✅ Enter key simulated');
            }
        }, 1200);

        return false;
    }

    function startInjection() {
        console.log('🚀 Starting injection process...');

        let success = attemptInjection();

        if (!success) {
            console.log('👀 Setting up MutationObserver...');

            const observer = new MutationObserver((mutations) => {
                console.log('🔍 DOM changed, retrying injection...');
                success = attemptInjection();
                if (success) {
                    observer.disconnect();
                    console.log('✅ Observer disconnected (success)');
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true
            });

            setTimeout(() => {
                observer.disconnect();
                console.log('⏰ Observer disconnected (timeout)');
            }, 10000);
        }

        setTimeout(() => {
            if (!success) {
                console.log('🔄 Retrying injection after delay...');
                attemptInjection();
            }
        }, 3000);
    }

    if (document.readyState === 'loading') {
        console.log('📄 Waiting for DOM to load...');
        document.addEventListener('DOMContentLoaded', startInjection);
    } else {
        console.log('📄 DOM already loaded, starting injection...');
        startInjection();
    }

    window.injectToGemini = function (newText) {
        console.log('🔄 Manual injection triggered');
        const strategiesCopy = [...strategies];
        for (const strategy of strategiesCopy) {
            if (strategy(newText || cleanText)) {
                return true;
            }
        }
        return false;
    };

    console.log('🏁 Gemini Inject script loaded successfully');

})(arguments[0]);