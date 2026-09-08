const LABELS = ["A", "B", "C", "D"];

const SHAPES = [
  {
    id: "quadrilateral",
    name: "Quadrilateral",
    parent: null,
    rule: "4 sides, closed shape.",
    uglyName: "A shattered piece of glass",
    uglyBlurb: "No sides are parallel, no sides are the same length, and every angle is different.",
    proves: "Quadrilaterals have absolutely no guaranteed symmetry, and diagonals do not bisect each other.",
    guaranteed: [],
    falseFolds: ["ac", "bd", "h", "v"],
  },
  {
    id: "kite",
    name: "Kite",
    parent: "quadrilateral",
    rule: "2 pairs of consecutive, equal sides.",
    uglyName: "A stretched-out spearhead",
    uglyBlurb: "The top two sides are an inch long, and the bottom two sides stretch down a full foot.",
    proves: "Only one diagonal gets bisected. The long diagonal cuts the short one in half — not the other way around.",
    guaranteed: ["consecutiveEqualSides", "diagonalsPerpendicular", "diagonalsBisectOne"],
    falseFolds: ["ac", "h", "v"],
  },
  {
    id: "trapezoid",
    name: "Trapezoid",
    parent: "quadrilateral",
    rule: "Exactly 1 pair of parallel sides.",
    uglyName: "A slanted roof with one straight wall",
    uglyBlurb: "The top and bottom are parallel, but the left side goes straight up while the right side slopes out into a long ramp.",
    proves: "A standard trapezoid has zero lines of symmetry. You cannot fold it anywhere.",
    guaranteed: ["exactlyOnePairParallel"],
    falseFolds: ["ac", "bd", "h", "v"],
  },
  {
    id: "isoscelesTrapezoid",
    name: "Isosceles Trapezoid",
    parent: "trapezoid",
    rule: "1 pair of parallel sides + the non-parallel legs are equal.",
    uglyName: "A massive, flat riverboat",
    uglyBlurb: "Extremely wide and squatted down very low.",
    proves: "The diagonals are equal in length, but they cross at a very wide, shallow angle — not perpendicular.",
    guaranteed: ["exactlyOnePairParallel", "equalLegs", "diagonalsEqual"],
    falseFolds: ["ac", "bd", "h"],
  },
  {
    id: "parallelogram",
    name: "Parallelogram",
    parent: "quadrilateral",
    rule: "2 pairs of parallel sides.",
    uglyName: "A house of cards in a hurricane",
    uglyBlurb: "Severely slanted, with the top and bottom much longer than the sides.",
    proves: "It has zero lines of symmetry. Fold it diagonally or down the middle and the sharp corners stick out. The diagonals are vastly different lengths.",
    guaranteed: ["bothPairsParallel", "oppSidesEqual", "oppAnglesEqual", "diagonalsBisectBoth"],
    falseFolds: ["ac", "bd", "h", "v"],
  },
  {
    id: "rectangle",
    name: "Rectangle",
    parent: "parallelogram",
    rule: "Parallelogram + 4 right angles.",
    uglyName: "A yardstick",
    uglyBlurb: "Incredibly long and incredibly skinny.",
    proves: "You cannot fold a rectangle diagonally — try a dollar bill corner-to-corner; it does not line up. The diagonals do not cross at 90°.",
    guaranteed: ["bothPairsParallel", "oppSidesEqual", "oppAnglesEqual", "allRightAngles", "diagonalsEqual", "diagonalsBisectBoth"],
    falseFolds: ["ac", "bd"],
  },
  {
    id: "rhombus",
    name: "Rhombus",
    parent: "parallelogram",
    rule: "Parallelogram + 4 equal sides.",
    uglyName: "A completely flattened diamond",
    uglyBlurb: "Two angles are incredibly sharp, and two are massively wide.",
    proves: "The diagonals cross at a perfect 90°, but they are drastically different lengths.",
    guaranteed: ["bothPairsParallel", "allSidesEqual", "oppSidesEqual", "oppAnglesEqual", "diagonalsPerpendicular", "diagonalsBisectBoth"],
    falseFolds: ["h", "v"],
  },
  {
    id: "square",
    name: "Square",
    parent: "rhombus",
    rule: "Rectangle (4 right angles) + rhombus (4 equal sides).",
    uglyName: "You can't draw an ugly square",
    uglyBlurb: "Every inherited rule locks it into perfection. Size and tilt can change; the relationships cannot.",
    proves: "A square has 4 lines of symmetry, and its diagonals are both equal and perpendicular.",
    guaranteed: [
      "bothPairsParallel",
      "allSidesEqual",
      "oppSidesEqual",
      "oppAnglesEqual",
      "allRightAngles",
      "diagonalsEqual",
      "diagonalsPerpendicular",
      "diagonalsBisectBoth",
    ],
    falseFolds: [],
  },
];

