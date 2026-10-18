// "Mắt" của cổng check_object: dựng cây nút của Konva giả (scripts/lib/draw-object-harness.mjs) thành SVG rồi PNG bằng sharp, không cần trình
// duyệt. Theo đúng thứ tự biến đổi của Konva (dời, quay, co giãn, rồi trừ offset); đã đối chiếu với ảnh trình duyệt chụp cùng vật.
// Không có trong ảnh: bộ lọc (filters), cache, ảnh ngoài; chữ dùng Arial. Konva.Shape có sceneFunc được vẽ (xem case "Shape").
import { createRequire } from "node:module";
import { join } from "node:path";

const num = (v, f = 0) => (typeof v === "number" && Number.isFinite(v) ? v : f);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const r2 = (v) => Math.round(v * 100) / 100;

/** Đường cong Catmull-Rom (như `tension` của Konva.Line) qua các điểm, dạng lệnh SVG. */
function tensionPath(pts, tension, closed) {
  const p = [];
  for (let i = 0; i + 1 < pts.length; i += 2) p.push([pts[i], pts[i + 1]]);
  if (p.length < 3) return p.map(([x, y], i) => `${i ? "L" : "M"}${r2(x)} ${r2(y)}`).join(" ") + (closed ? " Z" : "");
  const at = (i) => (closed ? p[(i + p.length) % p.length] : p[Math.max(0, Math.min(p.length - 1, i))]);
  const t = tension / 2;
  let d = `M${r2(p[0][0])} ${r2(p[0][1])}`;
  const last = closed ? p.length : p.length - 1;
  for (let i = 0; i < last; i += 1) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t];
    const c2 = [p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t];
    d += ` C${r2(c1[0])} ${r2(c1[1])} ${r2(c2[0])} ${r2(c2[1])} ${r2(p2[0])} ${r2(p2[1])}`;
  }
  return d + (closed ? " Z" : "");
}

const polar = (r, deg) => [r * Math.cos((deg * Math.PI) / 180), r * Math.sin((deg * Math.PI) / 180)];
/** Hình quạt / cung vành khuyên từ góc 0 theo chiều kim đồng hồ (như Konva.Wedge, Konva.Arc). */
function sectorPath(inner, outer, angle, clockwise) {
  const a = Math.max(-359.99, Math.min(359.99, clockwise ? -angle : angle));
  const large = Math.abs(a) > 180 ? 1 : 0, sweep = a >= 0 ? 1 : 0;
  const [ox1, oy1] = polar(outer, 0), [ox2, oy2] = polar(outer, a);
  if (inner <= 0) return `M0 0 L${r2(ox1)} ${r2(oy1)} A${r2(outer)} ${r2(outer)} 0 ${large} ${sweep} ${r2(ox2)} ${r2(oy2)} Z`;
  const [ix2, iy2] = polar(inner, a), [ix1, iy1] = polar(inner, 0);
  return `M${r2(ox1)} ${r2(oy1)} A${r2(outer)} ${r2(outer)} 0 ${large} ${sweep} ${r2(ox2)} ${r2(oy2)} L${r2(ix2)} ${r2(iy2)} A${r2(inner)} ${r2(inner)} 0 ${large} ${1 - sweep} ${r2(ix1)} ${r2(iy1)} Z`;
}

