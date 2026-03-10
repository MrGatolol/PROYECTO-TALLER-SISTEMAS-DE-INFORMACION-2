import { Router } from "express";
import { registrarUsuario, loginUsuario, buscarUsuario } from "./handlers/usuarios";
import { crearCliente, listarClientes, actualizarCliente, eliminarCliente } from "./handlers/clientes";
import { crearProducto, listarProductos, buscarProducto, actualizarProducto, eliminarProducto } from "./handlers/productos";
import { crearPedido, cancelarPedido, listarPedidos } from "./handlers/pedidos";
import { listarDetallesPorPedido } from "./handlers/detallePedidos";
import { listarAjustes, crearAjuste } from "./handlers/ajustes";
const router = Router();
// --- USUARIOS ---
router.post("/usuarios/register", registrarUsuario);
router.post("/usuarios/login", loginUsuario);
router.get("/usuarios/:rut", buscarUsuario);
// --- CLIENTES ---
router.post("/clientes", crearCliente);
router.get("/clientes", listarClientes);
router.put("/clientes/:rut", actualizarCliente);
router.delete("/clientes/:rut", eliminarCliente);
// --- PRODUCTOS ---
router.post("/productos", crearProducto);
router.get("/productos", listarProductos);
// Rutas específicas con parámetros al final
router.get("/productos/:cod", buscarProducto);
router.put("/productos/:cod", actualizarProducto);
router.delete("/productos/:cod", eliminarProducto);
// --- PEDIDOS ---
router.post("/pedidos", crearPedido);
router.delete("/pedidos/:id", cancelarPedido);
router.get("/pedidos", listarPedidos);
// --- DETALLE PEDIDOS ---
router.get("/detalles/:cod_pedido", listarDetallesPorPedido);
// --- AJUSTES ---
router.get("/ajustes", listarAjustes);
router.post("/ajustes", crearAjuste);
export default router;