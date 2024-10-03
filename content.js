// Global variables for observers and intervals
let chatObserver;
let chatIntervalId = null;
let currentLanguage = null; // To track the current preferred language

// Function to initialize the MutationObserver
const getChatContainer = () => {
  return document.getElementById("main"); // Return the main chat container or null if not found
};

// Function to fetch the footer and append the translate icon
const appendTranslateIconToFooter = () => {
  try {
    const footer = document.querySelector("footer"); // Fetch the footer where the message input is
    const targetDiv = footer
      ? footer.querySelector(
          "div.x1n2onr6.xhtitgo.x9f619.x78zum5.x1q0g3np.xuk3077.x193iq5w.x122xwht.x1bmpntp.xy80clv.xgkeump.x26u7qi.xs9asl8.x1swvt13.x1pi30zi.xnpuxes.copyable-area"
        )
      : null;

    if (targetDiv && !targetDiv.querySelector(".translate-icon")) {
      // Only add if it doesn't exist already
      const translateIcon = document.createElement("img");
      translateIcon.src = chrome.runtime.getURL("translate.png"); // Access translate.png from web_accessible_resources
      translateIcon.className = "translate-icon"; // Add a class for easier styling if needed
      translateIcon.style.width = "24px";
      translateIcon.style.height = "24px";
      translateIcon.style.cursor = "pointer";
      translateIcon.style.margin = "10px";

      targetDiv.appendChild(translateIcon);

      // Event listener for the translate icon functionality
      // Event listener for the translate icon functionality
      translateIcon.addEventListener('click', async () => {
        console.log('Translate icon clicked!');
        const messageContainer = document.querySelector('div[contenteditable="true"][data-tab="10"]');
    
        if (messageContainer) {
            const messageSpan = messageContainer.querySelector('span.selectable-text.copyable-text');
    
            if (messageSpan) {
                const messageText = messageSpan.textContent; // Fetch the text content
                console.log('Message to translate:', messageText);
    
                if (messageText) {
                    const translatedText = await translateText(messageText, currentLanguage);
    
                    if (translatedText) {
                        // Use innerHTML if necessary for formatting
                        messageSpan.innerHTML = translatedText; // Update text here
                        console.log('Replaced with translated text:', translatedText);
                        
                        // Set focus back to the input field
                        messageContainer.focus();
                    } else {
                        console.error('Failed to fetch translated text.');
                    }
                } else {
                    console.log('No text to translate.');
                }
            } else {
                console.error('No message span found within the input container.');
            }
        } else {
            console.error('No message input container found for translation.');
        }
    });


      console.log("Translate icon added to the footer.");
    }
  } catch (error) {
    console.error("Error appending translate icon to footer:", error);
  }
};

// Function to send the message for translation (helper function)
const translateText = async (text, preferredLanguage) => {
  try {
    const res = await fetch("http://localhost:5000/translate", {
      method: "POST",
      body: JSON.stringify({
        q: text, // Message to be translated
        source: "auto", // Automatically detect the source language
        target: preferredLanguage, // Use the preferred language
        format: "text",
        alternatives: 3,
        api_key: "", // Add your API key if required
      }),
      headers: { "Content-Type": "application/json" },
    });

    const translatedData = await res.json();
    return translatedData.translatedText; // Return the translated text
  } catch (error) {
    console.error("Error translating message:", error);
    return null;
  }
};

// Function to send the message for translation (for normal message flow)
const translateMessage = async (
  messageText,
  messageNode,
  preferredLanguage
) => {
  const translatedText = await translateText(messageText, preferredLanguage);
  if (translatedText) {
    appendTranslatedMessage(messageNode, translatedText); // Keep appending the translated message as before
  }
};

// Function to append the translated message to the DOM (for normal messages)
const appendTranslatedMessage = (messageNode, translatedText) => {
  const existingTranslation = messageNode.querySelector(".translated-message");
  if (existingTranslation) {
    // Update the text if the translation already exists
    existingTranslation.innerText = `Translated: ${translatedText}`;
  } else {
    // Create a new translation message
    const translatedMessageElement = document.createElement("div");
    translatedMessageElement.className = "translated-message"; // Add a class to identify it
    translatedMessageElement.innerText = `Translated: ${translatedText}`;
    translatedMessageElement.style.color = "blue"; // You can style it as per your needs
    translatedMessageElement.style.marginTop = "5px";

    messageNode.appendChild(translatedMessageElement); // Append the new div below the messageNode
  }
};

// Function to handle new messages
const handleNewMessages = (mutations, preferredLanguage) => {
  mutations.forEach((mutation) => {
    if (mutation.type === "childList") {
      const newMessages = mutation.addedNodes;

      newMessages.forEach((messageNode) => {
        if (messageNode.nodeType === 1) {
          const messageTextSpan = messageNode.querySelector(
            "span._ao3e.selectable-text.copyable-text"
          );

          if (messageTextSpan) {
            const messageText = messageTextSpan.innerText;
            translateMessage(messageText, messageNode, preferredLanguage);
          }
        }
      });
    }
  });
};

// Function to fetch all existing messages
const fetchAllMessages = (preferredLanguage) => {
  const messages = document.querySelectorAll("div.message-in, div.message-out");
  messages.forEach((messageNode) => {
    const messageTextSpan = messageNode.querySelector(
      "span._ao3e.selectable-text.copyable-text"
    );
    if (messageTextSpan) {
      const messageText = messageTextSpan.innerText;
      translateMessage(messageText, messageNode, preferredLanguage);
    }
  });
};

// Function to initialize the chat observer when a list item is clicked
const initializeChatObserver = (preferredLanguage) => {
  let chatContainer = getChatContainer();

  if (chatIntervalId) clearInterval(chatIntervalId);

  chatIntervalId = setInterval(() => {
    chatContainer = getChatContainer();
    if (chatContainer) {
      clearInterval(chatIntervalId);
      fetchAllMessages(preferredLanguage);
      appendTranslateIconToFooter();

      if (chatObserver) chatObserver.disconnect();

      chatObserver = new MutationObserver((mutations) =>
        handleNewMessages(mutations, preferredLanguage)
      );
      chatObserver.observe(chatContainer, { childList: true, subtree: true });
    } else {
      console.log("Chat container not found. Retrying...");
    }
  }, 1000);
};

// Function to set up list item click listeners
const setupListItemListeners = (preferredLanguage) => {
  const listItems = document.querySelectorAll('[role="listitem"]');
  if (listItems.length > 0) {
    listItems.forEach((listItem) => {
      listItem.addEventListener("click", () => {
        initializeChatObserver(preferredLanguage);
      });
    });
    return true;
  }
  return false;
};

const listItemIntervalId = setInterval(() => {
  chrome.storage.sync.get(["preferredLanguage"], (result) => {
    currentLanguage = result.preferredLanguage || "hi";
    const listItemsAdded = setupListItemListeners(currentLanguage);
    if (listItemsAdded) {
      clearInterval(listItemIntervalId);
    }
  });
}, 1000);
