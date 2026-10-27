/**
 * Texture vẽ bằng canvas, dùng chung cho các vật 3D (máy phát ở /may-phat-dien-xoay-chieu, bộ lắp ráp ở /lap-rap-3d).
 * Chỉ chạy trong trình duyệt (cần document).
 */

import * as THREE from "three";

export function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, srgb = true) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

export function woodTexture() {
  return canvasTexture(1024, 512, (g) => {
    g.fillStyle = "#9a6338";
    g.fillRect(0, 0, 1024, 512);
    // thớ gỗ chạy dọc chiều dài đế
    for (let i = 0; i < 260; i++) {
      const y = Math.random() * 512;
      const a = 0.04 + Math.random() * 0.12;
      g.strokeStyle = Math.random() < 0.5 ? `rgba(60,30,12,${a})` : `rgba(210,150,95,${a * 0.7})`;
      g.lineWidth = 0.6 + Math.random() * 2.2;
      g.beginPath();
      g.moveTo(0, y);
      for (let x = 0; x <= 1024; x += 32) g.lineTo(x, y + Math.sin(x / 140 + i) * 3 + Math.sin(x / 37 + i * 2) * 0.8);
      g.stroke();
    }
  });
}

export function windingTexture() {
  // mỗi vạch tối là khe giữa hai vòng dây
  return canvasTexture(256, 32, (g) => {
    g.fillStyle = "#c97a45";
    g.fillRect(0, 0, 256, 32);
    for (let x = 0; x < 256; x += 4) {
      const grad = g.createLinearGradient(x, 0, x + 4, 0);
      grad.addColorStop(0, "rgba(70,25,8,.85)");
      grad.addColorStop(0.35, "rgba(240,170,110,.35)");
      grad.addColorStop(1, "rgba(70,25,8,.6)");
      g.fillStyle = grad;
      g.fillRect(x, 0, 4, 32);
    }
  });
}

export function letterTexture(letter: string) {
  return canvasTexture(128, 128, (g) => {
    g.clearRect(0, 0, 128, 128);
    g.fillStyle = "rgba(255,255,255,.92)";
    g.font = "bold 92px Arial, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(letter, 64, 70);
  });
}

export function dialTexture() {
  return canvasTexture(512, 384, (g) => {
    g.fillStyle = "#f4efe2";
    g.fillRect(0, 0, 512, 384);
    const cx = 256, cy = 330, r = 250;
    g.strokeStyle = "#222";
    g.fillStyle = "#222";
    g.lineWidth = 3;
    g.beginPath();
    g.arc(cx, cy, r - 30, Math.PI * 1.25, Math.PI * 1.75);
    g.stroke();
    g.font = "26px Arial, sans-serif";
    g.textAlign = "center";
    for (let i = -10; i <= 10; i++) {
      const a = -Math.PI / 2 + (i / 10) * (Math.PI / 4);
      const long = i % 5 === 0;
      const r0 = r - 30, r1 = r0 - (long ? 26 : 13);
      g.lineWidth = long ? 3 : 1.6;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      g.stroke();
      if (long) g.fillText(String(Math.abs(i) * 2), cx + Math.cos(a) * (r1 - 22), cy + Math.sin(a) * (r1 - 22) + 8);
    }
    g.font = "bold 40px Arial, sans-serif";
    g.fillText("V", cx, 250);
    g.font = "20px Arial, sans-serif";
    g.fillText("−          0          +", cx, 285);
  });
}
