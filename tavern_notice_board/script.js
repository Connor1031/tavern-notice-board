const API_URL = 'http://localhost:5000/messages';

const localMessages = [
    { author: "Tavern Keeper", message: "Welcome to the tavern! Drinks are half off tonight.", date: "10:00 AM" },
    { author: "Bounty Hunter", message: "Looking for a someone to hunt goblins in the forest. Reward is 20 gold.", date: "11:30 AM" }
];

// fetch messages when the page loads
window.addEventListener('DOMContentLoaded', () => {
    displayMessages(localMessages);
    fetchMessages();
    document.getElementById('messageForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('messageForm').addEventListener('input', () => {
        document.getElementById('formError').textContent = '';
    });
});

async function fetchMessages() {
    try {
        const response = await fetch(API_URL, {
            method: 'GET'
        });

        if (!response.ok) {
            throw new Error('Server returned error status');
        }

        const data = await response.json();
        displayMessages([...localMessages, ...data]);
    } catch (error) {
        console.log('Server not reachable. Showing preview data:', error.message);
        displayMessages(localMessages);
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();

    const authorInput = document.getElementById('author');
    const messageInput = document.getElementById('message');
    const formError = document.getElementById('formError');

    formError.textContent = '';
    if (!authorInput.value.trim()) {
        formError.textContent = 'Please enter your name.';
        authorInput.focus();
        return;
    }
    if (!messageInput.value.trim()) {
        formError.textContent = 'Please enter a message.';
        messageInput.focus();
        return;
    }

    const newNotice = {
        author: authorInput.value.trim(),
        message: messageInput.value.trim(),
        date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newNotice)
        });

        if (response.status === 201 || response.ok) {
            // Clear form inputs
            authorInput.value = '';
            messageInput.value = '';
            // Refresh message list from server
            fetchMessages();
        } else {
            throw new Error('Could not post message');
        }
    } catch (error) {
        console.log('Server offline. Adding to local preview:', error.message);
        localMessages.push(newNotice);
        authorInput.value = '';
        messageInput.value = '';
        displayMessages(localMessages);
    }
}

// Render messages into the DOM
function displayMessages(messages) {
    const container = document.getElementById('messagesContainer');
    container.innerHTML = '';

    if (!messages || messages.length === 0) {
        container.innerHTML = '<p class="empty-msg">No notices posted yet.</p>';
        return;
    }

    [...messages].reverse().forEach(item => {
        const card = document.createElement('div');
        card.className = 'message-card';

        let author = 'Traveler';
        let text = item;
        let date = '';

        if (typeof item === 'object' && item !== null) {
            author = item.author || 'Anonymous';
            text = item.message || item.text || JSON.stringify(item);
            date = item.date || '';
        }

        card.innerHTML = `
            <div class="message-author">${escapeHTML(author)}</div>
            <div class="message-text">${escapeHTML(text)}</div>
            ${date ? `<div class="message-date">${escapeHTML(date)}</div>` : ''}
        `;

        container.appendChild(card);
    });
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
