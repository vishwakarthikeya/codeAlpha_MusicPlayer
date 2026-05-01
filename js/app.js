// Main orchestration
(async function() {
  // get modules
  const db = window.dbManager;
  const player = window.playerModule;
  const ui = window.uiManager;
  
  let allSongs = [];

  async function loadSongsFromDB() {
    const songs = await db.getAllSongs();
    allSongs = songs;
    player.setSongs(allSongs);
    renderCurrentPlaylist();
    if (allSongs.length && !player.getCurrentSong()) {
      // optionally not autoplay.
    }
  }

  function renderCurrentPlaylist() {
    const current = player.getCurrentSong();
    const isPlaying = !player.getCurrentAudio().paused;
    ui.renderPlaylist(allSongs, current ? current.id : null, isPlaying);
  }

  async function uploadSongs(files) {
    for (let file of files) {
      if (file.type.startsWith('audio/')) {
        const duration = await utils.getAudioDuration(file);
        const title = prompt(`Title for "${file.name}"`, file.name.replace(/\.[^/.]+$/, ""));
        if (title === null) continue;
        const artist = prompt("Artist name (optional)", "K-pop Artist");
        const newSong = {
          id: utils.generateId(),
          title: title || file.name,
          artist: artist || '',
          duration: duration,
          file: file
        };
        await db.saveSong(newSong);
        allSongs.push(newSong);
      }
    }
    player.setSongs(allSongs);
    renderCurrentPlaylist();
  }

  async function deleteSongById(id) {
    await db.deleteSong(id);
    allSongs = allSongs.filter(s => s.id !== id);
    if (player.getCurrentSong() && player.getCurrentSong().id === id) {
      player.stop();
      ui.updateNowPlaying(null, false);
    }
    player.setSongs(allSongs);
    renderCurrentPlaylist();
  }

  async function editSong(id, newTitle, newArtist) {
    const song = allSongs.find(s => s.id === id);
    if (song) {
      song.title = newTitle;
      song.artist = newArtist;
      await db.updateSong(song);
      player.setSongs(allSongs);
      if (player.getCurrentSong() && player.getCurrentSong().id === id) {
        ui.updateNowPlaying(song, !player.getCurrentAudio().paused);
      }
      renderCurrentPlaylist();
    }
  }

  function playSongById(id) {
    player.playById(id);
  }

  // bind UI
  ui.setCallbacks(playSongById, deleteSongById, (id) => {
    const song = allSongs.find(s => s.id === id);
    if (song) ui.showEditModal(song, editSong);
  });
  
  ui.setSearchInputHandler((term) => {
    const filtered = allSongs.filter(s => s.title.toLowerCase().includes(term.toLowerCase()));
    const current = player.getCurrentSong();
    ui.renderPlaylist(filtered, current ? current.id : null, !player.getCurrentAudio().paused);
  });
  
  // player callbacks
  player.setCallbacks(
    () => renderCurrentPlaylist(),
    (cur, dur) => ui.updateProgress(cur, dur),
    (isPlaying, song) => ui.updateNowPlaying(song, isPlaying)
  );
  
  // volume & progress
  document.getElementById('volumeSlider').addEventListener('input', (e) => player.setVolume(parseFloat(e.target.value)));
  
  const playBtn = document.getElementById('playBtn');
  playBtn.addEventListener('click', () => { 
    if(player.getCurrentAudio().paused) player.play(); 
    else player.pause(); 
  });
  
  document.getElementById('stopBtn').addEventListener('click', () => player.stop());
  document.getElementById('nextBtn').addEventListener('click', () => player.next());
  document.getElementById('prevBtn').addEventListener('click', () => player.prev());
  
  const progBg = document.getElementById('progressBarBg');
  progBg.addEventListener('click', (e) => { 
    const rect = progBg.getBoundingClientRect(); 
    const percent = (e.clientX - rect.left) / rect.width; 
    player.seekTo(percent); 
  });
  
  document.getElementById('fileUpload').addEventListener('change', async (e) => { 
    await uploadSongs(Array.from(e.target.files)); 
    document.getElementById('fileUpload').value = ''; 
    renderCurrentPlaylist(); 
  });
  
  document.querySelector('label[for="fileUpload"]').addEventListener('click', () => document.getElementById('fileUpload').click());
  
  await db.openDB();
  await loadSongsFromDB();
  
  // Update UI equalizer animation while playing
  setInterval(() => {
    const isPlaying = !player.getCurrentAudio().paused;
    if (player.getCurrentSong() && isPlaying) {
      if(ui.startEqualizerAnimation) ui.startEqualizerAnimation();
    } else if (!isPlaying) {
      ui.stopEqualizerAnimation();
    }
  }, 300);
})();