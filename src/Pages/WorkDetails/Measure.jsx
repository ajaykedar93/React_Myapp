import React, { useMemo, useState, useEffect } from "react";

/**
 * Measure.jsx (Professional)
 * ✅ Only shows ONE main answer (no ratio line, no quick chips)
 * ✅ Answer is bold + dark blue
 * ✅ Buttons same style (Swap / Reset / Copy)
 * ✅ Mobile-perfect + clean UI
 */

const UNITS = [
  { id: "mm", label: "Millimeter (mm)", kind: "length" },
  { id: "cm", label: "Centimeter (cm)", kind: "length" },
  { id: "m", label: "Meter (m)", kind: "length" },
  { id: "km", label: "Kilometer (km)", kind: "length" },
  { id: "inch", label: "Inch (in)", kind: "length" },
  { id: "ft", label: "Feet (ft)", kind: "length" },
  { id: "yd", label: "Yard (yd)", kind: "length" },
  { id: "mi", label: "Mile (mi)", kind: "length" },
];

// base unit = meter
const TO_M = {
  mm: 0.001,
  cm: 0.01,
  m: 1,
  km: 1000,
  inch: 0.0254,
  ft: 0.3048,
  yd: 0.9144,
  mi: 1609.344,
};

const fromMeters = (meters, toUnit) => meters / TO_M[toUnit];

function isValidNumberString(s) {
  if (s === "" || s === "-" || s === "." || s === "-.") return false;
  return !Number.isNaN(Number(s));
}

function formatNumber(n) {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs === 0) return "0";
  if (abs >= 1e9 || abs <= 1e-6) return n.toExponential(8).replace(/(\.0+|0+)e/, "e");
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 10 }).format(Number(n.toFixed(10)));
}

