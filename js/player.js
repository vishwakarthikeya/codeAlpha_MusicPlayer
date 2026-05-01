// Global audio object, controls and playlist queue
window.playerModule = (function() {
  let currentAudio = new Audio();
  let currentSongId = null;
  let currentSongData = null;
  let songsList = [];   // full array of song objects
  let onSongChangeCallback = null;
  let onTimeUpdateCallback = null;
  let onPlayStateChange = null;
  let volume = 0.75;
  currentAudio.volume = volume;

  function setSongs(songs) {
    songsList = songs;
  }

  function playById(songId) {
    const song = songsList.find(s => s.id === songId);
    if (!song) return false;
    // revoke old blob URL if exists
    if (currentAudio.src && currentAudio.src.startsWith('blob:')) {
      URL.revokeObjectURL(currentAudio.src);
    }
    const blobUrl = URL.createObjectURL(song.file);
    currentAudio.src = blobUrl;
    currentAudio.load();
    currentSongId = song.id;
    currentSongData = song;
    currentAudio.play().catch(e => console.log("play error", e));
    if (onPlayStateChange) onPlayStateChange(true, song);
    return true;
  }

  function play() {
    if (!currentSongId && songsList.length) {
      playById(songsList[0].id);
    } else {
      currentAudio.play().catch(e => console.log);
      if (onPlayStateChange && currentSongData) onPlayStateChange(true, currentSongData);
    }
  }
  
  function pause() {
    currentAudio.pause();
    if (onPlayStateChange && currentSongData) onPlayStateChange(false, currentSongData);
  }
  
  function stop() {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    if (onPlayStateChange && currentSongData) onPlayStateChange(false, currentSongData);
  }
  
  function nextSong(songsArr) {
    if (!songsArr.length) return;
    if (!currentSongId && songsArr.length) {
      playById(songsArr[0].id);
      return;
    }
    const index = songsArr.findIndex(s => s.id === currentSongId);
    let nextIndex = (index + 1) % songsArr.length;
    if (nextIndex < 0) nextIndex = 0;
    playById(songsArr[nextIndex].id);
  }
  
  function prevSong(songsArr) {
    if (!songsArr.length) return;
    if (!currentSongId && songsArr.length) {
      playById(songsArr[0].id);
      return;
    }
    const index = songsArr.findIndex(s => s.id === currentSongId);
    let prevIndex = (index - 1 + songsArr.length) % songsArr.length;
    playById(songsArr[prevIndex].id);
  }

  function setVolume(val) { 
    volume = val; 
    currentAudio.volume = volume; 
  }
  
  function seekTo(percent) { 
    if (currentAudio.duration) 
      currentAudio.currentTime = percent * currentAudio.duration; 
  }
  
  function bindEvents() {
    currentAudio.addEventListener('timeupdate', () => {
      if (onTimeUpdateCallback) 
        onTimeUpdateCallback(currentAudio.currentTime, currentAudio.duration);
    });
    currentAudio.addEventListener('ended', () => {
      if (songsList.length && currentSongId) {
        const idx = songsList.findIndex(s => s.id === currentSongId);
        let nextIdx = (idx + 1) % songsList.length;
        if (songsList[nextIdx]) playById(songsList[nextIdx].id);
      }
    });
  }
  
  function getCurrentSong() { return currentSongData; }
  function getCurrentAudio() { return currentAudio; }

  function setCallbacks(onChange, onTime, onPlayState) {
    onSongChangeCallback = onChange;
    onTimeUpdateCallback = onTime;
    onPlayStateChange = onPlayState;
  }
  
  bindEvents();
  
  return { 
    play, 
    pause, 
    stop, 
    next: () => nextSong(songsList), 
    prev: () => prevSong(songsList), 
    setVolume, 
    seekTo, 
    playById, 
    setSongs, 
    getCurrentSong, 
    setCallbacks, 
    getCurrentAudio 
  };
})();