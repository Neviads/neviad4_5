import * as THREE from "three";
const g = new THREE.CylinderGeometry(0.06, 0.06, 0.3, 12, 3, false);
const attr = g.attributes.position, idx = g.index.array;
const p = attr.array, map = new Int32Array(attr.count), out = [], key = new Map();
for (let i = 0; i < attr.count; i++) {
  const k = `${Math.round(p[i*3]*1e7)},${Math.round(p[i*3+1]*1e7)},${Math.round(p[i*3+2]*1e7)}`;
  let j = key.get(k);
  if (j === undefined) { j = out.length/3; key.set(k, j); out.push(p[i*3], p[i*3+1], p[i*3+2]); }
  map[i] = j;
}
const tri = new Uint32Array(idx.length);
for (let i = 0; i < idx.length; i++) tri[i] = map[idx[i]];
const nv = out.length/3, sets = Array.from({length: nv}, () => new Set());
for (let t = 0; t < tri.length; t += 3) {
  const a = tri[t], b = tri[t+1], c = tri[t+2];
  sets[a].add(b); sets[a].add(c); sets[b].add(a); sets[b].add(c); sets[c].add(a); sets[c].add(b);
}
const P = (i) => [out[i*3].toFixed(4), out[i*3+1].toFixed(4), out[i*3+2].toFixed(4)];
console.log("v39", P(39), "neighbors", [...sets[39]].map(P));
console.log("first 6 welded", [0,1,2,3,4,5].map(P));
