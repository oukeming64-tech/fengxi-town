(function () {
  const T = window.MorningTown || (window.MorningTown = {});
  const stageData = T.townStageData;
  if (!stageData) throw new Error("town-stage-data.js must load before town-stage-routes.js");

  const reviewedRoadNodes = [
    { id: "farm-lane", x: 27, y: 31 },
    { id: "farm-gate", x: 34, y: 38 },
    { id: "north-crossing", x: 45, y: 38 },
    { id: "forest-road", x: 43, y: 27 },
    { id: "mine-road-west", x: 56, y: 37 },
    { id: "mine-road-east", x: 66, y: 32 },
    { id: "town-square", x: 47, y: 52 },
    { id: "town-southwest", x: 36, y: 60 },
    { id: "wetland-road", x: 29, y: 58 },
    { id: "town-south", x: 52, y: 70 },
    { id: "bridge-north", x: 51, y: 77 },
    { id: "east-road", x: 63, y: 61 },
    { id: "station-road", x: 72, y: 75 },
    { id: "accounting-road", x: 82, y: 77 }
  ];

  const reviewedEdges = [
    ["farm-field", "farm-lane"],
    ["greenhouse-door", "farm-lane"],
    ["barn-table", "farm-lane"],
    ["farm-lane", "farm-gate"],
    ["farm-gate", "north-crossing"],
    ["forest-edge", "forest-road"],
    ["forest-road", "north-crossing"],
    ["home-north", "north-crossing"],
    ["home-north", "inn-door"],
    ["home-north", "town-square"],
    ["north-crossing", "mine-road-west"],
    ["mine-road-west", "mine-road-east"],
    ["mine-road-east", "mine-gate"],
    ["town-market-stall", "town-square"],
    ["inn-door", "town-square"],
    ["notice-board", "town-square"],
    ["home-west", "town-southwest"],
    ["town-southwest", "town-market-stall"],
    ["town-southwest", "wetland-road"],
    ["wetland-road", "wetland-dock"],
    ["town-square", "east-road"],
    ["notice-board", "town-south"],
    ["town-south", "bridge-north"],
    ["bridge-north", "old-bridge"],
    ["old-bridge", "consignment-rack"],
    ["consignment-rack", "home-south"],
    ["consignment-rack", "goldkin-counter"],
    ["east-road", "old-truck"],
    ["old-truck", "station-road"],
    ["station-road", "goldkin-counter"],
    ["station-road", "accounting-road"],
    ["accounting-road", "accounting-desk"],
    ["goldkin-counter", "home-east"],
    ["accounting-desk", "home-east"]
  ];

  const nodes = [
    ...(stageData.mapHotspots || []).map((hotspot) => ({ id: hotspot.id, x: hotspot.x, y: hotspot.y, kind: "hotspot" })),
    ...reviewedRoadNodes.map((node) => ({ ...node, kind: "road" }))
  ];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const adjacency = new Map(nodes.map((node) => [node.id, []]));

  function distance(a, b) {
    return Math.hypot(Number(b.x) - Number(a.x), Number(b.y) - Number(a.y));
  }

  reviewedEdges.forEach(([fromId, toId]) => {
    const from = byId.get(fromId);
    const to = byId.get(toId);
    if (!from || !to) throw new Error(`unknown reviewed route edge: ${fromId} -> ${toId}`);
    const weight = distance(from, to);
    adjacency.get(fromId).push({ id: toId, weight });
    adjacency.get(toId).push({ id: fromId, weight });
  });

  function shortestNodeIds(fromId, toId) {
    if (!byId.has(fromId) || !byId.has(toId)) return [];
    if (fromId === toId) return [fromId];
    const distances = new Map(nodes.map((node) => [node.id, Infinity]));
    const previous = new Map();
    const remaining = new Set(nodes.map((node) => node.id));
    distances.set(fromId, 0);

    while (remaining.size) {
      let currentId = "";
      let currentDistance = Infinity;
      remaining.forEach((id) => {
        if (distances.get(id) < currentDistance) {
          currentId = id;
          currentDistance = distances.get(id);
        }
      });
      if (!currentId || currentDistance === Infinity) break;
      remaining.delete(currentId);
      if (currentId === toId) break;
      (adjacency.get(currentId) || []).forEach((edge) => {
        if (!remaining.has(edge.id)) return;
        const candidate = currentDistance + edge.weight;
        if (candidate >= distances.get(edge.id)) return;
        distances.set(edge.id, candidate);
        previous.set(edge.id, currentId);
      });
    }

    if (!previous.has(toId)) return [];
    const route = [toId];
    let cursor = toId;
    while (cursor !== fromId) {
      cursor = previous.get(cursor);
      if (!cursor) return [];
      route.unshift(cursor);
    }
    return route;
  }

  function roundedPoint(point) {
    return {
      x: Math.round(Number(point?.x || 0) * 100) / 100,
      y: Math.round(Number(point?.y || 0) * 100) / 100
    };
  }

  function dedupePoints(points) {
    return points.reduce((result, point) => {
      const next = roundedPoint(point);
      const previous = result[result.length - 1];
      if (!previous || previous.x !== next.x || previous.y !== next.y) result.push(next);
      return result;
    }, []);
  }

  function samplePolyline(points, sampleCount = 5) {
    const line = dedupePoints(points);
    if (!line.length) return [];
    if (line.length === 1) return Array.from({ length: sampleCount }, () => ({ ...line[0] }));
    const lengths = [];
    let total = 0;
    for (let index = 1; index < line.length; index += 1) {
      const segmentLength = distance(line[index - 1], line[index]);
      lengths.push(segmentLength);
      total += segmentLength;
    }
    if (!total) return Array.from({ length: sampleCount }, () => ({ ...line[0] }));

    return Array.from({ length: sampleCount }, (_, sampleIndex) => {
      const target = (total * sampleIndex) / (sampleCount - 1);
      let walked = 0;
      for (let segmentIndex = 0; segmentIndex < lengths.length; segmentIndex += 1) {
        const segmentLength = lengths[segmentIndex];
        if (walked + segmentLength < target && segmentIndex < lengths.length - 1) {
          walked += segmentLength;
          continue;
        }
        const ratio = segmentLength ? T.clamp((target - walked) / segmentLength, 0, 1) : 0;
        const from = line[segmentIndex];
        const to = line[segmentIndex + 1];
        return roundedPoint({
          x: from.x + (to.x - from.x) * ratio,
          y: from.y + (to.y - from.y) * ratio
        });
      }
      return { ...line[line.length - 1] };
    });
  }

  function routeBetween(fromHotspotId, toHotspotId, fromPoint, toPoint) {
    const nodeIds = shortestNodeIds(fromHotspotId, toHotspotId);
    const routePoints = nodeIds.map((id) => byId.get(id)).filter(Boolean);
    const rawPoints = dedupePoints([fromPoint, ...routePoints, toPoint]);
    const fallbackPoints = dedupePoints([fromPoint, toPoint]);
    return {
      nodeIds,
      rawPoints: rawPoints.length >= 2 ? rawPoints : fallbackPoints,
      points: samplePolyline(rawPoints.length >= 2 ? rawPoints : fallbackPoints, 5),
      source: nodeIds.length ? "local-reviewed-route-waypoints" : "local-stage-point-fallback"
    };
  }

  const hotspotIds = (stageData.mapHotspots || []).map((hotspot) => hotspot.id);
  const unreachableHotspotIds = hotspotIds.filter((hotspotId) => {
    return hotspotIds.some((otherId) => otherId !== hotspotId && !shortestNodeIds(hotspotId, otherId).length);
  });

  T.townStageRoutes = {
    version: "town-stage-routes-v0.1.6-local-reviewed",
    nodes,
    edges: reviewedEdges,
    byId,
    adjacency,
    hotspotIds,
    unreachableHotspotIds,
    shortestNodeIds,
    samplePolyline,
    routeBetween
  };
}());