const SHAPE_MAP = Object.fromEntries(SHAPES.map((s) => [s.id, s]));

function kiteFromParams(M, axisAngle, halfWidth, tB, tD) {
  const n = { x: Math.cos(axisAngle), y: Math.sin(axisAngle) };
  const p = perp(n);
  return [
    add(M, scale(p, -halfWidth)),
    add(M, scale(n, tB)),
    add(M, scale(p, halfWidth)),
    add(M, scale(n, tD)),
  ];
}

function rectFromParams(O, hw, hh, theta) {
  const corners = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
  ];
  return corners.map((c) => rotate(add(O, c), theta, O));
}

function rhombusFromDiags(O, d1, d2, theta) {
  const local = [
    { x: d1, y: 0 },
    { x: 0, y: -d2 },
    { x: -d1, y: 0 },
    { x: 0, y: d2 },
  ];
  return local.map((c) => rotate(add(O, c), theta, O));
}

function isoFromParams(O, angle, height, topW, botW) {
  const dir = { x: Math.cos(angle), y: Math.sin(angle) };
  const n = perp(dir);
  const h2 = height / 2;
  return [
    add(O, add(scale(n, -h2), scale(dir, -topW / 2))),
    add(O, add(scale(n, -h2), scale(dir, topW / 2))),
    add(O, add(scale(n, h2), scale(dir, botW / 2))),
    add(O, add(scale(n, h2), scale(dir, -botW / 2))),
  ];
}

function trapFromParams(D, C, height, sA, wTop) {
  const dir = norm(sub(C, D));
  const n = perp(dir);
  const A = add(D, add(scale(dir, sA), scale(n, height)));
  const B = add(A, scale(dir, wTop));
  return [A, B, C, D];
}

function squareFromParams(O, halfDiag, theta) {
  return rhombusFromDiags(O, halfDiag, halfDiag, theta);
}

function parallelogramFrom(A, u, v) {
  return [A, add(A, u), add(add(A, u), v), add(A, v)];
}

function rotatePoly(pts, angle) {
  const O = mid(mid(pts[0], pts[2]), mid(pts[1], pts[3]));
  return pts.map((p) => rotate(p, angle, O));
}

