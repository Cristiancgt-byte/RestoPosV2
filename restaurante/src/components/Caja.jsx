// src/components/Caja.jsx

import React, { useState, useEffect } from "react";
import { MENU_BASE, esHuevosAlGusto } from "../menuBase";
import { supabase } from "../supabaseClient";

// ─── PRECIO ICOPOR ───────────────────────────────────────────────────────────
const PRECIO_ICOPOR = 500;

const fmt = (n) => "$" + Math.round(n).toLocaleString("es-CO");

const itemVacio = () => ({
  esCaldo: false,
  caldo: null,
  bandeja: null,
  bebidaD: null,
  soloSopa: false,
  conSopa: false,
  categoria: null,
  proteina: null,
  principios: [],
  mixto: false,
  bebidaA: null,
});

// ─── STOCK INICIAL ───────────────────────────────────────────────────────────
const buildStockInicial = () => {
  const stock = {};
  ["ejecutivo", "intermedio", "corriente"].forEach((cat) => {
    MENU_BASE.almuerzo[cat].forEach((p) => {
      stock[p.id] = { name: p.name, cat, total: 0, vendidas: 0 };
    });
  });
  return stock;
};

// ─── COMPONENTE ──────────────────────────────────────────────────────────────
function Caja({
  onCobro,
  stockProteinas = {},
  diaAbierto = false,
  sopaDelDia = "",
  proteinasDelDia = [],
  principiosDelDia = [],
  caldosDelDia = [],
  huevosPrep = [],
}) {
  // Menú base con precios (editable)
  const [menuBase, setMenuBase] = useState(MENU_BASE);

  // Agrega al menú base las proteínas/caldos nuevos que se ingresaron hoy
  useEffect(() => {
    if (!diaAbierto) return;
    setMenuBase((prev) => {
      let changed = false;
      const nuevo = JSON.parse(JSON.stringify(prev));
      const listaDe = (cat) =>
        cat === "Desayuno"
          ? nuevo.desayuno.bandeja
          : nuevo.almuerzo[cat.toLowerCase()];

      proteinasDelDia.forEach((p) => {
        const lista = listaDe(p.categoria);
        if (lista && !lista.find((x) => x.id === p.id)) {
          lista.push({
            id: p.id,
            name: p.name,
            precio: p.precio || 0,
            conSopa: p.conSopa || 0,
            sinSopa: p.sinSopa || 0,
            tipo: "carne",
          });
          changed = true;
        }
      });
      caldosDelDia.forEach((c) => {
        if (!nuevo.desayuno.caldos.find((x) => x.id === c.id)) {
          nuevo.desayuno.caldos.push({ ...c });
          changed = true;
        }
      });
      return changed ? nuevo : prev;
    });
  }, [diaAbierto, proteinasDelDia, caldosDelDia]);

  // Menú de HOY: solo lo ingresado en el inicio de día
  const idsHoy = new Set(proteinasDelDia.map((p) => p.id));
  const conPrep = (lista) =>
    lista
      .filter((x) => idsHoy.has(x.id))
      .map((x) => ({
        ...x,
        preparacion:
          proteinasDelDia.find((p) => p.id === x.id)?.preparacion || "",
      }));

  const menu = {
    desayuno: {
      caldos: menuBase.desayuno.caldos.filter((c) =>
        caldosDelDia.some((x) => x.id === c.id)
      ),
      bandeja: conPrep(menuBase.desayuno.bandeja),
      bebidas: menuBase.desayuno.bebidas,
    },
    almuerzo: {
      sopa: {
        id: "sopa",
        name: sopaDelDia || menuBase.almuerzo.sopa.name,
        precioSolo: menuBase.almuerzo.sopa.precioSolo,
      },
      principios: principiosDelDia.map((p) => ({ id: p.id, name: p.nombre })),
      bebidas: menuBase.almuerzo.bebidas,
      ejecutivo: conPrep(menuBase.almuerzo.ejecutivo),
      intermedio: conPrep(menuBase.almuerzo.intermedio),
      corriente: conPrep(menuBase.almuerzo.corriente),
    },
  };

  const [servicio, setServicio] = useState(null);
  const [ticket, setTicket] = useState([]);
  const [item, setItem] = useState(itemVacio());
  const [paraLlevar, setParaLlevar] = useState(false);
  const [tipoPago, setTipoPago] = useState("efectivo");
  const [pagoInput, setPagoInput] = useState("");
  const [pedidoNum, setPedidoNum] = useState(1);
  const [editIdx, setEditIdx] = useState(null);
  const [precioEdit, setPrecioEdit] = useState("");
  const [cobrado, setCobrado] = useState(false);
  const [stock, setStock] = useState(buildStockInicial());
  const [stockConfigurado] = useState(false);
  const [pedidoCobrado, setPedidoCobrado] = useState(null);

  // Factura electrónica
  const [modalFactura, setModalFactura] = useState(false);
  const [datosFactura, setDatosFactura] = useState({
    nombre: "",
    documento: "",
    correo: "",
  });
  const [facturaError, setFacturaError] = useState("");
  const [facturaGenerada, setFacturaGenerada] = useState(null);

  // Edición de precios en caja
  const [editandoPrecios, setEditandoPrecios] = useState(false);
  const [preciosTemp, setPreciosTemp] = useState({});

  // ─── TOTALES ─────────────────────────────────────────────────────────────
  const costoIcopor = () => {
    if (!paraLlevar) return 0;
    let recipientes = 0;
    ticket.forEach((t) => {
      if (t.tieneSopa) recipientes++;
      if (t.tieneBandeja) recipientes++;
      if (t.esSoloSopa || t.esSoloCaldo) recipientes++;
    });
    return recipientes * PRECIO_ICOPOR;
  };

  const totalTicket = ticket.reduce((s, t) => s + t.precio, 0) + costoIcopor();
  const pagoNum = parseFloat(pagoInput) || 0;
  const cambio = pagoNum - totalTicket;
  const puedeCobrar =
    ticket.length > 0 && (tipoPago !== "efectivo" || pagoNum >= totalTicket);

  // ─── PRECIO ÍTEM EN CONSTRUCCIÓN ─────────────────────────────────────────
  const calcPrecioItem = () => {
    if (servicio === "desayuno") {
      if (item.esCaldo && !item.bandeja && item.caldo) return item.caldo.precio;
      if (item.bandeja && !item.esCaldo) return item.bandeja.precio;
      if (item.esCaldo && item.bandeja && item.caldo && item.bandeja)
        return item.caldo.precio + item.bandeja.precio;
      return 0;
    }
    if (servicio === "almuerzo") {
      if (item.soloSopa) return menu.almuerzo.sopa.precioSolo;
      if (!item.proteina) return 0;
      const { categoria, proteina, conSopa } = item;
      if (categoria === "ejecutivo") return proteina.precio;
      return conSopa ? proteina.conSopa : proteina.sinSopa;
    }
    return 0;
  };

  // ─── DESCRIPCIÓN ÍTEM ────────────────────────────────────────────────────
  const descItem = () => {
    if (servicio === "desayuno") {
      const partes = [];
      if (item.caldo) partes.push(item.caldo.name);
      if (item.bandeja)
        partes.push(
          item.bandeja.name + (item.huevosPrep ? ` (${item.huevosPrep})` : "")
        );
      if (item.bebidaD) partes.push(item.bebidaD.name);

      return partes.join(" + ") || "—";
    }
    if (servicio === "almuerzo") {
      if (item.soloSopa) return menu.almuerzo.sopa.name;
      const partes = [];
      if (item.conSopa) partes.push(menu.almuerzo.sopa.name);
      if (item.proteina)
        partes.push(
          item.proteina.name +
            (item.proteina.preparacion
              ? ` (${item.proteina.preparacion})`
              : "")
        );
      if (item.principios.length > 0)
        partes.push(
          item.mixto
            ? `Mixto (${item.principios.map((p) => p.name).join("/")})`
            : item.principios[0].name
        );
      if (item.bebidaA) partes.push(item.bebidaA.name);
      return partes.join(" + ") || "—";
    }
    return "—";
  };

  // ─── CONFIRMAR ÍTEM ──────────────────────────────────────────────────────
  const confirmarItem = () => {
    const precio = calcPrecioItem();
    const faltaPrepHuevos =
      servicio === "desayuno" &&
      item.bandeja &&
      esHuevosAlGusto(item.bandeja.name) &&
      huevosPrep.length > 0 &&
      !item.huevosPrep;
    if (precio === 0) return;
    if (faltaPrepHuevos) return;

    const tieneSopa = servicio === "almuerzo" && item.conSopa && !item.soloSopa;
    const tieneBandeja =
      servicio === "almuerzo" && !item.soloSopa && !!item.proteina;
    const esSoloSopa = servicio === "almuerzo" && item.soloSopa;
    const esSoloCaldo =
      servicio === "desayuno" && item.esCaldo && !item.bandeja;

    setTicket((prev) => [
      ...prev,
      {
        id: Date.now(),
        desc: descItem(),
        precio,
        servicio,
        tieneSopa,
        tieneBandeja,
        esSoloSopa,
        esSoloCaldo,
        proteina:
          servicio === "desayuno"
            ? item.bandeja || null
            : item.proteina || null,
        categoria: item.categoria || null,
        huevosPrep: null,
      },
    ]);

    setItem(itemVacio());
  };

  // ─── ELIMINAR ÍTEM ───────────────────────────────────────────────────────
  const eliminarItem = (id) => {
    setTicket((prev) => prev.filter((t) => t.id !== id));
    if (editIdx === id) setEditIdx(null);
  };

  // ─── EDITAR PRECIO TICKET ────────────────────────────────────────────────
  const iniciarEdicion = (t) => {
    setEditIdx(t.id);
    setPrecioEdit(String(t.precio));
  };
  const guardarEdicion = (id) => {
    const nuevo = parseFloat(precioEdit);
    if (!isNaN(nuevo) && nuevo >= 0)
      setTicket((prev) =>
        prev.map((t) => (t.id === id ? { ...t, precio: nuevo } : t))
      );
    setEditIdx(null);
  };

  const limpiar = () => {
    if (ticket.length > 0) {
      const confirmar = window.confirm(
        "¿Seguro que quieres cancelar este pedido? Se perderán los ítems agregados."
      );
      if (!confirmar) return;
    }
    setTicket([]);
    setItem(itemVacio());
    setPagoInput("");
    setParaLlevar(false);
    setTipoPago("efectivo");
    setEditIdx(null);
    setPrecioEdit("");
    setServicio(null);
  };

  // ─── ACUMULAR LAS VENTA EN EL TURNO QUE ESTE ACTIVO DE LA SUPABASE ───────────────────────
  const registrarVentaEnTurno = async (monto, medioPago, itemsTicket, numPedido) => {
    try {
      // se busca el turno abierto actual actibo para poder asociar la venta
      const { data: turnoAbierto } = await supabase
        .from("cajas_turnos")
        .select("id, total_ventas_efectivo, total_ventas_tarjeta, total_ventas_transferencia")
        .eq("estado", "abierta")
        .order("fecha_apertura", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!turnoAbierto) {
        console.warn("No hay un turno abierto en la BD.");
        return;
      }

      // Insertamos el nuevo registro individual en la tabla de ventas detalladas
      await supabase.from("ventas_detalladas").insert([
        {
          turno_id: turnoAbierto.id,
          numero_pedido: numPedido,
          total: monto,
          tipo_pago: medioPago,
          detalle_items: itemsTicket, // Guarda los platos del ticket
        },
      ]);

      // Actualiza los acumulados generales del turno en cajas_turnos en supabase
      let colEfectivo = Number(turnoAbierto.total_ventas_efectivo) || 0;
      let colTarjeta = Number(turnoAbierto.total_ventas_tarjeta) || 0;
      let colTransf = Number(turnoAbierto.total_ventas_transferencia) || 0;

      if (medioPago === "efectivo") colEfectivo += monto;
      else if (medioPago === "nequi" || medioPago === "daviplata") colTransf += monto;
      else colTarjeta += monto;

      await supabase
        .from("cajas_turnos")
        .update({
          total_ventas_efectivo: colEfectivo,
          total_ventas_tarjeta: colTarjeta,
          total_ventas_transferencia: colTransf,
        })
        .eq("id", turnoAbierto.id);

    } catch (err) {
      console.error("Error al registrar la venta detallada:", err);
    }
  };

  // ─── COBRAR ──────────────────────────────────────────────────────────────
  const cobrar = async () => {
    if (!puedeCobrar) return;

    // Se declara la variable del número de pedido aquí arriba
    const numPedidoStr = String(pedidoNum).padStart(5, "0");

    const snapshot = {
      num: numPedidoStr,
      items: [...ticket],
      total: totalTicket,
      icopor: costoIcopor(),
      paraLlevar,
      tipoPago,
      pagoRecibido: tipoPago === "efectivo" ? pagoNum : totalTicket,
      cambioEntregado: tipoPago === "efectivo" ? cambio : 0,
      fecha: new Date().toLocaleString("es-CO"),
    };

    // Descontar stock
    setStock((prev) => {
      const nuevo = { ...prev };
      ticket.forEach((t) => {
        if (t.proteina && nuevo[t.proteina.id]) {
          nuevo[t.proteina.id] = {
            ...nuevo[t.proteina.id],
            vendidas: nuevo[t.proteina.id].vendidas + 1,
          };
        }
      });
      return nuevo;
    });

    // Se registra la venta individual y se suma el acumulado del turno en Supabase
    await registrarVentaEnTurno(totalTicket, tipoPago, ticket, numPedidoStr);

    // ── Notificar al App.js con todos los datos ──
    if (onCobro) {
      onCobro({
        monto: totalTicket,
        pagoRecibido: tipoPago === "efectivo" ? pagoNum : totalTicket,
        cambioEntregado: tipoPago === "efectivo" ? cambio : 0,
        tipoPago,
        proteinas: ticket
          .filter((t) => t.proteina)
          .map((t) => ({ id: t.proteina.id, name: t.proteina.name })),
      });
    }

    setPedidoNum((n) => n + 1);
    setPedidoCobrado(snapshot);
    setCobrado(true);

    setTicket([]);
    setPagoInput("");
    setParaLlevar(false);
    setItem(itemVacio());
  };

  // ─── FACTURA ELECTRÓNICA ─────────────────────────────────────────────────
  const generarFactura = () => {
    const { nombre, documento, correo } = datosFactura;
    if (!nombre.trim() || !documento.trim() || !correo.trim()) {
      setFacturaError("Por favor completa todos los campos.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      setFacturaError("El correo electrónico no es válido.");
      return;
    }
    const cufe =
      "CUFE-" + Math.random().toString(36).substr(2, 16).toUpperCase();
    const numFact = "REST-" + String(pedidoNum).padStart(5, "0");
    setFacturaGenerada({
      numero: numFact,
      cufe,
      fecha: new Date().toLocaleString("es-CO"),
      cliente: nombre,
      documento,
      correo,
      items: ticket.map((t) => ({ desc: t.desc, precio: t.precio })),
      total: totalTicket,
    });
    setFacturaError("");
  };

  // ─── EDITAR PRECIOS EN CAJA ──────────────────────────────────────────────
  const abrirEditarPrecios = () => {
    const temp = {};
    ["ejecutivo", "intermedio", "corriente"].forEach((cat) => {
      menu.almuerzo[cat].forEach((p) => {
        temp[p.id] = { ...p };
      });
    });
    menu.desayuno.caldos.forEach((c) => {
      temp[c.id] = { ...c };
    });
    menu.desayuno.bandeja.forEach((b) => {
      temp[b.id] = { ...b };
    });
    setPreciosTemp(temp);
    setEditandoPrecios(true);
  };

  const guardarPrecios = () => {
    setMenuBase((prev) => {
      const nuevo = JSON.parse(JSON.stringify(prev));
      ["ejecutivo", "intermedio", "corriente"].forEach((cat) => {
        nuevo.almuerzo[cat] = nuevo.almuerzo[cat].map((p) =>
          preciosTemp[p.id] ? { ...p, ...preciosTemp[p.id] } : p
        );
      });
      nuevo.desayuno.caldos = nuevo.desayuno.caldos.map((c) =>
        preciosTemp[c.id]
          ? { ...c, precio: parseFloat(preciosTemp[c.id].precio) || c.precio }
          : c
      );
      nuevo.desayuno.bandeja = nuevo.desayuno.bandeja.map((b) =>
        preciosTemp[b.id]
          ? { ...b, precio: parseFloat(preciosTemp[b.id].precio) || b.precio }
          : b
      );
      return nuevo;
    });
    setEditandoPrecios(false);
  };

  // ─── HELPERS ─────────────────────────────────────────────────────────────
  const selBtn = (cond) => `tipo-btn${cond ? " active" : ""}`;

  const togglePrincipio = (p) => {
    setItem((prev) => {
      const yaEsta = prev.principios.find((sp) => sp.id === p.id);
      if (yaEsta)
        return {
          ...prev,
          principios: prev.principios.filter((sp) => sp.id !== p.id),
        };
      const max = prev.mixto ? 2 : 1;
      if (prev.principios.length >= max) return prev;
      return { ...prev, principios: [...prev.principios, p] };
    });
  };

  // ─── MODAL EDITAR PRECIOS ────────────────────────────────────────────────
  const renderModalPrecios = () => (
    <div className="modal-overlay open">
      <div className="modal-box wide">
        <div className="modal-title">Editar precios del menú</div>
        <div className="modal-sub">
          Los cambios se aplican inmediatamente en la caja
        </div>

        {/* Desayuno - Caldos */}
        <div style={{ marginBottom: "16px" }}>
          <div className="section-label">Desayuno — Caldos</div>
          {menu.desayuno.caldos.map((c) => (
            <div
              key={c.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "6px",
              }}
            >
              <span style={{ flex: 1, fontSize: "13px" }}>{c.name}</span>
              <input
                type="number"
                className="input-field"
                style={{
                  width: "100px",
                  fontFamily: "var(--fm)",
                  textAlign: "right",
                }}
                value={preciosTemp[c.id]?.precio || ""}
                onChange={(e) =>
                  setPreciosTemp((prev) => ({
                    ...prev,
                    [c.id]: { ...prev[c.id], precio: e.target.value },
                  }))
                }
              />
            </div>
          ))}
        </div>

        {/* Desayuno - Bandeja */}
        <div style={{ marginBottom: "16px" }}>
          <div className="section-label">Desayuno — Bandeja</div>
          {menu.desayuno.bandeja.map((b) => (
            <div
              key={b.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "6px",
              }}
            >
              <span style={{ flex: 1, fontSize: "13px" }}>{b.name}</span>
              <input
                type="number"
                className="input-field"
                style={{
                  width: "100px",
                  fontFamily: "var(--fm)",
                  textAlign: "right",
                }}
                value={preciosTemp[b.id]?.precio || ""}
                onChange={(e) =>
                  setPreciosTemp((prev) => ({
                    ...prev,
                    [b.id]: { ...prev[b.id], precio: e.target.value },
                  }))
                }
              />
            </div>
          ))}
        </div>

        {/* Almuerzo - Ejecutivo */}
        <div style={{ marginBottom: "16px" }}>
          <div className="section-label">
            Almuerzo — Ejecutivo (precio único)
          </div>
          {menu.almuerzo.ejecutivo.map((p) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "6px",
              }}
            >
              <span style={{ flex: 1, fontSize: "13px" }}>{p.name}</span>
              <input
                type="number"
                className="input-field"
                style={{
                  width: "100px",
                  fontFamily: "var(--fm)",
                  textAlign: "right",
                }}
                value={preciosTemp[p.id]?.precio || ""}
                onChange={(e) =>
                  setPreciosTemp((prev) => ({
                    ...prev,
                    [p.id]: {
                      ...prev[p.id],
                      precio: parseFloat(e.target.value),
                    },
                  }))
                }
              />
            </div>
          ))}
        </div>

        {/* Almuerzo - Intermedio */}
        <div style={{ marginBottom: "16px" }}>
          <div className="section-label">
            Almuerzo — Intermedio (con sopa / sin sopa)
          </div>
          {menu.almuerzo.intermedio.map((p) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "6px",
              }}
            >
              <span style={{ flex: 1, fontSize: "13px" }}>{p.name}</span>
              <div
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <span style={{ fontSize: "11px", color: "var(--text3)" }}>
                  Con sopa
                </span>
                <input
                  type="number"
                  className="input-field"
                  style={{
                    width: "90px",
                    fontFamily: "var(--fm)",
                    textAlign: "right",
                  }}
                  value={preciosTemp[p.id]?.conSopa || ""}
                  onChange={(e) =>
                    setPreciosTemp((prev) => ({
                      ...prev,
                      [p.id]: {
                        ...prev[p.id],
                        conSopa: parseFloat(e.target.value),
                      },
                    }))
                  }
                />
                <span style={{ fontSize: "11px", color: "var(--text3)" }}>
                  Sin sopa
                </span>
                <input
                  type="number"
                  className="input-field"
                  style={{
                    width: "90px",
                    fontFamily: "var(--fm)",
                    textAlign: "right",
                  }}
                  value={preciosTemp[p.id]?.sinSopa || ""}
                  onChange={(e) =>
                    setPreciosTemp((prev) => ({
                      ...prev,
                      [p.id]: {
                        ...prev[p.id],
                        sinSopa: parseFloat(e.target.value),
                      },
                    }))
                  }
                />
              </div>
            </div>
          ))}
        </div>

        {/* Almuerzo - Corriente */}
        <div style={{ marginBottom: "16px" }}>
          <div className="section-label">
            Almuerzo — Corriente (con sopa / sin sopa)
          </div>
          {menu.almuerzo.corriente.map((p) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "6px",
              }}
            >
              <span style={{ flex: 1, fontSize: "13px" }}>{p.name}</span>
              <div
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <span style={{ fontSize: "11px", color: "var(--text3)" }}>
                  Con sopa
                </span>
                <input
                  type="number"
                  className="input-field"
                  style={{
                    width: "90px",
                    fontFamily: "var(--fm)",
                    textAlign: "right",
                  }}
                  value={preciosTemp[p.id]?.conSopa || ""}
                  onChange={(e) =>
                    setPreciosTemp((prev) => ({
                      ...prev,
                      [p.id]: {
                        ...prev[p.id],
                        conSopa: parseFloat(e.target.value),
                      },
                    }))
                  }
                />
                <span style={{ fontSize: "11px", color: "var(--text3)" }}>
                  Sin sopa
                </span>
                <input
                  type="number"
                  className="input-field"
                  style={{
                    width: "90px",
                    fontFamily: "var(--fm)",
                    textAlign: "right",
                  }}
                  value={preciosTemp[p.id]?.sinSopa || ""}
                  onChange={(e) =>
                    setPreciosTemp((prev) => ({
                      ...prev,
                      [p.id]: {
                        ...prev[p.id],
                        sinSopa: parseFloat(e.target.value),
                      },
                    }))
                  }
                />
              </div>
            </div>
          ))}
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={() => setEditandoPrecios(false)}>
            Cancelar
          </button>
          <button className="btn btn-accent" onClick={guardarPrecios}>
            Guardar precios
          </button>
        </div>
      </div>
    </div>
  );

  // ─── MODAL FACTURA ────────────────────────────────────────────────────────
  const renderModalFactura = () => (
    <div className="modal-overlay open">
      <div className="modal-box">
        {!facturaGenerada ? (
          <>
            <div className="modal-title">Factura electrónica</div>
            <div className="modal-sub">
              La factura se enviará al correo del cliente automáticamente
            </div>

            <div className="form-group" style={{ marginBottom: "10px" }}>
              <div className="form-label">Nombre completo</div>
              <input
                type="text"
                className="input-field"
                placeholder="Nombre del cliente o razón social"
                value={datosFactura.nombre}
                onChange={(e) =>
                  setDatosFactura((prev) => ({
                    ...prev,
                    nombre: e.target.value,
                  }))
                }
              />
            </div>
            <div className="form-group" style={{ marginBottom: "10px" }}>
              <div className="form-label">Documento (CC / NIT)</div>
              <input
                type="text"
                className="input-field"
                placeholder="Ej: 1020304050"
                value={datosFactura.documento}
                onChange={(e) =>
                  setDatosFactura((prev) => ({
                    ...prev,
                    documento: e.target.value,
                  }))
                }
              />
            </div>
            <div className="form-group" style={{ marginBottom: "14px" }}>
              <div className="form-label">Correo electrónico</div>
              <input
                type="email"
                className="input-field"
                placeholder="cliente@correo.com"
                value={datosFactura.correo}
                onChange={(e) =>
                  setDatosFactura((prev) => ({
                    ...prev,
                    correo: e.target.value,
                  }))
                }
              />
            </div>

            <div
              style={{
                background: "var(--surface2)",
                borderRadius: "var(--r-md)",
                padding: "12px",
                marginBottom: "14px",
              }}
            >
              <div className="section-label" style={{ marginBottom: "8px" }}>
                Productos
              </div>
              {pedidoCobrado?.items.map((t) => (
                <div
                  key={t.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "12px",
                    marginBottom: "4px",
                  }}
                >
                  <span>{t.desc}</span>
                  <span style={{ fontFamily: "var(--fm)" }}>
                    {fmt(t.precio)}
                  </span>
                </div>
              ))}
              {pedidoCobrado?.paraLlevar && pedidoCobrado?.icopor > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "12px",
                    marginBottom: "4px",
                  }}
                >
                  <span>Icopor (para llevar)</span>
                  <span style={{ fontFamily: "var(--fm)" }}>
                    {fmt(pedidoCobrado.icopor)}
                  </span>
                </div>
              )}
              <hr className="divider" style={{ margin: "8px 0" }} />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: 700,
                  fontSize: "14px",
                }}
              >
                <span>Total</span>
                <span
                  style={{ fontFamily: "var(--fm)", color: "var(--accent)" }}
                >
                  {fmt(pedidoCobrado?.total || 0)}
                </span>
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--text3)",
                  marginTop: "4px",
                }}
              >
                Fecha: {pedidoCobrado?.fecha}
              </div>
            </div>

            {facturaError && (
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--red)",
                  marginBottom: "10px",
                }}
              >
                {facturaError}
              </div>
            )}

            <div className="modal-footer">
              <button
                className="btn"
                onClick={() => {
                  setModalFactura(false);
                  setFacturaGenerada(null);
                  setFacturaError("");
                }}
              >
                Cancelar
              </button>
              <button className="btn btn-accent" onClick={generarFactura}>
                Generar y enviar factura
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="modal-title">✓ Factura generada</div>
            <div
              style={{
                background: "var(--green-bg)",
                borderRadius: "var(--r-md)",
                padding: "14px",
                marginBottom: "14px",
                borderLeft: "3px solid var(--green)",
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--green)",
                  marginBottom: "6px",
                }}
              >
                {facturaGenerada.numero}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--green)",
                  marginBottom: "4px",
                }}
              >
                Cliente: {facturaGenerada.cliente} — {facturaGenerada.documento}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--green)",
                  marginBottom: "4px",
                }}
              >
                Enviada a: {facturaGenerada.correo}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--green)",
                  marginBottom: "4px",
                }}
              >
                Total: {fmt(facturaGenerada.total)}
              </div>
              <div
                style={{
                  fontFamily: "var(--fm)",
                  fontSize: "9px",
                  color: "var(--green)",
                  wordBreak: "break-all",
                  marginTop: "8px",
                }}
              >
                {facturaGenerada.cufe}
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-accent"
                onClick={() => {
                  setModalFactura(false);
                  setFacturaGenerada(null);
                  setDatosFactura({ nombre: "", documento: "", correo: "" });
                }}
              >
                Cerrar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  // ─── ARMADOR DESAYUNO ────────────────────────────────────────────────────
  const renderDesayuno = () => (
    <div className="card">
      <div className="card-title" style={{ color: "var(--accent)" }}>
        🍳 Armar desayuno
      </div>

      <div style={{ marginBottom: "14px" }}>
        <div className="section-label">¿Qué va a llevar?</div>
        <div className="tipo-pago" style={{ marginTop: "6px" }}>
          <button
            className={selBtn(item.esCaldo && !item.bandeja)}
            onClick={() => setItem({ ...itemVacio(), esCaldo: true })}
          >
            🍲 Solo caldo
          </button>
          <button
            className={selBtn(!item.esCaldo && !!item.bandeja)}
            onClick={() => setItem({ ...itemVacio(), esCaldo: false })}
          >
            🍳 Solo bandeja
          </button>
          <button
            className={selBtn(item.esCaldo && !!item.bandeja)}
            onClick={() =>
              setItem({ ...itemVacio(), esCaldo: true, bandeja: item.bandeja })
            }
          >
            🍲+🍳 Caldo + Bandeja
          </button>
        </div>
      </div>

      {item.esCaldo && (
        <div style={{ marginBottom: "14px" }}>
          <div className="section-label">Elige el caldo</div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              marginTop: "6px",
            }}
          >
            {menu.desayuno.caldos.map((c) => (
              <button
                key={c.id}
                className={selBtn(item.caldo?.id === c.id)}
                onClick={() => setItem((prev) => ({ ...prev, caldo: c }))}
              >
                {c.name} — {fmt(c.precio)}
              </button>
            ))}
          </div>
        </div>
      )}

      {(!item.esCaldo || !!item.bandeja !== false) && (
        <div style={{ marginBottom: "14px" }}>
          <div className="section-label">Elige la bandeja</div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              marginTop: "6px",
            }}
          >
            {menu.desayuno.bandeja.map((b) => {
              const quedan = stockProteinas[b.id];
              const agotado = quedan !== undefined && quedan <= 0;
              return (
                <button
                  key={b.id}
                  className={selBtn(item.bandeja?.id === b.id)}
                  disabled={agotado}
                  style={{ opacity: agotado ? 0.4 : 1 }}
                  onClick={() =>
                    setItem((prev) => ({
                      ...prev,
                      bandeja: b,
                      huevosPrep: null,
                    }))
                  }
                >
                  {b.name} — {fmt(b.precio)}
                  {agotado && " 🚫"}
                  {quedan !== undefined &&
                    !agotado &&
                    quedan <= 3 &&
                    ` (${quedan} quedan)`}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {item.bandeja &&
        esHuevosAlGusto(item.bandeja.name) &&
        huevosPrep.length > 0 && (
          <div style={{ marginBottom: "14px" }}>
            <div className="section-label">¿Cómo quiere los huevos?</div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "6px",
                marginTop: "6px",
              }}
            >
              {huevosPrep.map((h) => (
                <button
                  key={h}
                  className={selBtn(item.huevosPrep === h)}
                  onClick={() =>
                    setItem((prev) => ({ ...prev, huevosPrep: h }))
                  }
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
        )}

      {(item.caldo || item.bandeja) && (
        <div style={{ marginBottom: "14px" }}>
          <div className="section-label">Bebida (incluida)</div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              marginTop: "6px",
            }}
          >
            <button
              className={selBtn(!item.bebidaD)}
              onClick={() => setItem((prev) => ({ ...prev, bebidaD: null }))}
            >
              Sin bebida
            </button>
            {menu.desayuno.bebidas.map((b) => (
              <button
                key={b.id}
                className={selBtn(item.bebidaD?.id === b.id)}
                onClick={() => setItem((prev) => ({ ...prev, bebidaD: b }))}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {calcPrecioItem() > 0 && (
        <div
          style={{
            background: "var(--surface2)",
            borderRadius: "var(--r-md)",
            padding: "12px",
            marginBottom: "12px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "var(--text2)",
              marginBottom: "4px",
            }}
          >
            Resumen
          </div>
          <div style={{ fontSize: "13px", fontWeight: 500 }}>{descItem()}</div>
          <div
            style={{
              fontSize: "22px",
              fontWeight: 700,
              color: "var(--accent)",
              fontFamily: "var(--fm)",
            }}
          >
            {fmt(calcPrecioItem())}
          </div>
        </div>
      )}

      <button
        className="btn btn-accent btn-full btn-lg"
        onClick={confirmarItem}
      >
        + Agregar al pedido
      </button>
    </div>
  );

  // ─── ARMADOR ALMUERZO ────────────────────────────────────────────────────
  const renderAlmuerzo = () => (
    <div className="card">
      <div className="card-title" style={{ color: "var(--accent)" }}>
        🍛 Armar almuerzo
      </div>

      <div style={{ marginBottom: "14px" }}>
        <div className="section-label">¿Qué va a llevar?</div>
        <div className="tipo-pago" style={{ marginTop: "6px" }}>
          <button
            className={selBtn(item.soloSopa)}
            onClick={() => setItem({ ...itemVacio(), soloSopa: true })}
          >
            🍲 Solo sopa — {fmt(menu.almuerzo.sopa.precioSolo)}
          </button>
          <button
            className={selBtn(
              !item.soloSopa && item.conSopa === false && !!item.categoria
            )}
            onClick={() =>
              setItem({ ...itemVacio(), soloSopa: false, conSopa: false })
            }
          >
            🍽 Solo bandeja
          </button>
          <button
            className={selBtn(!item.soloSopa && item.conSopa === true)}
            onClick={() =>
              setItem({ ...itemVacio(), soloSopa: false, conSopa: true })
            }
          >
            🍲+🍽 Completo
          </button>
        </div>
      </div>

      {!item.soloSopa && (item.conSopa === true || item.conSopa === false) && (
        <div style={{ marginBottom: "14px" }}>
          <div className="section-label">Categoría</div>
          <div className="tipo-pago" style={{ marginTop: "6px" }}>
            {["ejecutivo", "intermedio", "corriente"].map((cat) => (
              <button
                key={cat}
                className={selBtn(item.categoria === cat)}
                onClick={() =>
                  setItem((prev) => ({
                    ...prev,
                    categoria: cat,
                    proteina: null,
                  }))
                }
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {item.categoria && (
        <div style={{ marginBottom: "14px" }}>
          <div className="section-label">Proteína</div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              marginTop: "6px",
            }}
          >
            {menu.almuerzo[item.categoria].map((p) => {
              const precio =
                item.categoria === "ejecutivo"
                  ? p.precio
                  : item.conSopa
                  ? p.conSopa
                  : p.sinSopa;
              const quedan = stockProteinas[p.id];
              const agotado = quedan !== undefined && quedan <= 0;
              return (
                <button
                  key={p.id}
                  className={selBtn(item.proteina?.id === p.id)}
                  onClick={() =>
                    !agotado && setItem((prev) => ({ ...prev, proteina: p }))
                  }
                  style={{
                    opacity: agotado ? 0.4 : 1,
                    cursor: agotado ? "not-allowed" : "pointer",
                  }}
                  title={agotado ? "Agotado" : ""}
                >
                  {p.name}
                  {p.preparacion && ` (${p.preparacion})`} — {fmt(precio)}
                  {agotado && " 🚫"}
                  {quedan !== undefined &&
                    !agotado &&
                    quedan <= 3 &&
                    ` (${quedan} quedan)`}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {item.proteina && (
        <div style={{ marginBottom: "14px" }}>
          <div className="section-label">Principio (opcional)</div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              marginTop: "6px",
              marginBottom: "8px",
            }}
          >
            <button
              className={selBtn(item.principios.length === 0)}
              onClick={() =>
                setItem((prev) => ({ ...prev, principios: [], mixto: false }))
              }
            >
              Sin principio
            </button>
            {menu.almuerzo.principios.map((p) => (
              <button
                key={p.id}
                className={selBtn(
                  !!item.principios.find((sp) => sp.id === p.id)
                )}
                onClick={() => togglePrincipio(p)}
              >
                {p.name}
              </button>
            ))}
          </div>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={item.mixto}
              onChange={(e) =>
                setItem((prev) => ({
                  ...prev,
                  mixto: e.target.checked,
                  principios: e.target.checked
                    ? prev.principios.slice(0, 2)
                    : prev.principios.slice(0, 1),
                }))
              }
              style={{ accentColor: "var(--accent)" }}
            />
            Principio mixto (máx. 2 opciones)
          </label>
        </div>
      )}

      {item.proteina && (
        <div style={{ marginBottom: "14px" }}>
          <div className="section-label">Bebida (incluida)</div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              marginTop: "6px",
            }}
          >
            <button
              className={selBtn(!item.bebidaA)}
              onClick={() => setItem((prev) => ({ ...prev, bebidaA: null }))}
            >
              Sin bebida
            </button>
            {menu.almuerzo.bebidas.map((b) => (
              <button
                key={b.id}
                className={selBtn(item.bebidaA?.id === b.id)}
                onClick={() => setItem((prev) => ({ ...prev, bebidaA: b }))}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {calcPrecioItem() > 0 && (
        <div
          style={{
            background: "var(--surface2)",
            borderRadius: "var(--r-md)",
            padding: "12px",
            marginBottom: "12px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "var(--text2)",
              marginBottom: "4px",
            }}
          >
            Resumen
          </div>
          <div style={{ fontSize: "13px", fontWeight: 500 }}>{descItem()}</div>
          <div
            style={{
              fontSize: "22px",
              fontWeight: 700,
              color: "var(--accent)",
              fontFamily: "var(--fm)",
            }}
          >
            {fmt(calcPrecioItem())}
          </div>
        </div>
      )}

      <button
        className="btn btn-accent btn-full btn-lg"
        onClick={confirmarItem}
        disabled={!item.soloSopa && calcPrecioItem() === 0}
      >
        + Agregar al pedido
      </button>
    </div>
  );

  // ─── TICKET ──────────────────────────────────────────────────────────────
  const renderTicket = () => (
    <div className="ticket">
      <div className="ticket-header">
        <div className="ticket-title">
          Pedido #{String(pedidoNum).padStart(5, "0")}
        </div>
        <div style={{ fontSize: "11px", color: "var(--text3)" }}>
          {ticket.length} ítem{ticket.length !== 1 ? "s" : ""}
        </div>
      </div>

      <div className="ticket-body">
        {ticket.length === 0 ? (
          <div className="ticket-empty">
            <div className="ticket-empty-icon">⬡</div>
            <div>Agrega ítems al pedido</div>
          </div>
        ) : (
          ticket.map((t) => (
            <div
              key={t.id}
              className="ticket-item"
              style={{
                flexDirection: "column",
                alignItems: "flex-start",
                gap: "4px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: "100%",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span className="ticket-item-name" style={{ flex: 1 }}>
                  {t.desc}
                </span>
                <button
                  className="btn btn-sm"
                  style={{ fontSize: "10px", padding: "2px 7px" }}
                  onClick={() => iniciarEdicion(t)}
                  title="Ajustar precio"
                >
                  ✎
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  style={{ fontSize: "10px", padding: "2px 7px" }}
                  onClick={() => eliminarItem(t.id)}
                >
                  ✕
                </button>
              </div>
              {editIdx === t.id ? (
                <div style={{ display: "flex", gap: "6px", width: "100%" }}>
                  <input
                    type="number"
                    className="input-field"
                    value={precioEdit}
                    onChange={(e) => setPrecioEdit(e.target.value)}
                    style={{
                      flex: 1,
                      fontFamily: "var(--fm)",
                      fontWeight: 600,
                    }}
                    autoFocus
                  />
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => guardarEdicion(t.id)}
                  >
                    ✓
                  </button>
                  <button
                    className="btn btn-sm"
                    onClick={() => setEditIdx(null)}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "var(--accent)",
                    fontFamily: "var(--fm)",
                  }}
                >
                  {fmt(t.precio)}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="ticket-footer">
        {/* Para llevar */}
        <div style={{ marginBottom: "10px" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={paraLlevar}
              onChange={(e) => setParaLlevar(e.target.checked)}
              style={{
                accentColor: "var(--accent)",
                width: "16px",
                height: "16px",
              }}
            />
            <span style={{ fontSize: "13px", fontWeight: 500 }}>
              Para llevar
            </span>
            {paraLlevar && costoIcopor() > 0 && (
              <span className="badge badge-amber">
                +{fmt(costoIcopor())} icopor
              </span>
            )}
          </label>
        </div>

        {/* Total */}
        <table className="totals-table">
          <tbody>
            {paraLlevar && costoIcopor() > 0 && (
              <tr>
                <td style={{ color: "var(--text2)", fontSize: "12px" }}>
                  Subtotal
                </td>
                <td className="number">
                  {fmt(ticket.reduce((s, t) => s + t.precio, 0))}
                </td>
              </tr>
            )}
            {paraLlevar && costoIcopor() > 0 && (
              <tr>
                <td style={{ color: "var(--text2)", fontSize: "12px" }}>
                  Icopor
                </td>
                <td className="number" style={{ color: "var(--amber)" }}>
                  +{fmt(costoIcopor())}
                </td>
              </tr>
            )}
            <tr className="totals-total">
              <td>Total</td>
              <td className="number">{fmt(totalTicket)}</td>
            </tr>
          </tbody>
        </table>

        {/* Tipo de pago */}
        <div className="tipo-pago">
          {[
            { id: "efectivo", icon: "💵" },
            { id: "nequi", icon: "📲" },
            { id: "daviplata", icon: "💳" },
          ].map((tp) => (
            <button
              key={tp.id}
              className={selBtn(tipoPago === tp.id)}
              onClick={() => setTipoPago(tp.id)}
            >
              {tp.icon} {tp.id.charAt(0).toUpperCase() + tp.id.slice(1)}
            </button>
          ))}
        </div>

        {/* Pago efectivo */}
        {tipoPago === "efectivo" && (
          <>
            <div className="pago-label">Pago del cliente (COP)</div>
            <div className="pago-input-wrap">
              <input
                type="number"
                className="input-field pago-field"
                placeholder="0"
                value={pagoInput}
                onChange={(e) => setPagoInput(e.target.value)}
                step="1000"
                min="0"
              />
            </div>
            {pagoNum >= totalTicket && totalTicket > 0 && (
              <div className="cambio-display">
                <span className="cambio-label">Cambio</span>
                <span className="cambio-val">{fmt(cambio)}</span>
              </div>
            )}
          </>
        )}

        {/* Botón factura */}
        {ticket.length > 0 && (
          <button
            className="btn btn-full"
            style={{ marginBottom: "8px", fontSize: "12px" }}
            onClick={() => {
              setModalFactura(true);
              setFacturaGenerada(null);
            }}
          >
            🧾 Factura electrónica
          </button>
        )}

        {/* Cobrar */}
        {cobrado ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div
              className="alert-row alert-green"
              style={{ justifyContent: "center" }}
            >
              <span className="alert-text" style={{ fontWeight: 600 }}>
                ✓ Cobrado — {fmt(pedidoCobrado?.total || 0)}
              </span>
            </div>

            <button
              className="btn btn-full"
              style={{ fontSize: "12px" }}
              onClick={() => setModalFactura(true)}
            >
              🧾 Generar factura electrónica
            </button>

            <button
              className="btn btn-full"
              style={{ fontSize: "12px" }}
              onClick={() => {
                setCobrado(false);
                setPedidoCobrado(null);
                setServicio(null);
                setEditIdx(null);
              }}
            >
              Nuevo pedido
            </button>
          </div>
        ) : (
          <>
            <button
              className="btn btn-accent btn-full btn-lg"
              onClick={cobrar}
              disabled={!puedeCobrar}
            >
              Cobrar {totalTicket > 0 ? fmt(totalTicket) : ""}
            </button>
            <button
              className="btn btn-full"
              style={{ marginTop: "6px", fontSize: "12px" }}
              onClick={limpiar}
            >
              Cancelar pedido
            </button>
          </>
        )}
      </div>
    </div>
  );

  // ─── VALIDAR SI EL DÍA ESTÁ CERRADO DESDE EL DASHBOARD ───────────────────
  if (!diaAbierto) {
    return (
      <div className="main active fade-in" id="tab-caja">
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: "50px 20px",
            maxWidth: "450px",
            margin: "40px auto",
          }}
        >
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>🌅</div>
          <div
            style={{
              fontSize: "18px",
              fontWeight: 700,
              marginBottom: "8px",
              color: "#C4742A",
            }}
          >
            Caja Cerrada
          </div>
          <div
            style={{
              fontSize: "13px",
              color: "var(--text3)",
              marginBottom: "20px",
              lineHeight: "1.5",
            }}
          >
            Para registrar pedidos y cobrar, primero debes generar el{" "}
            <strong>Inicio de Día</strong> desde el Dashboard principal[cite: 2].
          </div>
        </div>
      </div>
    );
  }

  // ─── RETURN PRINCIPAL ────────────────────────────────────────────────────
  return (
    <div className="main active fade-in" id="tab-caja">
      {/* Encabezado y acciones de caja */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "16px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontSize: "16px", fontWeight: 600 }}>
          Caja registradora
        </div>

        {/* Selector servicio */}
        <div className="tipo-pago" style={{ margin: 0 }}>
          <button
            className={selBtn(servicio === "desayuno")}
            onClick={() => {
              setServicio("desayuno");
              setItem(itemVacio());
            }}
          >
            🍳 Desayuno
          </button>
          <button
            className={selBtn(servicio === "almuerzo")}
            onClick={() => {
              setServicio("almuerzo");
              setItem(itemVacio());
            }}
          >
            🍛 Almuerzo
          </button>
        </div>

        {/* Acciones */}
        <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
          <button className="btn btn-sm" onClick={abrirEditarPrecios}>
            ✎ Editar precios
          </button>
        </div>
      </div>

      {/* Layout principal */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 370px",
          gap: "16px",
          alignItems: "start",
        }}
      >
        <div>
          {!servicio && (
            <div
              className="card"
              style={{ textAlign: "center", padding: "40px" }}
            >
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>🍽</div>
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: 500,
                  marginBottom: "6px",
                }}
              >
                Selecciona el servicio
              </div>
              <div style={{ fontSize: "12px", color: "var(--text3)" }}>
                Elige desayuno o almuerzo para comenzar el pedido
              </div>
            </div>
          )}
          {servicio === "desayuno" && renderDesayuno()}
          {servicio === "almuerzo" && renderAlmuerzo()}
        </div>
        {renderTicket()}
      </div>

      {/* Modales */}
      {editandoPrecios && renderModalPrecios()}
      {modalFactura && renderModalFactura()}
    </div>
  );
}

export default Caja;
