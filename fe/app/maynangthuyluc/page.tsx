"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import styles from "./hydraulic.module.css";

const G = 9.81;

function format(value: number, digits = 0) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: digits }).format(value);
}

function precisionForStep(step: number) {
  if (step >= 1) return 0;
  return Math.max(0, Math.ceil(-Math.log10(step)));
}

function Slider({ label, value, min, max, step, unit, onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  const percent = ((value - min) / (max - min)) * 100;
  const precision = precisionForStep(step);
  return (
    <label className={styles.control}>
      <span className={styles.controlHeading}><span>{label}</span><strong>{format(value, precision)} {unit}</strong></span>
      <input aria-label={label} type="range" min={min} max={max} step={step} value={value} style={{ "--progress": `${percent}%` } as CSSProperties} onChange={(event) => onChange(Number(event.target.value))} />
      <span className={styles.rangeLabels}><span>{format(min, precision)}</span><span>{format(max, precision)}</span></span>
    </label>
  );
}

export default function HydraulicLiftPage() {
  const [inputForce, setInputForce] = useState(200);
  const [smallArea, setSmallArea] = useState(0.005);
  const [largeArea, setLargeArea] = useState(0.05);
  const [loadMass, setLoadMass] = useState(100);
  const [inputTravel, setInputTravel] = useState(0.1);
  const [pressed, setPressed] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const pressure = inputForce / smallArea;
  const outputForce = pressure * largeArea;
  const mechanicalAdvantage = largeArea / smallArea;
  const outputTravel = inputTravel / mechanicalAdvantage;
  const loadWeight = loadMass * G;
  const canLift = outputForce >= loadWeight;
  const inputProgress = pressed ? 1 : 0;
  const outputProgress = pressed && canLift ? 1 : 0;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.code === "Space") {
        event.preventDefault();
        setPressed(true);
      }
    }
    function onKeyUp(event: KeyboardEvent) {
      if (event.code === "Space") setPressed(false);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const status = useMemo(() => {
    if (!pressed) return { label: "Sẵn sàng thử nghiệm", tone: "neutral" };
    if (canLift) return { label: "Tải đang được nâng", tone: "success" };
    return { label: "Chưa đủ lực để nâng tải", tone: "warning" };
  }, [canLift, pressed]);

  function reset() {
    setInputForce(200);
    setSmallArea(0.005);
    setLargeArea(0.05);
    setLoadMass(100);
    setInputTravel(0.1);
    setPressed(false);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.logo} href="/" aria-label="Quay về NEVIAD"><span className={styles.logoMark}>✦</span><span>neviad <em>lab</em></span></Link>
        <div className={styles.headerMeta}><span className={styles.eyebrow}>PHÒNG THÍ NGHIỆM VẬT LÝ</span><span className={styles.dot} /><span>Máy nâng thủy lực</span></div>
        <button className={styles.guideButton} onClick={() => setShowGuide((current) => !current)}>{showGuide ? "Ẩn hướng dẫn" : "Cách khám phá"}</button>
      </header>

      <section className={styles.hero}>
        <div>
          <p className={styles.kicker}>THÍ NGHIỆM TƯƠNG TÁC · ĐỊNH LUẬT PASCAL</p>
          <h1>Nhấn nhẹ,<br /><i>nâng thật nhiều.</i></h1>
          <p className={styles.intro}>Khám phá cách áp suất truyền qua chất lỏng và vì sao piston lớn có thể nâng một tải nặng hơn nhiều lần lực bạn tác dụng.</p>
        </div>
        <div className={styles.heroFormula}><span>F₁ / A₁ = F₂ / A₂</span><small>Áp suất được truyền nguyên vẹn trong chất lỏng kín.</small></div>
      </section>

      {showGuide && <aside className={styles.guide} role="status"><strong>Thử như một nhà khoa học</strong><span>1. Dự đoán: tăng A₂ sẽ làm F₂ thay đổi thế nào?</span><span>2. Giữ F₁ cố định, kéo A₂ rồi nhấn giữ nút.</span><span>3. Quan sát lực tăng nhưng quãng đường piston lớn giảm.</span></aside>}

      <section className={styles.workspace}>
        <div className={styles.simCard}>
          <div className={styles.cardTop}><div><span className={styles.sectionLabel}>MÔ PHỎNG TRỰC QUAN</span><h2>Hai piston · một áp suất</h2></div><span className={`${styles.status} ${styles[status.tone]}`}><i />{status.label}</span></div>
          <HydraulicScene inputArea={smallArea} outputArea={largeArea} loadMass={loadMass} pressure={pressure} pressed={pressed} canLift={canLift} inputProgress={inputProgress} outputProgress={outputProgress} />
          <div className={styles.simFooter}><span><i className={styles.legendFluid} /> Chất lỏng không nén được</span><span><i className={styles.legendMotion} /> Chuyển động phóng đại</span><span className={styles.keyboardHint}>Giữ <kbd>Space</kbd> để ấn piston</span></div>
        </div>

        <aside className={styles.controlCard}>
          <div className={styles.cardTop}><div><span className={styles.sectionLabel}>BẢNG ĐIỀU KHIỂN</span><h2>Thay đổi biến</h2></div><button className={styles.reset} onClick={reset} aria-label="Đặt lại thí nghiệm">↺</button></div>
          <div className={styles.controls}>
            <Slider label="Lực tác dụng F₁" value={inputForce} min={10} max={1000} step={10} unit="N" onChange={setInputForce} />
            <Slider label="Diện tích piston nhỏ A₁" value={smallArea} min={0.001} max={0.02} step={0.001} unit="m²" onChange={setSmallArea} />
            <Slider label="Diện tích piston lớn A₂" value={largeArea} min={0.005} max={0.2} step={0.005} unit="m²" onChange={setLargeArea} />
            <Slider label="Khối lượng tải" value={loadMass} min={10} max={1000} step={10} unit="kg" onChange={setLoadMass} />
            <Slider label="Độ dịch chuyển d₁" value={inputTravel} min={0.02} max={0.5} step={0.01} unit="m" onChange={setInputTravel} />
          </div>
          <button className={`${styles.pressButton} ${pressed ? styles.pressing : ""}`} onPointerDown={() => setPressed(true)} onPointerUp={() => setPressed(false)} onPointerLeave={() => setPressed(false)} onKeyDown={(event) => { if (event.key === "Enter") setPressed(true); }} onKeyUp={(event) => { if (event.key === "Enter") setPressed(false); }}><span className={styles.pressIcon}>↓</span><span><b>{pressed ? "Đang ấn piston…" : "Ấn piston đầu vào"}</b><small>Giữ để truyền áp suất</small></span><span className={styles.buttonArrow}>↗</span></button>
          <div className={`${styles.liftNotice} ${canLift ? styles.noticeGood : styles.noticeWarn}`}><span>{canLift ? "✓" : "!"}</span><p><b>{canLift ? "Đủ lực để nâng tải" : "Tải đang quá nặng"}</b><small>F₂ {format(outputForce)} N {canLift ? ">" : "<"} trọng lượng {format(loadWeight)} N</small></p></div>
        </aside>
      </section>

      <section className={styles.metrics} aria-label="Kết quả tính toán"><Metric label="Áp suất truyền" value={`${format(pressure)} Pa`} detail="p = F₁ / A₁" accent="blue" /><Metric label="Lực nâng đầu ra" value={`${format(outputForce)} N`} detail="F₂ = p × A₂" accent="orange" /><Metric label="Mechanical advantage" value={`${format(mechanicalAdvantage, 1)}×`} detail="MA = A₂ / A₁" accent="green" /><Metric label="Dịch chuyển piston lớn" value={`${format(outputTravel, 3)} m`} detail="d₂ = d₁ × A₁ / A₂" accent="purple" /></section>

      <section className={styles.explain}><div><span className={styles.sectionLabel}>GHI NHỚ</span><h2>Lực lớn hơn luôn có một<br /><i>cái giá về quãng đường.</i></h2></div><p>Với cùng một thể tích chất lỏng, piston nhỏ phải đi xa hơn piston lớn. Đó là lý do máy nâng thủy lực có thể đổi lực lấy quãng đường — không tạo ra năng lượng từ hư không.</p><div className={styles.equation}><span>A₁ × d₁</span><b>=</b><span>A₂ × d₂</span></div></section>
      <footer className={styles.footer}><span>NEVIAD Physics Lab · Mô hình lý tưởng</span><span>Không xét ma sát, rò rỉ và độ nén của chất lỏng</span></footer>
    </main>
  );
}