export default function Measure() {
  const [fromUnit, setFromUnit] = useState("cm");
  const [toUnit, setToUnit] = useState("mm");
  const [value, setValue] = useState("1");
  const [toast, setToast] = useState({ show: false, msg: "", type: "info" });

  const units = useMemo(() => UNITS.filter((u) => u.kind === "length"), []);

  const result = useMemo(() => {
    if (!isValidNumberString(value)) return { out: "—", raw: NaN };
    const v = Number(value);
    const meters = v * TO_M[fromUnit];
    const out = fromMeters(meters, toUnit);
    return { out: formatNumber(out), raw: out };
  }, [value, fromUnit, toUnit]);

  const swap = () => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
  };

  const showToast = (msg, type = "info") => {
    setToast({ show: true, msg, type });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(
      () => setToast({ show: false, msg: "", type: "info" }),
      1400
    );
  };

  const copyResult = async () => {
    if (!Number.isFinite(result.raw)) return showToast("Enter a valid number", "error");
    const text = `${value} ${fromUnit} = ${result.out} ${toUnit}`;
    try {
      await navigator.clipboard.writeText(text);
      showToast("Copied!", "success");
    } catch {
      showToast("Copy not allowed", "error");
    }
  };

  useEffect(() => {
    // keep from/to different
    if (fromUnit === toUnit) setToUnit(fromUnit === "cm" ? "mm" : "cm");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromUnit]);

  return (
    <div className="measure-root" style={{ background: "var(--bg)" }}>
      <style>{`
        :root{
          --ink-900:#0b1220;
          --ink-700:#334155;
          --ink-600:#475569;
          --surface:#ffffff;
          --border:#e6e9ef;
          --bg:#f6f8fb;

          --brand1:#2563EB;
          --brand2:#06B6D4;

          --rad:14px;
          --px: clamp(12px, 4vw, 20px);
          --fs: clamp(14px, 3.6vw, 16px);
          --fs-sm: clamp(12px, 3.2vw, 14px);
        }

        html, body{
          width:100%;
          margin:0;
          padding:0;
          background: var(--bg);
          overflow-x:hidden;
        }

        .measure-root{
          width:100%;
          min-height:100vh;
          padding-bottom: calc(72px + env(safe-area-inset-bottom));
        }

        .page-wrap{
          max-width: 980px;
          margin: 0 auto;
          padding: 14px var(--px);
        }
        @media (max-width: 767.98px){
          .page-wrap{
            max-width:100%;
            padding: 10px 0;
          }
        }

        .title{
          font-size: clamp(18px, 5.2vw, 24px);
          font-weight: 950;
          background: linear-gradient(90deg, var(--brand1), var(--brand2));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          text-align:center;
          margin: 8px 0 14px;
          letter-spacing:.2px;
        }

        .card-ui{
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--rad);
          box-shadow: 0 10px 28px rgba(2,6,23,.06);
          padding: 14px;
        }
        @media (max-width: 767.98px){
          .card-ui{
            border-left:0;
            border-right:0;
            border-radius:0;
          }
        }

        .label{
          font-size: var(--fs-sm);
          color: var(--ink-700);
          font-weight: 900;
          margin-bottom: 6px;
        }

        .control{
          width:100%;
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: .65rem .75rem;
          font-size: var(--fs);
          outline: none;
          background: #fff;
        }
        .control:focus{
          border-color: rgba(37,99,235,.55);
          box-shadow: 0 0 0 4px rgba(37,99,235,.12);
        }

        .grid{
          display:grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        @media (min-width: 768px){
          .grid{
            grid-template-columns: 1fr 1fr 1fr;
            align-items: end;
          }
        }

        .btn-row{
          display:flex;
          gap:10px;
          flex-wrap: wrap;
          margin-top: 12px;
        }

        .btn-solid{
          background: #1f2937;
          color:#fff;
          border:none;
          border-radius:12px;
          padding:.65rem 1rem;
          font-weight:950;
          font-size: var(--fs);
          cursor:pointer;
        }
        .btn-solid:active{ transform: translateY(1px); }

        .btn-ghost{
          background:#f5f7fb;
          border:1px dashed #cfd6e4;
          color: #334155;
          border-radius:12px;
          padding:.65rem 1rem;
          font-weight:950;
          font-size: var(--fs);
          cursor:pointer;
        }

        .answer-box{
          margin-top: 14px;
          border-radius: 16px;
          border: 1px solid rgba(37,99,235,.18);
          background:
            radial-gradient(900px 380px at 15% 10%, rgba(37,99,235,.10), transparent 55%),
            radial-gradient(800px 320px at 85% 90%, rgba(6,182,212,.10), transparent 55%),
            #fff;
          padding: 16px;
        }

        .answer-text{
          color: #0B3A8C; /* ✅ dark blue */
          font-weight: 950; /* ✅ bold */
          font-size: clamp(20px, 6vw, 30px);
          line-height: 1.15;
          word-break: break-word;
          text-align: center;
        }

        .toast{
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%,-50%);
          z-index: 9999;
          color:#fff;
          padding: 12px 16px;
          border-radius: 12px;
          font-weight: 950;
          min-width: 240px;
          text-align:center;
          box-shadow: 0 16px 44px rgba(0,0,0,.25);
        }
        .toast-success{ background: #0f8a5f; }
        .toast-error{ background: #b33a3a; }
        .toast-info{ background: #4C1D95; }
      `}</style>

      {toast.show && (
        <div
          className={`toast ${
            toast.type === "success" ? "toast-success" : toast.type === "error" ? "toast-error" : "toast-info"
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="page-wrap">
        <div className="title">Measure Converter</div>

        <div className="card-ui">
          <div className="grid">
            <div>
              <div className="label">From</div>
              <select className="control" value={fromUnit} onChange={(e) => setFromUnit(e.target.value)}>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="label">To</div>
              <select className="control" value={toUnit} onChange={(e) => setToUnit(e.target.value)}>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="label">Value</div>
              <input
                className="control"
                inputMode="decimal"
                placeholder="Enter any number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
          </div>

          <div className="btn-row">
            <button className="btn-solid" onClick={swap}>Swap</button>
            <button className="btn-ghost" onClick={() => setValue("1")}>Reset to 1</button>
            <button className="btn-ghost" onClick={copyResult}>Copy</button>
          </div>

          {/* ✅ ONLY ONE ANSWER (no extra options below) */}
          <div className="answer-box" aria-live="polite">
            <div className="answer-text">
              {isValidNumberString(value)
                ? `${value} ${fromUnit} = ${result.out} ${toUnit}`
                : "Enter a valid number"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
