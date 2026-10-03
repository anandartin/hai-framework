  /* hero neural-network brain — animated canvas background */
  (function () {
    var hero = document.querySelector('.hero');
    var canvas = document.querySelector('.hero-net');
    if (!hero || !canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── tunable parameters ───────────────────────────────── */
    var P = {
      neuronCount:    640,   // neuron dots sampled inside the brain mask
      neighbours:     4,     // nearest-neighbour synapse links per neuron
      midRangeChance: 0.70,  // chance of one extra longer-range link per neuron
      midRangeLo:     5,     // mid-range link drawn from Nth..Mth nearest
      midRangeHi:     14,
      maxEdgeFactor:  0.15,  // edge-length cap = factor x min(canvas W, H)
      cursorRadius:   280,   // px — pointer influence radius
      pulseCount:     24,    // travelling signal pulses
      pulseDot:       1.7,   // pulse dot radius (px)
      pulseEase:      0.62,  // 0 = linear .. 1 = fully eased through nodes
      pulseSpeedMin:  20,    // pulse travel speed (px/sec) — min  (very slow)
      pulseSpeedMax:  42,    // pulse travel speed (px/sec) — max  (very slow)
      gyriBumps:      7,     // bumps along the top of the cerebrum
      dotMin:         0.35,  // neuron radius (px) — min
      dotMax:         0.72,  // neuron radius (px) — max
      orbitMin:       1.0,   // neuron wander-orbit radius (px) — min
      orbitMax:       2.0,   // neuron wander-orbit radius (px) — max
      orbitSpeedMin:  0.05,  // neuron wander speed — min  (very slow drift)
      orbitSpeedMax:  0.16,  // neuron wander speed — max  (very slow drift)
      parallaxMax:    14,    // max cursor parallax push (px)
      titleFeather:   40,    // px — soft fade radius of the title-safe zone
      restNeuron:     0.08,  // neuron alpha at rest
      litNeuron:      0.62,  // neuron alpha when fully cursor-lit
      restSyn:        0.055, // synapse alpha at rest
      litSyn:         0.34,  // synapse alpha when fully cursor-lit
      restPulse:      0.12,  // pulse alpha at rest (faint, like the synapses)
      litPulse:       0.95,  // pulse alpha when fully cursor-lit
      neuronSwell:    0.9,   // extra radius multiplier at full light
      depthMin:       0.40,  // depth span — far neurons (fainter / smaller / slower)
      depthMax:       1.50,  // depth span — near neurons (bolder / bigger / livelier)
      ink:   '17,16,15',     // neurons + synapses (rgb)
      pulse: '30,63,230'     // signal pulses (rgb of #1E3FE6)
    };

    /* ── brain silhouette — union of ellipses (brain space ~100x80) ── */
    function brainEllipses() {
      var e = [
        { x: 50, y: 37, rx: 39, ry: 27 },   // main cerebrum bulk
        { x: 26, y: 35, rx: 21, ry: 22 },   // frontal lobe
        { x: 75, y: 36, rx: 23, ry: 23 },   // parietal / occipital
        { x: 49, y: 26, rx: 31, ry: 17 },   // top crown
        { x: 35, y: 52, rx: 17, ry: 13 },   // temporal lobe (front)
        { x: 55, y: 53, rx: 18, ry: 12 }    // temporal / underside
      ];
      for (var i = 0; i < P.gyriBumps; i++) {        // gyri bumps along the top
        var bx = 18 + (i / (P.gyriBumps - 1)) * 68;
        var by = 15 + 0.010 * (bx - 48) * (bx - 48);
        e.push({ x: bx, y: by, rx: 9.5, ry: 8.5 });
      }
      e.push({ x: 83, y: 57, rx: 9, ry: 8 });        // cerebellum cluster
      e.push({ x: 89, y: 60, rx: 8, ry: 7 });
      e.push({ x: 85, y: 63, rx: 8, ry: 7 });
      e.push({ x: 91, y: 54, rx: 7, ry: 6 });
      e.push({ x: 80, y: 61, rx: 7, ry: 6 });
      e.push({ x: 66, y: 64, rx: 7, ry: 9 });        // brain stem
      e.push({ x: 65, y: 73, rx: 5.5, ry: 8 });
      return e;
    }

    var W, H, dpr, scale, ox, oy, neurons, edges, adj, pulses, zOrder;
    var dt = 0, last = 0, titleZone = null;
    var NB = 18, EB = [];                            // synapse alpha buckets
    for (var bi = 0; bi < NB; bi++) EB.push([]);
    var EB_MAX = 0.45;                               // top of bucket alpha range

    function rnd(a, b) { return a + Math.random() * (b - a); }
    function ease(t) { return t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t); }

    /* title-safe zone — 0 deep behind the title, easing to 1 outside it */
    function titleMask(x, y) {
      if (!titleZone) return 1;
      var z = titleZone, F = P.titleFeather;
      var dx = Math.max(z.x - x, x - (z.x + z.w), 0);
      var dy = Math.max(z.y - y, y - (z.y + z.h), 0);
      var d = Math.sqrt(dx * dx + dy * dy);
      return ease(d >= F ? 1 : d / F);
    }

    function build() {
      dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
      W = hero.clientWidth;
      H = hero.clientHeight;
      if (!W || !H) return;                        // hidden / not laid out yet
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      /* locate the title so the network can keep clear of it */
      var titleEl = hero.querySelector('h1');
      if (titleEl) {
        var hr = hero.getBoundingClientRect();
        var tr = titleEl.getBoundingClientRect();
        titleZone = { x: tr.left - hr.left, y: tr.top - hr.top, w: tr.width, h: tr.height };
      } else {
        titleZone = null;
      }

      var ell = brainEllipses();
      var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
      ell.forEach(function (e) {
        if (e.x - e.rx < minX) minX = e.x - e.rx;
        if (e.y - e.ry < minY) minY = e.y - e.ry;
        if (e.x + e.rx > maxX) maxX = e.x + e.rx;
        if (e.y + e.ry > maxY) maxY = e.y + e.ry;
      });
      var bw = maxX - minX, bh = maxY - minY;
      scale = Math.min((W * 0.92) / bw, (H * 0.84) / bh);
      ox = (W - bw * scale) * 0.5 - minX * scale;
      oy = (H - bh * scale) * 0.44 - minY * scale;

      /* brain mask on an offscreen canvas */
      var mc = document.createElement('canvas');
      mc.width = W; mc.height = H;
      var mx = mc.getContext('2d');
      mx.fillStyle = '#000';
      ell.forEach(function (e) {
        mx.beginPath();
        mx.ellipse(ox + e.x * scale, oy + e.y * scale,
                   e.rx * scale, e.ry * scale, 0, 0, Math.PI * 2);
        mx.fill();
      });
      var md = mx.getImageData(0, 0, W, H).data;
      function inside(px, py) {
        px = px | 0; py = py | 0;
        if (px < 0 || py < 0 || px >= W || py >= H) return false;
        return md[(py * W + px) * 4 + 3] > 128;
      }

      /* rejection-sample neurons inside the mask, each given a depth z */
      neurons = [];
      var tries = 0, cap = P.neuronCount * 90;
      while (neurons.length < P.neuronCount && tries < cap) {
        tries++;
        var x = Math.random() * W, y = Math.random() * H;
        if (inside(x, y)) {
          var z = Math.random();                     // 0 = far, 1 = near
          neurons.push({
            hx: x, hy: y, px: x, py: y, z: z,
            r: rnd(P.dotMin, P.dotMax) * (0.5 + 1.05 * z),
            df: P.depthMin + (P.depthMax - P.depthMin) * z,
            tm: titleMask(x, y),
            orbitR: rnd(P.orbitMin, P.orbitMax) * (0.75 + 0.45 * z),
            orbitS: rnd(P.orbitSpeedMin, P.orbitSpeedMax) * (0.6 + 0.5 * z) *
                    (Math.random() < 0.5 ? -1 : 1),
            orbitP: rnd(0, 6.283),
            twS: rnd(0.6, 1.8), twP: rnd(0, 6.283),
            light: 0
          });
        }
      }
      zOrder = neurons.map(function (_, i) { return i; });
      zOrder.sort(function (a, b) { return neurons[a].z - neurons[b].z; });

      /* synapse edges — nearest neighbours + mid-range links, deduped & capped */
      var maxLen = P.maxEdgeFactor * Math.min(W, H);
      var seen = {};
      edges = [];
      adj = [];
      var i, j, k;
      for (i = 0; i < neurons.length; i++) adj.push([]);

      function addEdge(i, j, dist) {
        if (dist > maxLen) return;
        var a = Math.min(i, j), b = Math.max(i, j), key = a + '_' + b;
        if (seen[key]) return;
        seen[key] = 1;
        var ei = edges.length;
        edges.push({
          a: a, b: b, len: dist,
          df: (neurons[a].df + neurons[b].df) * 0.5,
          tm: Math.min(neurons[a].tm, neurons[b].tm)
        });
        adj[a].push(ei); adj[b].push(ei);
      }

      for (i = 0; i < neurons.length; i++) {
        var d = [];
        for (j = 0; j < neurons.length; j++) {
          if (i === j) continue;
          var dx = neurons[i].hx - neurons[j].hx;
          var dy = neurons[i].hy - neurons[j].hy;
          d.push({ j: j, dist: Math.sqrt(dx * dx + dy * dy) });
        }
        d.sort(function (a, b) { return a.dist - b.dist; });
        for (k = 0; k < P.neighbours && k < d.length; k++) addEdge(i, d[k].j, d[k].dist);
        if (Math.random() < P.midRangeChance) {       // one longer, criss-cross link
          var hi = Math.min(P.midRangeHi, d.length - 1);
          if (hi >= P.midRangeLo) {
            var m = (rnd(P.midRangeLo, hi + 1)) | 0;
            addEdge(i, d[m].j, d[m].dist);
          }
        }
      }

      /* signal pulses */
      pulses = [];
      if (edges.length) for (i = 0; i < P.pulseCount; i++) pulses.push(newPulse(null));
    }

    function newPulse(fromNode) {
      var ei, dir;
      if (fromNode != null && adj[fromNode] && adj[fromNode].length) {
        ei = adj[fromNode][(Math.random() * adj[fromNode].length) | 0];
        dir = edges[ei].a === fromNode ? 0 : 1;
      } else {
        ei = (Math.random() * edges.length) | 0;
        dir = Math.random() < 0.5 ? 0 : 1;
      }
      return {
        e: ei, dir: dir,
        t: fromNode != null ? 0 : Math.random(),
        speed: rnd(P.pulseSpeedMin, P.pulseSpeedMax)
      };
    }

    /* ── pointer tracking ───────────────────────────────────── */
    var cx = -9999, cy = -9999;
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      cx = e.clientX - r.left;
      cy = e.clientY - r.top;
    });
    hero.addEventListener('pointerleave', function () { cx = cy = -9999; });

    function updateNeuron(n, time) {
      var oxn = Math.cos(time * n.orbitS + n.orbitP) * n.orbitR;
      var oyn = Math.sin(time * n.orbitS + n.orbitP) * n.orbitR;
      var tx = n.hx + oxn, ty = n.hy + oyn;
      var dx = n.hx - cx, dy = n.hy - cy;
      var d = Math.sqrt(dx * dx + dy * dy);
      var lit = 0;
      if (d < P.cursorRadius) {
        lit = ease(1 - d / P.cursorRadius);
        var push = P.parallaxMax * lit * (0.4 + 0.85 * n.z);   // depth parallax
        var inv = d > 0.01 ? 1 / d : 0;
        tx += dx * inv * push;
        ty += dy * inv * push;
      }
      n.light += (lit - n.light) * 0.12;
      n.px += (tx - n.px) * 0.14;
      n.py += (ty - n.py) * 0.14;
    }

    function render(now) {
      if (!neurons) return;
      var time = now / 1000;
      ctx.clearRect(0, 0, W, H);

      var i, b;
      for (i = 0; i < neurons.length; i++) updateNeuron(neurons[i], time);

      /* synapses — bucketed by alpha for smooth, cheap drawing */
      for (b = 0; b < NB; b++) EB[b].length = 0;
      for (i = 0; i < edges.length; i++) {
        var e = edges[i];
        if (e.tm <= 0.001) continue;                 // skip — behind the title
        var l = (neurons[e.a].light + neurons[e.b].light) * 0.5;
        var al = (P.restSyn + (P.litSyn - P.restSyn) * l) * e.df * e.tm;
        var idx = (al / EB_MAX * NB) | 0;
        if (idx < 0) idx = 0; else if (idx >= NB) idx = NB - 1;
        EB[idx].push(i);
      }
      ctx.lineWidth = 0.7;
      for (b = 0; b < NB; b++) {
        var list = EB[b];
        if (!list.length) continue;
        ctx.strokeStyle = 'rgba(' + P.ink + ',' +
          (((b + 0.5) / NB) * EB_MAX).toFixed(3) + ')';
        ctx.beginPath();
        for (i = 0; i < list.length; i++) {
          var ed = edges[list[i]];
          var na = neurons[ed.a], nb = neurons[ed.b];
          ctx.moveTo(na.px, na.py);
          ctx.lineTo(nb.px, nb.py);
        }
        ctx.stroke();
      }

      /* neurons — drawn far-to-near for depth layering */
      for (i = 0; i < zOrder.length; i++) {
        var n = neurons[zOrder[i]];
        if (n.tm <= 0.001) continue;                 // skip — behind the title
        var tw = 0.62 + 0.38 * Math.sin(time * n.twS + n.twP);
        var a = (P.restNeuron + (P.litNeuron - P.restNeuron) * n.light) * tw * n.df * n.tm;
        var rad = n.r * (1 + P.neuronSwell * n.light);
        ctx.fillStyle = 'rgba(' + P.ink + ',' + a.toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(n.px, n.py, rad, 0, Math.PI * 2);
        ctx.fill();
      }

      /* signal pulses — blue dot, eased glide, faint at rest like the synapses */
      for (i = 0; i < pulses.length; i++) {
        var p = pulses[i], ce = edges[p.e];
        if (!ce) { pulses[i] = newPulse(null); continue; }
        p.t += (p.speed / Math.max(ce.len, 1)) * dt;
        if (p.t >= 1) {
          var endNode = p.dir === 0 ? ce.b : ce.a;
          pulses[i] = newPulse(endNode);
          p = pulses[i]; ce = edges[p.e];
        }
        var te = p.t + (ease(p.t) - p.t) * P.pulseEase;     // smooth easing
        var n1 = neurons[ce.a], n2 = neurons[ce.b];
        var fx, fy, gx, gy, fl, gl, ftm, gtm;
        if (p.dir === 0) {
          fx = n1.px; fy = n1.py; gx = n2.px; gy = n2.py;
          fl = n1.light; gl = n2.light; ftm = n1.tm; gtm = n2.tm;
        } else {
          fx = n2.px; fy = n2.py; gx = n1.px; gy = n1.py;
          fl = n2.light; gl = n1.light; ftm = n2.tm; gtm = n1.tm;
        }
        var ptm = ftm + (gtm - ftm) * te;                   // title-safe fade
        if (ptm <= 0.001) continue;
        var plight = fl + (gl - fl) * te;                   // local cursor light
        var pa = (P.restPulse + (P.litPulse - P.restPulse) * plight) * ptm;
        ctx.fillStyle = 'rgba(' + P.pulse + ',' + pa.toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(fx + (gx - fx) * te, fy + (gy - fy) * te, P.pulseDot, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function loop(now) {
      dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      render(now);
      requestAnimationFrame(loop);
    }

    function staticFrame() {
      if (!neurons) return;
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 0.7;
      var i;
      for (i = 0; i < edges.length; i++) {
        var e = edges[i];
        if (e.tm <= 0.001) continue;
        var na = neurons[e.a], nb = neurons[e.b];
        ctx.strokeStyle = 'rgba(' + P.ink + ',' + (0.15 * e.df * e.tm).toFixed(3) + ')';
        ctx.beginPath();
        ctx.moveTo(na.hx, na.hy); ctx.lineTo(nb.hx, nb.hy);
        ctx.stroke();
      }
      for (i = 0; i < neurons.length; i++) {
        var n = neurons[i];
        if (n.tm <= 0.001) continue;
        ctx.fillStyle = 'rgba(' + P.ink + ',' + (0.30 * n.df * n.tm).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(n.hx, n.hy, n.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    build();
    if (reduce) staticFrame();
    else requestAnimationFrame(loop);

    var rt;
    function onResize() {
      clearTimeout(rt);
      rt = setTimeout(function () { build(); if (reduce) staticFrame(); }, 180);
    }
    if (window.ResizeObserver) new ResizeObserver(onResize).observe(hero);
    else window.addEventListener('resize', onResize);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { build(); if (reduce) staticFrame(); });
    }
  })();
