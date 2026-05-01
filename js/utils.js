// Helper functions and metadata extractor
window.utils = (function() {
  // format seconds to mm:ss
  function formatTime(seconds) {
    if (isNaN(seconds) || seconds === Infinity) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // extract duration from audio Blob using Promise
  function getAudioDuration(blob) {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio();
      audio.addEventListener('loadedmetadata', () => {
        const dur = audio.duration;
        URL.revokeObjectURL(url);
        resolve(isFinite(dur) ? dur : 0);
      });
      audio.addEventListener('error', () => {
        URL.revokeObjectURL(url);
        resolve(0);
      });
      audio.src = url;
    });
  }

  // generate unique id
  function generateId() {
    return Date.now() + '-' + Math.random().toString(36).substr(2, 6);
  }

  return { formatTime, getAudioDuration, generateId };
})();