// src/components/ModalCierre.jsx

import React, { useState } from "react";

function ModalCierre({
  onCerrar,
  baseCaja = 0,
  totalVentas = 0,
  efectivoRecibido = 0,
  cambioEntregado = 0,
  nequiTotal = 0,
  daviplataTotal = 0,
  gastos = [],
  pedidosCount = 0,
  onConfirmar,
}) {
  const fmt = (n) => "$" + Math.round(n).toLocaleString("es-CO");

  // ─── GASTOS FIJOS EDITABLES ───────────────────────────────────────────────
  const [gastosNomina, setGastosNomina] = useState([
    { id: "mesero1", label: "Mesero 1", val: 0 },
    { id: "cocinera", label: "Cocinera", val: 0 },
    { id: "aux", label: "Aux de cocina", val: 0 },
    { id: "mesero2", label: "Mesero 2", val: 0 },
  ]);
  const [arriendoServ, setArriendo] = useState(0);
  const [gastoTransporte, setTransporte] = useState(0);
  const [otroGasto, setOtroGasto] = useState(0);
  const [otroGastoDesc, setOtroDesc] = useState("Otro");
  const [mercadoManana, setMercado] = useState("");

  // ─── PENDIENTES (FÍADOS) ──────────────────────────────────────────────────
  const [pendientes, setPendientes] = useState([]);
  const [pendNombre, setPendNombre] = useState("");
  const [pendValor, setPendValor] = useState("");

  const agregarPendiente = () => {
    if (!pendNombre.trim() || !pendValor || parseFloat(pendValor) <= 0) return;
    setPendientes((prev) => [
      ...prev,
      {
        id: Date.now(),
        nombre: pendNombre.trim(),
        valor: parseFloat(pendValor),
      },
    ]);
    setPendNombre("");
    setPendValor("");
  };

  const eliminarPendiente = (id) =>
    setPendientes((prev) => prev.filter((p) => p.id !== id));

  // ─── CÁLCULOS ─────────────────────────────────────────────────────────────
  const efectivoNeto = efectivoRecibido - cambioEntregado;
  const ventaTotal = efectivoNeto + nequiTotal + daviplataTotal;
  const totalDisponible = baseCaja + ventaTotal;

  const totalNomina = gastosNomina.reduce(
    (s, g) => s + (parseFloat(g.val) || 0),
    0,
  );
  const totalGastosFijos =
    totalNomina +
    (parseFloat(arriendoServ) || 0) +
    (parseFloat(gastoTransporte) || 0) +
    (parseFloat(otroGasto) || 0);

  // Gastos adicionales del sistema (insumos, etc.)
  const gastosAdicionales = gastos
    .filter((g) => g.cat !== "Nómina")
    .reduce((s, g) => s + g.val, 0);

  const totalGastos = totalGastosFijos + gastosAdicionales;
  const saldoGanancias = totalDisponible - totalGastos;
  const mercadoNum = parseFloat(mercadoManana) || 0;
  const totalFinalDia = saldoGanancias - mercadoNum;
  const totalPendientes = pendientes.reduce((s, p) => s + p.valor, 0);

  // ─── ESTILOS ──────────────────────────────────────────────────────────────
  const rowStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "7px 10px",
    background: "var(--surface2)",
    borderRadius: "var(--r-sm)",
    marginBottom: "5px",
  };

  const labelStyle = { fontSize: "12px", color: "var(--text2)" };
  const valStyle = {
    fontSize: "12px",
    fontWeight: 600,
    fontFamily: "var(--fm)",
  };

  const inputCierre = (valor, onChange, placeholder = "0") => (
    <input
      type="number"
      value={valor || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      min="0"
      style={{
        width: "110px",
        padding: "4px 8px",
        textAlign: "right",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-sm)",
        background: "var(--surface)",
        color: "var(--text)",
        fontSize: "13px",
        fontFamily: "var(--fm)",
        fontWeight: 600,
        outline: "none",
      }}
    />
  );

  const secTitle = (txt) => (
    <div
      style={{
        fontSize: "11px",
        fontWeight: 600,
        letterSpacing: "0.8px",
        textTransform: "uppercase",
        color: "var(--text3)",
        margin: "14px 0 8px",
      }}
    >
      {txt}
    </div>
  );

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 300,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "20px",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          borderRadius: "var(--r-xl)",
          border: "1px solid var(--border)",
          width: "100%",
          maxWidth: "680px",
          marginTop: "10px",
          marginBottom: "20px",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "var(--accent)",
            color: "white",
            padding: "16px 24px",
            borderRadius: "var(--r-xl) var(--r-xl) 0 0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: "17px", fontWeight: 600 }}>
              🌙 fin de dia
            </div>
            <div
              style={{
                fontSize: "12px",
                opacity: 0.85,
                fontFamily: "var(--fm)",
              }}
            >
              {new Date().toLocaleDateString("es-CO", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>
          </div>
          <button
            onClick={onCerrar}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              color: "white",
              borderRadius: "var(--r-sm)",
              padding: "6px 12px",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            ✕ Cerrar
          </button>
        </div>

        <div style={{ padding: "24px" }}>
          {/* ── SECCIÓN 1: VENTAS DEL DÍA ── */}
          {secTitle("Ventas del día")}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
              marginBottom: "4px",
            }}
          >
            <div style={rowStyle}>
              <span style={labelStyle}>Efectivo en caja</span>
              <span style={{ ...valStyle, color: "var(--green)" }}>
                {fmt(efectivoNeto)}
              </span>
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>Base de caja (apertura)</span>
              <span style={{ ...valStyle, color: "var(--blue)" }}>
                {fmt(baseCaja)}
              </span>
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>Nequi</span>
              <span style={{ ...valStyle, color: "var(--green)" }}>
                {fmt(nequiTotal)}
              </span>
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>Daviplata</span>
              <span style={{ ...valStyle, color: "var(--green)" }}>
                {fmt(daviplataTotal)}
              </span>
            </div>
          </div>

          {/* Resumen ventas */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
              marginBottom: "4px",
            }}
          >
            <div style={{ ...rowStyle, background: "var(--blue-bg)" }}>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--blue)",
                }}
              >
                Venta total del día
              </span>
              <span
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "var(--blue)",
                  fontFamily: "var(--fm)",
                }}
              >
                {fmt(ventaTotal)}
              </span>
            </div>
            <div style={{ ...rowStyle, background: "var(--green-bg)" }}>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--green)",
                }}
              >
                Total disponible en caja
              </span>
              <span
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "var(--green)",
                  fontFamily: "var(--fm)",
                }}
              >
                {fmt(totalDisponible)}
              </span>
            </div>
          </div>

          <div style={{ ...rowStyle, marginTop: "4px" }}>
            <span style={labelStyle}>Pedidos registrados</span>
            <span style={{ ...valStyle, color: "var(--blue)" }}>
              {pedidosCount}
            </span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Ticket promedio</span>
            <span style={valStyle}>
              {pedidosCount > 0 ? fmt(totalVentas / pedidosCount) : "$0"}
            </span>
          </div>

          {/* ── SECCIÓN 2: NÓMINA ── */}
          {secTitle("Nómina del día")}
          {gastosNomina.map((g, i) => (
            <div key={g.id} style={{ ...rowStyle }}>
              <span style={labelStyle}>{g.label}</span>
              {inputCierre(g.val, (v) =>
                setGastosNomina((prev) =>
                  prev.map((x, j) => (j === i ? { ...x, val: v } : x)),
                ),
              )}
            </div>
          ))}

          {/* ── SECCIÓN 3: GASTOS FIJOS ── */}
          {secTitle("Gastos fijos")}
          <div style={rowStyle}>
            <span style={labelStyle}>Arriendo y servicios</span>
            {inputCierre(arriendoServ, setArriendo)}
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Gasto transporte</span>
            {inputCierre(gastoTransporte, setTransporte)}
          </div>
          <div style={{ ...rowStyle, flexWrap: "wrap", gap: "6px" }}>
            <input
              type="text"
              value={otroGastoDesc}
              onChange={(e) => setOtroDesc(e.target.value)}
              placeholder="Descripción"
              style={{
                flex: 1,
                minWidth: "120px",
                padding: "4px 8px",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-sm)",
                background: "var(--surface)",
                color: "var(--text)",
                fontSize: "12px",
                outline: "none",
              }}
            />
            {inputCierre(otroGasto, setOtroGasto)}
          </div>

          {/* Gastos del sistema */}
          {gastos.filter((g) => g.cat !== "Nómina").length > 0 && (
            <>
              {gastos
                .filter((g) => g.cat !== "Nómina")
                .map((g) => (
                  <div key={g.id} style={rowStyle}>
                    <span style={{ ...labelStyle, color: "var(--text3)" }}>
                      {g.desc}
                    </span>
                    <span style={{ ...valStyle, color: "var(--red)" }}>
                      -{fmt(g.val)}
                    </span>
                  </div>
                ))}
            </>
          )}

          {/* Total gastos */}
          <div
            style={{
              ...rowStyle,
              background: "var(--red-bg)",
              marginTop: "8px",
            }}
          >
            <span
              style={{ fontSize: "13px", fontWeight: 600, color: "var(--red)" }}
            >
              Total gastos del día
            </span>
            <span
              style={{
                fontSize: "15px",
                fontWeight: 700,
                color: "var(--red)",
                fontFamily: "var(--fm)",
              }}
            >
              -{fmt(totalGastos)}
            </span>
          </div>

          {/* ── SECCIÓN 4: PENDIENTES (FÍADOS) ── */}
          {secTitle("Pendientes — Clientes fíados")}
          {pendientes.length === 0 ? (
            <div
              style={{
                ...rowStyle,
                justifyContent: "center",
                color: "var(--text3)",
                fontSize: "12px",
              }}
            >
              Sin pendientes registrados
            </div>
          ) : (
            pendientes.map((p) => (
              <div key={p.id} style={rowStyle}>
                <span style={labelStyle}>{p.nombre}</span>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <span style={{ ...valStyle, color: "var(--amber)" }}>
                    {fmt(p.valor)}
                  </span>
                  <button
                    onClick={() => eliminarPendiente(p.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--red)",
                      cursor: "pointer",
                      fontSize: "13px",
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}

          {/* Agregar pendiente */}
          <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
            <input
              type="text"
              className="input-field"
              placeholder="Nombre del cliente"
              value={pendNombre}
              onChange={(e) => setPendNombre(e.target.value)}
              style={{ flex: 2 }}
            />
            <input
              type="number"
              className="input-field"
              placeholder="Valor fíado"
              value={pendValor}
              onChange={(e) => setPendValor(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && agregarPendiente()}
              style={{ flex: 1 }}
              min="0"
            />
            <button
              className="btn btn-sm btn-accent"
              onClick={agregarPendiente}
            >
              + Agregar
            </button>
          </div>

          {pendientes.length > 0 && (
            <div
              style={{
                ...rowStyle,
                background: "var(--amber-bg)",
                marginTop: "8px",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--amber)",
                }}
              >
                Total pendiente por cobrar
              </span>
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "var(--amber)",
                  fontFamily: "var(--fm)",
                }}
              >
                {fmt(totalPendientes)}
              </span>
            </div>
          )}

          {/* ── SECCIÓN 5: SALDO DE GANANCIAS ── */}
          {secTitle("Resultado")}

          <div
            style={{
              background:
                saldoGanancias >= 0 ? "var(--green-bg)" : "var(--red-bg)",
              border: `2px solid ${saldoGanancias >= 0 ? "var(--green)" : "var(--red)"}`,
              borderRadius: "var(--r-md)",
              padding: "14px 16px",
              marginBottom: "12px",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                color: saldoGanancias >= 0 ? "var(--green)" : "var(--red)",
                marginBottom: "4px",
              }}
            >
              Saldo de ganancias del día
            </div>
            <div
              style={{
                fontSize: "28px",
                fontWeight: 700,
                color: saldoGanancias >= 0 ? "var(--green)" : "var(--red)",
                fontFamily: "var(--fm)",
              }}
            >
              {fmt(saldoGanancias)}
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--text3)",
                marginTop: "4px",
              }}
            >
              {fmt(totalDisponible)} disponible − {fmt(totalGastos)} gastos
            </div>
          </div>

          {/* Mercado mañana */}
          <div
            style={{
              ...rowStyle,
              border: "2px dashed var(--accent)",
              background: "var(--accent2)",
              padding: "12px 14px",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--accent)",
                }}
              >
                💰 ¿Cuánto deja para el mercado de mañana?
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--text3)",
                  marginTop: "2px",
                }}
              >
                Este valor se descuenta de las ganancias del día
              </div>
            </div>
            <input
              type="number"
              value={mercadoManana}
              onChange={(e) => setMercado(e.target.value)}
              placeholder="0"
              min="0"
              style={{
                width: "130px",
                padding: "8px 10px",
                textAlign: "right",
                border: "2px solid var(--accent)",
                borderRadius: "var(--r-sm)",
                background: "var(--surface)",
                color: "var(--accent)",
                fontSize: "18px",
                fontFamily: "var(--fm)",
                fontWeight: 700,
                outline: "none",
              }}
              autoFocus
            />
          </div>

          {/* Total final del día */}
          <div
            style={{
              background:
                totalFinalDia >= 0 ? "var(--green-bg)" : "var(--red-bg)",
              border: `2px solid ${totalFinalDia >= 0 ? "var(--green)" : "var(--red)"}`,
              borderRadius: "var(--r-lg)",
              padding: "16px 20px",
              marginTop: "12px",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: totalFinalDia >= 0 ? "var(--green)" : "var(--red)",
                    marginBottom: "4px",
                  }}
                >
                  Total final del día
                </div>
                <div style={{ fontSize: "11px", color: "var(--text3)" }}>
                  {fmt(saldoGanancias)} ganancias − {fmt(mercadoNum)} mercado
                </div>
              </div>
              <div
                style={{
                  fontSize: "34px",
                  fontWeight: 700,
                  color: totalFinalDia >= 0 ? "var(--green)" : "var(--red)",
                  fontFamily: "var(--fm)",
                }}
              >
                {fmt(totalFinalDia)}
              </div>
            </div>
          </div>

          {/* Botones */}
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              className="btn btn-accent btn-full btn-lg"
              onClick={() => onConfirmar(mercadoNum)}
              disabled={!mercadoManana}
            >
              ✓ Confirmar cierre
            </button>
            <button className="btn btn-full" onClick={() => window.print()}>
              🖨 Imprimir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModalCierre;