/** Dựng một bộ dịch SVG riêng cho mỗi ảnh (id gradient và filter không đụng nhau). */
function translator() {
  let defs = "", uid = 0;
  const stops = (list) => { let s = ""; for (let i = 0; i + 1 < list.length; i += 2) s += `<stop offset="${num(list[i])}" stop-color="${esc(list[i + 1])}"/>`; return s; };
  const gradient = (a, kind) => {
    const pre = kind === "fill" ? "fill" : "stroke";
    if (Array.isArray(a[`${pre}LinearGradientColorStops`])) {
      const id = `g${uid++}`, s = a[`${pre}LinearGradientStartPoint`] ?? {}, e = a[`${pre}LinearGradientEndPoint`] ?? {};
      defs += `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${num(s.x)}" y1="${num(s.y)}" x2="${num(e.x)}" y2="${num(e.y)}">${stops(a[`${pre}LinearGradientColorStops`])}</linearGradient>`;
      return `url(#${id})`;
    }
    if (Array.isArray(a[`${pre}RadialGradientColorStops`])) {
      const id = `g${uid++}`, s = a[`${pre}RadialGradientStartPoint`] ?? {}, e = a[`${pre}RadialGradientEndPoint`] ?? {};
      defs += `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${num(e.x)}" cy="${num(e.y)}" r="${num(a[`${pre}RadialGradientEndRadius`])}" fx="${num(s.x)}" fy="${num(s.y)}" fr="${num(a[`${pre}RadialGradientStartRadius`])}">${stops(a[`${pre}RadialGradientColorStops`])}</radialGradient>`;
      return `url(#${id})`;
    }
    return null;
  };
  const paint = (a, filled = true) => {
    const fill = filled ? (gradient(a, "fill") ?? (a.fill ? esc(a.fill) : "none")) : "none";
    let s = `fill="${a.fillEnabled === false ? "none" : fill}"`;
    const stroke = gradient(a, "stroke") ?? (a.stroke ? esc(a.stroke) : null);
    if (stroke && a.strokeEnabled !== false) {
      s += ` stroke="${stroke}" stroke-width="${num(a.strokeWidth, 1)}" stroke-linecap="${esc(a.lineCap ?? "butt")}" stroke-linejoin="${esc(a.lineJoin ?? "miter")}"`;
      if (Array.isArray(a.dash) && a.dash.length) s += ` stroke-dasharray="${a.dash.map((v) => num(v)).join(" ")}"`;
    }
    if (a.opacity !== undefined) s += ` opacity="${num(a.opacity, 1)}"`;
    if (a.shadowColor && num(a.shadowBlur) > 0 && a.shadowEnabled !== false) {
      const id = `f${uid++}`, o = a.shadowOffset ?? { x: a.shadowOffsetX, y: a.shadowOffsetY };
      defs += `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceAlpha" stdDeviation="${num(a.shadowBlur) / 2}"/><feOffset dx="${num(o?.x)}" dy="${num(o?.y)}" result="b"/><feFlood flood-color="${esc(a.shadowColor)}" flood-opacity="${num(a.shadowOpacity, 1)}"/><feComposite in2="b" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
      s += ` filter="url(#${id})"`;
    }
    return s;
  };
  const node = (nd, depth = 0) => {
    const a = nd?.__attrs;
    if (!a || a.visible === false || depth > 60) return "";
    const t = `translate(${num(a.x)} ${num(a.y)}) rotate(${num(a.rotation)}) scale(${num(a.scaleX, 1)} ${num(a.scaleY, 1)}) translate(${-num(a.offsetX)} ${-num(a.offsetY)})`;
    let inner = "";
    switch (nd.__kind) {
      case "Group": case "Layer":
        return `<g transform="${t}"${a.opacity !== undefined ? ` opacity="${num(a.opacity, 1)}"` : ""}>${(nd.__children ?? []).map((c) => node(c, depth + 1)).join("")}</g>`;
      case "Rect": inner = `<rect width="${num(a.width)}" height="${num(a.height)}" rx="${Array.isArray(a.cornerRadius) ? num(a.cornerRadius[0]) : num(a.cornerRadius)}" ${paint(a)}/>`; break;
      case "Circle": inner = `<circle r="${num(a.radius)}" ${paint(a)}/>`; break;
      case "Ellipse": inner = `<ellipse rx="${num(a.radiusX, num(a.radius?.x))}" ry="${num(a.radiusY, num(a.radius?.y))}" ${paint(a)}/>`; break;
      case "Ring": inner = `<path d="${sectorPath(num(a.innerRadius), num(a.outerRadius), 360, false)}" fill-rule="evenodd" ${paint(a)}/>`; break;
      case "Wedge": inner = `<path d="${sectorPath(0, num(a.radius), num(a.angle), Boolean(a.clockwise))}" ${paint(a)}/>`; break;
      case "Arc": inner = `<path d="${sectorPath(num(a.innerRadius), num(a.outerRadius), num(a.angle), Boolean(a.clockwise))}" ${paint(a)}/>`; break;
      case "RegularPolygon": case "Star": {
        const n = Math.max(3, Math.round(num(a.sides, num(a.numPoints, 5))));
        const pts = [];
        const count = nd.__kind === "Star" ? n * 2 : n;
        for (let i = 0; i < count; i += 1) {
          const r = nd.__kind === "Star" ? (i % 2 ? num(a.innerRadius) : num(a.outerRadius)) : num(a.radius);
          const ang = -Math.PI / 2 + (i * 2 * Math.PI) / count;
          pts.push(`${r2(r * Math.cos(ang))} ${r2(r * Math.sin(ang))}`);
        }
        inner = `<path d="M${pts.join(" L")} Z" ${paint(a)}/>`; break;
      }
      case "Path": inner = `<path d="${esc(a.data ?? "")}" ${paint(a)}/>`; break;
      case "Line": case "Arrow": {
        const pts = Array.isArray(a.points) ? a.points.map((v) => num(v)) : [];
        const closed = Boolean(a.closed);
        const d = num(a.tension) > 0 ? tensionPath(pts, num(a.tension), closed)
          : pts.reduce((s, v, i) => (i % 2 ? s : `${s}${i ? " L" : "M"}${r2(v)} ${r2(pts[i + 1] ?? 0)}`), "") + (closed ? " Z" : "");
        inner = `<path d="${d}" ${paint(a, closed)}/>`;
        if (nd.__kind === "Arrow" && pts.length >= 4) {
          const [x1, y1, x2, y2] = pts.slice(-4), ang = Math.atan2(y2 - y1, x2 - x1), len = num(a.pointerLength, 10), w = num(a.pointerWidth, 10) / 2;
          const bx = x2 - Math.cos(ang) * len, by = y2 - Math.sin(ang) * len;
          inner += `<path d="M${r2(x2)} ${r2(y2)} L${r2(bx - Math.sin(ang) * w)} ${r2(by + Math.cos(ang) * w)} L${r2(bx + Math.sin(ang) * w)} ${r2(by - Math.cos(ang) * w)} Z" fill="${esc(a.fill ?? a.stroke ?? "#fff")}"/>`;
        }
        break;
      }
      case "Text": {
        const size = num(a.fontSize, 12), lines = String(a.text ?? "").split("\n");
        const anchor = a.align === "center" ? "middle" : a.align === "right" ? "end" : "start";
        const x = anchor === "middle" ? num(a.width) / 2 : anchor === "end" ? num(a.width) : 0;
        inner = lines.map((line, i) => `<text x="${r2(x)}" y="${r2(size * 0.85 + i * size * num(a.lineHeight, 1))}" font-size="${size}" font-family="Arial" font-weight="${/bold/.test(String(a.fontStyle ?? "")) ? 700 : 400}" text-anchor="${anchor}" ${paint(a)}>${esc(line)}</text>`).join("");
        break;
      }
      case "Shape": {
        // Konva.Shape tự vẽ bằng sceneFunc: chạy nó trên một "canvas" ghi lại đường đi rồi dịch thành path SVG (hỗ trợ moveTo, lineTo, arc, ellipse, rect,
        // quadraticCurveTo, bezierCurveTo, closePath và fillStrokeShape/fill/stroke; mỗi lần fill hay stroke chốt một path).
        if (typeof a.sceneFunc !== "function") return "";
        let d = "";
        let has = false;
        const paths = [];
        const pt = (x, y) => { d += (has ? "L" : "M") + r2(x) + " " + r2(y) + " "; has = true; };
        const arcTo = (cx, cy, rx, ry, a0, a1, ccw) => {
          let sweep = a1 - a0;
          if (Math.abs(sweep) >= 2 * Math.PI - 1e-9) sweep = ccw ? -2 * Math.PI : 2 * Math.PI;
          else if (!ccw && sweep < 0) sweep += 2 * Math.PI;
          else if (ccw && sweep > 0) sweep -= 2 * Math.PI;
          const steps = Math.max(8, Math.ceil(Math.abs(sweep) / 0.08));
          for (let i = 0; i <= steps; i += 1) { const t = a0 + (sweep * i) / steps; pt(cx + rx * Math.cos(t), cy + ry * Math.sin(t)); }
        };
        const ctx = {
          beginPath() { d = ""; has = false; },
          moveTo(x, y) { d += "M" + r2(x) + " " + r2(y) + " "; has = true; },
          lineTo(x, y) { pt(x, y); },
          closePath() { d += "Z "; has = false; },
          quadraticCurveTo(cx, cy, x, y) { d += "Q" + r2(cx) + " " + r2(cy) + " " + r2(x) + " " + r2(y) + " "; has = true; },
          bezierCurveTo(c1x, c1y, c2x, c2y, x, y) { d += "C" + [c1x, c1y, c2x, c2y, x, y].map(r2).join(" ") + " "; has = true; },
          arc(cx, cy, r, a0, a1, ccw) { arcTo(cx, cy, r, r, a0, a1, ccw); },
          ellipse(cx, cy, rx, ry, rot, a0, a1, ccw) { arcTo(cx, cy, rx, ry, a0, a1, ccw); },
          rect(x, y, w, h) { d += "M" + r2(x) + " " + r2(y) + " L" + r2(x + w) + " " + r2(y) + " L" + r2(x + w) + " " + r2(y + h) + " L" + r2(x) + " " + r2(y + h) + " Z "; has = false; },
          fillStrokeShape() { paths.push(d); },
          fill() { paths.push(d); },
          stroke() { paths.push(d); },
        };
        a.sceneFunc(ctx, nd);
        inner = paths.map((pd) => `<path d="${pd}" ${paint(a, true)}/>`).join("");
        break;
      }
      default: return "";
    }
    return `<g transform="${t}">${inner}</g>`;
  };
  return { node, defs: () => defs };
}