function getPreset(id, mood, bounds) {
  const cx = bounds.x + bounds.w / 2;
  const cy = bounds.y + bounds.h / 2;
  const neat = mood === "neat";
  let pts;

  switch (id) {
    case "quadrilateral":
      pts = neat
        ? [
            v(cx - 150, cy - 110),
            v(cx + 160, cy - 100),
            v(cx + 150, cy + 120),
            v(cx - 155, cy + 115),
          ]
        : [
            v(cx - 250, cy - 170),
            v(cx + 230, cy - 90),
            v(cx + 140, cy + 175),
            v(cx - 280, cy + 130),
          ];
      break;
    case "kite":
      pts = neat
        ? kiteFromParams(v(cx, cy + 10), Math.PI / 2, 150, -150, 170)
        : kiteFromParams(v(cx, cy - 40), Math.PI / 2, 120, -70, 250);
      break;
    case "trapezoid":
      pts = neat
        ? trapFromParams(v(cx - 200, cy + 90), v(cx + 200, cy + 90), -180, 40, 320)
        : trapFromParams(v(cx - 220, cy + 130), v(cx + 280, cy + 130), -220, 0, 170);
      break;
    case "isoscelesTrapezoid":
      pts = neat
        ? isoFromParams(v(cx, cy), 0, 170, 260, 420)
        : isoFromParams(v(cx, cy + 20), 0, 70, 620, 700);
      break;
    case "parallelogram":
      pts = neat
        ? parallelogramFrom(v(cx - 170, cy + 90), v(320, 0), v(60, -180))
        : rotatePoly(
            parallelogramFrom(v(cx - 280, cy + 40), v(560, 24), v(310, -80)),
            0.28
          );
      break;
    case "rectangle":
      pts = neat
        ? rectFromParams(v(cx, cy), 190, 120, 0)
        : rectFromParams(v(cx, cy), 340, 28, 0);
      break;
    case "rhombus":
      pts = neat
        ? rhombusFromDiags(v(cx, cy), 160, 130, 0)
        : rhombusFromDiags(v(cx, cy), 320, 28, 0);
      break;
    case "square":
      pts = squareFromParams(v(cx, cy), 160, 0);
      break;
    default:
      return getPreset("quadrilateral", mood, bounds);
  }
  return fitPoints(pts, bounds);
}

function fitPoints(pts, bounds, pad = 48) {
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const w = Math.max(maxX - minX, 1);
  const h = Math.max(maxY - minY, 1);
  const s = Math.min(1, (bounds.w - pad * 2) / w, (bounds.h - pad * 2) / h);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const tx = bounds.x + bounds.w / 2;
  const ty = bounds.y + bounds.h / 2;
  return pts.map((p) => ({
    x: tx + (p.x - cx) * s,
    y: ty + (p.y - cy) * s,
  }));
}

function measure(pts) {
  const [A, B, C, D] = pts;
  const sides = [dist(A, B), dist(B, C), dist(C, D), dist(D, A)];
  const angles = [angleAt(D, A, B), angleAt(A, B, C), angleAt(B, C, D), angleAt(C, D, A)];
  const ac = dist(A, C);
  const bd = dist(B, D);
  const hit = lineIntersection(A, C, B, D);
  const acHit = hit ? dist(A, hit) : 0;
  const chit = hit ? dist(C, hit) : 0;
  const bdHit = hit ? dist(B, hit) : 0;
  const dhit = hit ? dist(D, hit) : 0;
  const lenTol = 6;
  const acBisected = hit ? nearlyEqual(acHit, chit, lenTol) : false;
  const bdBisected = hit ? nearlyEqual(bdHit, dhit, lenTol) : false;
  const ab = sub(B, A);
  const bc = sub(C, B);
  const cd = sub(D, C);
  const da = sub(A, D);
  const abParCD = nearlyParallel(ab, sub(C, D));
  const adParBC = nearlyParallel(sub(D, A), sub(C, B));
  const parallelCount = (abParCD ? 1 : 0) + (adParBC ? 1 : 0);
  const consecutiveEqualSides =
    (nearlyEqual(sides[0], sides[3], lenTol) && nearlyEqual(sides[1], sides[2], lenTol)) ||
    (nearlyEqual(sides[0], sides[1], lenTol) && nearlyEqual(sides[2], sides[3], lenTol));
  const allSidesEqual = sides.every((s) => nearlyEqual(s, sides[0], lenTol));
  const oppSidesEqual =
    nearlyEqual(sides[0], sides[2], lenTol) && nearlyEqual(sides[1], sides[3], lenTol);
  const equalLegs = nearlyEqual(sides[3], sides[1], lenTol);
  const allRightAngles = angles.every((a) => nearlyEqual(a, Math.PI / 2, 0.07));
  const oppAnglesEqual =
    nearlyEqual(angles[0], angles[2], 0.07) && nearlyEqual(angles[1], angles[3], 0.07);
  const diagonalsEqual = nearlyEqual(ac, bd, lenTol);
  const diagonalsPerpendicular = nearlyPerp(sub(C, A), sub(D, B));
  const crossAngle = acuteAngleBetween(sub(C, A), sub(D, B));

  return {
    sides,
    angles,
    perimeter: sides.reduce((s, n) => s + n, 0),
    area: shoelace(pts),
    ac,
    bd,
    hit,
    acHit,
    chit,
    bdHit,
    dhit,
    acBisected,
    bdBisected,
    abParCD,
    adParBC,
    parallelCount,
    consecutiveEqualSides,
    allSidesEqual,
    oppSidesEqual,
    equalLegs,
    allRightAngles,
    oppAnglesEqual,
    diagonalsEqual,
    diagonalsPerpendicular,
    diagonalsBisectBoth: acBisected && bdBisected,
    diagonalsBisectOne: (acBisected || bdBisected) && !(acBisected && bdBisected),
    exactlyOnePairParallel: parallelCount === 1,
    bothPairsParallel: parallelCount === 2,
    crossAngle,
  };
}

