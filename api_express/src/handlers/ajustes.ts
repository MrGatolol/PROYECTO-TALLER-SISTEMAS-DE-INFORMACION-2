import { Request, Response } from "express";
import Ajuste from "../models/Ajuste";
import Producto from "../models/Producto";
import Usuario from "../models/Usuario";

export const crearAjuste = async (req: Request, res: Response) => {
  try {
    const { cod_producto, rut_usuario, tipo, fecha, descripcion, ajuste_stock } = req.body;
    if (!rut_usuario) {
        return res.status(400).json({ error: "Falta rut_usuario para auditoria" });
    }
    const producto = await Producto.findByPk(cod_producto);
    if (!producto) {
      return res.status(404).json({ error: "Producto no existe" });
    }
    const ajuste = await Ajuste.create({
      cod_producto,
      rut_usuario,
      tipo,
      fecha: fecha || new Date(),
      descripcion,
      ajuste_stock,
    });
    // TIPO 0: INCREMENTO 
    // TIPO 1: REDUCCIÓN 
    if (tipo === 0) { 
      producto.stock_actual += ajuste_stock;
    } else if (tipo === 1) { 
      producto.stock_actual -= ajuste_stock;
      if (producto.stock_actual < 0) producto.stock_actual = 0; 
    }
    await producto.save();
    return res.status(201).json({ message: "Ajuste OK", ajuste });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error creando ajuste" });
  }
};
export const listarAjustes = async (req: Request, res: Response) => {
  try {
    const ajustes = await Ajuste.findAll({ 
        include: [
            { model: Producto },
            { model: Usuario, attributes: ['rut_usuario', 'nombres', 'apellido_paterno'] } 
        ],
        order: [['fecha', 'DESC']]
    }); 
    return res.status(200).json(ajustes);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error listando ajustes" });
  }
};