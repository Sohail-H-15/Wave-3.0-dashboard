/**
 * Admin Panel Script for WAVE 3.0 Live Dashboard
 * Uses Firebase Realtime Database for real-time cross-device sync
 */

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('adminForm');
    const notification = document.getElementById('notification');
    const resetBtn = document.getElementById('resetDefaults');
    const dbRef = db.ref('dashboard');

    // Local mirror of Firebase data (replaces localStorage reads)
    let fbCache = {};
    let isLocalUpdate = false; // Prevents form overwrite during own submissions

    // Default values mapping
    const defaultData = {
        eventStage: '2',
        liveTimer: '24:00:00',
        telemetryCheckedIn: '145',
        telemetryReviews: '98',
        winnerChampion: 'Team TBA',
        winnerRunnerUp: 'Team TBA',
        winnerThird: 'Team TBA',
        leaderboardDataJSON: JSON.stringify([
            { rank: 1, avatar: 'A', name: 'Team Apex', college: 'BEC Bagalkot', tClass: 'primary', theme: 'EdTech', progress: 95, score: 92.5 },
            { rank: 2, avatar: 'N', name: 'Code Ninjas', college: 'VTU Belgaum', tClass: 'secondary', theme: 'Gen AI', progress: 88, score: 89.0 },
            { rank: 3, avatar: 'B', name: 'Byte Me', college: 'BMSCE Bangalore', tClass: 'tertiary', theme: 'Healthcare', progress: 85, score: 86.5 },
            { rank: 4, avatar: 'S', name: 'Syntax Error', college: 'RVCE', tClass: 'primary', theme: 'EdTech', progress: 75, score: 80.1 }
        ], null, 4),
        showAnnouncement: 'false',
        announcementMessage: '',
        fullscreenClock: 'false',
        autoScrollEnabled: 'false'
    };

    // Sync form inputs from Firebase cache
    function syncFormFromCache() {
        for (const key in defaultData) {
            const el = document.getElementById(key);
            if (el) {
                if (el.type === 'checkbox') {
                    el.checked = fbCache[key] === 'true' || fbCache[key] === true;
                } else {
                    el.value = (fbCache[key] != null) ? fbCache[key] : defaultData[key];
                }
            }
        }

        const cb = document.getElementById('resultsUnlocked');
        if (cb) cb.checked = fbCache.resultsUnlocked === 'true';
    }

    // Listen for real-time Firebase changes (handles initial load + live sync)
    dbRef.on('value', (snapshot) => {
        fbCache = snapshot.val() || {};
        if (!isLocalUpdate) {
            syncFormFromCache();
        }
    });

    // Admin Auth Logic (stays session-based — no need for Firebase)
    const authOverlay = document.getElementById('authOverlay');
    const loginBtn = document.getElementById('loginBtn');
    const pwdInput = document.getElementById('adminPassword');
    const authError = document.getElementById('authError');

    if (sessionStorage.getItem('adminAuthenticated') === 'true') {
        authOverlay.classList.add('hidden');
    }

    function attemptLogin() {
        if (pwdInput.value === 'hWv3@bec#26') {
            sessionStorage.setItem('adminAuthenticated', 'true');
            authOverlay.classList.add('hidden');
            authError.style.display = 'none';
        } else {
            authError.style.display = 'block';
            pwdInput.value = '';
        }
    }

    if (loginBtn && pwdInput) {
        loginBtn.addEventListener('click', attemptLogin);
        pwdInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') attemptLogin();
        });
    }

    // Show Notification Helper
    function showNotification(message, iconClass, isSuccess) {
        const icon = notification.querySelector('i');
        const text = notification.querySelector('span');

        icon.className = iconClass;
        text.textContent = message;

        notification.style.background = isSuccess ? 'var(--success)' : 'var(--chart-3)';

        notification.classList.add('show');
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    // Handle Form Submit (Broadcast to Firebase)
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        isLocalUpdate = true;

        let updates = {};
        let updatedCount = 0;

        // Validate JSON first if textarea is dirty
        const jsonField = document.getElementById('leaderboardDataJSON');
        if (jsonField) {
            const val = jsonField.value.trim();
            if (val !== '') {
                try {
                    JSON.parse(val);
                } catch (err) {
                    showNotification('Invalid JSON in Leaderboard Data', 'fa-solid fa-triangle-exclamation', false);
                    isLocalUpdate = false;
                    return;
                }
            }
        }

        // Collect all form inputs into updates object
        const elements = form.querySelectorAll('input, textarea, select');
        elements.forEach(el => {
            if (el.type === 'checkbox') {
                updates[el.id] = el.checked.toString();
                updatedCount++;
            } else {
                updates[el.id] = el.value.trim();
                updatedCount++;
            }
        });

        // Timer start-timestamp logic
        const timerVal = document.getElementById('liveTimer');
        if (timerVal && timerVal.value.trim() !== '') {
            const newValue = timerVal.value.trim();
            const oldValue = fbCache.liveTimer;

            if (newValue !== oldValue) {
                // User typed a new time and hit broadcast — clear paused state
                updates.timerPausedRemaining = null; // null = delete from Firebase
                updates.timerStartTs = Date.now().toString();
                updates.timerRunning = 'true';
            } else {
                if (!fbCache.timerStartTs) {
                    updates.timerStartTs = Date.now().toString();
                }
            }
        }

        // Announcement timestamp
        const showAnn = document.getElementById('showAnnouncement');
        if (showAnn && showAnn.checked) {
            updates.announcementTimestamp = Date.now().toString();
        }

        // Timestamp to signal update
        updates.lastUpdate = Date.now();

        // Push everything to Firebase in one atomic update
        dbRef.update(updates).then(() => {
            isLocalUpdate = false;
            if (updatedCount > 0) {
                showNotification('Live Dashboard Updated Successfully', 'fa-solid fa-check-circle', true);
            } else {
                showNotification('No values to update', 'fa-solid fa-circle-exclamation', false);
            }
        }).catch((err) => {
            isLocalUpdate = false;
            showNotification('Firebase Error: ' + err.message, 'fa-solid fa-triangle-exclamation', false);
        });
    });

    // --- Timer Controls ---
    const btnStart = document.getElementById('btnTimerStart');
    const btnPause = document.getElementById('btnTimerPause');
    const btnReset = document.getElementById('btnTimerReset');
    const timerInput = document.getElementById('liveTimer');

    if (btnStart) {
        btnStart.addEventListener('click', () => {
            if (timerInput.value.trim() !== '') {
                const newValue = timerInput.value.trim();
                const oldValue = fbCache.liveTimer;
                let updates = {};

                // If user changed the input text before clicking start, ignore paused state
                let pausedRemaining = fbCache.timerPausedRemaining;
                if (newValue !== oldValue) {
                    pausedRemaining = null;
                    updates.timerPausedRemaining = null;
                }

                updates.liveTimer = newValue;

                if (pausedRemaining) {
                    // Timer was paused — calculate adjusted start timestamp
                    const parts = timerInput.value.trim().split(':');
                    const initialH = parseInt(parts[0] || '0', 10);
                    const initialM = parseInt(parts[1] || '0', 10);
                    const initialS = parseInt(parts[2] || '0', 10);
                    const initialTotalSeconds = (initialH * 3600) + (initialM * 60) + initialS;

                    const currentRemaining = parseInt(pausedRemaining, 10);
                    const elapsedToNow = initialTotalSeconds - currentRemaining;

                    // "Backdate" the start timestamp by the elapsed amount
                    const adjustedStartTs = Date.now() - (elapsedToNow * 1000);
                    updates.timerStartTs = adjustedStartTs.toString();
                    updates.timerPausedRemaining = null;
                } else {
                    // Fresh start
                    updates.timerStartTs = Date.now().toString();
                }

                updates.timerRunning = 'true';
                updates.lastUpdate = Date.now();

                dbRef.update(updates).then(() => {
                    showNotification('Timer Started', 'fa-solid fa-play', true);
                });
            } else {
                showNotification('Please enter a timer value first', 'fa-solid fa-circle-exclamation', false);
            }
        });
    }

    if (btnPause) {
        btnPause.addEventListener('click', () => {
            const isRunning = fbCache.timerRunning === 'true';
            if (isRunning) {
                const liveTimer = fbCache.liveTimer;
                const timerStartTs = fbCache.timerStartTs;

                if (liveTimer && timerStartTs) {
                    const parts = liveTimer.split(':');
                    const initialTotalSeconds = (parseInt(parts[0] || '0') * 3600) + (parseInt(parts[1] || '0') * 60) + parseInt(parts[2] || '0');
                    const elapsedSeconds = Math.floor((Date.now() - parseInt(timerStartTs)) / 1000);
                    let currentRemaining = initialTotalSeconds - elapsedSeconds;
                    if (currentRemaining < 0) currentRemaining = 0;

                    dbRef.update({
                        timerPausedRemaining: currentRemaining.toString(),
                        timerRunning: 'false',
                        lastUpdate: Date.now()
                    }).then(() => {
                        showNotification('Timer Paused', 'fa-solid fa-pause', true);
                    });
                }
            }
        });
    }

    if (btnReset) {
        btnReset.addEventListener('click', () => {
            timerInput.value = '24:00:00';
            dbRef.update({
                liveTimer: '24:00:00',
                timerRunning: 'false',
                timerStartTs: null,
                timerPausedRemaining: null,
                lastUpdate: Date.now()
            }).then(() => {
                showNotification('Timer Reset', 'fa-solid fa-rotate-left', true);
            });
        });
    }

    // Handle Reset defaults
    resetBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all dashboard metrics to their default baseline?')) {
            let updates = {};
            for (const key in defaultData) {
                updates[key] = defaultData[key];
            }
            updates.resultsUnlocked = 'false';
            updates.lastUpdate = Date.now();

            dbRef.update(updates).then(() => {
                showNotification('Metrics Reset to Defaults', 'fa-solid fa-rotate-left', true);
            });
        }
    });
});
