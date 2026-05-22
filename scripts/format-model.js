(function () {
  const root = window.CineTrack || (window.CineTrack = {});
  const EMOJIS = ['🎬', '🎥', '🎞️', '🍿', '🎦', '🌟', '🎭', '🎪'];

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function normaliseTitle(value) {
    return String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\b(the|a|an)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normaliseYear(value) {
    const match = String(value || '').match(/\d{4}/);
    return match ? match[0] : '';
  }

  function posterEmoji(title) {
    let hash = 0;
    for (const char of String(title || '')) hash = (hash * 31 + char.charCodeAt(0)) | 0;
    return EMOJIS[Math.abs(hash) % EMOJIS.length];
  }

  function starsHtml(rating) {
    const value = Number(rating) || 0;
    if (!value) return '';
    return `<span class="card-stars" title="${value}/10">${'★'.repeat(value)}${'☆'.repeat(10 - value)}</span>`;
  }

  function runtime(mins) {
    const value = Number(mins) || 0;
    if (!value) return '';
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    return hours > 0 ? (minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`) : `${minutes}m`;
  }

  function calendarDuration(mins) {
    const value = Number(mins) || 0;
    if (!value) return '';
    let days = Math.floor(value / 1440);
    if (days < 1) return runtime(value);

    const years = Math.floor(days / 365);
    days %= 365;
    const months = Math.floor(days / 30);
    days %= 30;
    const weeks = Math.floor(days / 7);
    days %= 7;

    const parts = [];
    if (years) parts.push(`${years}y`);
    if (months) parts.push(`${months}mo`);
    if (weeks) parts.push(`${weeks}w`);
    if (days) parts.push(`${days}d`);
    return parts.join(' ') || runtime(value);
  }

  root.format = {
    escapeHtml,
    normaliseTitle,
    normaliseYear,
    posterEmoji,
    starsHtml,
    runtime,
    calendarDuration,
  };
})();
