/* ============================================================
   GEHEIMNISSE DER DDR – app.js
   Gemeinsame Spiellogik für alle Akten
   Erstellt: März 2026 | Autor: Jonas Engeler
   ============================================================ */

/* ── KONSTANTEN ── */
var PROGRESS_KEY = 'ddr_progress_v1';
var TEACHER_KEY  = 'ddr_teacher_v1';
const MUSIC_KEY  = 'ddr_music_v1';
const TRACK_KEY  = 'ddr_track_v1';

/* ── MUSIK-TRACKS ── */
const TRACKS = [
  { name: 'Challenge',  src: '../audio/track-challenge.mp3'  },
  { name: 'Thinking',   src: '../audio/track-thinking.mp3'   },
  { name: 'Mission',    src: '../audio/track-mission.mp3'    },
  { name: 'Escape',     src: '../audio/track-escape.mp3'     },
  { name: 'Focus',      src: '../audio/track-focus.mp3'      }
];

var _musicEl  = null;
var _musicOn  = false;
var _trackIdx = 0;

/* ── FORTSCHRITT ── */
function getProgress() {
  try {
    var raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch(e) { return {}; }
}

function saveProgress(p) {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch(e) {}
}

function isTaskDone(mappeNum, taskKey) {
  var p = getProgress();
  return !!(p.completedTasks &&
            p.completedTasks[mappeNum] &&
            p.completedTasks[mappeNum].indexOf(String(taskKey)) !== -1);
}

function markTaskDone(mappeNum, taskKey) {
  var p = getProgress();
  if (!p.completedTasks) p.completedTasks = {};
  if (!p.completedTasks[mappeNum]) p.completedTasks[mappeNum] = [];
  var key = String(taskKey);
  if (p.completedTasks[mappeNum].indexOf(key) === -1) {
    p.completedTasks[mappeNum].push(key);
  }
  saveProgress(p);
}

/* ── LEHRER-MODUS ── */
function isTeacherMode() {
  return sessionStorage.getItem(TEACHER_KEY) === '1';
}

/* ── KAPITEL ENTSPERREN ── */
function unlockNextMappe(currentNum) {
  var nextNum = currentNum + 1;
  var p = getProgress();
  if (!Array.isArray(p.unlockedMappes)) p.unlockedMappes = [1];
  if (p.unlockedMappes.indexOf(nextNum) === -1) {
    p.unlockedMappes.push(nextNum);
  }
  markTaskDone(currentNum, 'done');
  saveProgress(p);

  sessionStorage.setItem(MUSIC_KEY, 'on');
  // Konfetti + kurze Verzögerung, dann weiter
  if (typeof launchConfetti === 'function') launchConfetti();

  setTimeout(function() {
    if (nextNum <= 7) {
      window.location.href = 'akte-0' + nextNum + '.html';
    }
  }, 2200);
}

/* ── FEEDBACK ANZEIGEN ── */
function showFeedback(id, message, type) {
  var el = document.getElementById(id);
  if (!el) return;
  el.className = 'feedback-area ' + (type || '');
  el.innerHTML = message;
  // Scroll ins Sichtfeld
  setTimeout(function() {
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 50);
}

/* ── AUFGABE ABSCHLIESSEN ── */
function completeTask(n) {
  var taskEl = document.getElementById('task-' + n);
  if (taskEl) taskEl.classList.add('completed');

  var nb = document.getElementById('next-btn-' + n);
  if (nb) nb.style.display = 'inline-flex';

  // Sidebar aktualisieren
  var si = document.querySelector('.task-list [data-task="' + n + '"] .task-status');
  if (si) si.textContent = '✓';
  var navItem = document.querySelector('.task-list [data-task="' + n + '"]');
  if (navItem) {
    navItem.classList.remove('active');
    navItem.classList.add('completed');
  }
  var nextItem = document.querySelector('.task-list [data-task="' + (n + 1) + '"]');
  if (nextItem) {
    nextItem.classList.remove('locked');
    var nextStatus = nextItem.querySelector('.task-status');
    if (nextStatus) nextStatus.textContent = '';
  }

  // Sound + Stempel – PFLICHT
  if (typeof playSound === 'function') playSound('correct');
  if (typeof showStamp === 'function') showStamp(n);

  // Fortschritt speichern
  var mappeNum = window._MAPPE_NUM || 1;
  markTaskDone(mappeNum, n);
}

/* ── NÄCHSTE AUFGABE ZEIGEN ── */
function showTask(n) {
  var taskEl = document.getElementById('task-' + n);
  if (!taskEl) return;
  taskEl.classList.add('visible');

  // Sidebar
  var navItem = document.querySelector('.task-list [data-task="' + n + '"]');
  if (navItem) {
    document.querySelectorAll('.task-nav-item.active').forEach(function(el) {
      el.classList.remove('active');
    });
    navItem.classList.remove('locked');
    navItem.classList.add('active');
    var st = navItem.querySelector('.task-status');
    if (st) st.textContent = '';
  }

  // Scroll
  setTimeout(function() {
    taskEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);

  // Code-Section nach letzter Aufgabe
  if (n === (window._TOTAL_TASKS || 5)) {
    var nextBtn = document.getElementById('next-btn-' + n);
    if (nextBtn) {
      nextBtn.onclick = function() {
        revealCodeSection();
        var codeItem = document.querySelector('.task-list [data-task="code"]');
        if (codeItem) {
          codeItem.classList.remove('locked');
          document.querySelectorAll('.task-nav-item.active').forEach(function(el) {
            el.classList.remove('active');
          });
          codeItem.classList.add('active');
          var st = codeItem.querySelector('.task-status');
          if (st) st.textContent = '';
        }
      };
    }
  }
}

/* ── CODE-SECTION ANZEIGEN ── */
function revealCodeSection() {
  var cs = document.getElementById('code-section');
  if (!cs) return;
  cs.style.display = 'block';
  setTimeout(function() {
    cs.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

/* ── STEMPEL-ANIMATION ── */
function showStamp(n) {
  var card = document.querySelector('#task-' + n + ' .document-card');
  if (!card) return;

  // Verhindere Doppelung
  if (card.querySelector('.analysiert-stamp')) return;

  var stamp = document.createElement('div');
  stamp.className = 'analysiert-stamp';
  stamp.textContent = 'ANALYSIERT ✓';
  card.style.position = 'relative';
  card.appendChild(stamp);

  requestAnimationFrame(function() {
    stamp.classList.add('show');
  });

  setTimeout(function() {
    stamp.style.opacity = '0.35';
    stamp.style.transition = 'opacity 1s ease';
  }, 1500);
}

/* ── WEB AUDIO: SOUND ── */
var _audioCtx = null;
function _getAudioCtx() {
  if (!_audioCtx) {
    try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
  }
  return _audioCtx;
}

function playSound(type) {
  var ctx = _getAudioCtx();
  if (!ctx) return;
  try {
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'correct') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(784, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(); osc.stop(ctx.currentTime + 0.4);
    } else if (type === 'wrong') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(); osc.stop(ctx.currentTime + 0.35);
    } else if (type === 'unlock') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(392, ctx.currentTime);
      osc.frequency.setValueAtTime(523, ctx.currentTime + 0.12);
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.24);
      osc.frequency.setValueAtTime(784, ctx.currentTime + 0.36);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
      osc.start(); osc.stop(ctx.currentTime + 0.7);
    } else if (type === 'warning') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(330, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(); osc.stop(ctx.currentTime + 0.3);
    }
  } catch(e) {}
}

/* ── KONFETTI ── */
function launchConfetti() {
  var canvas = document.createElement('canvas');
  canvas.id = 'confetti-canvas';
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
  document.body.appendChild(canvas);
  var ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  var pieces = [];
  var colors = ['#c9a227','#8b1a1a','#e8e0d4','#27ae60','#2980b9','#e67e22','#f5f0e8'];
  for (var i = 0; i < 120; i++) {
    pieces.push({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height * 0.5 - 20,
      w: 8 + Math.random() * 8,
      h: 6 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.2,
      vx: (Math.random() - 0.5) * 3,
      vy: 2 + Math.random() * 4
    });
  }

  var frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(function(p) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
      ctx.restore();
      p.x += p.vx;
      p.y += p.vy;
      p.angle += p.spin;
      p.vy += 0.06;
    });
    frame++;
    if (frame < 160) requestAnimationFrame(draw);
    else { canvas.remove(); }
  }
  draw();
}