const PROP_META = [
  { key: "consecutiveEqualSides", label: "2 pairs of consecutive equal sides" },
  { key: "exactlyOnePairParallel", label: "Exactly 1 pair of parallel sides" },
  { key: "bothPairsParallel", label: "2 pairs of parallel sides" },
  { key: "oppSidesEqual", label: "Opposite sides equal" },
  { key: "allSidesEqual", label: "All 4 sides equal" },
  { key: "equalLegs", label: "Non-parallel legs equal" },
  { key: "allRightAngles", label: "4 right angles" },
  { key: "oppAnglesEqual", label: "Opposite angles equal" },
  { key: "diagonalsEqual", label: "Diagonals are equal" },
  { key: "diagonalsPerpendicular", label: "Diagonals meet at 90°" },
  { key: "diagonalsBisectBoth", label: "Diagonals bisect each other" },
  { key: "diagonalsBisectOne", label: "Only one diagonal is bisected" },
];

function symmetryLines(id, pts) {
  const [A, B, C, D] = pts;
  const lines = [];
  const push = (p1, p2, kind, ok) => lines.push({ p1, p2, kind, ok });

  if (id === "kite" || id === "rhombus" || id === "square") {
    push(B, D, "bd", true);
  }
  if (id === "rhombus" || id === "square") {
    push(A, C, "ac", true);
  }
  if (id === "isoscelesTrapezoid" || id === "rectangle" || id === "square") {
    push(mid(A, B), mid(D, C), "v", true);
  }
  if (id === "rectangle" || id === "square") {
    push(mid(A, D), mid(B, C), "h", true);
  }
  return lines;
}

function falseFoldLines(id, pts) {
  const shape = SHAPE_MAP[id];
  const [A, B, C, D] = pts;
  const map = {
    ac: [A, C],
    bd: [B, D],
    h: [mid(A, D), mid(B, C)],
    v: [mid(A, B), mid(D, C)],
  };
  return (shape.falseFolds || []).map((kind) => ({
    p1: map[kind][0],
    p2: map[kind][1],
    kind,
    ok: false,
  }));
}

function allInBounds(pts, bounds, pad = 20) {
  return pts.every((p) =>
    p.x >= bounds.x + pad &&
    p.x <= bounds.x + bounds.w - pad &&
    p.y >= bounds.y + pad &&
    p.y <= bounds.y + bounds.h - pad
  );
}

function applyConstraint(id, pts, index, raw, bounds) {
  const next = pts.map(clone);
  const p = keepInBounds(raw, bounds);

  switch (id) {
    case "quadrilateral":
      next[index] = p;
      break;
    case "kite":
      constrainKite(next, index, p);
      break;
    case "trapezoid":
      constrainTrapezoid(next, index, p);
      break;
    case "isoscelesTrapezoid":
      constrainIso(next, index, p, bounds);
      break;
    case "parallelogram":
      constrainParallelogram(next, index, p);
      break;
    case "rectangle":
      constrainRectangle(next, index, p);
      break;
    case "rhombus":
      constrainRhombus(next, index, p);
      break;
    case "square":
      constrainSquare(next, index, p);
      break;
    default:
      next[index] = p;
  }

  if (!allInBounds(next, bounds) || isDegenerate(next)) return pts.map(clone);
  return next;
}

