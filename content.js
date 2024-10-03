let chatObserver;
let chatIntervalId = null;
let translatedMessagesMap = new Map();

// Function to initialize the MutationObserver
const getChatContainer = () => {
    return document.getElementById("main"); 
};

// Function to send the message for translation
const translateMessage = async (messageText, messageNode, isRetranslation = false) => {
    chrome.storage.sync.get(['preferredLanguage'], async (result) => {
        const preferredLanguage = result.preferredLanguage || 'hi'; 

        console.log('Preferred language fetched:', preferredLanguage); 
        try {
            const res = await fetch("http://localhost:5000/translate", {
                method: "POST",
                body: JSON.stringify({
                    q: messageText,
                    source: "auto",
                    target: preferredLanguage, 
                    format: "text",
                    alternatives: 3,
                    api_key: "" 
                }),
                headers: { "Content-Type": "application/json" }
            });

            const translatedData = await res.json();
            const translatedText = translatedData.translatedText; 
            console.log('Translated message:', translatedText); 

            if (!isRetranslation) {
                translatedMessagesMap.set(messageNode, messageText); 
            }

            appendTranslatedMessage(messageNode, translatedText);

        } catch (error) {
            console.error('Error translating message:', error);
        }
    });
};

// Function to append the translated message to the DOM
const appendTranslatedMessage = (messageNode, translatedText) => {
    let translatedMessageElement = messageNode.querySelector('.translated-message'); 
    if (!translatedMessageElement) {
        translatedMessageElement = document.createElement('div');
        translatedMessageElement.classList.add('translated-message');
        translatedMessageElement.style.color = 'blue'; 
        translatedMessageElement.style.marginTop = '5px';
        messageNode.appendChild(translatedMessageElement); 
    }

    translatedMessageElement.innerText = `Translated: ${translatedText}`; 
};

// Function to handle new messages
const handleNewMessages = (mutations) => {
    mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
            const newMessages = mutation.addedNodes;

            newMessages.forEach(messageNode => {
                if (messageNode.nodeType === 1) { 
                    const messageTextSpan = messageNode.querySelector('span._ao3e.selectable-text.copyable-text');
                    
                    if (messageTextSpan) {
                        const messageText = messageTextSpan.innerText;
                        console.log('New message detected:', messageText); 
                        translateMessage(messageText, messageNode);
                    }
                }
            });
        }
    });
};

// Function to fetch all existing messages
const fetchAllMessages = () => {
    const messages = document.querySelectorAll('div.message-in, div.message-out'); 
    messages.forEach(messageNode => {
        const messageTextSpan = messageNode.querySelector('span._ao3e.selectable-text.copyable-text');
        if (messageTextSpan) {
            const messageText = messageTextSpan.innerText;
            console.log('Existing message detected:', messageText);

            translateMessage(messageText, messageNode);
        }
    });
};

// Function to retranslate all previously translated messages
const retranslateAllMessages = () => {
    translatedMessagesMap.forEach((originalMessageText, messageNode) => {
        translateMessage(originalMessageText, messageNode, true); 
    });
};

// Listen for changes in Chrome storage (preferred language)
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.preferredLanguage) {
        console.log('Preferred language updated:', changes.preferredLanguage.newValue);
        retranslateAllMessages(); 
    }
});

