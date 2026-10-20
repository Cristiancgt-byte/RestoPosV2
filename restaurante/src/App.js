// src/App.js

import React, { useState, useEffect, useCallback } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Topbar from "./components/Topbar";
import Dashboard from "./components/Dashboard";
import Caja from "./components/Caja";
import Saneamiento from "./components/Saneamiento";
import Inventario from "./components/Inventario";
import AlertaToast from "./components/AlertaToast";
import ModalCierre from "./components/ModalCierre";
import ModalApertura from "./components/ModalApertura";
import "./App.css";

let alertaIdSeq = 1;

function POS() {
  const [sesion, setSesion] = useState(() => {
    try {
      const s = localStorage.getItem("rpos_session");
      return s ? JSON.parse(s) : null;
    } catch (error) {
      console.error("Error leyendo la sesión:", error);
      localStorage.removeItem("rpos_session");
      return null;
    }
  });

  const cerrarSesion = () => {
    localStorage.removeItem("rpos_session");
    setSesion(null);
  };
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sanFirmadoHoy, setSanFirmadoHoy] = useState(false);
  const [totalVentas, setTotalVentas] = useState(0);
  const [pedidosCount, setPedidosCount] = useState(0);
  const [dark, setDark] = useState(
    () => localStorage.getItem("theme") === "dark",
  );
  const [clock, setClock] = useState("--:--:--");
  const [dateDisplay, setDateDisplay] = useState("");
  const [diaAbierto, setDiaAbierto] = useState(false);

  // ─── BASE DE CAJA ────────────────────────────────────────────────────────
  const [baseCaja, setBaseCaja] = useState(0);

  // ─── GASTOS ──────────────────────────────────────────────────────────────
  const [gastos, setGastos] = useState([
    { id: 1, desc: "Insumos base del día", cat: "Insumos", val: 94500 },
    { id: 2, desc: "Nómina empleados", cat: "Nómina", val: 48000 },
  ]);
  const [gastoIdSeq, setGastoIdSeq] = useState(3);
  const [panelGastos, setPanelGastos] = useState(false);
  const [gDesc, setGDesc] = useState("");
  const [gCat, setGCat] = useState("Insumos");
  const [gVal, setGVal] = useState("");

  // ─── CIERRE ──────────────────────────────────────────────────────────────
  const [modalCierre, setModalCierre] = useState(false);
  const [cierreFirmado, setCierreFirmado] = useState(false);

  // ─── APERTURA ────────────────────────────────────────────────────────────
  const [modalApertura, setModalApertura] = useState(false);
  const [baseCajaTemp, setBaseCajaTemp] = useState("");
  const [stockAperturaTemp, setStockAperturaTemp] = useState({});
  const [sopaDelDia, setSopaDelDia] = useState("");
  const [proteinasDelDia, setProteinasDelDia] = useState([]);
  const [principiosDelDia, setPrincipiosDelDia] = useState([]);
  const [caldosDelDia, setCaldosDelDia] = useState([]);
  const [huevosPrep, setHuevosPrep] = useState([]);

  // ─── INVENTARIO ──────────────────────────────────────────────────────────
  const [stockProteinas, setStockProteinas] = useState({});

  // ─── CONTROL DE EFECTIVO ─────────────────────────────────────────────────
  const [efectivoRecibido, setEfectivoRecibido] = useState(0);
  const [cambioEntregado, setCambioEntregado] = useState(0);
  const [nequiTotal, setNequiTotal] = useState(0);
  const [daviplataTotal, setDaviplataTotal] = useState(0);

  // ─── ALERTAS ─────────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState([]);
  const [historialAlertas, setHistorialAlertas] = useState([]);

  // ─── AGREGAR ALERTA ──────────────────────────────────────────────────────
  const agregarAlerta = useCallback((nivel, titulo, mensaje) => {
    const id = alertaIdSeq++;
    const nueva = {
      id,
      nivel,
      titulo,
      mensaje,
      hora: new Date().toLocaleTimeString("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setToasts((prev) => [...prev, nueva]);
    setHistorialAlertas((prev) => [nueva, ...prev]);
  }, []);

  const cerrarToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ─── COBRO ───────────────────────────────────────────────────────────────

  const handleCobro = useCallback(
    (datos) => {
      setTotalVentas((prev) => prev + datos.monto);
      setPedidosCount((prev) => prev + 1);

      if (datos.tipoPago === "efectivo") {
        setEfectivoRecibido((prev) => prev + datos.pagoRecibido);
        setCambioEntregado((prev) => prev + datos.cambioEntregado);
      } else if (datos.tipoPago === "nequi") {
        setNequiTotal((prev) => prev + datos.monto);
      } else if (datos.tipoPago === "daviplata") {
        setDaviplataTotal((prev) => prev + datos.monto);
      }

      // Descontar stock y generar alertas por proteína
      if (datos.proteinas && datos.proteinas.length > 0) {
        setStockProteinas((prev) => {
          const nuevo = { ...prev };
          datos.proteinas.forEach((p) => {
            if (nuevo[p.id] !== undefined) {
              const restantes = Math.max(0, nuevo[p.id] - 1);
              nuevo[p.id] = restantes;

              // Generar alerta según nivel
              if (restantes >= 6 && restantes <= 7) {
                agregarAlerta(
                  "verde",
                  `Stock: ${p.name}`,
                  `Quedan ${restantes} porciones disponibles`,
                );
              } else if (restantes >= 4 && restantes <= 5) {
                agregarAlerta(
                  "naranja",
                  `Stock bajo: ${p.name}`,
                  `Quedan ${restantes} porciones — considera preparar más`,
                );
              } else if (restantes <= 3 && restantes > 0) {
                agregarAlerta(
                  "rojo",
                  `¡Stock crítico! ${p.name}`,
                  `Solo quedan ${restantes} porciones`,
                );
              } else if (restantes === 0) {
                agregarAlerta(
                  "rojo",
                  `¡Agotado! ${p.name}`,
                  `No quedan más porciones disponibles`,
                );
              }
            }
          });
          return nuevo;
        });
      }
    },
    [agregarAlerta],
  );

  // ─── APERTURA DEL DÍA ────────────────────────────────────────────────────
  const confirmarApertura = () => {
    const base = parseFloat(baseCajaTemp) || 0;
    setBaseCaja(base);
    setStockProteinas({ ...stockAperturaTemp });
    setDiaAbierto(true);
    setModalApertura(false);
    setBaseCajaTemp("");
    setStockAperturaTemp({});
    agregarAlerta(
      "verde",
      "Apertura de caja",
      `Día iniciado con base de ${fmt(base)}`,
    );
  };

  // ─── GASTOS FUNCIONES ────────────────────────────────────────────────────
  const abrirGastos = () => setPanelGastos(true);
  const cerrarGastos = () => {
    setPanelGastos(false);
    setGDesc("");
    setGVal("");
    setGCat("Insumos");
  };

  const agregarGasto = () => {
    if (!gDesc.trim() || !gVal || parseFloat(gVal) <= 0) return;
    setGastos((prev) => [
      ...prev,
      { id: gastoIdSeq, desc: gDesc.trim(), cat: gCat, val: parseFloat(gVal) },
    ]);
    setGastoIdSeq((prev) => prev + 1);
    setGDesc("");
    setGVal("");
  };

  const eliminarGasto = (id) =>
    setGastos((prev) => prev.filter((g) => g.id !== id));

  // ─── CIERRE FUNCIONES ────────────────────────────────────────────────────
  const abrirCierre = () => setModalCierre(true);
  const cerrarCierre = () => setModalCierre(false);

  const totalGastos = gastos.reduce((s, g) => s + g.val, 0);
  const utilidad = totalVentas - totalGastos;
  const margen =
    totalVentas > 0 ? Math.round((utilidad / totalVentas) * 100) : 0;
  const efectivoEnCaja = baseCaja + (efectivoRecibido - cambioEntregado);
  const fmt = (n) => "$" + Math.round(n).toLocaleString("es-CO");

  // ─── ALERTAS AUTOMÁTICAS ─────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const ahora = new Date();
      const hora = ahora.getHours();
      const min = ahora.getMinutes();

      // Alerta cierre de caja — después de 5:00 PM
      if (hora >= 17 && !cierreFirmado && diaAbierto) {
        if (hora === 17 && min === 0) {
          agregarAlerta(
            "rojo",
            "Cierre de caja pendiente",
            "Son las 5:00 PM — recuerda generar el cierre de caja",
          );
        }
        // Cada 15 min después de las 5:30 PM
        if ((hora > 17 || (hora === 17 && min >= 30)) && min % 15 === 0) {
          agregarAlerta(
            "rojo",
            "¡Cierre pendiente!",
            `Son las ${ahora.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })} — el cierre de caja no se ha generado`,
          );
        }
      }

      // Alerta saneamiento — después de las 3:00 PM
      if (hora >= 15 && !sanFirmadoHoy && diaAbierto) {
        if (min === 0) {
          agregarAlerta(
            "rojo",
            "Saneamiento pendiente",
            "El plan de saneamiento no ha sido firmado hoy",
          );
        }
      }
    }, 60000); // Revisar cada minuto

    return () => clearInterval(interval);
  }, [cierreFirmado, sanFirmadoHoy, diaAbierto, agregarAlerta]);

  // ─── RELOJ ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setClock(
        now.toLocaleTimeString("es-CO", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
      setDateDisplay(
        now.toLocaleDateString("es-CO", {
          weekday: "short",
          day: "numeric",
          month: "short",
        }),
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ─── MODO NOCHE ──────────────────────────────────────────────────────────
  useEffect(() => {
    document.body.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  // ─── PROTEÍNAS PARA APERTURA ─────────────────────────────────────────────
  const PROTEINAS_LISTA = [
    { id: "p-huevos", name: "Huevos al gusto", cat: "Desayuno" },
    { id: "p-rancheros", name: "Huevos rancheros", cat: "Desayuno" },
    { id: "p-carne-s", name: "Carne sudada", cat: "Desayuno" },
    { id: "p-monona", name: "Moñona", cat: "Desayuno" },
    { id: "p-churra", name: "Minichurrasco", cat: "Ejecutivo" },
    { id: "p-chuleta-e", name: "Chuleta", cat: "Ejecutivo" },
    { id: "p-cachama", name: "Cachama", cat: "Ejecutivo" },
    { id: "p-cazuela", name: "Cazuela de mariscos", cat: "Ejecutivo" },
    { id: "p-chuleta-i", name: "Chuleta ejecutiva", cat: "Intermedio" },
    { id: "p-robalo", name: "Filete de robalo", cat: "Intermedio" },
    { id: "p-pechuga", name: "Pechuga", cat: "Corriente" },
    { id: "p-lomo", name: "Lomo", cat: "Corriente" },
    { id: "p-higado", name: "Hígado", cat: "Corriente" },
    { id: "p-mojarra", name: "Mojarra", cat: "Corriente" },
  ];

  const CATEGORIAS = ["Desayuno", "Ejecutivo", "Intermedio", "Corriente"];

  // ─── RENDER ──────────────────────────────────────────────────────────────
  if (!sesion) {
    return (
      <Login
        onLogin={(datos) => {
          localStorage.setItem("rpos_session", JSON.stringify(datos));
          setSesion(datos);
        }}
      />
    );
  }
  return (
    <div className="app">
      <Topbar
        activeTab={activeTab}
        setTab={setActiveTab}
        toggleTheme={() => setDark(!dark)}
        toggleAlertas={() => setActiveTab("alertas")}
        dark={dark}
        clock={clock}
        dateDisplay={dateDisplay}
        numAlertas={historialAlertas.length}
        cerrarSesion={cerrarSesion}
        nombre={sesion?.nombre}
      />

      {activeTab === "dashboard" && (
        <Dashboard
          totalVentas={totalVentas}
          pedidosCount={pedidosCount}
          gastos={gastos}
          abrirGastos={abrirGastos}
          abrirCierre={diaAbierto ? abrirCierre : () => setModalApertura(true)}
          dark={dark}
          efectivoRecibido={efectivoRecibido}
          cambioEntregado={cambioEntregado}
          nequiTotal={nequiTotal}
          daviplataTotal={daviplataTotal}
          baseCaja={baseCaja}
          efectivoEnCaja={efectivoEnCaja}
          diaAbierto={diaAbierto}
          abrirApertura={() => setModalApertura(true)}
          historialAlertas={historialAlertas}
        />
      )}

      {activeTab === "caja" && (
        <Caja
          onCobro={handleCobro}
          stockProteinas={stockProteinas}
          diaAbierto={diaAbierto}
          sopaDelDia={sopaDelDia}
          proteinasDelDia={proteinasDelDia}
          principiosDelDia={principiosDelDia}
          caldosDelDia={caldosDelDia}
          huevosPrep={huevosPrep}
        />
      )}

      {activeTab === "saneamiento" && (
        <Saneamiento
          onSanFirmado={(pct) => {
            setSanFirmadoHoy(true);
            agregarAlerta(
              "verde",
              "Saneamiento firmado",
              `Plan diligenciado al ${pct}%`,
            );
          }}
        />
      )}

      {activeTab === "inventario" && (
        <Inventario
          stockExterno={stockProteinas}
          onStockChange={setStockProteinas}
          diaAbierto={diaAbierto}
          proteinasDelDia={proteinasDelDia}
        />
      )}

      {/* ══ TOASTS ══ */}
      <AlertaToast alertas={toasts} onCerrar={cerrarToast} />

      {/* ══ CSS ANIMACIONES ══ */}
      <style>{`
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes progressBar {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>

      {/* ══════════ MODAL APERTURA DE CAJA ══════════ */}
      {modalApertura && (
        <ModalApertura
          onCerrar={() => setModalApertura(false)}
          onConfirmar={(datos) => {
            setBaseCaja(datos.baseCaja);
            setSopaDelDia(datos.sopa);
            setProteinasDelDia(datos.proteinas);
            setPrincipiosDelDia(datos.principios);
            setStockProteinas(
              Object.fromEntries(
                datos.proteinas.map((p) => [p.id, p.porciones]),
              ),
            );
            setDiaAbierto(true);
            setModalApertura(false);
            setCaldosDelDia(datos.caldos);
            setHuevosPrep(datos.huevosPrep);
            agregarAlerta(
              "verde",
              "Apertura de caja",
              `Día iniciado — Base: ${fmt(datos.baseCaja)} — ${datos.proteinas.length} proteínas`,
            );
          }}
        />
      )}

      {/* ══════════ PANEL LATERAL — GASTOS ══════════ */}
      {panelGastos && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 200,
            display: "flex",
            justifyContent: "flex-end",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) cerrarGastos();
          }}
        >
          <div
            style={{
              background: "var(--surface)",
              width: "420px",
              height: "100vh",
              overflowY: "auto",
              padding: "24px",
              borderLeft: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "6px",
              }}
            >
              <div>
                <div style={{ fontSize: "16px", fontWeight: 600 }}>
                  Gestión de gastos
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--text3)",
                    marginTop: "2px",
                  }}
                >
                  Registra gastos fijos, imprevistos y extras del día
                </div>
              </div>
              <button className="btn btn-sm" onClick={cerrarGastos}>
                ✕
              </button>
            </div>

            <hr className="divider" style={{ margin: "14px 0" }} />

            {gastos.map((g) => (
              <div
                key={g.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 10px",
                  background: "var(--surface2)",
                  borderRadius: "var(--r-sm)",
                  marginBottom: "6px",
                }}
              >
                <span style={{ flex: 1, fontSize: "12px" }}>{g.desc}</span>
                <span className="badge badge-amber">{g.cat}</span>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--red)",
                    minWidth: "80px",
                    textAlign: "right",
                    fontFamily: "var(--fm)",
                  }}
                >
                  {fmt(g.val)}
                </span>
                <button
                  className="btn btn-sm"
                  style={{ color: "var(--red)", padding: "2px 8px" }}
                  onClick={() => eliminarGasto(g.id)}
                >
                  ✕
                </button>
              </div>
            ))}

            <div
              style={{
                background: "var(--surface2)",
                borderRadius: "var(--r-md)",
                padding: "14px",
                marginTop: "8px",
                border: "1px dashed var(--border2)",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 500,
                  marginBottom: "10px",
                }}
              >
                Agregar nuevo gasto
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                <input
                  type="text"
                  className="input-field"
                  placeholder="Descripción..."
                  value={gDesc}
                  onChange={(e) => setGDesc(e.target.value)}
                />
                <select
                  className="input-field"
                  value={gCat}
                  onChange={(e) => setGCat(e.target.value)}
                >
                  <option>Insumos</option>
                  <option>Nómina</option>
                  <option>Imprevisto</option>
                  <option>Servicios</option>
                  <option>Mantenimiento</option>
                  <option>Otro</option>
                </select>
                <input
                  type="number"
                  className="input-field"
                  placeholder="Valor en pesos (COP)"
                  value={gVal}
                  min="0"
                  onChange={(e) => setGVal(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && agregarGasto()}
                />
                <button
                  className="btn btn-accent btn-full"
                  onClick={agregarGasto}
                >
                  + Agregar gasto
                </button>
              </div>
            </div>

            <div
              style={{
                background: "var(--red-bg)",
                borderRadius: "var(--r-sm)",
                padding: "12px 14px",
                marginTop: "12px",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--red)",
                  marginBottom: "2px",
                }}
              >
                Total gastos del día
              </div>
              <div
                style={{
                  fontSize: "22px",
                  fontWeight: 700,
                  color: "var(--red)",
                  fontFamily: "var(--fm)",
                }}
              >
                {fmt(totalGastos)}
              </div>
            </div>

            <button
              className="btn btn-full"
              style={{ marginTop: "10px" }}
              onClick={cerrarGastos}
            >
              Cerrar y guardar
            </button>
          </div>
        </div>
      )}

      {/* ══════════ MODAL CIERRE DE CAJA ══════════ */}
      {modalCierre && (
        <ModalCierre
          onCerrar={cerrarCierre}
          baseCaja={baseCaja}
          totalVentas={totalVentas}
          efectivoRecibido={efectivoRecibido}
          cambioEntregado={cambioEntregado}
          nequiTotal={nequiTotal}
          daviplataTotal={daviplataTotal}
          gastos={gastos}
          pedidosCount={pedidosCount}
          onConfirmar={(mercado) => {
            setCierreFirmado(true);
            setDiaAbierto(false);
            agregarAlerta(
              "verde",
              "Cierre generado",
              `Día cerrado correctamente`,
            );
            cerrarCierre();
          }}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<POS />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
