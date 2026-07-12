(function () {
  const T = window.MorningTown || (window.MorningTown = {});

  const smallPatterns = {
    2: [[-0.78, 0], [0.78, 0]],
    3: [[-0.9, 0.7], [0, -0.85], [0.9, 0.7]],
    4: [[-0.82, -0.85], [0.82, -0.85], [-0.82, 0.85], [0.82, 0.85]]
  };

  function rounded(value) {
    return Math.round(value * 100) / 100;
  }

  function smallGroupPoint(point, index, total, radius) {
    const pattern = smallPatterns[total][index] || [0, 0];
    const spacingX = T.clamp(radius * 0.86, 4.1, 5.6);
    const spacingY = T.clamp(radius * 0.9, 4.2, 5.5);
    return {
      x: point.x + pattern[0] * spacingX,
      y: point.y + pattern[1] * spacingY
    };
  }

  function multiRowPoint(point, index, total, radius) {
    const columns = total <= 6 ? 3 : 4;
    const rows = Math.ceil(total / columns);
    const row = Math.floor(index / columns);
    const rowStart = row * columns;
    const rowSize = Math.min(columns, total - rowStart);
    const column = index - rowStart;
    const spacingX = T.clamp(radius * 0.96, 5.4, 6.8);
    const spacingY = 8.6;
    let startY = -((rows - 1) * spacingY) / 2;
    if (point.y > 82) startY = -(rows - 1) * spacingY;
    if (point.y < 18) startY = 0;
    return {
      x: point.x + (column - (rowSize - 1) / 2) * spacingX,
      y: point.y + startY + row * spacingY
    };
  }

  function groupPoint(point, index, total, radius = 4) {
    if (!point) return { x: 50, y: 50 };
    if (total <= 1) return { x: point.x, y: point.y };
    const raw = total <= 4
      ? smallGroupPoint(point, index, total, radius)
      : multiRowPoint(point, index, total, radius);
    return {
      x: T.clamp(rounded(raw.x), 3, 97),
      y: T.clamp(rounded(raw.y), 3, 97)
    };
  }

  function assignEventPoints(events, options = {}) {
    const groups = new Map();
    (events || []).forEach((event) => {
      const key = event.hotspotId || event.zoneId || "town";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(event);
    });
    groups.forEach((group) => {
      const ordered = [...group].sort((a, b) => String(a.residentId).localeCompare(String(b.residentId)));
      ordered.forEach((event, index) => {
        const hotspot = options.byId?.get(event.hotspotId) || options.hotspots?.[0] || { x: 50, y: 50, radius: 4 };
        const point = groupPoint(hotspot, index, ordered.length, hotspot.radius || 4);
        event.x = point.x;
        event.y = point.y;
        event.depth = Math.round(point.y);
        event.layoutIndex = index;
        event.layoutSize = ordered.length;
      });
    });
    return events;
  }

  T.townStageLayout = {
    version: "town-stage-layout-v0.1.6-local-stable-fans",
    groupPoint,
    assignEventPoints
  };
}());
