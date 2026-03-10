import { Request, Response } from "express";
import db from "../config/database";
import Pedido from "../models/Pedido";
import DetallePedido from "../models/DetallePedido";
import Producto from "../models/Producto";
import Cliente from "../models/Cliente"; 
import Ajuste from "../models/Ajuste";

export const crearPedido = async (req: Request, res: Response) => {
  const t = await db.transaction();
  try {
    const { rut_usuario, rut_cliente, items, medio_pago } = req.body;
    
    // Log para depuración
    console.log("Procesando pedido. Medio pago:", medio_pago);

    if (!rut_usuario || !rut_cliente || !Array.isArray(items) || items.length === 0) {
      await t.rollback();
      return res.status(400).json({ message: "Datos de pedido incompletos" });
    }
    let subtotal = 0;
    for (const it of items) {
      subtotal += it.cantidad * it.precio_unitario;
    }
    const iva = Math.round(subtotal * 0.19);
    const total = subtotal + iva;

    // Crear cabecera del pedido
    const pedido = await Pedido.create({
      rut_usuario,
      rut_cliente,
      fecha: new Date(),
      total,
      medio_pago: medio_pago || "TRANSFERENCIA"
    }, { transaction: t });

    // Procesar items
    for (const it of items) {
      const producto = await Producto.findByPk(it.cod_producto, { transaction: t });
      
      if (!producto) throw new Error(`Producto ${it.cod_producto} no encontrado`);

      if (producto.stock_actual < it.cantidad) {
        throw new Error(`Stock insuficiente para ${producto.nom_producto}.`);
      }

      await DetallePedido.create({
        cod_pedido: pedido.cod_pedido, 
        cod_producto: it.cod_producto,
        cantidad: it.cantidad,
        precio_unitario: it.precio_unitario,
      }, { transaction: t });

       // Descontar stock
       producto.stock_actual = producto.stock_actual - it.cantidad;
       await producto.save({ transaction: t });
    }

    await t.commit();
    return res.status(201).json({ message: "Pedido creado", cod_pedido: pedido.cod_pedido, total });
  } catch (err: any) {
    await t.rollback();
    return res.status(409).json({ error: err.message });
  }
};

export const cancelarPedido = async (req: Request, res: Response) => {
  const t = await db.transaction();
  try {
    const { id } = req.params;
    const { rut_responsable } = req.body; 

    const pedido = await Pedido.findByPk(id, { transaction: t });
    if (!pedido) {
      await t.rollback();
      return res.status(404).json({ message: "Pedido no encontrado" });
    }

    const detalles = await DetallePedido.findAll({ where: { cod_pedido: pedido.cod_pedido }, transaction: t });
    
    for (const d of detalles) {
      const prod = await Producto.findByPk(d.cod_producto, { transaction: t });
      if (prod) {
          prod.stock_actual = prod.stock_actual + d.cantidad;
          await prod.save({ transaction: t });
      }
      
      await Ajuste.create({
        cod_producto: d.cod_producto,
        rut_usuario: rut_responsable || pedido.rut_usuario, 
        tipo: 0, // Reingreso
        fecha: new Date(),
        descripcion: `Reintegro por cancelación pedido #${pedido.cod_pedido}`,
        ajuste_stock: d.cantidad,
      }, { transaction: t });
    }

    await DetallePedido.destroy({ where: { cod_pedido: pedido.cod_pedido }, transaction: t });
    await pedido.destroy({ transaction: t });

    await t.commit();
    return res.status(200).json({ message: "Pedido cancelado" });
  } catch (err: any) {
    await t.rollback();
    return res.status(500).json({ error: err.message });
  }
};
export const listarPedidos = async (req: Request, res: Response) => {
  try {
    const { rut } = req.query; 
    const where: any = {};
    if (rut) {
        where.rut_usuario = rut as string;
    }
    const pedidos = await Pedido.findAll({
      where: where,
      include: [
        { 
          model: Cliente
        },
        {
          model: DetallePedido,
          include: [
            { model: Producto } 
          ]
        }
      ],
      order: [['fecha', 'DESC']]
    });
    return res.status(200).json(pedidos);
  } catch (err: any) {
    console.error("Error listarPedidos:", err);
    return res.status(500).json({ error: err.message });
  }
};