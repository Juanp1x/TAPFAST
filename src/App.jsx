import { useState, useEffect, useRef, useCallback } from "react";

// ─── Constantes ───────────────────────────────────────────────────────────────
const MODES = {
  classic: {
    id: "classic",
    label: "CLÁSICO",
    desc: "Reacciona cuando aparezca el objetivo",
    icon: "◎",
    color: "#e8c840",
  },
  sniper: {
    id: "sniper",
    label: "FRANCOTIRADOR",
    desc: "Objetivo pequeño, ventana de 200ms",
    icon: "✛",
    color: "#e84040",
  },
  multi: {
    id: "multi",
    label: "MULTI-TARGET",
    desc: "Elimina 5 objetivos lo más rápido posible",
    icon: "⊕",
    color: "#40c8e8",
  },
};

const RATINGS = [
  { max: 150, label: "PRO PLAYER", color: "#00ff88", desc: "Nivel competitivo élite" },
  { max: 200, label: "RANK S", color: "#e8c840", desc: "Tiempo de reacción excepcional" },
  { max: 250, label: "RANK A", color: "#40c8e8", desc: "Por encima del promedio" },
  { max: 300, label: "RANK B", color: "#a0a0e0", desc: "Promedio gamer" },
  { max: 400, label: "RANK C", color: "#c0c0c0", desc: "Sigue entrenando" },
  { max: Infinity, label: "RECLUTAR", color: "#808080", desc: "Necesitas más práctica" },
];

function getRating(ms) {
  return RATINGS.find((r) => ms < r.max);
}

function avg(arr) {
  if (!arr.length) return 0;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

// ─── Componente CrosshairTarget ───────────────────────────────────────────────
function CrosshairTarget({ x, y, size = 60, color = "#e8c840", onClick, pulse }) {
  return (
    <div
      onClick={onClick}
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        cursor: "crosshair",
        animation: pulse ? "targetPop 0.15s ease-out forwards" : "none",
        zIndex: 10,
      }}
    >
      <svg width={size} height={size} viewBox="0 0 60 60">
        <circle cx="30" cy="30" r="26" fill="none" stroke={color} strokeWidth="1.5" opacity="0.4" />
        <circle cx="30" cy="30" r="14" fill="none" stroke={color} strokeWidth="1.5" />
        <circle cx="30" cy="30" r="4" fill={color} />
        <line x1="0" y1="30" x2="16" y2="30" stroke={color} strokeWidth="1.5" />
        <line x1="44" y1="30" x2="60" y2="30" stroke={color} strokeWidth="1.5" />
        <line x1="30" y1="0" x2="30" y2="16" stroke={color} strokeWidth="1.5" />
        <line x1="30" y1="44" x2="30" y2="60" stroke={color} strokeWidth="1.5" />
      </svg>
    </div>
  );
}

// ─── Componente ResultBar ─────────────────────────────────────────────────────
function ResultBar({ time, index, best }) {
  const rating = getRating(time);
  const pct = Math.min(100, (time / 600) * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
      <span style={{ fontSize: 11, color: "#606080", width: 20, textAlign: "right" }}>
        #{index + 1}
      </span>
      <div style={{ flex: 1, height: 6, background: "#1a1a2a", borderRadius: 3, overflow: "hidden" }}>
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: index === best ? rating.color : "#404060",
            borderRadius: 3,
            transition: "width 0.4s ease",
          }}
        />
      </div>
      <span
        style={{
          fontSize: 13,
          fontFamily: "'Courier New', monospace",
          color: index === best ? rating.color : "#8080a0",
          width: 60,
          textAlign: "right",
          fontWeight: index === best ? "bold" : "normal",
        }}
      >
        {time}ms
      </span>
    </div>
  );
}

