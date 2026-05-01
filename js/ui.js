// Manages DOM, playlist render, search, edit modal, equalizer effect
window.uiManager = (function() {
  let currentRenderSongs = [];
  let searchTerm = '';
  let onPlayRequest = null, onDeleteRequest = null, onEditSave = null;
  let eqInterval = null;

  function renderPlaylist(songs, activeSongId, isPlaying) {
    const container = document.getElementById('playlistContainer');
    if (!container) return;
    if (!songs.length) {
      container.innerHTML = '<div class="empty-playlist">✨ No songs yet. Upload some ✨</div>';
      document.getElementById('songCount').innerText = '0 songs';
      return;
    }
    document.getElementById('songCount').innerText = `${songs.length} songs`;
    let filtered = filterSongsBySearch(songs, searchTerm);
    filtered = prioritizeStartsWith(filtered, searchTerm);
    container.innerHTML = '';
    filtered.forEach(song => {
      const item = document.createElement('div');
      item.className = 'song-item';
      if (activeSongId === song.id) item.style.borderLeft = '4px solid #dc96ff';
      item.innerHTML = `
        <div class="song-info-play" data-id="${song.id}">
          <span class="song-title">${escapeHtml(song.title)} ${activeSongId === song.id && isPlaying ? '🔊' : ''}</span>
          <span class="song-artist">${escapeHtml(song.artist || 'Unknown Artist')}</span>
        </div>
        <span class="song-duration">${utils.formatTime(song.duration)}</span>
        <div class="song-actions">
          <button class="edit-btn" data-id="${song.id}" title="Edit">✏️</button>
          <button class="delete-btn" data-id="${song.id}" title="Delete">🗑️</button>
        </div>
      `;
      container.appendChild(item);
    });
    attachPlaylistEvents(container);
  }

  function filterSongsBySearch(songs, term) {
    if (!term.trim()) return [...songs];
    return songs.filter(s => s.title.toLowerCase().includes(term.toLowerCase()));
  }
  
  function prioritizeStartsWith(songs, term) {
    if (!term.trim()) return songs.sort((a,b) => a.title.localeCompare(b.title));
    const termLow = term.toLowerCase();
    const starts = songs.filter(s => s.title.toLowerCase().startsWith(termLow));
    const includes = songs.filter(s => s.title.toLowerCase().includes(termLow) && !s.title.toLowerCase().startsWith(termLow));
    const rest = songs.filter(s => !s.title.toLowerCase().includes(termLow));
    return [...starts, ...includes, ...rest].sort((a,b) => a.title.localeCompare(b.title));
  }

  function attachPlaylistEvents(container) {
    container.querySelectorAll('.song-info-play').forEach(el => {
      el.addEventListener('click', (e) => {
        const id = el.getAttribute('data-id');
        if (onPlayRequest) onPlayRequest(id);
      });
    });
    container.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        if (onEditSave) onEditSave(id);
      });
    });
    container.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        if (onDeleteRequest) onDeleteRequest(id);
      });
    });
  }

  function showEditModal(song, onSaveCallback) {
    const modalDiv = document.createElement('div');
    modalDiv.className = 'modal-overlay';
    modalDiv.innerHTML = `
      <div class="edit-modal">
        <h3 style="color:#decbff">Edit Song</h3>
        <input id="editTitle" value="${escapeHtml(song.title)}" placeholder="Title" />
        <input id="editArtist" value="${escapeHtml(song.artist || '')}" placeholder="Artist" />
        <div class="modal-buttons">
          <button class="neon-btn small" id="saveEditBtn">Save</button>
          <button class="neon-btn small" id="cancelEditBtn">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modalDiv);
    const saveBtn = modalDiv.querySelector('#saveEditBtn');
    const cancelBtn = modalDiv.querySelector('#cancelEditBtn');
    const titleInput = modalDiv.querySelector('#editTitle');
    const artistInput = modalDiv.querySelector('#editArtist');
    saveBtn.onclick = () => {
      const newTitle = titleInput.value.trim() || song.title;
      const newArtist = artistInput.value.trim();
      onSaveCallback(song.id, newTitle, newArtist);
      modalDiv.remove();
    };
    cancelBtn.onclick = () => modalDiv.remove();
  }

  function updateNowPlaying(song, isPlaying) {
    const titleEl = document.getElementById('currentTitle');
    const artistEl = document.getElementById('currentArtist');
    if (song) {
      titleEl.innerText = song.title || '♫';
      artistEl.innerText = song.artist || '✨ Artist';
    } else {
      titleEl.innerText = '✨ Select a song';
      artistEl.innerText = '— waiting for vibe —';
    }
    const eqAnimDiv = document.getElementById('eqAnim');
    if (isPlaying && song) {
      eqAnimDiv.classList.add('playing-active');
      startEqualizerAnimation();
    } else {
      eqAnimDiv.classList.remove('playing-active');
      stopEqualizerAnimation();
    }
  }

  function startEqualizerAnimation() {
    const lines = document.querySelectorAll('#eqAnim .eq-line');
    if (!eqInterval) {
      eqInterval = setInterval(() => {
        lines.forEach(line => {
          const h = Math.floor(Math.random() * 24) + 8;
          line.style.height = h + 'px';
        });
      }, 200);
    }
  }
  
  function stopEqualizerAnimation() {
    if (eqInterval) { clearInterval(eqInterval); eqInterval = null; }
    const lines = document.querySelectorAll('#eqAnim .eq-line');
    lines.forEach(l => l.style.height = '12px');
  }

  function updateProgress(current, duration) {
    const fill = document.getElementById('progressFill');
    const curSpan = document.getElementById('currentTime');
    const durSpan = document.getElementById('durationDisplay');
    if (fill && curSpan && durSpan) {
      const percent = duration ? (current / duration) * 100 : 0;
      fill.style.width = `${percent}%`;
      curSpan.innerText = utils.formatTime(current);
      durSpan.innerText = utils.formatTime(duration);
    }
  }

  function escapeHtml(str) { 
    if(!str) return ''; 
    return str.replace(/[&<>]/g, function(m){
      if(m==='&') return '&amp;'; 
      if(m==='<') return '&lt;'; 
      if(m==='>') return '&gt;'; 
      return m;
    });
  }
  
  function setSearchInputHandler(handler) { 
    document.getElementById('searchInput').addEventListener('input', (e) => handler(e.target.value)); 
  }
  
  function setCallbacks(playFn, deleteFn, editFn) { 
    onPlayRequest = playFn; 
    onDeleteRequest = deleteFn; 
    onEditSave = editFn; 
  }

  return { 
    renderPlaylist, 
    updateNowPlaying, 
    updateProgress, 
    showEditModal, 
    setSearchInputHandler, 
    setCallbacks, 
    stopEqualizerAnimation,
    startEqualizerAnimation
  };
})();