let gameWindowId = null;

chrome.action.onClicked.addListener(() => {
    if (gameWindowId) {
        chrome.windows.get(gameWindowId, (window) => {
            if (window) {
                chrome.windows.update(gameWindowId, { focused: true });
                return;
            } else {
                gameWindowId = null;
            }
        });
    }
    
    // Создаем почти полноэкранное окно
    chrome.windows.create({
        url: chrome.runtime.getURL('index.html'),
        type: 'popup', // или 'normal' для обычного окна
        state: 'maximized' // 'maximized', 'minimized', 'fullscreen'
    }, (newWindow) => {
        gameWindowId = newWindow.id;
        
        chrome.windows.onRemoved.addListener((closedWindowId) => {
            if (closedWindowId === gameWindowId) {
                gameWindowId = null;
            }
        });
    });
});