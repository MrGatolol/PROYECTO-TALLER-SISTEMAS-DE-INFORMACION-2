import { Request, Response } from "express";
import Cliente from "../models/Cliente";
import Pedido from "../models/Pedido"; 
import { Op } from "sequelize";
export const crearCliente = async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    if (!payload.rut_cliente || !payload.nombres || !payload.apellido_paterno) {
        return res.status(400).json({ message: "RUT, Nombres y Apellido Paterno son requeridos" });
    }
    const existing = await Cliente.findByPk(payload.rut_cliente);
    if (existing) return res.status(409).json({ message: "Cliente ya existe" });
    const cliente = await Cliente.create(payload);
    return res.status(201).json({ message: "Cliente creado", cliente });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
export const listarClientes = async (req: Request, res: Response) => {
  try {
    const { rut, nombre } = req.query as any;
    const where: any = {};
    if (rut) where.rut_cliente = rut;
    if (nombre) {
        where[Op.or] = [
            { nombres: { [Op.like]: `%${nombre}%` } },
            { apellido_paterno: { [Op.like]: `%${nombre}%` } },
            { razon_social: { [Op.like]: `%${nombre}%` } }
        ];
    }
    const clientes = await Cliente.findAll({ where });
    return res.status(200).json(clientes);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
export const actualizarCliente = async (req: Request, res: Response) => {
  try {
    const { rut } = req.params;
    const data = req.body;
    // REQUISITO: No permitir modificar clave primaria
    if (data.rut_cliente && data.rut_cliente !== rut) {
      return res.status(400).json({ message: "No se puede modificar el RUT (Clave Primaria)" });
    }
    const cliente = await Cliente.findByPk(rut);
    if (!cliente) return res.status(404).json({ message: "Cliente no encontrado" });
    await cliente.update(data);
    return res.status(200).json({ message: "Cliente actualizado", cliente });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
export const eliminarCliente = async (req: Request, res: Response) => {
  try {
    const { rut } = req.params;
    const cliente = await Cliente.findByPk(rut);
    if (!cliente) return res.status(404).json({ message: "Cliente no encontrado" });
    // Verificamos si tiene pedidos antes de borrar
    const pedidosCount = await Pedido.count({ where: { rut_cliente: rut } });
    
    if (pedidosCount > 0) {
        return res.status(409).json({ 
            message: `No se puede eliminar: El cliente tiene ${pedidosCount} pedido(s) asociados.` 
        });
    }
    
    await cliente.destroy();
    return res.status(200).json({ message: "Cliente eliminado correctamente" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};