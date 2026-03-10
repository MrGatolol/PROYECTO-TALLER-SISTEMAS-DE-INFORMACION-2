import { useEffect, useState } from "react";
import NavBar from "../components/NavBar";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// --- TIPOS DE DATOS ---
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
    tipo_cliente: number;
};

type Pedido = {
  cod_pedido: number;
  fecha: string;
  total: number;
  detalles: Detalle[]; 
  rut_cliente: string;
  medio_pago?: string; 
  cliente?: ClienteInfo; 
  rut_usuario?: string;
};

export default function MisPedidos() {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const rutSesion = localStorage.getItem("rut_usuario_sesion");

  useEffect(() => {
    if (!rutSesion) {
        navigate("/login");
        return;
    }
    cargarPedidos();
  }, [rutSesion, navigate]);

  const cargarPedidos = async () => {
    try {
      const res = await fetch(`http://localhost:3000/api/pedidos?rut=${rutSesion}`);
      const data = await res.json();
      
      // Console log para ver qué está llegando realmente desde la base de datos
      console.log("Datos recibidos del Backend:", data);

      if (Array.isArray(data)) {
        const misPedidos = data.filter((p: any) => p.rut_usuario === rutSesion || !p.rut_usuario);
        setPedidos(misPedidos);
      }
    } catch (e) {
      console.error("Error cargando pedidos:", e);
    } finally {
      setLoading(false);
    }
  };


  const descargarBoleta = (p: Pedido) => {

    const detallesSeguros = p.detalles || []; 

    console.log("Generando PDF para pedido:", p.cod_pedido);
    console.log("Detalles encontrados:", detallesSeguros);

    const doc = new jsPDF();
    

    const cli = p.cliente;
    const esEmpresa = cli && (cli.tipo_cliente === 1 || (cli.razon_social && cli.razon_social.length > 1));
    
    const nombreCliente = esEmpresa 
        ? (cli?.razon_social || "Empresa Sin Nombre")
        : (cli ? `${cli.nombres} ${cli.apellido_paterno}` : "Cliente General");

    const direccion = cli?.direccion || "No registrada";
    const giro = cli?.giro || "";
    const medioPago = p.medio_pago ? p.medio_pago.toUpperCase() : "TRANSFERENCIA";

    // 2. Encabezado
    doc.setFontSize(22);
    doc.text("PRODINOX", 14, 20);
    doc.setFontSize(12);
    doc.text("Copia de Boleta (Historial)", 14, 28);

    doc.setFontSize(10);
    doc.text(`Pedido N°: ${p.cod_pedido}`, 14, 40);
    doc.text(`Fecha: ${new Date(p.fecha).toLocaleString()}`, 14, 45);

    // 3. Datos del Cliente
    doc.setFont("helvetica", "bold");
    doc.text("Datos del Cliente:", 14, 55);
    doc.setFont("helvetica", "normal");

    doc.text(`Nombre/Razón: ${nombreCliente}`, 14, 60);
    doc.text(`RUT: ${p.rut_cliente || "S/R"}`, 14, 65);
    
    let currentY = 70;
    if (esEmpresa && giro) {
        doc.text(`Giro: ${giro}`, 14, currentY);
        currentY += 5;
    }
    doc.text(`Dirección: ${direccion}`, 14, currentY);
    currentY += 5;
    doc.text(`Medio de Pago: ${medioPago}`, 14, currentY);


    const rows = detallesSeguros.map(d => [
        d.producto?.nom_producto || "Producto desconocido", 
        d.cantidad || 0,
        `$${(d.precio_unitario || 0).toLocaleString()}`,
        `$${((d.cantidad || 0) * (d.precio_unitario || 0)).toLocaleString()}`
    ]);

 
    if (rows.length === 0) {
        rows.push(["No se encontraron detalles del pedido", 0, "0", "0"]);
    }

    autoTable(doc, {
        startY: currentY + 10,
        head: [['Producto', 'Cant.', 'Precio Neto', 'Total']],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] }
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

    doc.save(`Boleta_Prodinox_${p.cod_pedido}.pdf`);
  };

  return (
    <>
      <NavBar />
      <div className="container mt-4">
        <h2 className="mb-4 fw-bold text-primary">📦 Mis Pedidos</h2>
        <div className="card shadow-sm border-0">
            <div className="card-body p-0">
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                        <thead className="bg-light text-secondary">
                            <tr>
                                <th className="ps-4">N° Pedido</th>
                                <th>Fecha</th>
                                <th>Monto Total</th>
                                <th>Medio Pago</th>
                                <th>Estado</th>
                                <th className="text-end pe-4">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} className="text-center p-4">Cargando historial...</td></tr>
                            ) : pedidos.length === 0 ? (
                                <tr><td colSpan={6} className="text-center p-5 text-muted">Aún no has realizado compras.</td></tr>
                            ) : (
                                pedidos.map(p => (
                                    <tr key={p.cod_pedido}>
                                        <td className="ps-4 fw-bold">#{p.cod_pedido}</td>
                                        <td>{new Date(p.fecha).toLocaleDateString()}</td>
                                        <td className="fw-bold text-success">${(p.total || 0).toLocaleString()}</td>
                                        <td className="small text-muted">{p.medio_pago ? p.medio_pago.toUpperCase() : "TRANSFERENCIA"}</td>
                                        <td><span className="badge bg-success bg-opacity-10 text-success">Completado</span></td>
                                        <td className="text-end pe-4">
                                            <button 
                                                className="btn btn-outline-primary btn-sm"
                                                onClick={() => descargarBoleta(p)}
                                            >
                                                📄 Ver Boleta
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      </div>
    </>
  );
}