/* ── MUSIK-PLAYER ── */
function initMusicPlayer() {
  // Prüfen ob Musik gewünscht
  var musicWanted = sessionStorage.getItem(MUSIC_KEY) === 'on';
  var savedIdx = parseInt(sessionStorage.getItem(TRACK_KEY) || '0', 10);
  if (isNaN(savedIdx) || savedIdx < 0 || savedIdx >= TRACKS.length) savedIdx = 0;
  _trackIdx = savedIdx;

  // Player-HTML erzeugen
  var player = document.createElement('div');
  player.id = 'music-player';
  player.innerHTML =
    '<button class="music-btn" onclick="changeTrack(-1)" aria-label="Vorheriger Track">&#8249;</button>' +
    '<button class="music-btn music-main-btn" id="music-toggle-btn" onclick="toggleMusic()" aria-label="Musik ein/aus">&#9834;</button>' +
    '<span class="music-label" id="music-track-label">' + TRACKS[_trackIdx].name + '</span>' +
    '<button class="music-btn" onclick="changeTrack(1)" aria-label="Nächster Track">&#8250;</button>';
  document.body.appendChild(player);

  // Audio-Element
  _musicEl = document.createElement('audio');
  _musicEl.loop = true;
  _musicEl.volume = 0.35;
  _musicEl.src = TRACKS[_trackIdx].src;
  document.body.appendChild(_musicEl);

  if (musicWanted) {
    _musicOn = true;
    player.classList.add('music-on');
    _musicEl.play().catch(function() {
      _musicOn = false;
      sessionStorage.removeItem(MUSIC_KEY);
      _updateMusicBtn();
      // Autoplay-Retry: erster Klick startet Musik
      document.addEventListener('click', function _resumeOnClick() {
        document.removeEventListener('click', _resumeOnClick);
        if (_musicEl && !_musicOn) {
          _musicEl.play().then(function() {
            _musicOn = true;
            sessionStorage.setItem(MUSIC_KEY, 'on');
            _updateMusicBtn();
          }).catch(function() {});
        }
      }, { once: true });
    });
  }
}

