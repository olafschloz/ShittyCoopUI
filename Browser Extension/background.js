chrome.runtime.onInstalled.addListener(() => {
  console.log('AI Shopping Assistant installed');
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-sidebar") {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0] && tabs[0].id) {
        const tabId = tabs[0].id;
        chrome.scripting.executeScript({
          target: {tabId: tabId},
          files: ["content.js"]
        }, () => {
          if (chrome.runtime.lastError) {
            console.warn('[BACKGROUND] Error injecting script for command:', chrome.runtime.lastError.message);
            return;
          }
          console.log("[BACKGROUND] Script injected via command. Sending message to tab:", tabId);
          chrome.tabs.sendMessage(tabId, {action: "toggleSidebar"}, (response) => {
            if (chrome.runtime.lastError) {
              console.warn('[BACKGROUND] No content script in this tab for command:', chrome.runtime.lastError.message);
            }
          });
        });
      }
    });
  }
});

chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    const tabId = tab.id;
    chrome.scripting.executeScript({
      target: {tabId: tabId},
      files: ["content.js"]
    }, () => {
      if (chrome.runtime.lastError) {
        console.warn('[BACKGROUND] Error injecting script for action click:', chrome.runtime.lastError.message);
        return;
      }
      console.log("[BACKGROUND] Script injected via action click. Sending message to tab:", tabId);
      chrome.tabs.sendMessage(tabId, {action: "toggleSidebar"}, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('[BACKGROUND] No content script in this tab for action click:', chrome.runtime.lastError.message);
        }
      });
    });
  } else {
    console.warn("[BACKGROUND] action.onClicked: Tab ID is missing.");
  }
});
