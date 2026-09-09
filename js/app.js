(() => {
  const canvas = document.getElementById("stage");
  const ctx = canvas.getContext("2d");
  const shapeSelect = document.getElementById("shapeSelect");
  const resetBtn = document.getElementById("resetBtn");
  const neatBtn = document.getElementById("neatBtn");
  const uglyBtn = document.getElementById("uglyBtn");
  const diagToggle = document.getElementById("diagToggle");
  const parallelToggle = document.getElementById("parallelToggle");
  const symToggle = document.getElementById("symToggle");

  const state = {
    shapeId: "kite",
    mood: "ugly",
    points: [],
    drag: null,
    lastGood: [],
    showDiagonals: true,
    showParallel: false,
    showSymmetry: false,
    hover: -1,
  };

  function bounds() {
    return { x: 0, y: 0, w: canvas.width / dpr(), h: canvas.height / dpr() };
  }

  function dpr() {
    return window.devicePixelRatio || 1;
  }

  function resize() {
    const wrap = canvas.parentElement;
    const ratio = dpr();
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    canvas.width = Math.max(1, Math.floor(w * ratio));
    canvas.height = Math.max(1, Math.floor(h * ratio));
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const box = bounds();
    if (box.w < 80 || box.h < 80) return;
    if (!state.points.length) {
      loadPreset(state.mood);
      return;
    }
    if (!allInBounds(state.points, box)) {
      state.points = fitPoints(state.points, box);
      state.lastGood = state.points.map(clone);
      updateUi();
    }
    draw();
  }

  function loadPreset(mood) {
    state.mood = mood;
    state.points = getPreset(state.shapeId, mood, bounds());
    state.lastGood = state.points.map(clone);
    neatBtn.classList.toggle("active", mood === "neat");
    uglyBtn.classList.toggle("active", mood === "ugly");
    updateUi();
    draw();
  }

  function setShape(id) {
    state.shapeId = id;
    shapeSelect.value = id;
    document.querySelectorAll("#tree button").forEach((b) => {
      b.classList.toggle("active", b.dataset.id === id);
    });
    loadPreset(id === "square" ? "neat" : state.mood);
  }

  function populateSelects() {
    shapeSelect.innerHTML = SHAPES.map((s) => `<option value="${s.id}">${s.name}</option>`).join("");
    shapeSelect.value = state.shapeId;
    const tree = document.getElementById("tree");
    tree.innerHTML = `
      <div class="tree-top">
        <button type="button" data-id="kite">Kite</button>
        <span class="tree-link" aria-hidden="true"></span>
        <div class="tree-root">
          <button type="button" data-id="quadrilateral">Quadrilateral</button>
        </div>
      </div>
      <div class="tree-families">
        <div class="family">
          <button type="button" data-id="parallelogram">Parallelogram</button>
          <div class="family-branch">
            <button type="button" data-id="rhombus">Rhombus</button>
            <button type="button" data-id="rectangle">Rectangle</button>
          </div>
          <button type="button" data-id="square">Square</button>
        </div>
        <div class="family">
          <button type="button" data-id="trapezoid">Trapezoid</button>
          <button type="button" data-id="isoscelesTrapezoid">Isosceles Trapezoid</button>
        </div>
      </div>
    `;
    tree.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => setShape(btn.dataset.id));
    });
    document.querySelector(`#tree button[data-id="${state.shapeId}"]`)?.classList.add("active");
  }

  function pointerPos(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function hitVertex(p) {
    let best = -1;
    let bestDist = 16;
    state.points.forEach((q, i) => {
      const d = dist(p, q);
      if (d < bestDist) {
        best = i;
        bestDist = d;
      }
    });
    return best;
  }

  function onPointerDown(event) {
    const p = pointerPos(event);
    const vIndex = hitVertex(p);
    if (vIndex >= 0) {
      state.drag = { kind: "vertex", index: vIndex };
      canvas.setPointerCapture(event.pointerId);
    } else if (pointInQuad(p, state.points)) {
      state.drag = { kind: "body", last: p };
      canvas.setPointerCapture(event.pointerId);
    }
    updateUi();
    draw();
  }

  function onPointerMove(event) {
    const p = pointerPos(event);
    if (!state.drag) {
      state.hover = hitVertex(p);
      canvas.style.cursor = state.hover >= 0 ? "grab" : pointInQuad(p, state.points) ? "move" : "default";
      draw();
      return;
    }

    if (state.drag.kind === "vertex") {
      const next = applyConstraint(state.shapeId, state.points, state.drag.index, p, bounds());
      if (!isDegenerate(next)) {
        state.points = next;
        state.lastGood = next.map(clone);
      } else {
        state.points = state.lastGood.map(clone);
      }
    } else {
      const delta = sub(p, state.drag.last);
      const next = translatePoints(state.points, delta, bounds());
      if (!isDegenerate(next)) {
        state.points = next;
        state.lastGood = next.map(clone);
        state.drag.last = p;
      }
    }
    canvas.style.cursor = state.drag.kind === "vertex" ? "grabbing" : "move";
    updateUi();
    draw();
  }

  function onPointerUp() {
    state.drag = null;
    updateUi();
    draw();
  }

  function drawGrid(w, h) {
    ctx.clearRect(0, 0, w, h);
  }

  function drawQuad() {
    const [A, B, C, D] = state.points;
    ctx.beginPath();
    ctx.moveTo(A.x, A.y);
    ctx.lineTo(B.x, B.y);
    ctx.lineTo(C.x, C.y);
    ctx.lineTo(D.x, D.y);
    ctx.closePath();
    ctx.fillStyle = "rgba(98, 176, 234, 0.16)";
    ctx.fill();
    ctx.strokeStyle = "#62b0ea";
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  function extendLine(p1, p2, extra = 36) {
    const d = norm(sub(p2, p1));
    return [sub(p1, scale(d, extra)), add(p2, scale(d, extra))];
  }

  function drawDashed(p1, p2, color) {
    const [a, b] = extendLine(p1, p2);
    ctx.save();
    ctx.setLineDash([7, 6]);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
  }

  function strokeSide(p1, p2, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.restore();
  }

  function drawChevrons(p1, p2, count, color) {
    const tangent = norm(sub(p2, p1));
    if (len(tangent) < EPS) return;
    const normal = perp(tangent);
    const c = mid(p1, p2);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let i = 0; i < count; i++) {
      const o = add(c, scale(tangent, (i - (count - 1) / 2) * 10));
      const tip = add(o, scale(tangent, 5));
      const a = add(o, add(scale(tangent, -4), scale(normal, 6)));
      const b = add(o, add(scale(tangent, -4), scale(normal, -6)));
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(tip.x, tip.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawParallelSides() {
    if (!state.showParallel) return;
    const m = measure(state.points);
    const [A, B, C, D] = state.points;
    if (m.abParCD) {
      strokeSide(A, B, "#f0a36b");
      strokeSide(D, C, "#f0a36b");
      drawChevrons(A, B, 1, "#f0a36b");
      drawChevrons(D, C, 1, "#f0a36b");
    }
    if (m.adParBC) {
      strokeSide(A, D, "#c084fc");
      strokeSide(B, C, "#c084fc");
      drawChevrons(A, D, 2, "#c084fc");
      drawChevrons(B, C, 2, "#c084fc");
    }
  }

  function drawDiagonals() {
    if (!state.showDiagonals) return;
    const [A, B, C, D] = state.points;
    drawDashed(A, C, "#e4c76b");
    drawDashed(B, D, "#6dcaa0");
    const hit = lineIntersection(A, C, B, D);
    if (hit) {
      ctx.beginPath();
      ctx.arc(hit.x, hit.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
    }
  }

  function drawSymmetry() {
    if (!state.showSymmetry) return;
    for (const line of falseFoldLines(state.shapeId, state.points)) {
      drawDashed(line.p1, line.p2, "rgba(224, 122, 122, 0.7)");
    }
    for (const line of symmetryLines(state.shapeId, state.points)) {
      drawDashed(line.p1, line.p2, "#6dcaa0");
    }
  }

  function drawMeasures() {
    const m = measure(state.points);
    const names = ["AB", "BC", "CD", "DA"];
    ctx.save();
    ctx.font = "500 12px IBM Plex Mono, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const centroid = scale(state.points.reduce((acc, p) => add(acc, p), v(0, 0)), 0.25);
    for (let i = 0; i < 4; i++) {
      const a = state.points[i];
      const b = state.points[(i + 1) % 4];
      const c = mid(a, b);
      let n = norm(perp(sub(b, a)));
      if (dot(n, sub(c, centroid)) < 0) n = scale(n, -1);
      const label = `${names[i]} ${Math.round(m.sides[i])}`;
      const pos = add(c, scale(n, 16));
      ctx.fillStyle = "rgba(14, 16, 22, 0.72)";
      const w = ctx.measureText(label).width;
      ctx.fillRect(pos.x - w / 2 - 4, pos.y - 8, w + 8, 16);
      ctx.fillStyle = "#c5d4e6";
      ctx.fillText(label, pos.x, pos.y);
    }
    ctx.restore();
  }

  function drawHandles() {
    state.points.forEach((p, i) => {
      const active = state.drag?.kind === "vertex" && state.drag.index === i;
      const hover = state.hover === i;
      const r = active || hover ? 12 : 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = "#10131a";
      ctx.fill();
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = "#9fd2ff";
      ctx.stroke();
      ctx.fillStyle = "#e8eef6";
      ctx.font = "600 13px Outfit, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(LABELS[i], p.x, p.y + 22);
    });
  }

  function draw() {
    const w = canvas.width / dpr();
    const h = canvas.height / dpr();
    drawGrid(w, h);
    if (state.points.length === 4) {
      drawQuad();
      drawParallelSides();
      drawDiagonals();
      drawSymmetry();
      drawMeasures();
      drawHandles();
    }
  }

  function sidePairClass(m, i) {
    const s = m.sides;
    if (nearlyEqual(s[i], s[(i + 2) % 4], 6)) return "equal";
    if (
      (i === 0 && nearlyEqual(s[0], s[1], 6)) ||
      (i === 1 && nearlyEqual(s[0], s[1], 6)) ||
      (i === 2 && nearlyEqual(s[2], s[3], 6)) ||
      (i === 3 && nearlyEqual(s[2], s[3], 6)) ||
      (i === 0 && nearlyEqual(s[0], s[3], 6)) ||
      (i === 3 && nearlyEqual(s[0], s[3], 6)) ||
      (i === 1 && nearlyEqual(s[1], s[2], 6)) ||
      (i === 2 && nearlyEqual(s[1], s[2], 6))
    ) {
      return "equal";
    }
    return "";
  }

  function updateUi() {
    const shape = SHAPE_MAP[state.shapeId];
    const m = state.points.length === 4 ? measure(state.points) : null;
    document.getElementById("statShape").textContent = shape.name;
    document.getElementById("statPerimeter").textContent = m ? formatPx(m.perimeter) : "—";
    document.getElementById("statArea").textContent = m ? `${Math.round(m.area)} px²` : "—";
    document.getElementById("statDrag").textContent =
      state.drag?.kind === "vertex" ? LABELS[state.drag.index] : state.drag ? "Shape" : "None";

    document.getElementById("lessonName").textContent = shape.name;
    document.getElementById("lessonRule").textContent = shape.rule;
    document.getElementById("lessonUgly").textContent = `${shape.uglyName}. ${shape.uglyBlurb}`;
    document.getElementById("lessonProves").textContent = shape.proves;

    if (!m) return;

    document.getElementById("vertexReadout").innerHTML = state.points
      .map((p, i) => `<div class="row"><span class="name">${LABELS[i]}</span><span class="val">(${Math.round(p.x)}, ${Math.round(p.y)})</span></div>`)
      .join("");

    const sideNames = ["AB", "BC", "CD", "DA"];
    document.getElementById("sideReadout").innerHTML = sideNames
      .map((name, i) => {
        const cls = sidePairClass(m, i);
        return `<div class="row"><span class="name">${name}</span><span class="val ${cls}">${formatPx(m.sides[i])}</span></div>`;
      })
      .join("");

    const angleNames = ["∠A", "∠B", "∠C", "∠D"];
    document.getElementById("angleReadout").innerHTML = angleNames
      .map((name, i) => `<div class="row"><span class="name">${name}</span><span class="val">${formatDeg(m.angles[i])}</span></div>`)
      .join("") +
      `<div class="row"><span class="name">Sum</span><span class="val">${formatDeg(m.angles.reduce((a, b) => a + b, 0))}</span></div>` +
      `<div class="row"><span class="name">AB ∥ CD</span><span class="val">${m.abParCD ? "yes" : "no"}</span></div>` +
      `<div class="row"><span class="name">AD ∥ BC</span><span class="val">${m.adParBC ? "yes" : "no"}</span></div>`;

    document.getElementById("diagReadout").innerHTML = `
      <div class="row"><span class="name">AC</span><span class="val">${formatPx(m.ac)}</span></div>
      <div class="row"><span class="name">BD</span><span class="val">${formatPx(m.bd)}</span></div>
      <div class="row"><span class="name">AC split</span><span class="val">${formatRatio(m.acHit, m.chit)} ${m.acBisected ? "bisected" : "not bisected"}</span></div>
      <div class="row"><span class="name">BD split</span><span class="val">${formatRatio(m.bdHit, m.dhit)} ${m.bdBisected ? "bisected" : "not bisected"}</span></div>
      <div class="row"><span class="name">Crossing angle</span><span class="val">${formatDeg(m.crossAngle)}</span></div>
    `;

    document.getElementById("propReadout").innerHTML = PROP_META.map((prop) => {
      const actual = !!m[prop.key];
      const guaranteed = shape.guaranteed.includes(prop.key);
      let light = "off";
      let tip = "False";
      if (guaranteed && actual) {
        light = "go";
        tip = "Required by the definition";
      } else if (actual) {
        light = "caution";
        tip = "True right now, but not promised";
      } else if (isFalseFriend(shape, prop.key)) {
        light = "stop";
        tip = "A habit this ugly version is meant to break";
      }
      return `<div class="prop ${light}" title="${tip}"><span class="light"></span><span>${prop.label}</span></div>`;
    }).join("");
  }

  function isFalseFriend(shape, key) {
    const habits = {
      quadrilateral: ["diagonalsBisectBoth", "diagonalsEqual", "diagonalsPerpendicular", "bothPairsParallel"],
      kite: ["diagonalsBisectBoth", "diagonalsEqual", "bothPairsParallel"],
      trapezoid: ["diagonalsEqual", "diagonalsBisectBoth", "diagonalsPerpendicular"],
      isoscelesTrapezoid: ["diagonalsPerpendicular", "diagonalsBisectBoth"],
      parallelogram: ["diagonalsEqual", "diagonalsPerpendicular", "allRightAngles", "allSidesEqual"],
      rectangle: ["diagonalsPerpendicular", "allSidesEqual"],
      rhombus: ["diagonalsEqual", "allRightAngles"],
      square: [],
    };
    return (habits[shape.id] || []).includes(key);
  }

  function init() {
    populateSelects();
    shapeSelect.addEventListener("change", () => setShape(shapeSelect.value));
    resetBtn.addEventListener("click", () => loadPreset(state.mood));
    neatBtn.addEventListener("click", () => loadPreset("neat"));
    uglyBtn.addEventListener("click", () => loadPreset("ugly"));
    diagToggle.addEventListener("change", () => {
      state.showDiagonals = diagToggle.checked;
      draw();
    });
    parallelToggle.addEventListener("change", () => {
      state.showParallel = parallelToggle.checked;
      draw();
    });
    symToggle.addEventListener("change", () => {
      state.showSymmetry = symToggle.checked;
      draw();
    });
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("resize", resize);
    window.addEventListener("keydown", (event) => {
      if (event.target.closest("input, select, button, textarea")) return;
      if (event.key === "d") {
        diagToggle.checked = !diagToggle.checked;
        state.showDiagonals = diagToggle.checked;
        draw();
      }
      if (event.key === "p") {
        parallelToggle.checked = !parallelToggle.checked;
        state.showParallel = parallelToggle.checked;
        draw();
      }
      if (event.key === "s") {
        symToggle.checked = !symToggle.checked;
        state.showSymmetry = symToggle.checked;
        draw();
      }
      if (event.key === "r") loadPreset(state.mood);
    });
    resize();
    setShape("kite");
  }

  init();
})();