function _updateMusicBtn() {
  var player = document.getElementById('music-player');
  if (!player) return;
  if (_musicOn) {
    player.classList.add('music-on');
  } else {
    player.classList.remove('music-on');
  }
  var label = document.getElementById('music-track-label');
  if (label) label.textContent = TRACKS[_trackIdx].name;
}

function toggleMusic() {
  if (!_musicEl) return;
  _musicOn = !_musicOn;
  if (_musicOn) {
    _musicEl.src = TRACKS[_trackIdx].src;
    _musicEl.play().catch(function() { _musicOn = false; });
    sessionStorage.setItem(MUSIC_KEY, 'on');
  } else {
    _musicEl.pause();
    sessionStorage.removeItem(MUSIC_KEY);
  }
  _updateMusicBtn();
}

function changeTrack(dir) {
  _trackIdx = (_trackIdx + dir + TRACKS.length) % TRACKS.length;
  sessionStorage.setItem(TRACK_KEY, String(_trackIdx));
  if (_musicEl) {
    _musicEl.src = TRACKS[_trackIdx].src;
    if (_musicOn) _musicEl.play().catch(function() {});
  }
  _updateMusicBtn();
}

/* ── KAPITEL-NAVIGATION AKTUALISIEREN ── */
function updateChapterNav(currentNum) {
  var p = getProgress();
  var unlocked = Array.isArray(p.unlockedMappes) ? p.unlockedMappes : [1];
  var completed = p.completedTasks || {};

  for (var i = 1; i <= 7; i++) {
    var circle = document.querySelector('.chapter-circle[data-mappe="' + i + '"]');
    if (!circle) continue;

    circle.classList.remove('active', 'completed', 'locked');

    if (i === currentNum) {
      circle.classList.add('active');
    } else if (completed[i] && completed[i].indexOf('done') !== -1) {
      circle.classList.add('completed');
      circle.textContent = '✓';
    } else if (unlocked.indexOf(i) === -1 && !isTeacherMode()) {
      circle.classList.add('locked');
    }
  }

  // Pfeile
  var prev = document.getElementById('prev-mappe');
  var next = document.getElementById('next-mappe');
  if (prev) {
    if (currentNum > 1) {
      prev.href = 'akte-0' + (currentNum - 1) + '.html';
      prev.style.opacity = '1';
    } else {
      prev.href = '#';
      prev.style.opacity = '0.3';
      prev.style.pointerEvents = 'none';
    }
  }
  if (next) {
    if (currentNum < 7 && (isTeacherMode() || unlocked.indexOf(currentNum + 1) !== -1)) {
      next.href = 'akte-0' + (currentNum + 1) + '.html';
      next.style.opacity = '1';
    } else {
      next.href = '#';
      next.style.opacity = '0.3';
      next.style.pointerEvents = 'none';
    }
  }
}