// Function to append Translate Icon to the footer
const appendTranslateIconToFooter = () => {
    try {
        const footerInterval = setInterval(() => {
            const footer = document.querySelector('footer'); 
            const targetDiv = footer ? footer.querySelector('div.x1n2onr6.xhtitgo.x9f619.x78zum5.x1q0g3np.xuk3077.x193iq5w.x122xwht.x1bmpntp.xy80clv.xgkeump.x26u7qi.xs9asl8.x1swvt13.x1pi30zi.xnpuxes.copyable-area') : null;
    
            if (targetDiv && !targetDiv.querySelector('.translate-icon')) {
                const translateIcon = document.createElement('img');
                translateIcon.src = chrome.runtime.getURL('translate.png'); 
                translateIcon.className = 'translate-icon'; 
                translateIcon.style.width = '24px';
                translateIcon.style.height = '24px';
                translateIcon.style.cursor = 'pointer';
                translateIcon.style.margin = '10px';
    
                targetDiv.appendChild(translateIcon);
    
                translateIcon.addEventListener('click', async () => {
                    console.log('Translate icon clicked!');
                    const messageContainer = document.querySelector('div[contenteditable="true"][data-tab="10"]');
                
                    if (messageContainer) {
                        const messageSpan = messageContainer.querySelector('span.selectable-text.copyable-text');
                
                        if (messageSpan) {
                            const messageText = messageSpan.innerText; 
                            console.log('Message to translate:', messageText);
                
                            if (messageText) {
                                chrome.storage.sync.get(['preferredLanguage'], async (result) => {
                                    const preferredLanguage = result.preferredLanguage || 'hi'; // Default to 'hi' if no language is stored
                
                                    console.log('Preferred language fetched:', preferredLanguage); 
                
                                    const res = await fetch("http://localhost:5000/translate", {
                                        method: "POST",
                                        body: JSON.stringify({
                                            q: messageText, 
                                            source: "auto", 
                                            target: preferredLanguage, 
                                            format: "text",
                                            alternatives: 3,
                                            api_key: ""     
                                        }),
                                        headers: { "Content-Type": "application/json" }
                                    });
                
                                    const translatedData = await res.json();
                                    const translatedText = translatedData.translatedText;
                
                                    if (translatedText) {
                                        messageSpan.innerText = translatedText;
                                        console.log('Replaced with translated text:', translatedText);
            
                                        messageContainer.focus();
                                    } else {
                                        console.error('Failed to fetch translated text.');
                                    }
                                });
                            } else {
                                console.log('No text to translate.');
                            }
                        } else {
                            console.error('No text span found within the input container.');
                        }
                    } else {
                        console.error('No message input container found for translation.');
                    }
                });
                
                
                clearInterval(footerInterval); // Stop retrying once the icon is added
                console.log('Translate icon added to the footer.');
            }
        }, 1000); 
    } catch (error) {
        console.error('Error appending translate icon to footer:', error);
    }
};


// Function to initialize the chat observer when a listitem is clicked
const initializeChatObserver = () => {
    let chatContainer = getChatContainer();

    if (chatIntervalId) clearInterval(chatIntervalId); 

    // Check if the chat container is not found and retry every second
    chatIntervalId = setInterval(() => {
        chatContainer = getChatContainer();
        if (chatContainer) {
            clearInterval(chatIntervalId); 
            console.log('Chat container found:', chatContainer);

            appendTranslateIconToFooter();

            fetchAllMessages();

            if (chatObserver) chatObserver.disconnect();

            // Set up MutationObserver to watch for changes
            chatObserver = new MutationObserver(handleNewMessages);
            chatObserver.observe(chatContainer, { childList: true, subtree: true }); 

        } else {
            console.log('Chat container not found. Retrying...');
        }
    }, 1000);
};

// Function to set up listitem click listeners
const setupListItemListeners = () => {
    const listItems = document.querySelectorAll('[role="listitem"]');
    if (listItems.length > 0) {
        listItems.forEach(listItem => {
            listItem.addEventListener('click', () => {
                console.log('List item clicked:', listItem); 
                
                initializeChatObserver(); // Call the function when a list item is clicked
            });
        });
        console.log('List items found and event listeners added.');
        return true; 
    }
    console.log('No list items found yet.');
    return false; 
};

// Check if the listitems are not found and retry every second
const listItemIntervalId = setInterval(() => {
    const listItemsAdded = setupListItemListeners();
    if (listItemsAdded) {
        clearInterval(listItemIntervalId); // Stop the interval once the listitems are found and listeners are added
    }
}, 1000);
