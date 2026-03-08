// --- 1. Global Configuration & State ---
let config = {
    triggerThreshold: 1800, 
    timeoutDuration: 1200   
};

let isCurrentlyLocked = false;

// --- 2. Storage Initialization & Listeners ---
function initSync() {
    chrome.storage.local.get(['config', 'timeoutExpiry', 'totalSecondsToday', 'lastDate'], (data) => {
        if (data.config) config = data.config;
        
        if (data.timeoutExpiry && data.timeoutExpiry > Date.now()) {
            showTimeoutUI(data.timeoutExpiry);
        }
    });
}

chrome.storage.onChanged.addListener((changes) => {
    if (changes.config) config = changes.config.newValue;
    
    if (changes.timeoutExpiry) {
        const expiry = changes.timeoutExpiry.newValue;
        if (expiry && expiry > Date.now()) {
            showTimeoutUI(expiry);
        } else {
            hideTimeoutUI();
        }
    }
});

// --- 3. The Core Timer (The Heartbeat) ---
// --- Updated Heartbeat for better Sync ---
function heartbeat() {
    // Only the tab you are currently looking at should "drive" the timer
    // This prevents multiple tabs from doubling or tripling the watch time
    if (document.hidden) return;

    chrome.storage.local.get(['timeoutExpiry', 'totalSecondsToday', 'lastDate'], (data) => {
        const now = Date.now();
        const today = new Date().getDate();

        // 1. Check if we are currently in a global timeout
        if (data.timeoutExpiry && data.timeoutExpiry > now) {
            updateCountdownText(data.timeoutExpiry);
            // Ensure the UI is showing if it's not already
            if (!isCurrentlyLocked) showTimeoutUI(data.timeoutExpiry);
            return; 
        } else if (data.timeoutExpiry && data.timeoutExpiry <= now) {
            // Timeout finished!
            chrome.storage.local.remove('timeoutExpiry');
            hideTimeoutUI();
            return;
        }

        // 2. Calculate Watch Time
        let total = data.totalSecondsToday || 0;
        
        // Reset if date changed
        if (data.lastDate !== today) {
            total = 0;
        } else {
            total += 1; // Increment by 1 second
        }
        
        // 3. Check against threshold
        if (total >= config.triggerThreshold) {
            const expiry = now + (config.timeoutDuration * 1000);
            // Trigger timeout globally
            chrome.storage.local.set({ 
                timeoutExpiry: expiry,
                totalSecondsToday: 0,
                lastDate: today
            });
        } else {
            // Regular update
            chrome.storage.local.set({ 
                totalSecondsToday: total, 
                lastDate: today 
            });
        }

        updateStatsUI(total);
        console.log("Current Watch Time:", total, "Limit:", config.triggerThreshold);
    });
}

// --- 4. Original Timeout UI (Restored Styling) ---
function showTimeoutUI(expiry) {
    if (isCurrentlyLocked) return;
    isCurrentlyLocked = true;

    const player = document.getElementById('movie_player');
    if (player && player.pauseVideo) player.pauseVideo();

    const ringRadius = 90;
    const ringCircumference = 2 * Math.PI * ringRadius;
    const totalMs = config.timeoutDuration * 1000;
    const remainingMs = expiry - Date.now();
    const initialOffset = ringCircumference - ((remainingMs / totalMs) * ringCircumference);

    const cover = document.createElement('div');
    cover.id = 'my-pro-timeout-cover';
    cover.innerHTML = `
        <div style="text-align: center; position: relative; width: 250px; height: 250px; display: flex; align-items: center; justify-content: center;">
            <svg style="position: absolute; transform: rotate(-90deg); overflow: visible;" width="200" height="200">
                <circle cx="100" cy="100" r="${ringRadius}" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="10" />
                <circle id="my-timeout-ring-progress" cx="100" cy="100" r="${ringRadius}" fill="none" stroke="white" stroke-width="10" stroke-linecap="round"
                        style="stroke-dasharray: ${ringCircumference}; stroke-dashoffset: ${initialOffset}; transition: stroke-dashoffset ${remainingMs}ms linear;" />
            </svg>
            <div style="position: relative; z-index: 10;">
                <h1 style="font-size: 5rem; margin: 0;">🌿</h1>
                <p style="font-size: 1.8rem; font-family: Roboto, Arial; margin: 10px 0 0 0; font-weight: 500;">Touch Grass</p>
                <p id="timeout-countdown" style="font-size: 1rem; opacity: 0.7; margin-top: 5px; font-family: Roboto, Arial;"></p>
            </div>
        </div>
    `;
    
    cover.style.cssText = `position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-color: #0f0f0f; color: white; z-index: 2147483647; display: flex; align-items: center; justify-content: center; flex-direction: column;`;
    document.body.appendChild(cover);
    document.body.style.overflow = 'hidden';

    requestAnimationFrame(() => {
        const ring = document.getElementById('my-timeout-ring-progress');
        if (ring) ring.style.strokeDashoffset = ringCircumference;
    });
}

function updateCountdownText(expiry) {
    const cd = document.getElementById('timeout-countdown');
    if (!cd) return;
    const diff = Math.ceil((expiry - Date.now()) / 1000);
    cd.textContent = `${Math.floor(diff / 60)}m ${diff % 60}s remaining`;
}

