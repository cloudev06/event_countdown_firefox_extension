document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const eventNameInput = document.getElementById('event-name');
    const eventDateInput = document.getElementById('event-date');
    const eventTimeInput = document.getElementById('event-time');
    const allDayCheckbox = document.getElementById('all-day');
    const allDayToggle = document.getElementById('all-day-toggle');
    const timeWrapper = document.getElementById('time-wrapper');
    const addBtn = document.getElementById('add-btn');
    const addToggleBtn = document.getElementById('add-toggle-btn');
    const addForm = document.getElementById('add-form');
    const eventList = document.getElementById('event-list');
    const clockElement = document.getElementById('clock');

    // Setup 24h time inputs
    function setupTimeInput(input) {
        input.addEventListener('input', (e) => {
            let v = input.value.replace(/[^0-9]/g, '');
            if (v.length > 4) v = v.slice(0, 4);

            if (v.length >= 2) {
                let h = parseInt(v.slice(0, 2));
                if (h > 23) {
                    v = '23' + v.slice(2);
                }
            }

            if (v.length > 2) {
                v = v.slice(0, 2) + ':' + v.slice(2);
            }

            // Validate minutes part on the fly if full length
            if (v.length === 5) {
                let m = parseInt(v.slice(3, 5));
                if (m > 59) {
                    v = v.slice(0, 3) + '59';
                }
            }

            input.value = v;
        });

        input.addEventListener('blur', () => {
            let v = input.value;
            // Auto-fix partial inputs
            if (v.length === 1) v = '0' + v + ':00';
            else if (v.length === 2) v = v + ':00';
            else if (v.length === 4) v = v + '0'; // 12:3 -> 12:30

            // Validate final time
            const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
            if (v && !timeRegex.test(v)) {
                // If invalid, revert to default or clear? 
                // Let's leave it for the user to fix but they'll get an error on save
            } else if (v) {
                input.value = v; // update with auto-fixes
            }
        });
    }



    // Edit form elements
    const editForm = document.getElementById('edit-form');
    const editEventName = document.getElementById('edit-event-name');
    const editEventDate = document.getElementById('edit-event-date');
    const editEventTime = document.getElementById('edit-event-time');
    const editAllDay = document.getElementById('edit-all-day');
    const editAllDayToggle = document.getElementById('edit-all-day-toggle');
    const editTimeWrapper = document.getElementById('edit-time-wrapper');
    const editEventId = document.getElementById('edit-event-id');
    const saveEditBtn = document.getElementById('save-edit-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');

    setupTimeInput(eventTimeInput);
    setupTimeInput(editEventTime);

    // Pagination elements
    const pagination = document.getElementById('pagination');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const pageDots = document.getElementById('page-dots');

    // Pagination state
    const ITEMS_PER_PAGE = 8;
    let currentPage = 1;
    let totalPages = 1;
    let allEvents = [];
    let slideDirection = null; // 'left' or 'right' for page transitions

    // Load and apply theme and mode from storage (shared with popup)
    function loadTheme() {
        browser.storage.sync.get(['popupTheme', 'popupMode']).then((result) => {
            const theme = result.popupTheme || 'coffee';
            const mode = result.popupMode || 'light';
            applyTheme(theme);
            applyMode(mode);
        }).catch(() => {
            browser.storage.local.get(['popupTheme', 'popupMode']).then((result) => {
                const theme = result.popupTheme || 'coffee';
                const mode = result.popupMode || 'light';
                applyTheme(theme);
                applyMode(mode);
            });
        });
    }

    function applyTheme(theme) {
        document.body.classList.remove(
            'theme-coffee', 'theme-matcha', 'theme-caramel', 'theme-oat', 'theme-espresso'
        );
        document.body.classList.add(`theme-${theme}`);
    }

    function applyMode(mode) {
        document.body.classList.remove('mode-dark', 'mode-light');
        document.body.classList.add(`mode-${mode}`);
    }

    // Load theme on startup
    loadTheme();

    // Listen for theme and mode changes from popup
    browser.storage.onChanged.addListener((changes, area) => {
        if (changes.popupTheme) {
            applyTheme(changes.popupTheme.newValue || 'coffee');
        }
        if (changes.popupMode) {
            applyMode(changes.popupMode.newValue || 'light');
        }
    });

    // Migrate old data from local to sync storage
    async function migrateToSyncStorage() {
        try {
            const localData = await browser.storage.local.get(['events', 'migrated']);
            if (localData.events && localData.events.length > 0 && !localData.migrated) {
                const migratedEvents = localData.events.map(event => {
                    if (event.date && event.date.includes('T')) {
                        const [date, time] = event.date.split('T');
                        return { id: event.id, name: event.name, date: date, time: time || null };
                    }
                    return event;
                });
                await browser.storage.sync.set({ events: migratedEvents });
                await browser.storage.local.set({ migrated: true });
            }
        } catch (e) {
            console.log('Migration not needed or failed:', e);
        }
    }

    // Update clock (24-hour format)
    function updateClock() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        clockElement.textContent = `${hours}:${minutes}`;
    }
    setInterval(updateClock, 1000);
    updateClock();

    // Toggle add form visibility
    addToggleBtn.addEventListener('click', () => {
        const isVisible = addForm.classList.contains('visible');
        addForm.classList.toggle('visible');
        editForm.classList.remove('visible');

        // Rotate button
        addToggleBtn.style.transform = isVisible ? '' : 'rotate(45deg)';
    });

    // All day checkbox - hide time input when checked
    allDayCheckbox.addEventListener('change', () => {
        if (allDayCheckbox.checked) {
            timeWrapper.classList.add('hidden');
            allDayToggle.classList.add('active');
        } else {
            timeWrapper.classList.remove('hidden');
            allDayToggle.classList.remove('active');
        }
    });

    editAllDay.addEventListener('change', () => {
        if (editAllDay.checked) {
            editTimeWrapper.classList.add('hidden');
            editAllDayToggle.classList.add('active');
        } else {
            editTimeWrapper.classList.remove('hidden');
            editAllDayToggle.classList.remove('active');
        }
    });

    // Set default date to tomorrow
    function setDefaultDate() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        eventDateInput.value = tomorrow.toISOString().split('T')[0];
        eventTimeInput.value = '12:00';
    }
    setDefaultDate();

    // Load events on startup (after migration)
    migrateToSyncStorage().then(() => loadEvents());

    // Add event
    addBtn.addEventListener('click', () => {
        const name = eventNameInput.value.trim();
        const date = eventDateInput.value;
        const time = allDayCheckbox.checked ? null : eventTimeInput.value;

        if (!name || !date) {
            alert('Please fill in the event name and date.');
            return;
        }

        if (!allDayCheckbox.checked && time && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
            alert('Please enter a valid time (HH:MM) in 24-hour format.');
            return;
        }

        addEvent(name, date, time);
        eventNameInput.value = '';
        setDefaultDate();
        allDayCheckbox.checked = false;
        timeWrapper.classList.remove('hidden');
        allDayToggle.classList.remove('active');
        addForm.classList.remove('visible');
        addToggleBtn.style.transform = '';
    });

    // Save edit
    saveEditBtn.addEventListener('click', () => {
        const id = parseInt(editEventId.value);
        const name = editEventName.value.trim();
        const date = editEventDate.value;
        const time = editAllDay.checked ? null : editEventTime.value;

        if (!name || !date) {
            alert('Please fill in the event name and date.');
            return;
        }

        if (!editAllDay.checked && time && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
            alert('Please enter a valid time (HH:MM) in 24-hour format.');
            return;
        }

        updateEvent(id, name, date, time);
        editForm.classList.remove('visible');
    });

    // Cancel edit
    cancelEditBtn.addEventListener('click', () => {
        editForm.classList.remove('visible');
    });

    // Pagination with slide animation
    function changePage(newPage) {
        if (newPage === currentPage || newPage < 1 || newPage > totalPages) return;

        // Determine slide direction
        slideDirection = newPage > currentPage ? 'left' : 'right';

        // Slide out animation
        eventList.classList.add(`slide-${slideDirection}`);

        setTimeout(() => {
            currentPage = newPage;
            eventList.classList.remove(`slide-${slideDirection}`);
            renderEventsContent();
            updatePagination();
            eventList.classList.add(`slide-in-${slideDirection}`);

            setTimeout(() => {
                eventList.classList.remove(`slide-in-${slideDirection}`);
                slideDirection = null;
            }, 300);
        }, 300);
    }

    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            changePage(currentPage - 1);
        }
    });

    nextPageBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
            changePage(currentPage + 1);
        }
    });

    function addEvent(name, date, time) {
        const event = { id: Date.now(), name, date, time };

        browser.storage.sync.get(['events']).then((result) => {
            const events = result.events || [];
            events.push(event);
            browser.storage.sync.set({ events }).then(() => loadEvents());
        }).catch(() => {
            browser.storage.local.get(['events']).then((result) => {
                const events = result.events || [];
                events.push(event);
                browser.storage.local.set({ events }).then(() => loadEvents());
            });
        });
    }

    function updateEvent(id, name, date, time) {
        browser.storage.sync.get(['events']).then((result) => {
            let events = result.events || [];
            events = events.map(e => e.id === id ? { ...e, name, date, time } : e);
            browser.storage.sync.set({ events }).then(() => loadEvents());
        }).catch(() => {
            browser.storage.local.get(['events']).then((result) => {
                let events = result.events || [];
                events = events.map(e => e.id === id ? { ...e, name, date, time } : e);
                browser.storage.local.set({ events }).then(() => loadEvents());
            });
        });
    }

    function loadEvents() {
        browser.storage.sync.get(['events']).then((result) => {
            processEvents(result.events || []);
        }).catch(() => {
            browser.storage.local.get(['events']).then((result) => {
                processEvents(result.events || []);
            });
        });
    }

    function processEvents(events) {
        events.sort((a, b) => {
            const dateA = new Date(a.date + (a.time ? `T${a.time}` : 'T00:00'));
            const dateB = new Date(b.date + (b.time ? `T${b.time}` : 'T00:00'));
            return dateA - dateB;
        });

        allEvents = events;
        totalPages = Math.ceil(events.length / ITEMS_PER_PAGE) || 1;
        if (currentPage > totalPages) currentPage = totalPages;
        renderEvents();
    }

    function renderEvents() {
        renderEventsContent();
        updatePagination();
    }

    function renderEventsContent() {
        eventList.innerHTML = '';

        if (allEvents.length === 0) {
            eventList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📅</div>
                    <div class="empty-state-text">No events yet. Add your first event!</div>
                </div>
            `;
            return;
        }

        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const pageEvents = allEvents.slice(startIndex, endIndex);
        const groups = groupEventsByDate(pageEvents);

        for (const [date, events] of Object.entries(groups)) {
            if (events.length === 1) {
                renderSingleEvent(events[0]);
            } else {
                renderDateGroup(date, events);
            }
        }
    }

    function updatePagination() {
        if (allEvents.length === 0) {
            pagination.classList.add('hidden');
            return;
        }

        if (totalPages > 1) {
            pagination.classList.remove('hidden');

            // Generate dots
            pageDots.innerHTML = '';
            for (let i = 1; i <= totalPages; i++) {
                const dot = document.createElement('button');
                dot.className = 'page-dot' + (i === currentPage ? ' active' : '');
                const pageNum = i;
                dot.addEventListener('click', () => {
                    changePage(pageNum);
                });
                pageDots.appendChild(dot);
            }

            prevPageBtn.disabled = currentPage === 1;
            nextPageBtn.disabled = currentPage === totalPages;
        } else {
            pagination.classList.add('hidden');
        }
    }

    function groupEventsByDate(events) {
        const groups = {};
        for (const event of events) {
            if (!groups[event.date]) groups[event.date] = [];
            groups[event.date].push(event);
        }
        return groups;
    }

    function renderDateGroup(date, events) {
        const groupDiv = document.createElement('li');
        groupDiv.className = 'date-group';

        const countdown = calculateCountdown(date, null);

        const header = document.createElement('div');
        header.className = 'date-group-header';

        const groupInfo = document.createElement('div');
        groupInfo.className = 'date-group-info';
        const groupDate = document.createElement('span');
        groupDate.className = 'date-group-date';
        groupDate.textContent = formatDisplayDate(date);
        const groupCount = document.createElement('span');
        groupCount.className = 'date-group-count';
        groupCount.textContent = `${events.length} events`;
        groupInfo.appendChild(groupDate);
        groupInfo.appendChild(groupCount);

        const groupCountdown = document.createElement('div');
        groupCountdown.className = 'date-group-countdown';
        const countdownVal = document.createElement('span');
        countdownVal.className = 'countdown-value';
        countdownVal.textContent = countdown.value;
        const countdownLbl = document.createElement('span');
        countdownLbl.className = 'countdown-label';
        countdownLbl.textContent = countdown.label;
        groupCountdown.appendChild(countdownVal);
        groupCountdown.appendChild(countdownLbl);

        header.appendChild(groupInfo);
        header.appendChild(groupCountdown);

        header.addEventListener('click', () => {
            groupDiv.classList.toggle('expanded');
            header.classList.toggle('expanded');
        });

        const eventsContainer = document.createElement('div');
        eventsContainer.className = 'date-group-events';

        for (const event of events) {
            const eventEl = createEventElement(event);
            eventsContainer.appendChild(eventEl);
        }

        groupDiv.appendChild(header);
        groupDiv.appendChild(eventsContainer);
        eventList.appendChild(groupDiv);
    }

    function renderSingleEvent(event) {
        const eventEl = createEventElement(event);
        eventList.appendChild(eventEl);
    }

    function createEventElement(event) {
        const li = document.createElement('li');
        li.className = 'event-item';
        li.dataset.id = event.id;

        const countdown = calculateCountdown(event.date, event.time);

        // Build event info section
        const eventInfo = document.createElement('div');
        eventInfo.className = 'event-info';
        const nameSpan = document.createElement('span');
        nameSpan.className = 'name';
        nameSpan.textContent = event.name;
        const dateSpan = document.createElement('span');
        dateSpan.className = 'date';
        dateSpan.textContent = `${formatDisplayDate(event.date)}${event.time ? ` · ${event.time}` : ' · All Day'}`;
        eventInfo.appendChild(nameSpan);
        eventInfo.appendChild(dateSpan);

        // Build event right section
        const eventRight = document.createElement('div');
        eventRight.className = 'event-right';

        const countdownBox = document.createElement('div');
        countdownBox.className = 'countdown-box';
        if (countdown.isHours) {
            const hoursSpan = document.createElement('span');
            hoursSpan.className = 'countdown-hours';
            hoursSpan.textContent = countdown.value;
            countdownBox.appendChild(hoursSpan);
        } else {
            const valueSpan = document.createElement('span');
            valueSpan.className = 'countdown-value';
            valueSpan.textContent = countdown.value;
            const labelSpan = document.createElement('span');
            labelSpan.className = 'countdown-label';
            labelSpan.textContent = countdown.label;
            countdownBox.appendChild(valueSpan);
            countdownBox.appendChild(labelSpan);
        }

        const eventActions = document.createElement('div');
        eventActions.className = 'event-actions';
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-btn';
        editBtn.title = 'Edit';
        editBtn.textContent = '✎';
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.title = 'Delete';
        deleteBtn.textContent = '×';
        eventActions.appendChild(editBtn);
        eventActions.appendChild(deleteBtn);

        eventRight.appendChild(countdownBox);
        eventRight.appendChild(eventActions);

        li.appendChild(eventInfo);
        li.appendChild(eventRight);

        li.querySelector('.edit-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openEditForm(event);
        });

        li.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            li.classList.add('deleting');
            setTimeout(() => deleteEvent(event.id), 350);
        });

        return li;
    }

    function openEditForm(event) {
        addForm.classList.remove('visible');
        addToggleBtn.style.transform = '';
        editForm.classList.add('visible');

        editEventId.value = event.id;
        editEventName.value = event.name;
        editEventDate.value = event.date;
        editEventTime.value = event.time || '12:00';
        editAllDay.checked = !event.time;

        if (!event.time) {
            editTimeWrapper.classList.add('hidden');
            editAllDayToggle.classList.add('active');
        } else {
            editTimeWrapper.classList.remove('hidden');
            editAllDayToggle.classList.remove('active');
        }
    }

    function deleteEvent(id) {
        browser.storage.sync.get(['events']).then((result) => {
            let events = (result.events || []).filter(e => e.id !== id);
            browser.storage.sync.set({ events }).then(() => loadEvents());
        }).catch(() => {
            browser.storage.local.get(['events']).then((result) => {
                let events = (result.events || []).filter(e => e.id !== id);
                browser.storage.local.set({ events }).then(() => loadEvents());
            });
        });
    }

    function calculateCountdown(date, time) {
        const now = new Date();
        const targetStr = time ? `${date}T${time}` : `${date}T23:59:59`;
        const target = new Date(targetStr);
        const diffMs = target - now;

        if (diffMs < 0) return { value: 'Passed', label: '', isHours: false };

        const diffHours = diffMs / (1000 * 60 * 60);
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (diffHours < 24 && time) {
            const hours = Math.floor(diffHours);
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            return { value: `${hours}h ${minutes}m`, label: '', isHours: true };
        }

        if (diffDays === 0) return { value: 'Today', label: '', isHours: false };
        if (diffDays === 1) return { value: '1', label: 'Day', isHours: false };
        return { value: String(diffDays), label: 'Days', isHours: false };
    }

    function formatDisplayDate(dateStr) {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    setInterval(() => renderEvents(), 60000);
});
