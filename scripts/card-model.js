(function () {
  const root = window.CineTrack || (window.CineTrack = {});

  function isShow(entry = {}) {
    return entry.mediaType === 'tv' || entry.mediaType === 'anime';
  }

  function fallbackPosterLabel(entry = {}, posterEmoji = title => title?.[0] || '') {
    if (entry.mediaType === 'anime') return '🎌';
    if (entry.mediaType === 'tv') return '📺';
    return posterEmoji(entry.title || '');
  }

  // Episodes of a season that have aired. Entries predating aired-tracking
  // carry no `aired` field, so fall back to the full total.
  function airedOf(season) {
    if (!season) return 0;
    const total = Math.max(0, Number(season.total) || 0);
    if (season.aired == null) return total;
    return Math.min(total, Math.max(0, Number(season.aired) || 0));
  }

  function episodeState(entry = {}, activeSeason) {
    const show = isShow(entry);
    const seasons = Array.isArray(entry.seasons) ? entry.seasons : [];
    const hasSeasons = show && seasons.length > 0;
    const active = hasSeasons && typeof activeSeason === 'function' ? activeSeason(entry) : null;
    const fallbackTotal = entry.totalEpisodes || 0;
    const fallbackWatched = Math.min(entry.watchedEpisodes || 0, fallbackTotal);
    const fallbackAired = entry.airedEpisodes == null
      ? fallbackTotal
      : Math.min(fallbackTotal, Math.max(0, Number(entry.airedEpisodes) || 0));
    const total = hasSeasons ? (active ? active.total : 0) : fallbackTotal;
    const watched = hasSeasons ? (active ? active.watched : 0) : fallbackWatched;
    const aired = hasSeasons ? (active ? airedOf(active) : 0) : fallbackAired;
    const pct = total > 0 ? Math.round((watched / total) * 100) : 0;
    // A scheduled-but-unaired episode can't be watched, so progress is gated
    // on aired rather than the full episode order TMDB publishes up front.
    const partiallyAired = aired < total;
    const seasonPrefix = hasSeasons && active && seasons.length > 1 ? `S${active.number} ` : '';

    let label;
    let title;
    if (partiallyAired && aired === 0) {
      label = `▶ ${seasonPrefix}not aired yet`;
      title = hasSeasons && active
        ? `${active.name || `Season ${active.number}`}: none of ${total} episodes have aired yet`
        : `None of ${total} episodes have aired yet`;
    } else if (partiallyAired) {
      label = `▶ ${seasonPrefix}${watched}/${aired} aired`;
      title = hasSeasons && active
        ? `${active.name || `Season ${active.number}`}: ${watched} of ${aired} aired episodes watched (${total} scheduled)`
        : `${watched} of ${aired} aired episodes watched (${total} scheduled)`;
    } else {
      label = `▶ ${seasonPrefix}${watched}/${total} eps`;
      title = hasSeasons && active
        ? `${active.name || `Season ${active.number}`}: ${watched} of ${total} episodes watched`
        : `${watched} of ${total} episodes watched`;
    }

    return {
      isShow: show,
      seasons,
      hasSeasons,
      active,
      total,
      watched,
      aired,
      partiallyAired,
      pct,
      canIncrement: show && total > 0 && watched < aired,
      label,
      title,
    };
  }

  // True when any season (or a flat entry) still has scheduled episodes that
  // have not aired.
  function episodeHasUnaired(entry = {}, episode = {}) {
    if (episode.partiallyAired) return true;
    const seasons = Array.isArray(entry.seasons) ? entry.seasons : [];
    if (seasons.length) return seasons.some(season => airedOf(season) < (Math.max(0, Number(season.total) || 0)));
    return false;
  }

  // Journal style: one tick per episode of the season being watched, a short
  // count, the next airing, and the label for the +1 action. Reads the same
  // aired view as the rest of the card. null for films and unknown counts.
  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function journalDay(airDate, todayStr) {
    if (!airDate) return '';
    if (airDate === todayStr) return 'Today';
    const date = new Date(`${airDate}T12:00:00`);
    const today = todayStr ? new Date(`${todayStr}T12:00:00`) : null;
    const days = today ? Math.round((date - today) / 86400000) : 99;
    return days > 0 && days < 7 ? WEEKDAYS[date.getDay()] : `${date.getDate()} ${MONTHS[date.getMonth()]}`;
  }

  function journalInfo(entry = {}, { behind = 0, nextEpisode = null, nextTag = '', todayStr = '' } = {}) {
    if (!isShow(entry)) return null;
    const seasons = Array.isArray(entry.seasons)
      ? [...entry.seasons].sort((a, b) => (a.number || 0) - (b.number || 0))
      : [];
    const frame = seasons.length
      ? (seasons.find(season => (season.watched || 0) < (season.total || 0)) || seasons[seasons.length - 1])
      : null;
    const total = Math.max(0, Number(frame ? frame.total : entry.totalEpisodes) || 0);
    if (!total) return null;
    const watched = Math.min(total, Math.max(0, Number(frame ? frame.watched : entry.watchedEpisodes) || 0));
    const airedRaw = frame ? frame.aired : entry.airedEpisodes;
    const aired = Math.min(total, Math.max(watched, airedRaw == null ? total : (Number(airedRaw) || 0)));
    const seasonPrefix = frame && seasons.length > 1 ? `S${frame.number} ` : '';
    let next = '';
    if (nextEpisode?.airDate && (!todayStr || nextEpisode.airDate >= todayStr)) {
      next = `Next ${nextTag ? `${nextTag} · ` : ''}${journalDay(nextEpisode.airDate, todayStr)}`;
    }
    return {
      total,
      watched,
      aired,
      ticks: total <= 40,
      count: `${watched} of ${total}`,
      behind: Math.max(0, Number(behind) || 0),
      upToDate: watched >= aired && watched < total,
      next,
      incLabel: `+1 · ${seasonPrefix}E${watched + 1}`,
    };
  }

  function statusLabel(entry = {}) {
    if (entry.status === 'watched') {
      return `✓ Watched${(entry.watchCount || 0) > 1 ? ` ×${entry.watchCount}` : ''}`;
    }
    if (entry.status === 'in_progress') return '▶ In Progress';
    if (entry.status === 'dropped') return '📛 Dropped';
    return '⏳ Watchlist';
  }

  function primaryAction(entry = {}, episode = episodeState(entry)) {
    if (episode.canIncrement) {
      return {
        type: 'episode',
        title: 'Mark next episode watched',
        labelLg: '+1 ep',
        labelMd: '+1 ep',
        labelSm: '+1',
      };
    }
    if (entry.status === 'watched') return null;
    // Caught up on a show that is still airing: there is nothing to do until
    // the next episode is out. Offering "Watched" here used to tick every
    // scheduled episode, unaired ones included, in a single press.
    if (episode.isShow && entry.status === 'in_progress' && episode.total > 0 && episodeHasUnaired(entry, episode)) {
      return {
        type: 'uptodate',
        title: 'All aired episodes watched — the next one isn’t out yet',
        labelLg: 'Up to date',
        labelMd: 'Up to date',
        labelSm: '✓',
      };
    }
    const markWatched = entry.status === 'in_progress';
    return {
      type: 'toggle',
      title: markWatched ? 'Mark watched' : 'Mark in progress',
      labelLg: markWatched ? '✓ Watched' : '▶ Start',
      labelMd: markWatched ? 'Watched' : '▶ Start',
      labelSm: markWatched ? '✓' : '▶',
    };
  }

  function view(entry = {}, helpers = {}) {
    const episode = episodeState(entry, helpers.activeSeason);
    return {
      isTV: entry.mediaType === 'tv',
      isShow: episode.isShow,
      fallbackPosterLabel: fallbackPosterLabel(entry, helpers.posterEmoji),
      runtime: typeof helpers.formatRuntime === 'function' ? helpers.formatRuntime(entry.runtime) : '',
      infoUrl: typeof helpers.infoUrlForEntry === 'function' ? helpers.infoUrlForEntry(entry) : '',
      episode,
      statusLabel: statusLabel(entry),
      primaryAction: primaryAction(entry, episode),
    };
  }

  root.cards = {
    isShow,
    fallbackPosterLabel,
    episodeState,
    journalInfo,
    statusLabel,
    primaryAction,
    view,
  };
})();