function hideTimeoutUI() {
    const cover = document.getElementById('my-pro-timeout-cover');
    if (cover) cover.remove();
    document.body.style.overflow = '';
    isCurrentlyLocked = false;
}

// --- 5. Original Popout & SVG Widget (Restored Styling) ---
function updateStatsUI(totalSeconds) {
    const timedom = document.getElementById('time');
    if (timedom) timedom.textContent = Math.round(totalSeconds / 60) + " mins watched today";
}

function injectProWidget() {
    const micButton = document.querySelector('#voice-search-button');
    if (!micButton || document.getElementById('my-pro-widget-container')) return;

    micButton.style.display = 'none';

    const container = document.createElement('div');
    container.id = 'my-pro-widget-container';
    container.style.cssText = `position: relative; display: inline-block;`;

    const myBtn = document.createElement('div');
    myBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="currentColor" d="M11 17a1 1 0 0 0 1 1a1 1 0 0 0 1-1a1 1 0 0 0-1-1a1 1 0 0 0-1 1m0-14v4h2V5.08c3.39.49 6 3.39 6 6.92a7 7 0 0 1-7 7a7 7 0 0 1-7-7c0-1.68.59-3.22 1.58-4.42L12 13l1.41-1.41l-6.8-6.8v.02C4.42 6.45 3 9.05 3 12a9 9 0 0 0 9 9a9 9 0 0 0 9-9a9 9 0 0 0-9-9m6 9a1 1 0 0 0-1-1a1 1 0 0 0-1 1a1 1 0 0 0 1 1a1 1 0 0 0 1-1M6 12a1 1 0 0 0 1 1a1 1 0 0 0 1-1a1 1 0 0 0-1-1a1 1 0 0 0-1 1"/></svg>';
    myBtn.style.cssText = `background-color: var(--yt-spec-badge-chip-background); color: var(--yt-spec-text-primary); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; margin-left: 8px;`;

    const popout = document.createElement('div');
    popout.id = 'my-pro-popout';
    popout.style.cssText = `position: absolute; top: 50px; right: -76px; width: 220px; background-color: var(--yt-spec-base-background, #0f0f0f); color: var(--yt-spec-text-primary, #fff); border-radius: 12px; box-shadow: 0 4px 32px 0 rgba(0,0,0,0.4); display: none; z-index: 9999; overflow: hidden; border: 1px solid var(--yt-spec-10-percent-layer); font-family: "Roboto", Arial, sans-serif;`;
    
    popout.innerHTML = `
        <div style="padding: 16px; border-bottom: 1px solid var(--yt-spec-10-percent-layer);">
            <strong style="display: block; margin-bottom: 4px;">Youtube Timeout</strong>
            <p style="font-size: 12px; color: var(--yt-spec-text-secondary);" id="date">${new Date().toLocaleDateString()}</p>
            <p style="font-size: 12px; color: var(--yt-spec-text-secondary);" id="time">0 mins watched today</p>
        </div>
        <div style="padding: 16px; display: flex; flex-direction: column; gap: 12px;">
            <div>
                <label style="display:block; font-size: 11px; color: var(--yt-spec-text-secondary); margin-bottom: 4px;">Watch Limit (sec)</label>
                <input type="number" id="cfg-trigger" value="${config.triggerThreshold}" style="width: 100%; background: var(--yt-spec-badge-chip-background); color: var(--yt-spec-text-primary); border: 1px solid var(--yt-spec-10-percent-layer); border-radius: 4px; padding: 4px;">
            </div>
            <div>
                <label style="display:block; font-size: 11px; color: var(--yt-spec-text-secondary); margin-bottom: 4px;">Break Duration (sec)</label>
                <input type="number" id="cfg-duration" value="${config.timeoutDuration}" style="width: 100%; background: var(--yt-spec-badge-chip-background); color: var(--yt-spec-text-primary); border: 1px solid var(--yt-spec-10-percent-layer); border-radius: 4px; padding: 4px;">
            </div>
            <button id="save-cfg" style="background-color: var(--yt-spec-text-primary); color: var(--yt-spec-base-background); border: none; padding: 6px; border-radius: 18px; font-weight: 500; cursor: pointer;">Save Settings</button>
        </div>
    `;

    myBtn.onclick = (e) => { e.stopPropagation(); popout.style.display = popout.style.display === 'block' ? 'none' : 'block'; };
    popout.onclick = (e) => e.stopPropagation();
    container.appendChild(myBtn);
    container.appendChild(popout);
    micButton.parentNode.insertBefore(container, micButton);

    document.getElementById('save-cfg').onclick = () => {
        config.triggerThreshold = parseInt(document.getElementById('cfg-trigger').value);
        config.timeoutDuration = parseInt(document.getElementById('cfg-duration').value);
        chrome.storage.local.set({ config });
        const btn = document.getElementById('save-cfg');
        btn.textContent = "Saved!";
        setTimeout(() => { btn.textContent = "Save Settings"; }, 1500);
    };
}

// --- 6. Init ---
window.addEventListener('click', () => {
    const pop = document.getElementById('my-pro-popout');
    if (pop) pop.style.display = 'none';
});

initSync();
setInterval(injectProWidget, 2000);
setInterval(heartbeat, 1000);