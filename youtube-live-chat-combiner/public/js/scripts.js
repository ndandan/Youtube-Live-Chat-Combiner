let SHORTS_VIDEO_ID = '';
let FULL_VIDEO_ID = '';

const participants = {
    shorts: {},
    full: {}
};

async function getApiKey() {
    const response = await fetch('/api-key');
    const data = await response.json();
    return data.apiKey;
}

async function getLiveChatId(videoId, API_KEY) {
    try {
        const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}&key=${API_KEY}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (!data.items || data.items.length === 0) {
            throw new Error(`No live streaming details found for video ID: ${videoId}`);
        }
        return data.items[0].liveStreamingDetails.activeLiveChatId;
    } catch (error) {
        console.error('Failed to get live chat ID:', error);
        return null;
    }
}

async function fetchChatMessages(liveChatId, label, API_KEY) {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${liveChatId}&part=snippet,authorDetails&key=${API_KEY}`);
    const data = await response.json();
    return data.items.map(item => ({
        message: item.snippet.displayMessage,
        author: item.authorDetails.displayName,
        label: label,
        timestamp: new Date(item.snippet.publishedAt).getTime(),
    }));
}

async function displayCombinedChat() {
    const API_KEY = await getApiKey();

    if (!SHORTS_VIDEO_ID || !FULL_VIDEO_ID) {
        console.error('Video IDs are not set');
        return;
    }

    const shortsChatId = await getLiveChatId(SHORTS_VIDEO_ID, API_KEY);
    const fullChatId = await getLiveChatId(FULL_VIDEO_ID, API_KEY);

    if (!shortsChatId || !fullChatId) {
        console.error('Could not retrieve live chat IDs');
        return;
    }

    const shortsMessages = await fetchChatMessages(shortsChatId, 'Shorts', API_KEY);
    const fullMessages = await fetchChatMessages(fullChatId, 'Full', API_KEY);

    const combinedMessages = [...shortsMessages, ...fullMessages].sort((a, b) => b.timestamp - a.timestamp); // Sort with newest first

    const chatContainer = document.getElementById('combinedChat');
    chatContainer.innerHTML = ''; // Clear chat messages

    combinedMessages.forEach(msg => {
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message';
        messageElement.innerHTML = `<strong>${msg.label} (${msg.author}):</strong> ${msg.message}`;
        chatContainer.appendChild(messageElement); // Append to container (newest first)
    });
}

document.getElementById('updateButton').addEventListener('click', () => {
    SHORTS_VIDEO_ID = document.getElementById('shortsId').value;
    FULL_VIDEO_ID = document.getElementById('fullId').value;

    const chatContainer = document.getElementById('combinedChat');
    chatContainer.innerHTML = ''; // Clear chat when IDs are updated

    if (SHORTS_VIDEO_ID && FULL_VIDEO_ID) {
        displayCombinedChat();
    } else {
        console.error('Both Video IDs must be provided');
    }
});

// Refresh chat every 2 seconds if both video IDs are set
setInterval(() => {
    if (SHORTS_VIDEO_ID && FULL_VIDEO_ID) {
        displayCombinedChat();
    }
}, 2000);