// ─── App Principal ────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("home"); // home | game | results
  const [mode, setMode] = useState("classic");
  const [phase, setPhase] = useState("waiting"); // waiting | ready | fire | early | done
  const [targets, setTargets] = useState([]); // {id, x, y, hit}
  const [startTime, setStartTime] = useState(null);
  const [times, setTimes] = useState([]); // array de ms por ronda
  const [history, setHistory] = useState([]); // historial total de sesiones
  const [round, setRound] = useState(0);
  const [flashMsg, setFlashMsg] = useState("");
  const [earlyCount, setEarlyCount] = useState(0);

  const arenaRef = useRef(null);
  const timerRef = useRef(null);
  const roundTimes = useRef([]);

  const ROUNDS = mode === "multi" ? 3 : 5;

  // ─── Limpiar timers ───────────────────────────────────────────────────────
  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  // ─── Posición aleatoria dentro del arena ─────────────────────────────────
  const randomPos = useCallback((padding = 60) => {
    const el = arenaRef.current;
    if (!el) return { x: 160, y: 160 };
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    return {
      x: padding + Math.random() * (w - padding * 2),
      y: padding + Math.random() * (h - padding * 2),
    };
  }, []);

  // ─── Iniciar ronda ────────────────────────────────────────────────────────
  const startRound = useCallback(() => {
    setPhase("waiting");
    setTargets([]);
    setFlashMsg("Preparado...");
    clearTimer();
    const delay = 1500 + Math.random() * 2500;
    timerRef.current = setTimeout(() => {
      setFlashMsg("");
      if (mode === "multi") {
        // Generar 5 objetivos
        const newTargets = Array.from({ length: 5 }, (_, i) => ({
          id: i,
          ...randomPos(50),
          hit: false,
        }));
        setTargets(newTargets);
        setPhase("fire");
        setStartTime(Date.now());
      } else {
        setTargets([{ id: 0, ...randomPos(), hit: false }]);
        setPhase("fire");
        setStartTime(Date.now());
        if (mode === "sniper") {
          // Ventana de 200ms en sniper
          timerRef.current = setTimeout(() => {
            setTargets([]);
            setPhase("waiting");
            setFlashMsg("¡Demasiado lento! +200ms");
            roundTimes.current.push(500);
            setTimeout(() => nextOrFinish(), 800);
          }, 200);
        }
      }
    }, delay);
  }, [mode, randomPos]);

  const nextOrFinish = useCallback(() => {
    const next = roundTimes.current.length;
    if (next >= ROUNDS) {
      const finalTimes = [...roundTimes.current];
      setTimes(finalTimes);
      setHistory((prev) => [
        ...prev,
        { mode, times: finalTimes, avg: avg(finalTimes), date: new Date() },
      ]);
      setScreen("results");
    } else {
      setRound(next);
      startRound();
    }
  }, [ROUNDS, mode, startRound]);

  // ─── Click en arena (early o miss) ────────────────────────────────────────
  const handleArenaClick = () => {
    if (phase === "waiting") {
      clearTimer();
      setEarlyCount((p) => p + 1);
      setPhase("early");
      setFlashMsg("¡DISPARO ANTICIPADO! Penalización +300ms");
      roundTimes.current.push(999);
      timerRef.current = setTimeout(() => {
        setFlashMsg("");
        nextOrFinish();
      }, 1000);
    }
  };

  // ─── Click en objetivo ────────────────────────────────────────────────────
  const handleTargetClick = (id) => {
    if (phase !== "fire") return;
    const reaction = Date.now() - startTime;

    if (mode === "multi") {
      setTargets((prev) => {
        const updated = prev.map((t) => (t.id === id ? { ...t, hit: true } : t));
        const allHit = updated.every((t) => t.hit);
        if (allHit) {
          clearTimer();
          roundTimes.current.push(reaction);
          setPhase("done");
          setFlashMsg(`${reaction}ms — ${getRating(reaction).label}`);
          timerRef.current = setTimeout(() => {
            setFlashMsg("");
            nextOrFinish();
          }, 900);
        }
        return updated;
      });
    } else {
      clearTimer();
      roundTimes.current.push(reaction);
      setTargets([]);
      setPhase("done");
      setFlashMsg(`${reaction}ms — ${getRating(reaction).label}`);
      timerRef.current = setTimeout(() => {
        setFlashMsg("");
        nextOrFinish();
      }, 900);
    }
  };

  // ─── Comenzar juego ───────────────────────────────────────────────────────
  const startGame = (selectedMode) => {
    setMode(selectedMode);
    setScreen("game");
    setRound(0);
    setEarlyCount(0);
    roundTimes.current = [];
    setTimes([]);
  };

  useEffect(() => {
    if (screen === "game") {
      setTimeout(() => startRound(), 300);
    }
    return () => clearTimer();
  }, [screen]);

  // ─── PANTALLA HOME ────────────────────────────────────────────────────────
  if (screen === "home") {
    return (
      <div style={styles.root}>
        <style>{css}</style>
        <div style={styles.homeInner}>
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={styles.logoIcon}>⊕</div>
            <div style={styles.logoTitle}>TAPSHOT</div>
            <div style={styles.logoSub}>REACTION TIME TRAINER</div>
          </div>

          {/* Stats globales */}
          {history.length > 0 && (
            <div style={styles.statsRow}>
              <div style={styles.statCard}>
                <div style={styles.statVal}>{history.length}</div>
                <div style={styles.statLbl}>SESIONES</div>
              </div>
              <div style={styles.statCard}>
                <div style={{ ...styles.statVal, color: "#e8c840" }}>
                  {Math.min(...history.map((h) => Math.min(...h.times)))}ms
                </div>
                <div style={styles.statLbl}>MEJOR</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statVal}>
                  {avg(history.flatMap((h) => h.times))}ms
                </div>
                <div style={styles.statLbl}>PROMEDIO</div>
              </div>
            </div>
          )}

          {/* Modos */}
          <div style={styles.modesGrid}>
            {Object.values(MODES).map((m) => (
              <button
                key={m.id}
                style={{ ...styles.modeCard, "--mc": m.color }}
                className="modeCard"
                onClick={() => startGame(m.id)}
              >
                <div style={{ ...styles.modeIcon, color: m.color }}>{m.icon}</div>
                <div style={styles.modeName}>{m.label}</div>
                <div style={styles.modeDesc}>{m.desc}</div>
                <div style={{ ...styles.modeStart, color: m.color }}>INICIAR →</div>
              </button>
            ))}
          </div>

          {/* Historial */}
          {history.length > 0 && (
            <div style={styles.historyBox}>
              <div style={styles.historyTitle}>HISTORIAL DE SESIONES</div>
              {history
                .slice(-5)
                .reverse()
                .map((h, i) => {
                  const r = getRating(h.avg);
                  return (
                    <div key={i} style={styles.historyRow}>
                      <span style={{ color: "#606080", fontSize: 11 }}>
                        {MODES[h.mode]?.label}
                      </span>
                      <span style={{ color: r.color, fontSize: 12, fontWeight: "bold" }}>
                        {r.label}
                      </span>
                      <span
                        style={{
                          fontFamily: "'Courier New', monospace",
                          color: "#a0a0c0",
                          fontSize: 12,
                        }}
                      >
                        avg {h.avg}ms
                      </span>
                    </div>
                  );
                })}
            </div>
          )}

          <div style={styles.tip}>
            Tiempo de reacción promedio humano: ~250ms · Pro gamer: ~150ms
          </div>
        </div>
      </div>
    );
  }

  // ─── PANTALLA JUEGO ───────────────────────────────────────────────────────
  if (screen === "game") {
    const modeInfo = MODES[mode];
    const currentRoundTimes = roundTimes.current;
    return (
      <div style={styles.root}>
        <style>{css}</style>

        {/* HUD superior */}
        <div style={styles.hud}>
          <button onClick={() => { clearTimer(); setScreen("home"); }} style={styles.backBtn}>
            ← SALIR
          </button>
          <div style={styles.hudCenter}>
            <span style={{ color: modeInfo.color, marginRight: 8 }}>{modeInfo.icon}</span>
            {modeInfo.label}
          </div>
          <div style={styles.hudRounds}>
            {Array.from({ length: ROUNDS }).map((_, i) => (
              <div
                key={i}
                style={{
                  ...styles.roundDot,
                  background:
                    i < currentRoundTimes.length
                      ? getRating(currentRoundTimes[i]).color
                      : i === currentRoundTimes.length
                      ? modeInfo.color
                      : "#2a2a3a",
                }}
              />
            ))}
          </div>
        </div>

        {/* Arena */}
        <div
          ref={arenaRef}
          style={{
            ...styles.arena,
            cursor:
              phase === "waiting" ? "default" : phase === "fire" ? "crosshair" : "default",
            background:
              phase === "fire"
                ? "radial-gradient(ellipse at center, #0f1a0f 0%, #080d08 100%)"
                : phase === "early"
                ? "radial-gradient(ellipse at center, #1a0808 0%, #080808 100%)"
                : "#080d0f",
          }}
          onClick={handleArenaClick}
        >
          {/* Grid overlay */}
          <div style={styles.gridOverlay} />

          {/* Targets */}
          {targets
            .filter((t) => !t.hit)
            .map((t) => (
              <CrosshairTarget
                key={t.id}
                x={t.x}
                y={t.y}
                size={mode === "sniper" ? 36 : 64}
                color={modeInfo.color}
                onClick={(e) => {
                  e.stopPropagation();
                  handleTargetClick(t.id);
                }}
                pulse={phase === "fire"}
              />
            ))}

          {/* Flash message */}
          {flashMsg && (
            <div
              style={{
                ...styles.flashMsg,
                color:
                  phase === "early"
                    ? "#e84040"
                    : phase === "done"
                    ? modeInfo.color
                    : "#c0c0e0",
              }}
            >
              {flashMsg}
            </div>
          )}

          {/* Instrucción cuando esperando */}
          {phase === "waiting" && !flashMsg && (
            <div style={styles.waitMsg}>
              <div style={{ fontSize: 13, color: "#404060", letterSpacing: 3 }}>
                NO DISPARES AÚN
              </div>
            </div>
          )}

          {/* Contador de ronda */}
          <div style={styles.roundCounter}>
            RONDA {Math.min(currentRoundTimes.length + 1, ROUNDS)} / {ROUNDS}
          </div>

          {/* Tiempos parciales */}
          {currentRoundTimes.length > 0 && (
            <div style={styles.partialTimes}>
              {currentRoundTimes.map((t, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 11,
                    color: getRating(t).color,
                    fontFamily: "'Courier New', monospace",
                    opacity: 0.8,
                  }}
                >
                  {t === 999 ? "ANTICIPADO" : `${t}ms`}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── PANTALLA RESULTADOS ──────────────────────────────────────────────────
  if (screen === "results") {
    const validTimes = times.filter((t) => t !== 999);
    const avgTime = avg(validTimes);
    const bestIdx = validTimes.length
      ? times.indexOf(Math.min(...validTimes))
      : -1;
    const rating = getRating(avgTime);
    const modeInfo = MODES[mode];

    // Comparación con sesión anterior
    const prevSessions = history.slice(0, -1).filter((h) => h.mode === mode);
    const prevAvg = prevSessions.length ? prevSessions[prevSessions.length - 1].avg : null;
    const improvement = prevAvg ? prevAvg - avgTime : null;

    return (
      <div style={styles.root}>
        <style>{css}</style>
        <div style={styles.resultsInner}>
          {/* Header resultado */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 11, color: "#404060", letterSpacing: 4, marginBottom: 8 }}>
              {modeInfo.label} · {ROUNDS} RONDAS
            </div>
            <div
              style={{
                fontSize: 52,
                fontFamily: "'Courier New', monospace",
                fontWeight: "bold",
                color: rating.color,
                lineHeight: 1,
                marginBottom: 4,
              }}
            >
              {avgTime}ms
            </div>
            <div style={{ fontSize: 22, color: rating.color, letterSpacing: 3, marginBottom: 4 }}>
              {rating.label}
            </div>
            <div style={{ fontSize: 13, color: "#606080" }}>{rating.desc}</div>

            {improvement !== null && (
              <div
                style={{
                  marginTop: 10,
                  fontSize: 13,
                  color: improvement > 0 ? "#00ff88" : "#e84040",
                }}
              >
                {improvement > 0
                  ? `▲ ${improvement}ms mejor que la sesión anterior`
                  : `▼ ${Math.abs(improvement)}ms peor que la sesión anterior`}
              </div>
            )}
          </div>

          {/* Barras por ronda */}
          <div style={styles.resultsSection}>
            <div style={styles.sectionTitle}>TIEMPOS POR RONDA</div>
            {times.map((t, i) =>
              t === 999 ? (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: "#606080", width: 20, textAlign: "right" }}>
                    #{i + 1}
                  </span>
                  <span style={{ fontSize: 12, color: "#e84040", letterSpacing: 2 }}>
                    DISPARO ANTICIPADO
                  </span>
                </div>
              ) : (
                <ResultBar key={i} time={t} index={i} best={bestIdx} />
              )
            )}
          </div>

          {/* Stats */}
          <div style={styles.statsRow}>
            <div style={styles.statCard}>
              <div style={{ ...styles.statVal, color: "#00ff88" }}>
                {validTimes.length ? Math.min(...validTimes) : "-"}ms
              </div>
              <div style={styles.statLbl}>MEJOR</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statVal, color: "#e84040" }}>
                {validTimes.length ? Math.max(...validTimes) : "-"}ms
              </div>
              <div style={styles.statLbl}>PEOR</div>
            </div>
            <div style={styles.statCard}>
              <div style={{ ...styles.statVal, color: "#e8c840" }}>
                {earlyCount}
              </div>
              <div style={styles.statLbl}>ANTICIPADOS</div>
            </div>
          </div>

          {/* Consejo personalizado */}
          <div style={styles.tipBox}>
            <div style={{ fontSize: 11, color: "#404060", letterSpacing: 3, marginBottom: 6 }}>
              CONSEJO DE ENTRENAMIENTO
            </div>
            <div style={{ fontSize: 13, color: "#a0a0c0", lineHeight: 1.7 }}>
              {avgTime < 150
                ? "Tiempo élite. Mantén la consistencia entre rondas y trabaja en precisión bajo presión."
                : avgTime < 200
                ? "Excelente tiempo. Practica el modo Francotirador para afinar la ventana de reacción."
                : avgTime < 250
                ? "Buen tiempo. Intenta reducir la variación entre tu mejor y peor ronda."
                : avgTime < 300
                ? "Tiempo promedio. Haz 10-15 minutos diarios de entrenamiento para mejorar."
                : "Sigue practicando. Relaja los dedos y enfoca la vista en el centro del área."}
            </div>
          </div>

          {/* Botones */}
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <button
              style={{ ...styles.actionBtn, flex: 1, borderColor: modeInfo.color, color: modeInfo.color }}
              onClick={() => {
                roundTimes.current = [];
                setRound(0);
                setEarlyCount(0);
                setTimes([]);
                setScreen("game");
              }}
            >
              REINTENTAR
            </button>
            <button
              style={{ ...styles.actionBtn, flex: 1 }}
              onClick={() => setScreen("home")}
            >
              MENÚ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = {
  root: {
    minHeight: "100vh",
    background: "#080d0f",
    color: "#c0c0e0",
    fontFamily: "'Courier New', Courier, monospace",
    display: "flex",
    flexDirection: "column",
    overflowX: "hidden",
  },
  homeInner: {
    maxWidth: 480,
    width: "100%",
    margin: "0 auto",
    padding: "36px 20px 40px",
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  logoIcon: {
    fontSize: 48,
    color: "#e8c840",
    lineHeight: 1,
    marginBottom: 8,
  },
  logoTitle: {
    fontSize: 32,
    fontWeight: "bold",
    letterSpacing: 8,
    color: "#e0e0f0",
  },
  logoSub: {
    fontSize: 11,
    letterSpacing: 5,
    color: "#404060",
    marginTop: 4,
  },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
  },
  statCard: {
    background: "#0d1218",
    border: "1px solid #1a1a2a",
    borderRadius: 4,
    padding: "12px 8px",
    textAlign: "center",
  },
  statVal: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#c0c0e0",
    fontFamily: "'Courier New', monospace",
  },
  statLbl: {
    fontSize: 9,
    letterSpacing: 2,
    color: "#404060",
    marginTop: 4,
  },
  modesGrid: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  modeCard: {
    background: "#0d1218",
    border: "1px solid #1a1a2a",
    borderRadius: 4,
    padding: "16px 20px",
    textAlign: "left",
    cursor: "pointer",
    transition: "border-color 0.2s, background 0.2s",
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  modeIcon: {
    fontSize: 28,
    lineHeight: 1,
    minWidth: 36,
    textAlign: "center",
  },
  modeName: {
    fontSize: 14,
    letterSpacing: 3,
    color: "#c0c0e0",
    fontWeight: "bold",
    minWidth: 140,
  },
  modeDesc: {
    fontSize: 11,
    color: "#505070",
    flex: 1,
  },
  modeStart: {
    fontSize: 11,
    letterSpacing: 2,
    whiteSpace: "nowrap",
  },
  historyBox: {
    background: "#0d1218",
    border: "1px solid #1a1a2a",
    borderRadius: 4,
    padding: "14px 16px",
  },
  historyTitle: {
    fontSize: 9,
    letterSpacing: 3,
    color: "#404060",
    marginBottom: 10,
  },
  historyRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "5px 0",
    borderBottom: "1px solid #12121e",
  },
  tip: {
    fontSize: 11,
    color: "#303050",
    textAlign: "center",
    letterSpacing: 1,
  },
  // Game
  hud: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 16px",
    background: "#050810",
    borderBottom: "1px solid #1a1a2a",
    height: 48,
    flexShrink: 0,
  },
  backBtn: {
    background: "transparent",
    border: "1px solid #2a2a3a",
    color: "#606080",
    fontFamily: "'Courier New', monospace",
    fontSize: 11,
    padding: "4px 10px",
    cursor: "pointer",
    letterSpacing: 1,
    borderRadius: 2,
  },
  hudCenter: {
    fontSize: 12,
    letterSpacing: 3,
    color: "#8080a0",
  },
  hudRounds: {
    display: "flex",
    gap: 6,
    alignItems: "center",
  },
  roundDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    transition: "background 0.3s",
  },
  arena: {
    flex: 1,
    position: "relative",
    transition: "background 0.3s",
    minHeight: "calc(100vh - 48px)",
    overflow: "hidden",
    userSelect: "none",
  },
  gridOverlay: {
    position: "absolute",
    inset: 0,
    backgroundImage:
      "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
    backgroundSize: "40px 40px",
    pointerEvents: "none",
  },
  flashMsg: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    fontSize: 22,
    fontWeight: "bold",
    letterSpacing: 2,
    textAlign: "center",
    pointerEvents: "none",
    textShadow: "0 0 20px currentColor",
    animation: "flashIn 0.2s ease-out",
  },
  waitMsg: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    textAlign: "center",
    pointerEvents: "none",
  },
  roundCounter: {
    position: "absolute",
    top: 14,
    left: "50%",
    transform: "translateX(-50%)",
    fontSize: 10,
    letterSpacing: 3,
    color: "#303050",
    pointerEvents: "none",
  },
  partialTimes: {
    position: "absolute",
    top: 14,
    right: 16,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 3,
    pointerEvents: "none",
  },
  // Results
  resultsInner: {
    maxWidth: 480,
    width: "100%",
    margin: "0 auto",
    padding: "32px 20px 40px",
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  resultsSection: {
    background: "#0d1218",
    border: "1px solid #1a1a2a",
    borderRadius: 4,
    padding: "14px 16px",
  },
  sectionTitle: {
    fontSize: 9,
    letterSpacing: 3,
    color: "#404060",
    marginBottom: 12,
  },
  tipBox: {
    background: "#0a0f14",
    border: "1px solid #1a2030",
    borderLeft: "3px solid #40c8e8",
    borderRadius: 4,
    padding: "14px 16px",
  },
  actionBtn: {
    background: "transparent",
    border: "1px solid #2a2a3a",
    color: "#8080a0",
    fontFamily: "'Courier New', monospace",
    fontSize: 12,
    padding: "12px 0",
    cursor: "pointer",
    letterSpacing: 3,
    borderRadius: 3,
    transition: "all 0.2s",
  },
};

const css = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #080d0f; }
  @keyframes targetPop {
    0% { transform: scale(0.5); opacity: 0; }
    60% { transform: scale(1.1); }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes flashIn {
    0% { transform: translate(-50%,-50%) scale(1.3); opacity: 0; }
    100% { transform: translate(-50%,-50%) scale(1); opacity: 1; }
  }
  .modeCard:hover {
    background: #101820 !important;
    border-color: var(--mc) !important;
  } 
`;