// src/menuBase.js

export const MENU_BASE = {
  desayuno: {
    caldos: [
      { id: "c1", name: "Caldo de costilla", precio: 7500, tipo: "normal" },
      { id: "c2", name: "Caldo de pollo", precio: 7500, tipo: "normal" },
      { id: "c3", name: "Caldo de pata", precio: 7500, tipo: "normal" },
      { id: "c4", name: "Caldo de pescado", precio: 8500, tipo: "especial" },
      { id: "c5", name: "Caldo de pajarilla", precio: 8500, tipo: "especial" },
    ],
    bandeja: [
      { id: "b1", name: "Huevos al gusto", precio: 13000 },
      { id: "b2", name: "Huevos rancheros", precio: 14000 },
      { id: "b3", name: "Carne sudada", precio: 14000 },
      { id: "b4", name: "Moñona", precio: 14000 },
    ],
    bebidas: [
      { id: "be1", name: "Limonada" },
      { id: "be2", name: "Chocolate" },
      { id: "be3", name: "Tinto" },
      { id: "be4", name: "Perico" },
    ],
  },
  almuerzo: {
    sopa: { id: "sopa", name: "Sopa de arroz", precioSolo: 5500 },
    principios: [
      { id: "p1", name: "Frijol" },
      { id: "p2", name: "Arveja" },
      { id: "p3", name: "Brócoli" },
    ],
    ejecutivo: [
      { id: "e1", name: "Minichurrasco", precio: 18000, tipo: "carne" },
      { id: "e2", name: "Chuleta", precio: 18000, tipo: "carne" },
      { id: "e3", name: "Cachama", precio: 19000, tipo: "pescado" },
      { id: "e4", name: "Cazuela de mariscos", precio: 20000, tipo: "cazuela" },
    ],
    intermedio: [
      { id: "i1", name: "Chuleta ejecutiva", conSopa: 16000, sinSopa: 15000, tipo: "carne" },
      { id: "i2", name: "Filete de robalo", conSopa: 16000, sinSopa: 15000, tipo: "pescado" },
    ],
    corriente: [
      { id: "co1", name: "Pechuga", conSopa: 13000, sinSopa: 12000, tipo: "carne" },
      { id: "co2", name: "Lomo", conSopa: 13000, sinSopa: 12000, tipo: "carne" },
      { id: "co3", name: "Hígado", conSopa: 13000, sinSopa: 12000, tipo: "carne" },
      { id: "co4", name: "Mojarra", conSopa: 14000, sinSopa: 13000, tipo: "pescado" },
    ],
    bebidas: [
      { id: "ab1", name: "Limonada" },
      { id: "ab2", name: "Jugo de mango" },
    ],
  },
};

// Los "huevos al gusto" son los que piden preparación (fritos, revueltos...)
export const esHuevosAlGusto = (nombre = "") => /al gusto/i.test(nombre);