/* ── FORTSCHRITT WIEDERHERSTELLEN ── */
function restoreTaskProgress(mappeNum, numTasks) {
  var allTasksDone = true;
  for (var i = 1; i <= numTasks; i++) {
    if (isTaskDone(mappeNum, i)) {
      var taskEl = document.getElementById('task-' + i);
      if (taskEl) {
        taskEl.classList.add('visible', 'completed');
        var si = document.querySelector('.task-list [data-task="' + i + '"] .task-status');
        if (si) si.textContent = '✓';
        var navItem = document.querySelector('.task-list [data-task="' + i + '"]');
        if (navItem) { navItem.classList.remove('locked', 'active'); navItem.classList.add('completed'); }
      }
      if (i < numTasks) {
        var nextEl = document.getElementById('task-' + (i + 1));
        if (nextEl) nextEl.classList.add('visible');
      }
    } else {
      allTasksDone = false;
    }
  }

  // Code-Section NUR bei 'done'-Key (Sicherheits-Bug-Fix!)
  if (isTaskDone(mappeNum, 'done')) {
    revealCodeSection();
    var codeItem = document.querySelector('.task-list [data-task="code"]');
    if (codeItem) {
      codeItem.classList.remove('locked');
      codeItem.classList.add('completed');
      var st = codeItem.querySelector('.task-status');
      if (st) st.textContent = '✓';
    }
  } else if (allTasksDone) {
    // Alle Aufgaben gelöst, aber Code noch nicht eingegeben
    var lastBtn = document.getElementById('next-btn-' + numTasks);
    if (lastBtn) lastBtn.style.display = 'inline-flex';
  }
}

/* ── LEHRER-UI ── */
function addTeacherUI() {
  if (!isTeacherMode()) return;
  var btn = document.createElement('button');
  btn.id = 'teacher-floating-btn';
  btn.textContent = '👩‍🏫 Lehrer-Modus aktiv';
  btn.onclick = exitTeacherMode;
  document.body.appendChild(btn);
}

function exitTeacherMode() {
  sessionStorage.removeItem(TEACHER_KEY);
  window.location.reload();
}

/* ── INIT APP ── */
function initApp(mappeNum, totalTasks) {
  window._MAPPE_NUM   = mappeNum;
  window._TOTAL_TASKS = totalTasks;

  updateChapterNav(mappeNum);
  restoreTaskProgress(mappeNum, totalTasks);
  addTeacherUI();
  initMusicPlayer();

  // Sidebar Toggle
  var toggle = document.getElementById('sidebar-toggle');
  var sidebar = document.getElementById('task-sidebar');
  if (toggle && sidebar) {
    toggle.addEventListener('click', function() {
      sidebar.style.display = sidebar.style.display === 'none' ? '' : 'none';
    });
  }

  // Task-Nav Klick
  document.querySelectorAll('.task-nav-item').forEach(function(item) {
    item.addEventListener('click', function() {
      var taskNum = item.dataset.task;
      if (taskNum === 'code') {
        var cs = document.getElementById('code-section');
        if (cs && cs.style.display !== 'none') {
          cs.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } else {
        var taskEl = document.getElementById('task-' + taskNum);
        if (taskEl && taskEl.classList.contains('visible')) {
          taskEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });
}

/* ── INIT LANDING PAGE ── */
function initLandingPage() {
  // PFLICHT: Teacher-Session isolieren
  sessionStorage.removeItem('ddr_teacher_v1');

  var p = getProgress();
  var unlocked = Array.isArray(p.unlockedMappes) ? p.unlockedMappes : [1];
  var highest = 1;
  for (var i = 7; i >= 1; i--) {
    if (unlocked.indexOf(i) !== -1) { highest = i; break; }
  }

  // Start-Button
  var startBtn = document.querySelector('.start-btn');
  if (startBtn) {
    startBtn.addEventListener('click', function() {
      sessionStorage.setItem('ddr_music_v1', 'on');
      window.location.href = 'akten/akte-0' + highest + '.html';
    });
  }

  // Anleitung-Modal
  var anlBtn = document.querySelector('.anleitung-btn');
  if (anlBtn) anlBtn.addEventListener('click', openAnleitung);
}

function openAnleitung() {
  var overlay = document.getElementById('anleitung-overlay');
  if (overlay) overlay.classList.add('open');
}

function closeAnleitung() {
  var overlay = document.getElementById('anleitung-overlay');
  if (overlay) overlay.classList.remove('open');
}
