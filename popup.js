document.addEventListener('DOMContentLoaded', () => {
    const eventNameInput = document.getElementById('event-name');
    const eventDateInput = document.getElementById('event-date');
    const addBtn = document.getElementById('add-btn');
    const eventList = document.getElementById('event-list');

    // Load events on startup
    loadEvents();

    // Set default date to tomorrow at current time
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 1);
    defaultDate.setMinutes(defaultDate.getMinutes() - defaultDate.getTimezoneOffset()); // Local time adjust
    eventDateInput.value = defaultDate.toISOString().slice(0, 16);

    addBtn.addEventListener('click', () => {
        const name = eventNameInput.value.trim();
        const date = eventDateInput.value;

        if (!name || !date) {
            alert('Please fill in both fields.');
            return;
        }

        addEvent(name, date);
        // Reset to tomorrow
        const resetDate = new Date();
        resetDate.setDate(resetDate.getDate() + 1);
        resetDate.setMinutes(resetDate.getMinutes() - resetDate.getTimezoneOffset());
        eventNameInput.value = '';
        eventDateInput.value = resetDate.toISOString().slice(0, 16);
    });

    function addEvent(name, date) {
        const event = {
            id: Date.now(),
            name,
            date
        };

        browser.storage.local.get(['events']).then((result) => {
            const events = result.events || [];
            events.push(event);
            browser.storage.local.set({ events }).then(() => {
                renderEvent(event);
            });
        });
    }

    function loadEvents() {
        browser.storage.local.get(['events']).then((result) => {
            const events = result.events || [];
            // Sort by date soonest first
            events.sort((a, b) => new Date(a.date) - new Date(b.date));
            eventList.innerHTML = ''; // Clear current list
            events.forEach(renderEvent);
        });
    }

    function renderEvent(event) {
        const li = document.createElement('li');
        li.className = 'event-item';

        const daysLeft = calculateDaysLeft(event.date);
        const daysText = daysLeft < 0 ? 'Passed' : daysLeft;
        const labelText = daysLeft === 1 ? 'Day' : 'Days';

        // Event Info Container
        const infoDiv = document.createElement('div');
        infoDiv.className = 'event-info';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'name';
        nameSpan.textContent = event.name;

        const dateSpan = document.createElement('span');
        dateSpan.className = 'date';
        dateSpan.textContent = formatDate(event.date);

        infoDiv.appendChild(nameSpan);
        infoDiv.appendChild(dateSpan);

        // Right Side Container
        const rightDiv = document.createElement('div');
        rightDiv.style.display = 'flex';
        rightDiv.style.alignItems = 'center';

        const countBox = document.createElement('div');
        countBox.className = 'countdown-box';

        const daysLeftSpan = document.createElement('span');
        daysLeftSpan.className = 'days-left';
        daysLeftSpan.textContent = daysText;
        countBox.appendChild(daysLeftSpan);

        if (daysLeft >= 0) {
            const labelSpan = document.createElement('span');
            labelSpan.className = 'days-label';
            labelSpan.textContent = labelText;
            countBox.appendChild(labelSpan);
        }

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = '×';
        deleteBtn.dataset.id = event.id;

        deleteBtn.addEventListener('click', (e) => {
            deleteEvent(event.id);
            li.remove();
        });

        rightDiv.appendChild(countBox);
        rightDiv.appendChild(deleteBtn);

        li.appendChild(infoDiv);
        li.appendChild(rightDiv);

        eventList.appendChild(li);
    }

    function deleteEvent(id) {
        browser.storage.local.get(['events']).then((result) => {
            let events = result.events || [];
            events = events.filter(e => e.id !== id);
            browser.storage.local.set({ events });
        });
    }

    function calculateDaysLeft(targetDateStr) {
        const today = new Date();
        const target = new Date(targetDateStr);
        // If target has no time (legacy), it defaults to UTC midnight usually if parsed directly, 
        // but we want to treat it relative to now. 
        // Actually, just simple diff is fine for "countdown".

        const diffTime = target - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }

    function formatDate(dateString) {
        // Handle YYYY-MM-DD (legacy) and YYYY-MM-DDTHH:mm
        const date = new Date(dateString);

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();

        const hasTime = dateString.includes('T');

        if (hasTime) {
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${day}/${month}/${year} ${hours}:${minutes}`;
        } else {
            return `${day}/${month}/${year}`;
        }
    }


});
