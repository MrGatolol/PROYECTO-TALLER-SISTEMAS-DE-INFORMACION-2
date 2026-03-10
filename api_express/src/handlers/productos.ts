import { Request, Response } from "express";
import { Op } from "sequelize";
import Producto from "../models/Producto";
import Ajuste from "../models/Ajuste";
import DetallePedido from "../models/DetallePedido"; 
import db from "../config/database"; 

export const crearProducto = async (req: Request, res: Response) => {
  const t = await db.transaction();
  try {
    const payload = req.body;

    const usuarioResponsable = payload.rut_usuario || "ADMIN-SYS";
    if (!payload.cod_producto || !payload.nom_producto || typeof payload.precio_producto === "undefined" || typeof payload.stock_actual === "undefined") {
      await t.rollback();
      return res.status(400).json({ message: "Faltan datos obligatorios" });
    }
    if (payload.precio_producto < 0 || payload.stock_actual < 0 || (Number(payload.stock_critico) <= 0 && payload.stock_critico !== undefined)) {
        await t.rollback();
        return res.status(400).json({ message: "Precio, stock o stock crítico inválido." });
    }

    payload.stock_critico = Number(payload.stock_critico || 1);
    
    // Chequeamos duplicados
    const existsByPK = await Producto.findByPk(payload.cod_producto, { transaction: t });
    if (existsByPK) {
        await t.rollback();
        return res.status(409).json({ message: "El código de producto ya existe" });
    }
    
    const nameConflict = await Producto.findOne({ where: { nom_producto: payload.nom_producto }, transaction: t });
    if (nameConflict) {
        await t.rollback();
        return res.status(409).json({ message: "Ya hay un producto con este nombre" });
    }
    
    payload.estado = 1; 
    
    const producto = await Producto.create(payload, { transaction: t });

    if (producto.stock_actual > 0) {
        await Ajuste.create({
            cod_producto: producto.cod_producto,
            rut_usuario: usuarioResponsable, 
            tipo: 2, 
            ajuste_stock: producto.stock_actual,
            descripcion: "Inventario Inicial (Creación de Producto)",
            fecha: new Date(),
        }, { transaction: t });
    }
    // 

    await t.commit();
    return res.status(201).json({ message: "Producto creado", producto });
  } catch (err: any) {
    await t.rollback();
    console.error("Error crearProducto:", err);
    return res.status(500).json({ error: err.message });
  }
};