/**
 * Một ảnh PNG `width × height` của nhóm `group` (nút Konva giả), đặt tại (`x`, `y`), trên nền cảnh mô phỏng (#0f172a, lưới 40 px);
 * `floorY` (tuỳ chọn) vẽ đường sàn. `label` ghi góc trên-trái ảnh để model biết ảnh nào là gì.
 */
export { translator };
export async function renderGroupPng(feRoot, group, { width, height, x, y, floorY, label }) {
  const sharp = createRequire(join(feRoot, "package.json"))("sharp");
  const tr = translator();
  const body = tr.node(group);
  let grid = "";
  for (let gx = 40; gx < width; gx += 40) grid += `M${gx} 0V${height}`;
  for (let gy = 40; gy < height; gy += 40) grid += `M0 ${gy}H${width}`;
  const floor = floorY === undefined ? "" : `<rect x="0" y="${r2(floorY)}" width="${width}" height="${r2(height - floorY)}" fill="#0b1220"/><path d="M0 ${r2(floorY)}H${width}" stroke="#64748b" stroke-width="2"/>`;
  const caption = label ? `<text x="12" y="22" font-size="14" font-family="Arial" fill="#94a3b8">${esc(label)}</text>` : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs>${tr.defs()}</defs>`
    + `<rect width="${width}" height="${height}" fill="#0f172a"/><path d="${grid}" stroke="#3a4a68" stroke-opacity=".55" fill="none"/>${floor}`
    + `<g transform="translate(${r2(x)} ${r2(y)})">${body}</g>${caption}</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}