function constrainKite(pts, index, p) {
  const [A, B, C, D] = pts;
  if (index === 0 || index === 2) {
    pts[index] = p;
    const a = pts[0];
    const c = pts[2];
    const M = mid(a, c);
    const axis = perp(sub(c, a));
    pts[1] = projectOnLine(B, M, axis);
    pts[3] = projectOnLine(D, M, axis);
    if (dist(pts[1], M) < 16) pts[1] = add(M, scale(norm(axis), -40));
    if (dist(pts[3], M) < 16) pts[3] = add(M, scale(norm(axis), 40));
  } else {
    const M = mid(A, C);
    const axis = perp(sub(C, A));
    pts[index] = projectOnLine(p, M, axis);
  }
}

function constrainTrapezoid(pts, index, p) {
  let [A, B, C, D] = pts;
  const bottom = dist(D, C);
  if (bottom < EPS) return;

  if (index === 0) {
    const dir = norm(sub(C, D));
    const n = perp(dir);
    const height = dot(sub(p, D), n);
    const sA = dot(sub(p, D), dir);
    const wTop = Math.max(40, dot(sub(B, A), dir));
    const next = trapFromParams(D, C, Math.abs(height) < 30 ? Math.sign(height || -1) * 30 : height, sA, wTop);
    pts[0] = next[0];
    pts[1] = next[1];
  } else if (index === 1) {
    const dir = norm(sub(C, D));
    const n = perp(dir);
    const height = dot(sub(p, D), n);
    const sA = dot(sub(A, D), dir);
    let wTop = dot(sub(p, A), dir);
    if (Math.abs(wTop) < 40) wTop = Math.sign(wTop || 1) * 40;
    const lifted = trapFromParams(D, C, Math.abs(height) < 30 ? Math.sign(height || -1) * 30 : height, sA, wTop);
    pts[0] = lifted[0];
    pts[1] = lifted[1];
  } else if (index === 2) {
    const height = (() => {
      const dir = norm(sub(C, D));
      return dot(sub(A, D), perp(dir));
    })();
    const dirOld = norm(sub(C, D));
    const sA = dot(sub(A, D), dirOld);
    const wTop = dot(sub(B, A), dirOld);
    const next = trapFromParams(D, p, height, sA, wTop);
    for (let i = 0; i < 4; i++) pts[i] = next[i];
  } else {
    const dirOld = norm(sub(C, D));
    const height = dot(sub(A, D), perp(dirOld));
    const sA = dot(sub(A, D), dirOld);
    const wTop = dot(sub(B, A), dirOld);
    const next = trapFromParams(p, C, height, sA, wTop);
    for (let i = 0; i < 4; i++) pts[i] = next[i];
  }

  const legs = [sub(pts[3], pts[0]), sub(pts[2], pts[1])];
  if (nearlyParallel(legs[0], legs[1], 0.04)) {
    pts[1] = add(pts[1], { x: 18, y: 0 });
  }
}

function constrainIso(pts, index, p, bounds) {
  const O = mid(mid(pts[0], pts[1]), mid(pts[2], pts[3]));
  const angle = heading(pts[3], pts[2]);
  const dir = { x: Math.cos(angle), y: Math.sin(angle) };
  const n = perp(dir);
  const height = dot(sub(pts[3], pts[0]), n) || 80;
  const topW = dist(pts[0], pts[1]);
  const botW = dist(pts[3], pts[2]);
  const local = {
    x: dot(sub(p, O), dir),
    y: dot(sub(p, O), n),
  };

  let nextH = Math.abs(height);
  let nextTop = topW;
  let nextBot = botW;

  if (index === 0 || index === 1) {
    nextH = clamp(Math.abs(local.y) * 2, 36, bounds.h * 0.72);
    nextTop = clamp(Math.abs(local.x) * 2, 40, bounds.w * 0.92);
  } else {
    nextH = clamp(Math.abs(local.y) * 2, 36, bounds.h * 0.72);
    nextBot = clamp(Math.abs(local.x) * 2, 40, bounds.w * 0.92);
  }
  if (Math.abs(nextTop - nextBot) < 28) {
    if (index === 0 || index === 1) nextTop = Math.max(40, nextBot - 28);
    else nextBot = nextTop + 28;
  }

  const next = isoFromParams(O, angle, nextH, nextTop, nextBot);
  for (let i = 0; i < 4; i++) pts[i] = next[i];
}