export const listarProductos = async (req: Request, res: Response) => {
  try {
    const { cod, nombre, minStock, maxStock, estado } = req.query as any; 
    
    const where: any = {};
    

    if (estado !== undefined) {
        where.estado = estado; 
    } else {
        where.estado = 1; 
    }

    if (cod) where.cod_producto = { [Op.like]: `%${cod}%` }; 
    if (nombre) where.nom_producto = { [Op.like]: `%${nombre}%` };
    
    if (minStock !== undefined || maxStock !== undefined) {
      where.stock_actual = {};
      if (minStock !== undefined) where.stock_actual[Op.gte] = parseInt(minStock, 10);
      if (maxStock !== undefined) where.stock_actual[Op.lte] = parseInt(maxStock, 10);
    }
        
    const productos = await Producto.findAll({ where });
    return res.status(200).json(productos);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const buscarProducto = async (req: Request, res: Response) => {
  try {
    const { cod } = req.params;
    const producto = await Producto.findByPk(cod);
    if (!producto) return res.status(404).json({ message: "Producto no encontrado" });
    return res.status(200).json(producto);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const actualizarProducto = async (req: Request, res: Response) => {
  try {
    const { cod } = req.params;
    const { rut_usuario, stock_actual, ...dataToUpdate } = req.body; 
    const usuarioResponsable = rut_usuario || "ADMIN-SYS"; 
    
    if (dataToUpdate.cod_producto && dataToUpdate.cod_producto !== cod) {
      return res.status(400).json({ message: "No se puede cambiar la PK del producto" });
    }
    
    const producto = await Producto.findByPk(cod);
    if (!producto) return res.status(404).json({ message: "Producto no existe" });
    
    const stockAnterior = producto.stock_actual;
    const nuevoStock = typeof stock_actual !== "undefined" ? Number(stock_actual) : stockAnterior;
    
    await producto.update({
        ...dataToUpdate,
        stock_actual: nuevoStock 
    });
    
    if (nuevoStock !== stockAnterior) {
      const diferencia = nuevoStock - stockAnterior;
      const tipo = diferencia > 0 ? 0 : 1; // 0: Entra (Incremento), 1: Sale (Reducción)

      await Ajuste.create({
        cod_producto: cod,
        rut_usuario: usuarioResponsable, 
        tipo,
        ajuste_stock: Math.abs(diferencia),
        descripcion: "Ajuste manual desde edición de producto",
        fecha: new Date(),
      });
    }
    
    return res.status(200).json({ message: "Producto actualizado correctamente", producto });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const actualizarStock = async (req: Request, res: Response) => {
  try {
    const { cod } = req.params;
    const { stock_actual, rut_usuario } = req.body; 
    const userResponsable = rut_usuario || "ADMIN-SYS"; 
    
    if (typeof stock_actual === "undefined") {
      return res.status(400).json({ message: "Falta stock_actual" });
    }
    if (stock_actual < 0) {
      return res.status(400).json({ message: "No se permiten stocks negativos" });
    }
    
    const producto = await Producto.findByPk(cod);
    if (!producto) return res.status(404).json({ message: "Producto no encontrado" });
    
    const stockAnterior = producto.stock_actual;
    const nuevoStock = Number(stock_actual);
    
    if (nuevoStock !== stockAnterior) {
      const diferencia = nuevoStock - stockAnterior;
      await Ajuste.create({
        cod_producto: producto.cod_producto,
        rut_usuario: userResponsable,
        tipo: diferencia > 0 ? 0 : 1,
        ajuste_stock: Math.abs(diferencia),
        descripcion: "Actualización rápida de stock",
        fecha: new Date(),
      });
    }
    
    await producto.update({ stock_actual: nuevoStock });
    return res.status(200).json({ message: "Stock actualizado", producto });
  } catch (err: any) {
    console.error("Error actualizarStock:", err);
    return res.status(500).json({ error: err.message });
  }
};


export const eliminarProducto = async (req: Request, res: Response) => {
  const t = await db.transaction();
  

  const usuarioResponsable = req.query.rut as string || "ADMIN-SYS"; 
  
  try {
    const { cod } = req.params;
    const producto = await Producto.findByPk(cod, { transaction: t });

    if (!producto) {
      await t.rollback();
      return res.status(404).json({ message: "No encontrado" });
    }
    
    const ventasAsociadas = await DetallePedido.count({
      where: { cod_producto: cod },
      transaction: t
    });

    if (ventasAsociadas > 0) {

      producto.estado = 0;
      await producto.save({ transaction: t });
      

      await Ajuste.create({
          cod_producto: cod,
          rut_usuario: usuarioResponsable, 
          tipo: 3, 
          ajuste_stock: 0,
          descripcion: `Producto inactivado (ocultado) por tener ${ventasAsociadas} venta(s) asociada(s).`,
          fecha: new Date(),
      }, { transaction: t });
      await t.commit();
      
      return res.status(409).json({ 
        message: `El producto '${producto.nom_producto}' tiene ${ventasAsociadas} venta(s) asociada(s). Ha sido INACTIVADO (Estado 0) en lugar de ser eliminado físicamente.`
      });
      
    } else {
      await Ajuste.destroy({
          where: { cod_producto: cod },
          transaction: t
      });
      
      await producto.destroy({ transaction: t });
      await t.commit();
      return res.status(200).json({ message: "Producto eliminado correctamente (sin ventas ni ajustes asociados)." });
    }
  } catch (err: any) {
    await t.rollback();
    console.error("Error eliminarProducto:", err); 
    return res.status(500).json({ error: err.message || "Error interno del servidor al eliminar producto." });
  }
};