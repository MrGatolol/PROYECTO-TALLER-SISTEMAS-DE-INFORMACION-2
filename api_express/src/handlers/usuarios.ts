import { Request, Response } from "express";
import Usuario from "../models/Usuario";
import Cliente from "../models/Cliente"; 
import db from "../config/database"; 

// LOGIN
export const loginUsuario = async (req: Request, res: Response) => {
  try {
    const { correo_usuario, contrasena } = req.body;
    
    if (!correo_usuario || !contrasena) {
      return res.status(400).json({ message: "Correo y contraseña requeridos" });
    }
    
    const usuarioDB = await Usuario.findOne({ where: { email_usuario: correo_usuario } });
    
    if (!usuarioDB) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }
    
    const usuario = usuarioDB.toJSON(); 
    
    if (usuario.contrasena !== contrasena) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }
    
    const tokenFicticio = `TOKEN_FICTICIO_${usuario.email_usuario}_${Date.now()}`;
    
    return res.status(200).json({
      token: tokenFicticio,
      usuario: {
        rut_usuario: usuario.rut_usuario,
        nombres: usuario.nombres,
        apellidos: `${usuario.apellido_paterno} ${usuario.apellido_materno || ''}`,
        nom_usuario: `${usuario.nombres} ${usuario.apellido_paterno}`,
        tipo_usuario: usuario.tipo_usuario,
        email_usuario: usuario.email_usuario,
        fono_usuario: usuario.fono_usuario,
      },
    });
  } catch (err: any) {
    console.error("Error en loginUsuario:", err);
    return res.status(500).json({ error: err.message });
  }
};
export const registrarUsuario = async (req: Request, res: Response) => {
  const t = await db.transaction();
  try {
    const rutFinal = req.body.rut || req.body.rut_usuario;
    const nombreFinal = req.body.nombre || req.body.nombres || req.body.nom_usuario; 
    const apellidoPFinal = req.body.apellidoPaterno || req.body.apellido_paterno;
    const apellidoMFinal = req.body.apellidoMaterno || req.body.apellido_materno;
    const emailFinal = req.body.correoElectronico || req.body.email_usuario;
    const fonoFinal = req.body.telefono || req.body.fono_usuario;
    const passFinal = req.body.password || req.body.contrasena;
    const { direccion, es_empresa, razon_social, giro, tipo_usuario } = req.body;
    if (!rutFinal || !nombreFinal || !apellidoPFinal || !passFinal) {
      await t.rollback();
      return res.status(400).json({ message: "Faltan datos obligatorios" });
    }
    const usuarioExistente = await Usuario.findByPk(rutFinal, { transaction: t });
    if (usuarioExistente) {
      await t.rollback();
      return res.status(409).json({ message: "El RUT ya está registrado como usuario" });
    }

    if (emailFinal) {
      const correoExistente = await Usuario.findOne({ where: { email_usuario: emailFinal }, transaction: t });
      if (correoExistente) {
        await t.rollback();
        return res.status(409).json({ message: "El correo electrónico ya está registrado" });
      }
    }
    const nuevoUsuario = await Usuario.create({
      rut_usuario: rutFinal,
      nombres: nombreFinal,
      apellido_paterno: apellidoPFinal,
      apellido_materno: apellidoMFinal,
      contrasena: passFinal,
      tipo_usuario: tipo_usuario ?? 0, 
      email_usuario: emailFinal || null,
      fono_usuario: fonoFinal || null,
    }, { transaction: t });
    const clienteExistente = await Cliente.findByPk(rutFinal, { transaction: t });
    const datosCliente = {
        rut_cliente: rutFinal,
        rut_usuario: rutFinal,
        nombres: nombreFinal,
        apellido_paterno: apellidoPFinal,
        apellido_materno: apellidoMFinal,
        email: emailFinal || null,
        fono: fonoFinal || null,
        direccion: direccion || null,
        tipo_cliente: es_empresa ? 1 : 0,
        razon_social: es_empresa ? razon_social : null,
        giro: es_empresa ? giro : null
    };
    if (!clienteExistente) {
        await Cliente.create(datosCliente, { transaction: t });
    } else {
        await clienteExistente.update(datosCliente, { transaction: t });
    }
    await t.commit(); 
    return res.status(201).json({
      ok: true,
      message: "Cuenta y Cliente creados exitosamente",
      usuario: nuevoUsuario.toJSON(),
    });
  } catch (err: any) {
    await t.rollback(); 
    console.error("Error registro:", err);
    return res.status(500).json({ error: err.message });
  }
};
export const buscarUsuario = async (req: Request, res: Response) => {
  try {
    const { rut } = req.params;
    if (rut === 'register' || rut === 'login') return res.status(404).json({message: "Ruta no válida para búsqueda"});
    const usuario = await Usuario.findByPk(rut);
    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    const data = usuario.toJSON();
    return res.status(200).json({
        rut_usuario: data.rut_usuario,
        nombres: data.nombres,
        apellido_paterno: data.apellido_paterno,
        apellido_materno: data.apellido_materno,
        nom_usuario: `${data.nombres} ${data.apellido_paterno}`, 
        email_usuario: data.email_usuario,
        fono_usuario: data.fono_usuario,
        tipo_usuario: data.tipo_usuario
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};