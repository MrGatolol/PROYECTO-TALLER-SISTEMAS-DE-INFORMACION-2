import { useState, useEffect } from "react";
import NavBar from "../components/NavBar";
type Ajuste = {
  cod_ajuste: number; 
  cod_producto: string;
  tipo: number;
  fecha: string;
  descripcion?: string;
  ajuste_stock: number;
  // Relaciones
  producto?: { 
    nom_producto: string; 
    stock_actual: number; 
  };
  usuario?: { rut_usuario: string; nombres: string; apellido_paterno: string };
};

export default function Ajustes() {
  const [ajustes, setAjustes] = useState<Ajuste[]>([]);
  const [loading, setLoading] = useState(true);
  
  const load = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/ajustes");
      if (!res.ok) throw new Error("Error al cargar ajustes");
      const data = await res.json();
      setAjustes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    load();
  }, []);
  
  const renderTipo = (tipo: number) => {
    // 0: Incremento, 1: Reducción
    // 2: Creación (Inventario Inicial)
    // 3: Baja/Inactivación
    // 4: Eliminación Permanente
    switch (tipo) {
      case 0: return <span className="badge bg-success">Incremento (+)</span>;
      case 1: return <span className="badge bg-danger">Reducción (-)</span>;
      case 2: return <span className="badge bg-primary">Creación (Inicial)</span>;
      case 3: return <span className="badge bg-dark">Inactivado (Baja)</span>;
      case 4: return <span className="badge bg-warning text-dark">Eliminado (Físico)</span>; // Nuevo tipo
      default: return <span className="badge bg-secondary">Otro</span>;
    }
  };
  
  const renderAjusteStock = (a: Ajuste) => {

      if (a.tipo === 2) return <span className="text-success fw-bold">+ {a.ajuste_stock}</span>;
      if (a.tipo === 3 || a.tipo === 4) return <span className="text-dark fw-bold">N/A</span>;
      
      return <span className="fw-bold" style={{ fontSize: '1.1rem' }}>{a.tipo === 1 ? "-" : "+"}{a.ajuste_stock}</span>;
  };
  
  const renderDescripcion = (a: Ajuste) => {
      if (a.tipo === 2) return `Producto agregado por primera vez.`;
      if (a.tipo === 3) return a.descripcion || `Producto Inactivado por integridad referencial.`;
      if (a.tipo === 4) return a.descripcion || `Producto Eliminado Físicamente del sistema.`; // Nuevo
      return a.descripcion || "-";
  };


  return (
    <>
      <NavBar />
      <div className="container mt-4">
        <h3 className="mb-4 text-dark fw-bold border-bottom pb-2">Historial de Movimientos de Stock</h3>
        
        <div className="card shadow-sm border-0">
            <div className="table-responsive">
            <table className="table table-striped table-hover mb-0 align-middle">
                <thead className="table-dark">
                <tr>
                    <th>ID</th>
                    <th>Producto</th>
                    <th>Tipo Movimiento</th>
                    <th>Cantidad Ajustada</th>
                    <th>Stock Final</th> 
                    <th>Responsable</th>
                    <th>Motivo / Descripción</th>
                    <th>Fecha</th>
                </tr>
                </thead>
                <tbody>
                {ajustes.map((a) => (
                    <tr key={a.cod_ajuste}>
                    <td className="fw-bold text-secondary">#{a.cod_ajuste}</td>
                    <td>
                        <div className="d-flex flex-column">
                            {/* Si el tipo es 4, el producto ya no existe, usamos el cod_producto */}
                            <span className="fw-bold">{a.producto?.nom_producto || `Producto [${a.cod_producto}]`}</span>
                            <span className="small text-muted">{a.cod_producto}</span>
                        </div>
                    </td>
                    <td>{renderTipo(a.tipo)}</td>
                    <td>{renderAjusteStock(a)}</td>
                    <td className="text-center">
                        <span className="badge bg-primary bg-opacity-10 text-primary border border-primary">
                            {/* Solo mostramos stock final para ajustes 0 y 1 */}
                            {a.tipo === 0 || a.tipo === 1 ? (a.producto?.stock_actual ?? "N/A") : "N/A"}
                        </span>
                    </td>
                    <td>
                        {a.usuario ? (
                            <div className="small">
                                <div>{a.usuario.nombres} {a.usuario.apellido_paterno}</div>
                                <div className="text-muted" style={{fontSize: '0.75rem'}}>{a.usuario.rut_usuario}</div>
                            </div>
                        ) : (
                            <span className="text-muted fst-italic">Sistema / Desconocido</span>
                        )}
                    </td>
                    <td className="text-secondary small">{renderDescripcion(a)}</td>
                    <td>{new Date(a.fecha).toLocaleString()}</td>
                    </tr>
                ))}
                {!loading && ajustes.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-5 text-muted">No hay movimientos registrados en el historial.</td></tr>
                )}
                </tbody>
            </table>
            </div>
        </div>
      </div>
    </>
  );
}