function Metric({ label, value, detail, accent }: { label: string; value: string; detail: string; accent: string }) {
  return <div className={`${styles.metric} ${styles[accent]}`}><span className={styles.metricDot} /><span className={styles.metricLabel}>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}

function HydraulicScene({ inputArea, outputArea, loadMass, pressure, pressed, canLift, inputProgress, outputProgress }: {
  inputArea: number;
  outputArea: number;
  loadMass: number;
  pressure: number;
  pressed: boolean;
  canLift: boolean;
  inputProgress: number;
  outputProgress: number;
}) {
  return (
    <div className={styles.scene} aria-label="Mô phỏng cắt lớp máy nâng thủy lực với người tác dụng lực lên piston nhỏ và ô tô trên piston lớn">
      <svg className={styles.sceneSvg} viewBox="0 0 900 420" role="img" aria-labelledby="hydraulic-scene-title hydraulic-scene-desc">
        <title id="hydraulic-scene-title">Máy nâng thủy lực</title>
        <desc id="hydraulic-scene-desc">Một người ấn piston nhỏ bên trái. Áp suất truyền qua chất lỏng nâng ô tô trên piston lớn bên phải.</desc>
        <defs>
          <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#f8fbf8" /><stop offset="1" stopColor="#dcefeb" /></linearGradient>
          <linearGradient id="fluid" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#91d5a9" /><stop offset="1" stopColor="#53a77f" /></linearGradient>
          <linearGradient id="carGreen" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#64c38b" /><stop offset="1" stopColor="#20905f" /></linearGradient>
          <linearGradient id="steel" x1="0" x2="1"><stop offset="0" stopColor="#b4c3c0" /><stop offset=".5" stopColor="#f1f5f0" /><stop offset="1" stopColor="#849b99" /></linearGradient>
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#315c5d" floodOpacity=".22" /></filter>
          <pattern id="concrete" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#d9d9d3" /><circle cx="4" cy="6" r="1" fill="#c4c5bd" /><circle cx="15" cy="14" r="1.2" fill="#c4c5bd" /></pattern>
        </defs>

        <rect width="900" height="420" fill="url(#sky)" />
        <rect y="145" width="900" height="275" fill="url(#concrete)" />
        <rect y="137" width="900" height="13" fill="#8f9996" />
        <rect y="132" width="900" height="6" fill="#566e6e" />
        <path d="M0 132H900" stroke="#f8fbf5" strokeWidth="2" opacity=".8" />

        <g className={styles.diagramLabel}><rect x="36" y="164" width="28" height="26" rx="5" /><text x="50" y="182">A</text><rect x="772" y="164" width="28" height="26" rx="5" /><text x="786" y="182">B</text></g>
        <text className={styles.diagramCaption} x="39" y="211">piston nhỏ</text><text className={styles.diagramCaption} x="748" y="211">piston lớn</text>

        <path d="M126 200V326H724V200" fill="none" stroke="#536f70" strokeWidth="48" strokeLinejoin="round" />
        <path d="M126 200V326H724V200" fill="none" stroke="url(#fluid)" strokeWidth="36" strokeLinejoin="round" />
        <path d="M126 200V326H724V200" fill="none" stroke="#d5f0dd" strokeWidth="3" strokeLinejoin="round" opacity=".72" />
        <path d="M126 324H724" stroke="#407963" strokeWidth="2" opacity=".8" />
        <g className={`${styles.fluidFlow} ${pressed ? styles.fluidFlowOn : ""}`}>
          <circle cx="185" cy="326" r="7" /><circle cx="280" cy="326" r="7" /><circle cx="375" cy="326" r="7" /><circle cx="470" cy="326" r="7" /><circle cx="565" cy="326" r="7" /><circle cx="660" cy="326" r="7" />
        </g>

        <g className={styles.smallAssembly} style={{ transform: `translateY(${inputProgress * 21}px)` }}>
          <rect x="98" y="181" width="56" height="19" rx="4" fill="url(#steel)" stroke="#4b6667" strokeWidth="3" />
          <rect x="111" y="198" width="30" height="72" fill="url(#steel)" stroke="#526c6c" strokeWidth="2" />
          <path d="M103 181H149" stroke="#2f4e50" strokeWidth="5" />
          <line x1="153" y1="188" x2="177" y2="167" stroke="#4a5554" strokeWidth="5" strokeLinecap="round" />
          <line x1="177" y1="167" x2="177" y2="150" stroke="#4a5554" strokeWidth="5" strokeLinecap="round" />
        </g>

        <g className={styles.person} aria-label="Người tác dụng lực">
          <circle cx="77" cy="63" r="11" fill="#e7b68c" stroke="#a96e52" strokeWidth="2" />
          <path d="M70 59C71 47 85 46 88 57C83 55 77 56 70 59Z" fill="#343b41" />
          <path d="M77 74L85 112L74 129M84 83L106 96L126 98" fill="none" stroke="#374d53" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M85 112L101 139M74 129L60 151" fill="none" stroke="#374d53" strokeWidth="7" strokeLinecap="round" />
          <circle cx="126" cy="98" r="4" fill="#e7b68c" />
        </g>

        <g className={`${styles.largeAssembly} ${outputProgress && canLift ? styles.largeAssemblyLifted : ""}`}>
          <rect x="676" y="181" width="97" height="21" rx="4" fill="url(#steel)" stroke="#4b6667" strokeWidth="3" />
          <rect x="707" y="199" width="36" height="80" fill="url(#steel)" stroke="#526c6c" strokeWidth="2" />
          <path d="M681 181H768" stroke="#2f4e50" strokeWidth="5" />
          <g className={styles.car} filter="url(#softShadow)">
            <path d="M642 102L661 79C667 71 676 66 687 66H738C750 66 758 73 765 83L783 103H811C819 103 826 110 826 118V132H634V117C634 109 638 105 642 102Z" fill="url(#carGreen)" stroke="#176344" strokeWidth="3" />
            <path d="M669 79L686 70H711V99H653Z" fill="#b9e0dc" stroke="#276b59" strokeWidth="2" />
            <path d="M716 70H738C746 70 752 76 758 83L770 99H716Z" fill="#b9e0dc" stroke="#276b59" strokeWidth="2" />
            <path d="M635 114H825" stroke="#a7e0a9" strokeWidth="3" opacity=".85" />
            <circle cx="670" cy="133" r="19" fill="#253e42" stroke="#edf0e8" strokeWidth="5" /><circle cx="670" cy="133" r="8" fill="#889b9a" />
            <circle cx="784" cy="133" r="19" fill="#253e42" stroke="#edf0e8" strokeWidth="5" /><circle cx="784" cy="133" r="8" fill="#889b9a" />
            <path d="M646 103H811" stroke="#d7f0ca" strokeWidth="2" opacity=".8" />
          </g>
        </g>

        <g className={`${styles.forceArrow} ${pressed ? styles.forceArrowOn : ""}`}><text x="184" y="172">F₁</text><path d="M184 178V218" /><path d="M174 208L184 220L194 208" /></g>
        <g className={`${styles.outputForceArrow} ${outputProgress && canLift ? styles.outputForceArrowOn : ""}`}><text x="811" y="190">F₂</text><path d="M811 182V148" /><path d="M801 158L811 146L821 158" /></g>
        <g className={styles.pressureBadge}><rect x="341" y="179" width="218" height="53" rx="10" /><text x="362" y="199">p = F₁ / A₁</text><text x="362" y="218">{format(pressure)} Pa · áp suất truyền đều</text></g>
        <text className={styles.areaCaption} x="104" y="369">A₁ = {inputArea.toFixed(3)} m²</text><text className={styles.areaCaption} x="674" y="369">A₂ = {outputArea.toFixed(3)} m²</text>
        <text className={styles.loadCaption} x="702" y="52">tải {format(loadMass)} kg</text>
        <text className={styles.fluidCaption} x="377" y="359">chất lỏng thủy lực</text>
      </svg>
    </div>
  );
}
