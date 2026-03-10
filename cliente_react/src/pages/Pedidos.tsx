import { useState, useEffect } from "react";
import NavBar from "../components/NavBar";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Producto = { 
  cod_producto: string; 
  nom_producto: string; 
  precio_producto: number; 
  stock_actual: number; 
};

// Actualizado para soportar Empresas
type Cliente = { 
  rut_cliente: string; 
  nombres: string;
  apellido_paterno: string; 
  direccion: string;
  email: string;
  fono: string;
  razon_social?: string;
  giro?: string;
  tipo_cliente: number; // 0: Persona, 1: Empresa
};

type ItemPedido = { 
  cod_producto: string; 
  nombre: string; 
  cantidad: number; 
  precio: number; 
  subtotal: number; 
};

export default function Pedidos() {
  const navigate = useNavigate();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [rutCliente, setRutCliente] = useState("");
  const [carrito, setCarrito] = useState<ItemPedido[]>([]);
  const [prodSelect, setProdSelect] = useState("");
  const [cant, setCant] = useState(1);
  
  // --- NUEVO ESTADO: Medio de Pago para el Admin ---
  const [medioPagoAdmin, setMedioPagoAdmin] = useState("TRANSFERENCIA");

  useEffect(() => {
    const isAdmin = localStorage.getItem("tipo_usuario") === "1";
    if (!isAdmin) {
      navigate("/home");
      return;
    }
    cargarListados();
  }, [navigate]);

  const cargarListados = async () => {
    try {
      const [resProd, resCli] = await Promise.all([
        fetch("http://localhost:3000/api/productos"),
        fetch("http://localhost:3000/api/clientes")
      ]);
      const dataProd = await resProd.json();
      const dataCli = await resCli.json();
      if (Array.isArray(dataProd)) setProductos(dataProd);
      if (Array.isArray(dataCli)) setClientes(dataCli);
    } catch (e) { 
      console.error("Error cargando listas:", e); 
      alert("Hubo un error al cargar los datos del servidor.");
    }
  };

  const agregarAlCarrito = () => {
    if (!prodSelect) return alert("Seleccione un producto de la lista.");
    if (cant <= 0) return alert("La cantidad debe ser mayor a 0.");
    const p = productos.find(x => x.cod_producto === prodSelect);
    if (!p) return;

    const indexExistente = carrito.findIndex(item => item.cod_producto === p.cod_producto);
    const cantidadEnCarrito = indexExistente >= 0 ? carrito[indexExistente].cantidad : 0;

    if (cantidadEnCarrito + cant > p.stock_actual) {
      return alert(`Stock insuficiente. Tienes ${cantidadEnCarrito} en el carrito y quieres agregar ${cant}, pero solo hay ${p.stock_actual} en total.`);
    }

    if (indexExistente >= 0) {
      const nuevoCarrito = [...carrito];
      nuevoCarrito[indexExistente].cantidad += cant;
      nuevoCarrito[indexExistente].subtotal = nuevoCarrito[indexExistente].cantidad * p.precio_producto;
      setCarrito(nuevoCarrito);
    } else {
      const nuevoItem: ItemPedido = {
        cod_producto: p.cod_producto,
        nombre: p.nom_producto,
        cantidad: cant,
        precio: p.precio_producto,
        subtotal: p.precio_producto * cant
      };
      setCarrito([...carrito, nuevoItem]);
    }
    
    setProdSelect("");
    setCant(1);
  };

  const generarBoleta = (codPedido: number, cliente: Cliente, medioPago: string) => {
    const doc = new jsPDF();
    const isEmpresa = cliente.tipo_cliente === 1 || !!cliente.razon_social;
    const nombreCliente = isEmpresa 
        ? cliente.razon_social 
        : `${cliente.nombres} ${cliente.apellido_paterno}`;

    doc.setFontSize(20);
    doc.text("PRODINOX - Comprobante de Venta", 14, 22);
    
    doc.setFontSize(10);
    doc.text(`N° Pedido: ${codPedido}`, 14, 30);
    doc.text(`Fecha: ${new Date().toLocaleString()}`, 14, 35);
    
    doc.text("Datos del Cliente:", 14, 45);
    doc.setFont("helvetica", "bold");
    
    let currentY = 50;

    if (isEmpresa) {
        doc.text(`Razón Social: ${nombreCliente}`, 14, currentY);
        doc.setFont("helvetica", "normal");
        doc.text(`RUT: ${cliente.rut_cliente}`, 14, currentY + 5);
        doc.text(`Giro: ${cliente.giro || "No especificado"}`, 14, currentY + 10);
        doc.text(`Dirección: ${cliente.direccion || "Retiro en tienda"}`, 14, currentY + 15);
        currentY += 20;
    } else {
        doc.text(`Cliente: ${nombreCliente}`, 14, currentY);
        doc.setFont("helvetica", "normal");
        doc.text(`RUT: ${cliente.rut_cliente}`, 14, currentY + 5);
        doc.text(`Dirección: ${cliente.direccion || "Retiro en tienda"}`, 14, currentY + 10);
        currentY += 15;
    }

    // --- MUESTRA EL MEDIO DE PAGO SELECCIONADO ---
    doc.setFont("helvetica", "bold");
    doc.text(`Medio de Pago: ${medioPago.toUpperCase()}`, 14, currentY + 5);
    doc.setFont("helvetica", "normal");
    // ---------------------------------------------
    
    const tableRows = carrito.map(item => [
        item.nombre,
        item.cantidad,
        `$${Math.round(item.precio / 1.19).toLocaleString()}`, // Neto visual
        `$${item.subtotal.toLocaleString()}`
    ]);

    autoTable(doc, {
        startY: currentY + 15, // Ajuste la posición de inicio
        head: [['Producto', 'Cant.', 'Precio Neto', 'Subtotal']],
        body: tableRows,
    });

    const total = carrito.reduce((acc, el) => acc + el.subtotal, 0);
    const neto = Math.round(total / 1.19);
    const iva = total - neto;

    // @ts-ignore
    const finalY = doc.lastAutoTable.finalY + 10;
    
    doc.text(`Neto: $${neto.toLocaleString()}`, 140, finalY);
    doc.text(`IVA (19%): $${iva.toLocaleString()}`, 140, finalY + 5);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL: $${total.toLocaleString()}`, 140, finalY + 12);

    doc.save(`boleta_admin_${codPedido}.pdf`);
  };

  const confirmarPedido = async () => {
    if (!rutCliente) return alert("Falta seleccionar el cliente.");
    if (carrito.length === 0) return alert("El carrito está vacío.");
    if (!medioPagoAdmin) return alert("Falta seleccionar el medio de pago.");
    
    const rutUsuario = localStorage.getItem("rut_usuario_sesion");
    if (!rutUsuario) {
        alert("Error crítico: No se detectó el usuario vendedor.");
        return;
    }

    const payload = {
      rut_usuario: rutUsuario, 
      rut_cliente: rutCliente,
      medio_pago: medioPagoAdmin, 
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
      
      if (!res.ok) {
        const err = await res.json();
        alert(err.message || "Error al procesar la venta.");
      } else {
        const dataRes = await res.json();
        
        const clienteObj = clientes.find(c => c.rut_cliente === rutCliente);
        
        if (clienteObj) {
            // Pasamos el medio de pago al generador de PDF
            generarBoleta(dataRes.cod_pedido, clienteObj, medioPagoAdmin); 
            alert("✅ Venta registrada y boleta generada.");
        } else {
            alert("✅ Venta registrada (No se pudo generar boleta: cliente no hallado en memoria).");
        }

        setCarrito([]);
        setRutCliente("");
        setMedioPagoAdmin("TRANSFERENCIA"); // Reiniciar
        cargarListados(); 
      }
    } catch (e) {
      console.error(e);
      alert("Error de conexión con el servidor.");
    }
  };
  
  const totalPedido = carrito.reduce((acc, el) => acc + el.subtotal, 0);

  return (
    <>
      <NavBar />
      <div className="container mt-4">
        <h2 className="fw-bold mb-4">Generar Nueva Venta (Admin)</h2>
        <div className="row">
          {/* Columna Izquierda */}
          <div className="col-md-5">
            <div className="card shadow-sm p-3 mb-3">
              <h5 className="mb-3 text-primary">1. Datos del Cliente</h5>
              <select 
                className="form-select mb-3" 
                value={rutCliente} 
                onChange={e => setRutCliente(e.target.value)}>
                <option value="">-- Seleccione Cliente --</option>
                {clientes.map(c => {
                   // Lógica de visualización en selector
                   const isEmpresa = c.tipo_cliente === 1 || !!c.razon_social;
                   const label = isEmpresa 
                      ? `${c.razon_social} (Empresa)` 
                      : `${c.nombres} ${c.apellido_paterno}`;
                   
                   return (
                      <option key={c.rut_cliente} value={c.rut_cliente}>
                        {label} - {c.rut_cliente}
                      </option>
                   );
                })}
              </select>
              <div className="d-grid">
                <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate("/clientes")}>
                  + Crear Nuevo Cliente
                </button>
              </div>
            </div>
            
            {/* --- NUEVO BLOQUE: MEDIO DE PAGO --- */}
            <div className="card shadow-sm p-3 mb-3">
                <h5 className="mb-3 text-primary">2. Medio de Pago</h5>
                <select
                    className="form-select"
                    value={medioPagoAdmin}
                    onChange={e => setMedioPagoAdmin(e.target.value)}
                >
                    <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                    <option value="DEBITO">Débito</option>
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="CREDITO">Crédito</option>
                </select>
                <div className="form-text">Este dato aparecerá en la boleta.</div>
            </div>
            {/* ---------------------------------- */}

            <div className="card shadow-sm p-3">
              <h5 className="mb-3 text-primary">3. Agregar Productos</h5>
              <div className="mb-2">
                <label className="form-label small">Producto</label>
                <select 
                  className="form-select" 
                  value={prodSelect} 
                  onChange={e => setProdSelect(e.target.value)}>
                  <option value="">-- Seleccione --</option>
                  {productos.map(p => (
                    <option 
                      key={p.cod_producto} 
                      value={p.cod_producto} 
                      disabled={p.stock_actual === 0}>
                      {p.nom_producto} - ${p.precio_producto.toLocaleString()} (Stock: {p.stock_actual})
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label small">Cantidad</label>
                <input 
                  type="number" 
                  className="form-control" 
                  min="1" 
                  value={cant} 
                  onChange={e => setCant(Number(e.target.value))} />
              </div>
              <button className="btn btn-primary w-100" onClick={agregarAlCarrito}>
                Agregar Producto
              </button>
            </div>
          </div>
          
          <div className="col-md-7">
            <div className="card shadow-sm h-100">
              <div className="card-header bg-dark text-white">
                <h5 className="mb-0">Resumen del Pedido</h5>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table table-striped align-middle">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Cant</th>
                        <th>Precio c/IVA</th>
                        <th>Subtotal</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {carrito.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.nombre}</td>
                          <td>{item.cantidad}</td>
                          <td>${item.precio.toLocaleString()}</td>
                          <td>${item.subtotal.toLocaleString()}</td>
                          <td>
                            <button 
                              className="btn btn-sm btn-danger py-0" 
                              onClick={() => {
                                const newCarrito = [...carrito];
                                newCarrito.splice(idx, 1);
                                setCarrito(newCarrito);
                              }}>
                              x
                            </button>
                          </td>
                        </tr>
                      ))}
                      {carrito.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center text-muted py-4">
                            El carrito está vacío. Agregue productos.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="card-footer bg-white">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span className="h5 text-muted">Total Neto:</span>
                  <span className="h4 fw-bold text-success">${totalPedido.toLocaleString()}</span>
                </div>
                <button 
                  className="btn btn-success w-100 py-2 fw-bold" 
                  disabled={carrito.length === 0 || !rutCliente || !medioPagoAdmin}
                  onClick={confirmarPedido}>
                  CONFIRMAR VENTA
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}