function constrainParallelogram(pts, index, p) {
  const opp = (index + 2) % 4;
  const keep = pts.map(clone);
  keep[index] = p;
  if (index === 0) keep[2] = add(sub(keep[1], keep[0]), keep[3]);
  else if (index === 1) keep[3] = add(sub(keep[0], keep[1]), keep[2]);
  else if (index === 2) keep[0] = add(sub(keep[3], keep[2]), keep[1]);
  else keep[1] = add(sub(keep[2], keep[3]), keep[0]);
  for (let i = 0; i < 4; i++) pts[i] = keep[i];
  void opp;
}

function rectFrame(pts) {
  const O = mid(pts[0], pts[2]);
  const theta = heading(pts[0], pts[1]);
  const local = rotate(sub(pts[1], O), -theta);
  return { O, theta, hw: Math.abs(local.x), hh: Math.abs(rotate(sub(pts[2], O), -theta).y) };
}

function constrainRectangle(pts, index, p) {
  const { O, theta } = rectFrame(pts);
  const opp = pts[(index + 2) % 4];
  const midpt = mid(p, opp);
  const local = rotate(sub(p, midpt), -theta);
  const hw = clamp(Math.abs(local.x), 16, 2000);
  const hh = clamp(Math.abs(local.y), 12, 2000);
  const next = rectFromParams(midpt, hw, hh, theta);
  for (let i = 0; i < 4; i++) pts[i] = next[i];
}

function constrainRhombus(pts, index, p) {
  const O = mid(pts[0], pts[2]);
  const theta = heading(pts[2], pts[0]);
  let d1 = dist(pts[0], pts[2]) / 2;
  let d2 = dist(pts[1], pts[3]) / 2;
  if (index === 0 || index === 2) {
    d1 = clamp(dist(p, O), 20, 2000);
  } else {
    const axis = perp({ x: Math.cos(theta), y: Math.sin(theta) });
    const proj = projectOnLine(p, O, axis);
    d2 = clamp(dist(proj, O), 12, 2000);
  }
  const next = rhombusFromDiags(O, d1, d2, theta);
  for (let i = 0; i < 4; i++) pts[i] = next[i];
}

function constrainSquare(pts, index, p) {
  const O = mid(pts[0], pts[2]);
  const halfDiag = clamp(dist(p, O), 30, 2000);
  const localAngle = [0, -Math.PI / 2, Math.PI, Math.PI / 2];
  const theta = heading(O, p) - localAngle[index];
  const next = squareFromParams(O, halfDiag, theta);
  for (let i = 0; i < 4; i++) pts[i] = next[i];
}

function translatePoints(pts, delta, bounds) {
  const pad = 20;
  let dx = delta.x;
  let dy = delta.y;
  for (const p of pts) {
    const nx = p.x + dx;
    const ny = p.y + dy;
    if (nx < bounds.x + pad) dx += bounds.x + pad - nx;
    if (nx > bounds.x + bounds.w - pad) dx -= nx - (bounds.x + bounds.w - pad);
    if (ny < bounds.y + pad) dy += bounds.y + pad - ny;
    if (ny > bounds.y + bounds.h - pad) dy -= ny - (bounds.y + bounds.h - pad);
  }
  return pts.map((p) => add(p, { x: dx, y: dy }));
}

function isDegenerate(pts) {
  if (shoelace(pts) < 80) return true;
  for (let i = 0; i < 4; i++) {
    if (dist(pts[i], pts[(i + 1) % 4]) < 18) return true;
  }
  return false;
}
