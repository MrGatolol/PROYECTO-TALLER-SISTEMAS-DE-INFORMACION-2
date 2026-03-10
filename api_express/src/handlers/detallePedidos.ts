import { Request, Response } from "express";
import DetallePedido from "../models/DetallePedido";

export const listarDetallesPorPedido = async (req: Request, res: Response) => {
  try {
    const { cod_pedido } = req.params;
    if (!cod_pedido) {
      return res.status(400).json({ message: "Falta cod_pedido en la URL" });
    }

    const detalles = await DetallePedido.findAll({
      where: { cod_pedido }
    });

    if (detalles.length === 0) {
      return res.status(404).json({ message: "No se encontraron detalles para este pedido" });
    }

    return res.status(200).json(detalles);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

