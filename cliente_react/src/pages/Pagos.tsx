import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// --- LIBRERÍAS PDF ---
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// --- COMPONENTE NAVBAR SIMULADO (O usa tu import real) ---
import NavBar from "../components/NavBar"; 

// --- UTILIDADES DE VALIDACIÓN ---
const formatearRut = (rut: string) => {
  let valor = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  if (valor.length > 10) { valor = valor.slice(0, 10); }
  if (valor.length > 1) {
    const cuerpo = valor.slice(0, -1);
    const dv = valor.slice(-1);
    return `${cuerpo}-${dv}`;
  }
  return valor;
};

const validarRutChileno = (rut: string) => {
  if (!rut) return false;
  let valor = rut.replace(/\./g, '').replace(/-/g, '');
  let cuerpo = valor.slice(0, -1);
  let dv = valor.slice(-1).toUpperCase();
  if (cuerpo.length < 7) return false;
  
  let suma = 0;
  let multiplo = 2;
  for (let i = 1; i <= cuerpo.length; i++) {
    let index = multiplo * parseInt(valor.charAt(cuerpo.length - i));
    suma = suma + index;
    if (multiplo < 7) { multiplo = multiplo + 1; } else { multiplo = 2; }
  }
  let dvEsperado = 11 - (suma % 11);
  let dvCalc = (dvEsperado === 11) ? '0' : ((dvEsperado === 10) ? 'K' : dvEsperado.toString());
  return dv === dvCalc;
};

// --- VALIDACIÓN DE FECHA DE EXPIRACIÓN (MM/AA) ---
const validarExpiracion = (fecha: string) => {
    if (!/^\d{2}\/\d{2}$/.test(fecha)) return false; 
    
    const [mesStr, anioStr] = fecha.split('/');
    const mes = parseInt(mesStr, 10);
    const anio = parseInt("20" + anioStr, 10); 
    
    const ahora = new Date();
    const mesActual = ahora.getMonth() + 1;
    const anioActual = ahora.getFullYear();

    if (mes < 1 || mes > 12) return false; 
    if (anio < anioActual) return false;
    if (anio === anioActual && mes < mesActual) return false;

    return true;
};

type ItemCarrito = {
  cod_producto: string;
  nombre: string;
  precio: number;
  cantidad: number;
  subtotal: number;
};

