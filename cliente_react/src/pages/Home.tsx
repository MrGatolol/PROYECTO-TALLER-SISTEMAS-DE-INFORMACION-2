import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
type Detalle = {
  cantidad: number;
  precio_unitario: number;
  producto: { nom_producto: string };
};

type ClienteInfo = {
    rut_cliente: string;
    nombres: string;
    apellido_paterno: string;
    razon_social?: string;
    giro?: string;
    direccion?: string;
    tipo_cliente: number; // 0: Persona, 1: Empresa
};

type Pedido = {
  cod_pedido: number;
  fecha: string;
  total: number;
  rut_cliente: string;

  cliente?: ClienteInfo;
  usuario?: { nom_usuario: string; nombres: string; apellido_paterno: string };
  detalles?: Detalle[];
  medio_pago?: string; 
};

export default function Home() {
  const navigate = useNavigate();
  // Validamos tipo de usuario para mostrar Dashboard o Bienvenida
  const tipoUsuario = localStorage.getItem("tipo_usuario");
  const isAdmin = tipoUsuario === "1"; 
  
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [stats, setStats] = useState({ totalVentas: 0, cantPedidos: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      cargarDatosDashboard();
    }
  }, [isAdmin]);

  const cargarDatosDashboard = async () => {
    setLoading(true);
    try {

      const res = await fetch("http://localhost:3000/api/pedidos"); 
      if (res.ok) {
        const data = await res.json();
        setPedidos(data);
        
        // Calcular estadísticas
        const totalDinero = data.reduce((acc: number, p: Pedido) => acc + (p.total || 0), 0);
        setStats({ totalVentas: totalDinero, cantPedidos: data.length });
      } else {
        console.error("Error fetching pedidos:", res.statusText);
      }
    } catch (e) {
      console.error("Error cargando dashboard", e);
    } finally {
      setLoading(false);
    }
  };
  const descargarBoleta = (p: Pedido) => {

    const detallesSeguros = p.detalles || []; 

    const doc = new jsPDF();
    const cli = p.cliente;
    const esEmpresa = cli && (cli.tipo_cliente === 1 || (cli.razon_social && cli.razon_social.length > 1));
    
    const nombreCliente = esEmpresa 
        ? (cli?.razon_social || "Empresa Sin Nombre")
        : (cli ? `${cli.nombres} ${cli.apellido_paterno}` : "Cliente General");

    const direccion = cli?.direccion || "No registrada";
    const giro = cli?.giro || "";
    // Ahora leemos el medio de pago real
    const medioPago = p.medio_pago ? p.medio_pago.toUpperCase() : "TRANSFERENCIA";


    doc.setFontSize(22);
    doc.text("PRODINOX", 14, 20);
    doc.setFontSize(12);
    doc.text("Reporte de Venta (Administración)", 14, 28);

    doc.setFontSize(10);
    doc.text(`Pedido N°: ${p.cod_pedido}`, 14, 40);
    doc.text(`Fecha: ${new Date(p.fecha).toLocaleString()}`, 14, 45);


    doc.setFont("helvetica", "bold");
    doc.text("Datos del Cliente:", 14, 55);
    doc.setFont("helvetica", "normal");

    doc.text(`Nombre/Razón: ${nombreCliente}`, 14, 60);
    doc.text(`RUT: ${p.rut_cliente}`, 14, 65);
    
    let currentY = 70;
    if (esEmpresa && giro) {
        doc.text(`Giro: ${giro}`, 14, currentY);
        currentY += 5;
    }
    doc.text(`Dirección: ${direccion}`, 14, currentY);
    currentY += 5;
    doc.text(`Medio de Pago: ${medioPago}`, 14, currentY);


    const rows = detallesSeguros.map(d => [
        d.producto?.nom_producto || "Producto Eliminado/Desconocido",
        d.cantidad || 0,
        `$${(d.precio_unitario || 0).toLocaleString()}`,
        `$${((d.cantidad || 0) * (d.precio_unitario || 0)).toLocaleString()}`
    ]);

    if (rows.length === 0) {
        rows.push(["Detalles no disponibles", 0, "0", "0"]);
    }

    autoTable(doc, {
        startY: currentY + 10,
        head: [['Producto', 'Cant.', 'Precio Neto', 'Total']],
        body: rows,
        theme: 'striped', 
        headStyles: { fillColor: [66, 66, 66] } 
    });

    const total = p.total || 0;
    const neto = Math.round(total / 1.19);
    const iva = total - neto;

    // @ts-ignore
    const finalY = doc.lastAutoTable.finalY + 10;
    
    doc.text(`Neto: $${neto.toLocaleString()}`, 140, finalY);
    doc.text(`IVA (19%): $${iva.toLocaleString()}`, 140, finalY + 5);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL: $${total.toLocaleString()}`, 140, finalY + 12);

    doc.save(`Reporte_Prodinox_${p.cod_pedido}.pdf`);
  };

  return (
    <>
      <NavBar />
      <div className="container mt-4">
        {isAdmin ? (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="fw-bold text-dark m-0">Panel de Administración</h2>
                <button className="btn btn-outline-secondary btn-sm" onClick={cargarDatosDashboard}>🔄 Actualizar Datos</button>
            </div>
            
            <div className="row mb-4">
                <div className="col-md-6">
                    <div className="card text-white bg-primary shadow-sm h-100">
                        <div className="card-body">
                            <h5 className="card-title">Ventas Totales Históricas</h5>
                            <p className="card-text display-6 fw-bold">
                                ${stats.totalVentas.toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="card text-white bg-success shadow-sm h-100">
                        <div className="card-body">
                            <h5 className="card-title">Pedidos Realizados</h5>
                            <p className="card-text display-6 fw-bold">
                                {stats.cantPedidos}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <h4 className="mb-3">Historial de Ventas General</h4>
            <div className="card shadow-sm border-0">
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                        <thead className="table-dark">
                            <tr>
                                <th>ID</th>
                                <th>Fecha</th>
                                <th>Cliente</th>
                                <th>Medio Pago</th>
                                <th>Monto Total</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && <tr><td colSpan={6} className="text-center p-3">Cargando datos...</td></tr>}
                            
                            {!loading && pedidos.map(p => {
                                // Lógica de visualización de nombre
                                const esEmpresa = p.cliente?.razon_social && p.cliente.razon_social.length > 1;
                                const nombreMostrar = esEmpresa 
                                    ? p.cliente?.razon_social 
                                    : (p.cliente ? `${p.cliente.nombres} ${p.cliente.apellido_paterno}` : "Cliente General");

                                return (
                                    <tr key={p.cod_pedido}>
                                        <td className="fw-bold">#{p.cod_pedido}</td>
                                        <td>{new Date(p.fecha).toLocaleDateString()} <small className="text-muted">{new Date(p.fecha).toLocaleTimeString()}</small></td>
                                        <td>
                                            <span className="fw-bold">{nombreMostrar}</span>
                                            <br/>
                                            <small className="text-muted">RUT: {p.rut_cliente}</small>
                                        </td>
                                        <td>
                                            <span className="badge bg-secondary text-light">
                                                {p.medio_pago ? p.medio_pago.toUpperCase() : "TRANSFERENCIA"}
                                            </span>
                                        </td>
                                        <td className="text-success fw-bold">${p.total.toLocaleString()}</td>
                                        <td>
                                            <button 
                                                className="btn btn-sm btn-outline-danger"
                                                onClick={() => descargarBoleta(p)}
                                            >
                                                📄 Reporte PDF
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {!loading && pedidos.length === 0 && <tr><td colSpan={6} className="text-center p-4">No hay ventas registradas aún.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-5">
            <h1 className="display-4 fw-bold text-primary mb-3">¡Bienvenido a PRODINOX!</h1>
            <p className="lead text-muted mb-5">
                Líderes en insumos de acero inoxidable y soluciones industriales.
            </p>
            
            <div className="d-flex justify-content-center gap-3">
                <button 
                    className="btn btn-primary btn-lg px-5 fw-bold shadow"
                    onClick={() => navigate("/tienda")}
                >
                    🛍️ Ir a la Tienda
                </button>
                {localStorage.getItem("token") && (
                    <button 
                        className="btn btn-outline-danger btn-lg px-4"
                        onClick={() => {
                            localStorage.clear();
                            navigate("/");
                            window.location.reload(); 
                        }}
                    >
                        Cerrar Sesión
                    </button>
                )}
            </div>

            <div className="row mt-5 pt-4">
                <div className="col-md-4"><div className="p-3"><div className="fs-1 mb-2">🚚</div><h5>Despacho Rápido</h5><p className="text-muted small">Envíos a todas las regiones.</p></div></div>
                <div className="col-md-4"><div className="p-3"><div className="fs-1 mb-2">💳</div><h5>Pago Seguro</h5><p className="text-muted small">Transferencias y pago en línea fácil.</p></div></div>
                <div className="col-md-4"><div className="p-3"><div className="fs-1 mb-2">⭐</div><h5>Calidad Garantizada</h5><p className="text-muted small">Acero certificado de alta durabilidad.</p></div></div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}