/**
 * WAVE 3.0 Hackathon Dashboard Scripts
 * Uses Firebase Realtime Database for real-time cross-device sync
 */

document.addEventListener('DOMContentLoaded', () => {

    // Global Chart Defaults
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = "'Outfit', sans-serif";
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.05)';

    // --- Firebase Cache (replaces localStorage) ---
    let fbCache = {};

    // --- 1. Phase-based Countdown Logic ---
    // Top right static 24h UI timer logic removed as the DOM element was deleted. 
    // The active live timer logic for the sidebar runs in tickTimer() sync loop.

    // --- 2. Chart Configurations ---

    // Utility to create gradients for charts
    const getGradient = (ctx, chartArea, colorStart, colorEnd) => {
        if (!chartArea) return colorStart;
        const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
        gradient.addColorStop(0, colorStart);
        gradient.addColorStop(1, colorEnd);
        return gradient;
    };

    // A. Themes Chart (Bar Chart)
    const ctxThemes = document.getElementById('themesChart');
    if (ctxThemes) {
        new Chart(ctxThemes, {
            type: 'bar',
            data: {
                labels: ['EdTech', 'Open Innov', 'Gen AI', 'AgriTech', 'Healthcare', 'Smart Cities', 'E-Commerce', 'CyberSec', 'FinTech'],
                datasets: [{
                    label: 'Teams',
                    data: [33, 26, 21, 18, 16, 15, 11, 7, 6],
                    backgroundColor: function (context) {
                        const chart = context.chart;
                        const { ctx, chartArea } = chart;
                        if (!chartArea) return null;
                        return getGradient(ctx, chartArea, 'rgba(14, 165, 233, 0.4)', '#0ea5e9');
                    },
                    borderRadius: 6,
                    borderWidth: 0,
                    barPercentage: 0.6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        titleFont: { family: 'Space Grotesk', size: 14 },
                        padding: 12,
                        cornerRadius: 8,
                        displayColors: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { drawBorder: false },
                        ticks: { stepSize: 10 }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    }

    // C. Evaluation Radar Chart
    const ctxRadar = document.getElementById('radarChart');
    if (ctxRadar) {
        new Chart(ctxRadar, {
            type: 'radar',
            data: {
                labels: ['Relevance', 'Clarity', 'Innovation'],
                datasets: [{
                    label: 'Phase 1 Average',
                    data: [8.5, 9.0, 7.5],
                    backgroundColor: 'rgba(56, 189, 248, 0.2)',
                    borderColor: '#38bdf8',
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#38bdf8',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#0ea5e9',
                    borderWidth: 2,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        pointLabels: {
                            color: '#cbd5e1',
                            font: { size: 11, family: 'Outfit' }
                        },
                        ticks: { display: false, min: 0, max: 10 }
                    }
                },
                plugins: { legend: { display: false } }
            }
        });
    }




    // --- 8. Admin Panel Sync Logic (Firebase-powered) ---
    function updateFromStorage() {

        const kpiStudents = fbCache.kpiStudents;
        if (kpiStudents) {
            const el = document.getElementById('val-kpiStudents');
            if (el) el.innerHTML = `${kpiStudents}<span class="trend up"><i class="fa-solid fa-arrow-up"></i> 12%</span>`;
        }

        const kpiTeams = fbCache.kpiTeams;
        if (kpiTeams) {
            const el = document.getElementById('val-kpiTeams');
            if (el) el.innerHTML = `${kpiTeams}<span class="trend up"><i class="fa-solid fa-arrow-up"></i> 5%</span>`;
        }

        const kpiDuration = fbCache.kpiDuration;
        if (kpiDuration) {
            const el = document.getElementById('val-kpiDuration');
            if (el) el.innerHTML = `${kpiDuration}<span class="unit">HRS</span>`;
        }

        const kpiPrize = fbCache.kpiPrize;
        if (kpiPrize) {
            const el = document.getElementById('val-kpiPrize');
            if (el) el.innerHTML = `₹${kpiPrize}<span class="unit">K</span>`;
        }

        const telemetryCheckedIn = fbCache.telemetryCheckedIn;
        if (telemetryCheckedIn) {
            const el = document.getElementById('val-telemetryCheckedInSpan');
            if (el) {
                const max = fbCache.kpiTeams || 155;
                el.textContent = `${telemetryCheckedIn}/${max}`;

                const circle = el.closest('.circ-progress');
                if (circle) {
                    const pct = Math.min(100, Math.round((parseInt(telemetryCheckedIn) / parseInt(max)) * 100));
                    circle.style.setProperty('--val', `${pct}%`);
                }
            }
        }



        const telemetryReviews = fbCache.telemetryReviews;
        if (telemetryReviews) {
            const max = fbCache.kpiTeams || 155;

            const pctEl = document.getElementById('val-telemetryReviewsPct');
            const fillEl = document.getElementById('val-telemetryReviewsFill');
            const countEl = document.getElementById('val-telemetryReviewsCount');

            if (pctEl && fillEl && countEl) {
                const pct = Math.min(100, Math.round((parseInt(telemetryReviews) / parseInt(max)) * 100));
                pctEl.textContent = `${pct}%`;
                fillEl.style.width = `${pct}%`;
                countEl.textContent = `${telemetryReviews} / ${max} Teams`;
            }
        }

        // Timer logic moved to tickTimer()
        tickTimer();

        // Event Timeline Override
        const eventStage = fbCache.eventStage;
        if (eventStage) {
            const stageNum = parseFloat(eventStage);

            // Update Top Badge
            const badge = document.querySelector('.timeline-section .status-badge');
            if (badge) {
                const badgeMap = {
                    1: 'Inauguration Active',
                    1.5: 'Inauguration & Hackathon',
                    2: 'Hackathon Active',
                    2.5: 'Hackathon & Evaluation',
                    3: 'Evaluation Active',
                    3.5: 'Evaluation & Valedictory',
                    4: 'Valedictory Active',
                    5: 'Event Completed'
                };
                badge.textContent = badgeMap[stageNum] || 'Live';
            }

            // Update Nodes & Track Width
            const nodes = document.querySelectorAll('.timeline-nodes .node');
            const track = document.querySelector('.timeline-track');

            if (nodes.length > 0) {
                let progress = 0;
                if (stageNum >= 4) progress = 100;
                else {
                    const wholeStage = Math.floor(stageNum);
                    const isHalf = stageNum % 1 !== 0;
                    progress = (wholeStage - 1) * 33.33;
                    if (isHalf) progress += 16.66; // Add half of a 33% step
                }

                if (track) {
                    track.style.setProperty('--track-width', `${progress}%`);
                }

                nodes.forEach((node, index) => {
                    node.classList.remove('completed', 'active', 'pulse-node');
                    const nodeStage = index + 1;

                    if (stageNum === 5) {
                        node.classList.add('completed');
                    } else if (nodeStage < Math.floor(stageNum)) {
                        // Strictly before the floor is completed
                        node.classList.add('completed');
                    } else if (nodeStage === Math.floor(stageNum) || nodeStage === Math.ceil(stageNum)) {
                        // Current stage(s) are active
                        node.classList.add('active', 'pulse-node');
                    }
                });
            }
        }



        // Final Protocol (Winners) Override
        const resultsUnlocked = fbCache.resultsUnlocked === 'true';
        const lock = document.getElementById('resultsLock');
        const podium = document.getElementById('resultsPodium');

        if (lock && podium) {
            if (resultsUnlocked) {
                lock.classList.add('hidden');
                podium.classList.remove('hidden');
                podium.querySelectorAll('.placeholderblur').forEach(el => el.classList.add('unblurred'));
            } else {
                lock.classList.remove('hidden');
                podium.classList.add('hidden');
                podium.querySelectorAll('.placeholderblur').forEach(el => el.classList.remove('unblurred'));
            }
        }

        const champ = document.querySelector('.podium-spot.winner .team-name');
        if (champ) champ.textContent = fbCache.winnerChampion || 'TBA';

        const runner = document.querySelector('.podium-spot.runner-up .team-name');
        if (runner) runner.textContent = fbCache.winnerRunnerUp || 'TBA';

        const third = document.querySelector('.podium-spot.third-place .team-name');
        if (third) third.textContent = fbCache.winnerThird || 'TBA';

        // Leaderboard Override
        const lbJSON = fbCache.leaderboardDataJSON;
        if (lbJSON != null) {
            try {
                const data = lbJSON.trim() === '' ? [] : JSON.parse(lbJSON);
                const tbody = document.getElementById('leaderboardBody');
                if (tbody) {
                    tbody.innerHTML = '';
                    if (data.length === 0) {
                        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">Leaderboard will be updated during the evaluation phase.</td></tr>`;
                    } else {
                        data.forEach(team => {
                            const tr = document.createElement('tr');
                            tr.className = `rank-${team.rank}`;
                            const rank = team.rank || '-';
                            const avatar = team.avatar || 'T';
                            const name = team.name || 'Unknown';
                            const college = team.college || '-';
                            const tClass = team.tClass || 'primary';
                            const theme = team.theme || '-';
                            const progress = team.progress || 0;
                            const score = typeof team.score === 'number' ? team.score.toFixed(1) : '-';

                            tr.innerHTML = `
                                <td>#${rank}</td>
                                <td>
                                    <div class="team-cell">
                                        <div class="avatar-sm">${avatar}</div>
                                        ${name}
                                    </div>
                                </td>
                                <td>${college}</td>
                                <td><span class="theme-tag ${tClass}">${theme}</span></td>
                                <td>
                                    <div class="progress-cell">
                                        <div class="bar-labels" style="margin-bottom: 2px;"><span>Status</span><span>${progress}%</span></div>
                                        <div class="mini-progress"><div class="mini-fill" style="width: ${progress}%; ${rank === 1 ? 'background: #facc15' : ''}"></div></div>
                                    </div>
                                </td>
                                <td>${score}</td>
                            `;
                            tbody.appendChild(tr);
                        });
                    }
                }
            } catch (e) { console.error('Error parsing leaderboard JSON', e); }
        }

        // Broadcast the announcement trigger if the DOM func exists
        if (typeof window.updateAnnouncement === 'function') {
            window.updateAnnouncement();
        }

        // Fullscreen Clock Mode
        const fsOverlay = document.getElementById('fullscreenClockOverlay');
        if (fsOverlay) {
            const fsEnabled = fbCache.fullscreenClock === 'true';
            if (fsEnabled) {
                fsOverlay.classList.remove('hidden');
                updateFullscreenClock();
                if (!window._fsParticlesCreated) {
                    createFsParticles();
                    window._fsParticlesCreated = true;
                }
            } else {
                fsOverlay.classList.add('hidden');
            }
        }

        // Auto-Scroll Toggle
        const autoScrollIndicator = document.getElementById('autoScrollIndicator');
        const autoScrollEnabled = fbCache.autoScrollEnabled === 'true';
        if (autoScrollIndicator) {
            if (autoScrollEnabled) {
                autoScrollIndicator.classList.remove('hidden');
                startAutoScroll();
            } else {
                autoScrollIndicator.classList.add('hidden');
                stopAutoScroll();
            }
        }
    }

    // --- Firebase Real-Time Listener (replaces localStorage 'storage' event) ---
    // This fires on initial load AND whenever any device writes to Firebase
    db.ref('dashboard').on('value', (snapshot) => {
        fbCache = snapshot.val() || {};
        updateFromStorage();
    });

    // --- Fullscreen Clock Helpers ---
    function updateFullscreenClock() {
        const liveTimer = fbCache.liveTimer;
        const timerStartTs = fbCache.timerStartTs;
        const timerRunning = fbCache.timerRunning === 'true';
        const pausedRemaining = fbCache.timerPausedRemaining;

        const fsHours = document.getElementById('fs-hours');
        const fsMinutes = document.getElementById('fs-minutes');
        const fsSeconds = document.getElementById('fs-seconds');

        if (!liveTimer || !fsHours || !fsMinutes || !fsSeconds) return;

        const parts = liveTimer.split(':');
        const initialH = parseInt(parts[0] || '0', 10);
        const initialM = parseInt(parts[1] || '0', 10);
        const initialS = parseInt(parts[2] || '0', 10);
        const initialTotalSeconds = (initialH * 3600) + (initialM * 60) + initialS;

        let currentTotalSeconds = initialTotalSeconds;

        if (timerRunning && timerStartTs) {
            const startTs = parseInt(timerStartTs, 10);
            const now = Date.now();
            const elapsedSeconds = Math.floor((now - startTs) / 1000);
            currentTotalSeconds = initialTotalSeconds - elapsedSeconds;
        } else if (pausedRemaining) {
            currentTotalSeconds = parseInt(pausedRemaining, 10);
        }

        if (currentTotalSeconds < 0) currentTotalSeconds = 0;

        fsHours.textContent = Math.floor(currentTotalSeconds / 3600).toString().padStart(2, '0');
        fsMinutes.textContent = Math.floor((currentTotalSeconds % 3600) / 60).toString().padStart(2, '0');
        fsSeconds.textContent = (currentTotalSeconds % 60).toString().padStart(2, '0');
    }

    function createFsParticles() {
        const container = document.getElementById('fsParticles');
        if (!container) return;
        const colors = ['rgba(14, 165, 233, 0.4)', 'rgba(139, 92, 246, 0.3)', 'rgba(16, 185, 129, 0.3)', 'rgba(56, 189, 248, 0.3)'];
        for (let i = 0; i < 30; i++) {
            const p = document.createElement('div');
            p.className = 'fs-particle';
            p.style.left = Math.random() * 100 + '%';
            p.style.background = colors[Math.floor(Math.random() * colors.length)];
            p.style.width = (2 + Math.random() * 3) + 'px';
            p.style.height = p.style.width;
            p.style.animationDuration = (8 + Math.random() * 12) + 's';
            p.style.animationDelay = (Math.random() * 10) + 's';
            container.appendChild(p);
        }
    }

    // --- Auto-Scroll Logic ---
    let autoScrollInterval = null;
    let autoScrollDirection = 1; // 1 = down, -1 = up
    let autoScrollPaused = false;
    let autoScrollResumeTimeout = null;

    function startAutoScroll() {
        if (autoScrollInterval) return; // already running
        const scrollArea = document.querySelector('.scroll-area');
        if (!scrollArea) return;

        autoScrollDirection = 1;

        // Pause on user interaction
        const pauseScrollTemporarily = () => {
            autoScrollPaused = true;
            clearTimeout(autoScrollResumeTimeout);
            autoScrollResumeTimeout = setTimeout(() => {
                autoScrollPaused = false;
            }, 5000);
        };

        scrollArea.addEventListener('wheel', pauseScrollTemporarily);
        scrollArea.addEventListener('touchstart', pauseScrollTemporarily);
        scrollArea.addEventListener('mousedown', pauseScrollTemporarily);

        autoScrollInterval = setInterval(() => {
            if (autoScrollPaused) return;

            const maxScroll = scrollArea.scrollHeight - scrollArea.clientHeight;
            if (maxScroll <= 0) return;

            scrollArea.scrollTop += autoScrollDirection * 1;

            // Reached the bottom
            if (scrollArea.scrollTop >= maxScroll) {
                autoScrollPaused = true;
                setTimeout(() => {
                    // Smooth scroll back to the top
                    scrollArea.scrollTo({ top: 0, behavior: 'smooth' });
                    setTimeout(() => {
                        autoScrollPaused = false;
                    }, 2000);
                }, 3000);
            }
        }, 30);
    }

    function stopAutoScroll() {
        if (autoScrollInterval) {
            clearInterval(autoScrollInterval);
            autoScrollInterval = null;
        }
        clearTimeout(autoScrollResumeTimeout);
        autoScrollPaused = false;
    }

    // --- 5. Theme Toggle Logic ---
    const themeToggleBtn = document.getElementById('theme-toggle');

    function tickTimer() {
        const liveTimer = fbCache.liveTimer;
        const timerStartTs = fbCache.timerStartTs;
        const timerRunning = fbCache.timerRunning === 'true';
        const pausedRemaining = fbCache.timerPausedRemaining;

        const sidebarTimerDisplay = document.getElementById('sidebar-countdown-display');

        if (liveTimer && sidebarTimerDisplay) {
            const parts = liveTimer.split(':');
            const initialH = parseInt(parts[0] || '0', 10);
            const initialM = parseInt(parts[1] || '0', 10);
            const initialS = parseInt(parts[2] || '0', 10);
            const initialTotalSeconds = (initialH * 3600) + (initialM * 60) + initialS;

            let currentTotalSeconds = initialTotalSeconds;

            if (timerRunning && timerStartTs) {
                const startTs = parseInt(timerStartTs, 10);
                const now = Date.now();
                const elapsedSeconds = Math.floor((now - startTs) / 1000);
                currentTotalSeconds = initialTotalSeconds - elapsedSeconds;
            } else if (pausedRemaining) {
                currentTotalSeconds = parseInt(pausedRemaining, 10);
            }

            if (currentTotalSeconds < 0) currentTotalSeconds = 0;

            const h = Math.floor(currentTotalSeconds / 3600).toString().padStart(2, '0');
            const m = Math.floor((currentTotalSeconds % 3600) / 60).toString().padStart(2, '0');
            const s = (currentTotalSeconds % 60).toString().padStart(2, '0');

            sidebarTimerDisplay.innerHTML = `
                    <span class="time-unit text-gradient-1">${h}<small>H</small></span><span style="color:var(--text-muted); font-size: 1.2rem;">:</span>
                    <span class="time-unit text-gradient-1">${m}<small>M</small></span><span style="color:var(--text-muted); font-size: 1.2rem;">:</span>
                    <span class="time-unit text-gradient-1">${s}<small>S</small></span>
            `;
        }
    }

    // Run interval locally to keep dashboard timer ticking autonomously
    setInterval(() => {
        if (fbCache.timerRunning === 'true') {
            tickTimer();
            // Also update fullscreen clock if visible
            const fsOverlay = document.getElementById('fullscreenClockOverlay');
            if (fsOverlay && !fsOverlay.classList.contains('hidden')) {
                updateFullscreenClock();
            }
        }
    }, 1000);

    // --- Theme Toggle Below ---
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);

        // Toggle icon
        const icon = themeToggleBtn.querySelector('i');
        if (newTheme === 'light') {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
            Chart.defaults.color = '#475569';
            Chart.defaults.borderColor = 'rgba(0, 0, 0, 0.1)';
        } else {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
            Chart.defaults.color = '#94a3b8';
            Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.05)';
        }

        // Update all chart typography and border colors
        for (let id in Chart.instances) {
            const chart = Chart.instances[id];

            if (chart.config.type === 'radar') {
                if (chart.options.scales.r.pointLabels) {
                    chart.options.scales.r.pointLabels.color = newTheme === 'light' ? '#475569' : '#cbd5e1';
                    chart.options.scales.r.angleLines.color = newTheme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
                    chart.options.scales.r.grid.color = newTheme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
                }
            }

            chart.update();
        }
    });

    // --- 6. Interactivity & Options ---

    // Nav Items Active State
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function () {
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Top Header Buttons - Admin Panel
    const adminPanelBtn = document.getElementById('adminPanelBtn');

    if (adminPanelBtn) {
        adminPanelBtn.addEventListener('click', () => {
            window.open('admin.html', '_blank');
        });
    }

    // Chart Options Buttons
    const chartOptionBtns = document.querySelectorAll('.section-header .icon-btn.small');
    chartOptionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            alert('Chart export and advanced options menu opened.');
        });
    });

    // Evaluation Filter
    const evalFilter = document.getElementById('phaseFilter');
    if (evalFilter && ctxRadar) {
        evalFilter.addEventListener('change', (e) => {
            const chart = Chart.getChart(ctxRadar);
            const list = document.getElementById('criteriaList');
            const title = document.getElementById('criteriaTitle');

            if (chart && list && title) {
                const phase = e.target.value;

                if (phase === 'Phase 1') {
                    title.textContent = 'Phase 1 Evaluation Criteria';
                    list.innerHTML = `
                        <li><span class="dot c-1"></span> Problem Identification & Relevance</li>
                        <li><span class="dot c-2"></span> Clarity of Idea & Solution</li>
                        <li><span class="dot c-3"></span> Innovation & Originality</li>
                    `;
                    chart.data.labels = ['Relevance', 'Clarity', 'Innovation'];
                    chart.data.datasets[0].data = [8.5, 9.0, 7.5];
                    chart.data.datasets[0].label = 'Phase 1 Average';
                } else if (phase === 'Phase 2') {
                    title.textContent = 'Phase 2 Evaluation Criteria';
                    list.innerHTML = `
                        <li><span class="dot c-1"></span> System Design & Architecture</li>
                        <li><span class="dot c-2"></span> Technology & Tool Selection</li>
                        <li><span class="dot c-3"></span> Implementation Progress</li>
                        <li><span class="dot c-4"></span> Use of Judging & Feedback</li>
                        <li><span class="dot c-5"></span> Team Collaboration</li>
                    `;
                    chart.data.labels = ['Format & Arch', 'Tech Stack', 'Progress', 'Judging', 'Collaboration'];
                    chart.data.datasets[0].data = [7.5, 8.0, 8.5, 7.0, 8.0];
                    chart.data.datasets[0].label = 'Phase 2 Average';
                } else if (phase === 'Phase 3') {
                    title.textContent = 'Phase 3 Evaluation Criteria';
                    list.innerHTML = `
                        <li><span class="dot c-1"></span> Implementation of Suggestions</li>
                        <li><span class="dot c-2"></span> Prototype Functionality & Refinement</li>
                        <li><span class="dot c-3"></span> Presentation & Demonstration</li>
                    `;
                    chart.data.labels = ['Feedback', 'Functionality', 'Presentation'];
                    chart.data.datasets[0].data = [8.8, 8.5, 9.0];
                    chart.data.datasets[0].label = 'Phase 3 Average';
                }

                chart.update();
            }
        });
    }

    // Leaderboard Search Filter
    const searchInput = document.querySelector('.search-box input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#leaderboardBody tr');

            rows.forEach(row => {
                if (row.children.length === 1) return;

                const text = row.textContent.toLowerCase();
                if (text.includes(searchTerm)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }

    // --- Live Announcement Logic ---
    const announcementModal = document.getElementById('announcementModal');
    const announcementText = document.getElementById('announcementText');
    const closeAnnouncementBtn = document.getElementById('closeAnnouncement');

    // Make it globally accessible so the main Firebase listener can trigger it
    window.updateAnnouncement = function () {
        if (!announcementModal || !announcementText) return;

        const showGlobal = fbCache.showAnnouncement === 'true';
        const msg = fbCache.announcementMessage || '';
        const timestamp = fbCache.announcementTimestamp || '0';

        // If the admin turned it off, hide it
        if (!showGlobal) {
            announcementModal.classList.remove('show');
            return;
        }

        // Check if the current broadcast was already dismissed by this client
        const dismissedTimestamp = sessionStorage.getItem('dismissedAnnouncementTs');
        if (timestamp !== '0' && timestamp === dismissedTimestamp) {
            return;
        }

        if (msg.trim() !== '') {
            announcementText.textContent = msg;
            announcementModal.classList.add('show');
        } else {
            announcementModal.classList.remove('show');
        }
    }

    if (closeAnnouncementBtn) {
        closeAnnouncementBtn.addEventListener('click', () => {
            announcementModal.classList.remove('show');
            const currentTs = fbCache.announcementTimestamp || '0';
            sessionStorage.setItem('dismissedAnnouncementTs', currentTs);
        });
    }

});

// --- 7. Global Action Methods ---
window.unlockResults = function () {
    const lock = document.getElementById('resultsLock');
    const podium = document.getElementById('resultsPodium');
    const placeholders = document.querySelectorAll('.placeholderblur');

    lock.classList.add('hidden');
    podium.classList.remove('hidden');

    setTimeout(() => {
        placeholders.forEach(el => el.classList.add('unblurred'));
    }, 800);
};