export default function Pagos() {
  const navigate = useNavigate();
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [isLogged, setIsLogged] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);


  const [esEmpresa, setEsEmpresa] = useState(false);

  const [datosPago, setDatosPago] = useState({ 
    rut: "", 
    nombre: "", 
    app_paterno: "", 
    app_materno: "", 
    razon_social: "",
    giro: "",
    email: "", 
    direccion: "", 
    fono: "+56", 
    password: "" 
  });
  
  const [login, setLogin] = useState({ correo: "", pass: "" });
  const [metodoPago, setMetodoPago] = useState("transferencia"); 
  const [showModalPago, setShowModalPago] = useState(false);
  

  const [datosTarjeta, setDatosTarjeta] = useState({ numero: "", expiracion: "", cvv: "" });

  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem("carrito_cliente") || "[]");
    if (savedCart.length === 0) {

        console.log("Carrito vacío, debe redirigir al usuario.");
    } else {
        setCarrito(savedCart);
    }
    checkSession();
  }, [navigate]);

  const checkSession = () => {
    const token = localStorage.getItem("token");
    const rutSesion = localStorage.getItem("rut_usuario_sesion");
    if (token && rutSesion) {
        setIsLogged(true);
        cargarDatosCombinados(rutSesion);
    } else {
        setIsLogged(false);
    }
  };

  const cargarDatosCombinados = async (rut: string) => {
    try {
        const [resUsuario, resCliente] = await Promise.all([
            fetch(`http://localhost:3000/api/usuarios/${rut}`),
            fetch(`http://localhost:3000/api/clientes?rut=${rut}`)
        ]);
        
        if (resUsuario.ok) {
            const usuarioDB = await resUsuario.json();
            setDatosPago(prev => ({ 
                ...prev, 
                rut: rut, 
                nombre: usuarioDB.nombres || prev.nombre,
                app_paterno: usuarioDB.apellido_paterno || prev.app_paterno,
                app_materno: usuarioDB.apellido_materno || prev.app_materno,
                email: usuarioDB.email_usuario || prev.email,
                fono: usuarioDB.fono_usuario || (prev.fono === "+56" ? "+56" : prev.fono)
            }));
        }
        if (resCliente.ok) {
            const clientesArr = await resCliente.json();
            const clienteDB = Array.isArray(clientesArr) ? clientesArr.find((c: any) => c.rut_cliente === rut) : clientesArr;
            
            if (clienteDB) {
                  const isCompany = clienteDB.tipo_cliente === 1 || (clienteDB.razon_social && clienteDB.razon_social.length > 1);
                  setEsEmpresa(isCompany);

                  setDatosPago(prev => ({
                    ...prev,
                    direccion: clienteDB.direccion || prev.direccion,
                    fono: clienteDB.fono || (prev.fono === "+56" ? "+56" : prev.fono),
                    razon_social: clienteDB.razon_social || prev.razon_social,
                    giro: clienteDB.giro || prev.giro
                  }));
            }
        }
        
        const nombreLocal = localStorage.getItem("nombre_usuario") || "";
        setDatosPago(prev => ({
            ...prev,
            rut: rut,
            nombre: prev.nombre || nombreLocal,
        }));

    } catch (e) { console.error("Error cargando datos combinados:", e); }
  };

  const totalBruto = carrito.reduce((acc, i) => acc + i.subtotal, 0);
  const totalNeto = Math.round(totalBruto / 1.19);
  const totalIVA = totalBruto - totalNeto;

  // --- GENERACIÓN AUTOMÁTICA DE PDF ---
  const generarBoletaPDF = (codPedido: number) => {
    const doc = new jsPDF();
    const nombreCliente = esEmpresa ? datosPago.razon_social : `${datosPago.nombre} ${datosPago.app_paterno}`;

    // Encabezado
    doc.setFontSize(22);
    doc.text("PRODINOX", 14, 20);
    doc.setFontSize(12);
    doc.text("Comprobante de Venta Electrónico", 14, 28);

    doc.setFontSize(10);
    doc.text(`Pedido N°: ${codPedido}`, 14, 40);
    doc.text(`Fecha: ${new Date().toLocaleString()}`, 14, 45);
    
    // Datos Cliente
    doc.setFont("helvetica", "bold");
    doc.text("Datos del Cliente:", 14, 55);
    doc.setFont("helvetica", "normal");
    
    doc.text(`Nombre/Razón: ${nombreCliente}`, 14, 60);
    doc.text(`RUT: ${datosPago.rut}`, 14, 65);
    if (esEmpresa && datosPago.giro) doc.text(`Giro: ${datosPago.giro}`, 14, 70);
    doc.text(`Dirección: ${datosPago.direccion}`, 14, esEmpresa ? 75 : 70);
    doc.text(`Medio de Pago: ${metodoPago.toUpperCase()}`, 14, esEmpresa ? 80 : 75);

    // Tabla de Productos
    const rows = carrito.map(item => [
        item.nombre,
        item.cantidad,
        `$${Math.round(item.precio / 1.19).toLocaleString()}`, 
        `$${item.subtotal.toLocaleString()}`
    ]);

    autoTable(doc, {
        startY: esEmpresa ? 90 : 85,
        head: [['Producto', 'Cant.', 'Precio Neto', 'Total']],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] }
    });

    // Totales
    // @ts-ignore
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.text(`Neto: $${totalNeto.toLocaleString()}`, 140, finalY);
    doc.text(`IVA (19%): $${totalIVA.toLocaleString()}`, 140, finalY + 5);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL PAGADO: $${totalBruto.toLocaleString()}`, 140, finalY + 12);

    // Descarga automática
    doc.save(`Boleta_Prodinox_${codPedido}.pdf`);
  };

  const handleRegistrarInvitado = async () => {
    if (!validarRutChileno(datosPago.rut)) return alert("El RUT ingresado no es válido.");
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(datosPago.email)) {
        return alert("El correo electrónico no es válido (debe contener '@' y un punto).");
    }

    if (!datosPago.nombre.trim() || !datosPago.app_paterno.trim() || !datosPago.direccion.trim()) {
        return alert("Por favor complete Nombre, Apellido y Dirección.");
    }
    
    if (datosPago.fono.length < 8 || datosPago.fono.replace(/\D/g, '').length < 8) {
        return alert("El teléfono es obligatorio y debe contener al menos 8 dígitos.");
    }

    if (datosPago.password.length < 4) return alert("La contraseña debe tener al menos 4 caracteres.");

    setIsProcessing(true);

    try {

        const payloadRegistro = {
            rut_usuario: datosPago.rut,
            nombres: datosPago.nombre, 
            apellido_paterno: datosPago.app_paterno,
            apellido_materno: datosPago.app_materno,
            contrasena: datosPago.password,
            email_usuario: datosPago.email,
            fono_usuario: datosPago.fono,
            direccion: datosPago.direccion, 
            tipo_usuario: 0 
        };

        
        let resReg;
        try {
            resReg = await fetch("http://localhost:3000/api/usuarios/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payloadRegistro)
            });
        } catch { /* ... */ }

        if (resReg && !resReg.ok && resReg.status !== 409) { 
             const errorBody = await resReg.json().catch(() => ({}));
             throw new Error(errorBody.message || "Error al registrar");
        }
        
        const resLogin = await fetch("http://localhost:3000/api/usuarios/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ correo_usuario: datosPago.email, contrasena: datosPago.password }),
        });
        
        if (resLogin.ok) {
            const data = await resLogin.json();
            localStorage.setItem("token", data.token);
            localStorage.setItem("rut_usuario_sesion", data.usuario.rut_usuario);
            localStorage.setItem("nombre_usuario", data.usuario.nom_usuario); 

            localStorage.setItem("tipo_usuario", data.usuario.tipo_usuario.toString());


            setIsLogged(true);

 
            window.dispatchEvent(new Event("auth-change"));
            alert("✅ Usuario creado con éxito. Recargando para habilitar pago...");
            window.location.reload(); 

        } else {
             if (resReg && resReg.status === 409) {
                 alert("⚠️ Este usuario ya existe, pero la contraseña no coincide. Por favor inicie sesión en el panel izquierdo.");
             } else {
                 alert("Error al iniciar sesión automática.");
             }
        }
    } catch (error: any) {
        alert("❌ Ocurrió un error: " + error.message);
    } finally {
        setIsProcessing(false);
    }
  };
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:3000/api/usuarios/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo_usuario: login.correo, contrasena: login.pass }),
      });
      if (!res.ok) return alert("Credenciales incorrectas");
      const data = await res.json();
      localStorage.setItem("token", data.token);
      localStorage.setItem("rut_usuario_sesion", data.usuario.rut_usuario);
      localStorage.setItem("nombre_usuario", data.usuario.nom_usuario);
      localStorage.setItem("tipo_usuario", data.usuario.tipo_usuario.toString());

      setIsLogged(true);
      

      window.dispatchEvent(new Event("auth-change"));
      window.location.reload(); 

    } catch (e) { alert("Error de conexión"); }
  };

  const handleLogout = () => {
      localStorage.clear();
      setIsLogged(false);
      window.dispatchEvent(new Event("auth-change"));
      window.location.reload(); 
  };

  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatearRut(e.target.value);
    setDatosPago({...datosPago, rut: formatted});
  };

  const handleFonoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^0-9+]/g, '');
    if (val.length > 12) { val = val.slice(0, 12); }
    setDatosPago({...datosPago, fono: val});
  };

  const handleTarjetaNumChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 16);
    setDatosTarjeta({ ...datosTarjeta, numero: val });
  };
  const handleTarjetaExpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, ''); 
    if (val.length >= 2) { val = val.slice(0, 2) + '/' + val.slice(2, 4); }
    setDatosTarjeta({ ...datosTarjeta, expiracion: val });
  };
  const handleTarjetaCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4); 
    setDatosTarjeta({ ...datosTarjeta, cvv: val });
  };

  const procesarPedidoFinal = async () => {
    const rutFinal = datosPago.rut;
    if (!rutFinal) return alert("Error: No hay RUT asociado.");

    if (metodoPago !== "transferencia") {
        if (datosTarjeta.numero.length < 16) return alert("❌ El número de tarjeta debe tener 16 dígitos.");
        if (!validarExpiracion(datosTarjeta.expiracion)) return alert("❌ La fecha de expiración es inválida o la tarjeta está vencida.");
        if (datosTarjeta.cvv.length < 3) return alert("❌ El código CVV es inválido.");
    }

    try {
        await fetch(`http://localhost:3000/api/clientes/${rutFinal}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                rut_cliente: rutFinal,
                nombres: esEmpresa ? "Empresa" : datosPago.nombre,
                apellido_paterno: esEmpresa ? "." : datosPago.app_paterno,
                apellido_materno: esEmpresa ? "" : datosPago.app_materno,
                
                razon_social: esEmpresa ? datosPago.razon_social : null,
                giro: esEmpresa ? datosPago.giro : null,
                
                email: datosPago.email, 
                fono: datosPago.fono,   
                direccion: datosPago.direccion,
            })
        });
    } catch (e) { 
        console.log("Nota: No se pudo actualizar datos cliente, se usarán los existentes."); 
    }

    const payload = {
        rut_usuario: rutFinal, 
        rut_cliente: rutFinal,
        medio_pago: metodoPago, 
        items: carrito.map(i => ({
          cod_producto: i.cod_producto,
          cantidad: i.cantidad,
          precio_unitario: Math.round(i.precio / 1.19)
        }))
    };

    try {
        const res = await fetch("http://localhost:3000/api/pedidos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const dataRes = await res.json();
            setShowModalPago(false); 
            
            generarBoletaPDF(dataRes.cod_pedido || 9999);

            alert("✅ ¡Pago Exitoso! Pedido #" + (dataRes.cod_pedido || "Generado") + ". Su boleta se está descargando.");
            localStorage.removeItem("carrito_cliente");
            
            window.dispatchEvent(new Event("cart-change"));

            setTimeout(() => {
                navigate("/home"); 
            }, 1500);
            
        } else {
            const err = await res.json();
            alert("Error al procesar pedido: " + (err.message || err.error));
        }
    } catch (e) {
        alert("Error de conexión al crear el pedido.");
    }
  };

  return (
    <>
      <NavBar />
      <div className="container mt-4 mb-5">
        <nav aria-label="breadcrumb" className="mb-4">
            <ol className="breadcrumb">
                <li className="breadcrumb-item"><a href="#" onClick={() => navigate("/tienda")}>Tienda</a></li>
                <li className="breadcrumb-item active">Finalizar Compra</li>
            </ol>
        </nav>

        <div className="row">
            <div className="col-md-8">
                <div className={`card shadow-sm border-0 mb-4 ${isLogged ? 'border-success border-2' : 'border-warning border-2'}`}>
                    <div className="card-header bg-white pt-4 px-4 border-0 d-flex justify-content-between align-items-center">
                        <h5 className="fw-bold text-dark mb-0">{isLogged ? "✅ Datos Confirmados" : "📝 Ingresa tus Datos para Continuar"}</h5>
                        {isLogged && (
                            <button className="btn btn-sm btn-outline-danger" onClick={handleLogout}>
                                Cambiar Usuario
                            </button>
                        )}
                    </div>
                    <div className="card-body px-4 pb-4">
                        <form className="row g-3">
                            <div className="col-12">
                                <label className="form-label small fw-bold">RUT *</label>
                                <input className="form-control" value={datosPago.rut} onChange={handleRutChange} disabled={isLogged} placeholder="12345678-9"/>
                            </div>
                            
                            {esEmpresa ? (
                                <>
                                    <div className="col-md-8">
                                        <label className="form-label small fw-bold">Razón Social *</label>
                                        <input className="form-control" value={datosPago.razon_social} onChange={e => setDatosPago({...datosPago, razon_social: e.target.value})} disabled={isLogged} />
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label small fw-bold">Giro *</label>
                                        <input className="form-control" value={datosPago.giro} onChange={e => setDatosPago({...datosPago, giro: e.target.value})} disabled={isLogged} />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="col-md-4">
                                        <label className="form-label small fw-bold">Nombre *</label>
                                        <input className="form-control" value={datosPago.nombre} onChange={e => setDatosPago({...datosPago, nombre: e.target.value})} disabled={isLogged} />
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label small fw-bold">Ap. Paterno *</label>
                                        <input className="form-control" value={datosPago.app_paterno} onChange={e => setDatosPago({...datosPago, app_paterno: e.target.value})} disabled={isLogged} />
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label small fw-bold">Ap. Materno</label>
                                        <input className="form-control" value={datosPago.app_materno} onChange={e => setDatosPago({...datosPago, app_materno: e.target.value})} disabled={isLogged} />
                                    </div>
                                </>
                            )}

                            <div className="col-md-6">
                                <label className="form-label small fw-bold">Correo Electrónico *</label>
                                <input type="email" className="form-control" value={datosPago.email} onChange={e => setDatosPago({...datosPago, email: e.target.value})} disabled={isLogged} />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label small fw-bold">Teléfono *</label>
                                <input className="form-control" value={datosPago.fono} onChange={handleFonoChange} maxLength={12} disabled={isLogged} placeholder="+569..." />
                            </div>
                            <div className="col-12">
                                <label className="form-label small fw-bold">Dirección de Despacho *</label>
                                <input className="form-control border-primary" value={datosPago.direccion} onChange={e => setDatosPago({...datosPago, direccion: e.target.value})} />
                                <div className="form-text small">Indique calle, número y comuna.</div>
                            </div>
                            
                            {!isLogged && (
                                <div className="col-12 bg-light p-4 rounded mt-3 border border-warning">
                                    <label className="form-label small fw-bold text-dark">Crea una contraseña para tu pedido *</label>
                                    <input type="password" className="form-control mb-3" placeholder="Mínimo 4 caracteres" value={datosPago.password} onChange={e => setDatosPago({...datosPago, password: e.target.value})} />
                                    <button type="button" className="btn btn-warning w-100 fw-bold py-2 shadow-sm text-dark" onClick={handleRegistrarInvitado} disabled={isProcessing}>
                                        {isProcessing ? "Registrando..." : "💾 GUARDAR DATOS Y CONTINUAR"}
                                    </button>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
                
                {!isLogged && (
                    <div className="card shadow-sm border-0 bg-white mb-4">
                        <div className="card-body">
                            <h6 className="mb-3 fw-bold">🔐 ¿Ya tienes cuenta antigua? Inicia sesión aquí:</h6>
                            <form onSubmit={handleLogin} className="d-flex gap-2">
                                <input className="form-control form-control-sm" placeholder="Correo" value={login.correo} onChange={e => setLogin({...login, correo: e.target.value})} />
                                <input type="password" className="form-control form-control-sm" placeholder="Contraseña" value={login.pass} onChange={e => setLogin({...login, pass: e.target.value})} />
                                <button className="btn btn-secondary btn-sm">Entrar</button>
                            </form>
                        </div>
                    </div>
                )}
            </div>

            <div className="col-md-4">
                <div className="card shadow-lg border-0 bg-white position-sticky" style={{top: "20px"}}>
                    <div className="card-header bg-dark text-white py-3"><h5 className="mb-0">Resumen</h5></div>
                    <div className="card-body">
                        <div className="d-flex justify-content-between mb-2 text-muted"><span>Neto:</span><span>${totalNeto.toLocaleString()}</span></div>
                        <div className="d-flex justify-content-between mb-3 text-muted"><span>IVA (19%):</span><span>${totalIVA.toLocaleString()}</span></div>
                        <div className="d-flex justify-content-between mb-3 border-top pt-2"><span className="h5">Total a Pagar:</span><span className="h4 fw-bold text-primary">${totalBruto.toLocaleString()}</span></div>

                        {isLogged ? (
                            <div className="mb-4 animate-fade-in">
                                <label className="form-label fw-bold small">Selecciona Medio de Pago:</label>
                                <div className="border rounded p-2 bg-light">
                                    <div className="form-check mb-2">
                                        <input className="form-check-input" type="radio" name="pago" checked={metodoPago === "transferencia"} onChange={() => setMetodoPago("transferencia")} />
                                        <label className="form-check-label">🏦 Transferencia / Depósito</label>
                                    </div>
                                    <div className="form-check mb-2">
                                        <input className="form-check-input" type="radio" name="pago" checked={metodoPago === "debito"} onChange={() => setMetodoPago("debito")} />
                                        <label className="form-check-label">💳 Tarjeta Débito</label>
                                    </div>
                                    <div className="form-check">
                                        <input className="form-check-input" type="radio" name="pago" checked={metodoPago === "credito"} onChange={() => setMetodoPago("credito")} />
                                        <label className="form-check-label">💳 Tarjeta Crédito</label>
                                    </div>
                                </div>
                                <button className="btn btn-primary w-100 fw-bold py-3 mt-3 shadow-md" onClick={() => setShowModalPago(true)}>CONTINUAR AL PAGO</button>
                            </div>
                        ) : (
                            <div className="alert alert-warning text-center small border-warning bg-warning bg-opacity-10">🔒 Para habilitar el pago, primero debes <strong>Guardar tus Datos</strong> en el formulario de la izquierda.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
      </div>

      {showModalPago && (
        <>
        <div className="modal-backdrop show fade"></div>
        <div className="modal show d-block fade" tabIndex={-1}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header bg-primary text-white">
                        <h5 className="modal-title">Confirmar Pago</h5>
                        <button type="button" className="btn-close btn-close-white" onClick={() => setShowModalPago(false)}></button>
                    </div>
                    <div className="modal-body">
                        <div className="text-center mb-4">
                            <h2 className="text-primary font-bold">${totalBruto.toLocaleString()}</h2>
                            <p className="text-muted small">Total a pagar</p>
                        </div>
                        {metodoPago === "transferencia" && (
                            <div className="alert alert-info border-info bg-info bg-opacity-10">
                                <h6 className="fw-bold">Datos Bancarios:</h6>
                                <p className="mb-0 small">Banco Estado - Cta Cte 123456</p>
                                <p className="mb-0 small">RUT: 76.123.456-7</p>
                                <p className="mb-0 small">Correo: pagos@prodinox.cl</p>
                            </div>
                        )}
                        {metodoPago !== "transferencia" && (
                             <div className="p-3 bg-light rounded border">
                                <div className="mb-3">
                                    <label className="form-label small fw-bold">Número de Tarjeta</label>
                                    <input className="form-control" placeholder="0000 0000 0000 0000" maxLength={16} value={datosTarjeta.numero} onChange={handleTarjetaNumChange} />
                                </div>
                                <div className="row">
                                    <div className="col-6">
                                        <label className="form-label small fw-bold">Vencimiento</label>
                                        <input className="form-control" placeholder="MM/AA" maxLength={5} value={datosTarjeta.expiracion} onChange={handleTarjetaExpChange} />
                                    </div>
                                    <div className="col-6">
                                        <label className="form-label small fw-bold">CVV</label>
                                        <input type="password" className="form-control" placeholder="123" maxLength={4} value={datosTarjeta.cvv} onChange={handleTarjetaCvvChange} />
                                    </div>
                                </div>
                             </div>
                        )}
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-secondary" onClick={() => setShowModalPago(false)}>Cancelar</button>
                        <button className="btn btn-success fw-bold" onClick={procesarPedidoFinal}>FINALIZAR COMPRA</button>
                    </div>
                </div>
            </div>
        </div>
        </>
      )}
    </>
  );
}