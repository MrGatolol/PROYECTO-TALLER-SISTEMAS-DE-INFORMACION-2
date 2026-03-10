import React, { useState, useEffect } from "react";
import NavBar from "../components/NavBar";
import { useNavigate } from "react-router-dom";
type Producto = {
  cod_producto: string;
  nom_producto: string;
  precio_producto: number;
  stock_actual: number;
  stock_critico?: number;
  descripcion?: string; 
  estado?: number; // 0: Inactivo (eliminado), 1: Activo
};

export default function Mantenedor() {
  const navigate = useNavigate();


  const [productos, setProductos] = useState<Producto[]>([]);
  const [productosFiltrados, setProductosFiltrados] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(false);
  const [cod, setCod] = useState("");
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState<number | "">("");
  const [stock, setStock] = useState<number | "">("");
  const [stockCritico, setStockCritico] = useState<number | "">(10);
  const [descripcion, setDescripcion] = useState(""); 
  const [filtroNombre, setFiltroNombre] = useState("");
  const [filtroCod, setFiltroCod] = useState("");
  const [productoEditar, setProductoEditar] = useState<Producto | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editPrecio, setEditPrecio] = useState<number>(0);
  const [editStock, setEditStock] = useState<number>(0);
  const [editStockCritico, setEditStockCritico] = useState<number>(10);
  const [editDescripcion, setEditDescripcion] = useState(""); 

  // --- CARGA INICIAL ---
  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:3000/api/productos"); 
      if (!res.ok) throw new Error("Error al cargar productos");
      const data = await res.json();
      const lista = Array.isArray(data) ? data : [];
      
      setProductos(lista); 
      setProductosFiltrados(lista);
    } catch (e) {
      console.error(e);
      setProductos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // --- LÓGICA DE FILTRADO ---
  useEffect(() => {
    let filtrados = productos || [];
    if (filtroCod) {
      filtrados = filtrados.filter((p) =>
        p.cod_producto.toLowerCase().includes(filtroCod.toLowerCase())
      );
    }
    if (filtroNombre) {
      filtrados = filtrados.filter((p) =>
        p.nom_producto.toLowerCase().includes(filtroNombre.toLowerCase())
      );
    }
    setProductosFiltrados(filtrados);
  }, [filtroCod, filtroNombre, productos]);


  const generarCodigoAuto = () => {
    const random = Math.floor(10 + Math.random() * 90); 
    const time = Date.now().toString().slice(-4); 
    setCod(`PROD-${time}${random}`);
  };


  const addProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cod || !nombre || !precio || !stock) return alert("Complete todos los campos obligatorios");

    const rutSesion = localStorage.getItem("rut_usuario_sesion");

    try {
      const payload = {
        cod_producto: cod,
        nom_producto: nombre,
        precio_producto: Number(precio),
        stock_actual: Number(stock),
        stock_critico: Number(stockCritico),
        descripcion: descripcion, 
        estado: 1, 
        rut_usuario: rutSesion 
      };

      const res = await fetch("http://localhost:3000/api/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.message || "Error al crear");
        return;
      }

      // Limpiar formulario
      setCod("");
      setNombre("");
      setPrecio("");
      setStock("");
      setStockCritico(10);
      setDescripcion(""); 
      
      await load();
      alert("✅ Producto creado exitosamente");
    } catch (e) {
      alert("Error de conexión");
    }
  };


  const deleteProducto = async (cod: string) => {

    const confirmacion = window.confirm(`¿Estás seguro de eliminar (o inactivar) el producto ${cod}? Esta acción es permanente si no tiene ventas.`);
    if (!confirmacion) return;
    

    const rutSesion = localStorage.getItem("rut_usuario_sesion");
    
    try {

      const res = await fetch(`http://localhost:3000/api/productos/${cod}?rut=${rutSesion}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json(); 
        
        if (res.status === 409) {
             alert(`⚠️ ADVERTENCIA: ${errorData.message}`);
        } else if (errorData.error) {
             alert(`❌ Error al procesar: ${errorData.error}`);
        } else {
             alert(`❌ Error al procesar: El servidor respondió con un error.`);
        }
        
      } else {
         const successData = await res.json();
         alert(`✅ ${successData.message}`);
      }
      
      await load(); 
      
    } catch (e) {
      console.error(e); 
      alert("Error de conexión al intentar eliminar");
    }
  };


  const abrirModalEditar = (p: Producto) => {
    setProductoEditar(p);
    setEditNombre(p.nom_producto);
    setEditPrecio(p.precio_producto);
    setEditStock(p.stock_actual);
    setEditStockCritico(p.stock_critico ?? 10); 
    setEditDescripcion(p.descripcion ?? ""); 
  };

  const guardarEdicion = async () => {
    if (!productoEditar) return;
    const rutSesion = localStorage.getItem("rut_usuario_sesion");

    try {
      const payload = {
        nom_producto: editNombre,
        precio_producto: editPrecio,
        stock_actual: editStock,
        stock_critico: editStockCritico,
        descripcion: editDescripcion, 
        rut_usuario: rutSesion, 
      };

      const res = await fetch(
        `http://localhost:3000/api/productos/${productoEditar.cod_producto}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (res.ok) {
        // Actualizamos la lista localmente
        setProductos((prevProductos) => 
          prevProductos.map((p) => {
            if (p.cod_producto === productoEditar.cod_producto) {
              return {
                ...p, 
                nom_producto: editNombre,
                precio_producto: editPrecio,
                stock_actual: editStock,
                stock_critico: editStockCritico,
                descripcion: editDescripcion
              };
            }
            return p;
          })
        );

        setProductoEditar(null); 
        alert("✅ Producto actualizado correctamente");
      } else {
        const errorData = await res.json();
        alert(`Error al actualizar producto: ${errorData.message || 'Error desconocido'}`);
      }
    } catch (e) {
      alert("Error de conexión");
    }
  };
  const productosActivos = productos.filter(p => p.estado === 1 || p.estado === undefined).length;
  const productosCriticos = productos.filter(
    (p) => (p.estado === 1 || p.estado === undefined) && p.stock_actual <= (p.stock_critico || 10)
  ).length;
  const valorInventario = productos.reduce(
    (acc, p) => acc + p.precio_producto * p.stock_actual,
    0
  );
  return (
    <div className="bg-light min-vh-100">
      <NavBar />

      <div className="container py-4">
        {/* ENCABEZADO Y ESTADÍSTICAS */}
        <div className="row mb-4 align-items-center">
          <div className="col-md-6">
            <h2 className="fw-bold text-dark mb-0">📦 Gestión de Inventario</h2>
            <p className="text-muted small">Administra tus productos, precios y stock crítico.</p>
          </div>
          <div className="col-md-6">
            <div className="row g-2">
              <div className="col-4">
                <div className="card border-0 shadow-sm text-center py-2 bg-primary text-white">
                  <small className="d-block opacity-75">Productos Activos</small>
                  <h4 className="fw-bold mb-0">{productosActivos}</h4>
                </div>
              </div>
              <div className="col-4">
                <div className="card border-0 shadow-sm text-center py-2 bg-danger text-white">
                  <small className="d-block opacity-75">Productos Críticos</small>
                  <h4 className="fw-bold mb-0">{productosCriticos}</h4>
                </div>
              </div>
              <div className="col-4">
                <div className="card border-0 shadow-sm text-center py-2 bg-success text-white">
                  <small className="d-block opacity-75">Valor Total Inventario</small>
                  <h4 className="fw-bold mb-0" style={{ fontSize: "1rem" }}>
                    ${valorInventario.toLocaleString("es-CL", { notation: "compact" })}
                  </h4>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FORMULARIO DE CREACIÓN (CARD PRINCIPAL) */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white py-3 border-bottom-0">
            <h5 className="mb-0 fw-bold text-primary">
              <i className="bi bi-plus-circle me-2"></i>Agregar Nuevo Producto
            </h5>
          </div>
          <div className="card-body bg-light bg-opacity-50">
            <form onSubmit={addProducto} className="row g-3 align-items-end">
              <div className="col-md-2">
                <label className="form-label fw-bold small">Código</label>
                <div className="input-group">
                  <span className="input-group-text bg-white"><i className="bi bi-upc-scan"></i></span>
                  <input
                    className="form-control"
                    value={cod}
                    onChange={(e) => setCod(e.target.value)}
                    required
                    placeholder="Ej: P001"
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={generarCodigoAuto}
                    title="Generar código automático"
                  >
                    ⚡
                  </button>
                </div>
              </div>
              <div className="col-md-4">
                <label className="form-label fw-bold small">Nombre del Producto</label>
                <input
                  className="form-control"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                />
              </div>
              <div className="col-md-2">
                <label className="form-label fw-bold small">Precio</label>
                <div className="input-group">
                  <span className="input-group-text">$</span>
                  <input
                    type="number"
                    min={1}
                    className="form-control"
                    value={precio}
                    onChange={(e) => setPrecio(Number(e.target.value))}
                    required
                  />
                </div>
              </div>
              <div className="col-md-2">
                <label className="form-label fw-bold small">Stock Inicial</label>
                <input
                  type="number"
                  min={0}
                  className="form-control"
                  value={stock}
                  onChange={(e) => setStock(Number(e.target.value))}
                  required
                />
              </div>
              <div className="col-md-2">
                <label className="form-label fw-bold small text-danger">Stock Crítico</label>
                <input
                  type="number"
                  min={1}
                  className="form-control border-danger"
                  value={stockCritico}
                  onChange={(e) => setStockCritico(Number(e.target.value))}
                  required
                  title="Alerta cuando el stock baje de este número"
                />
              </div>
              {/* Nuevo campo de Descripción */}
              <div className="col-12">
                <label className="form-label fw-bold small">Descripción del Producto (Opcional, afecta la visualización en la Tienda)</label>
                <textarea
                  className="form-control"
                  value={descripcion}
                  rows={2}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Detalles sobre el material, dimensiones o uso..."
                />
              </div>
              {/* Fin Nuevo campo de Descripción */}

              <div className="col-12 text-end mt-3">
                <button className="btn btn-success fw-bold px-4 shadow-sm">
                  <i className="bi bi-save me-2"></i>Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* FILTROS Y TABLA */}
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <h5 className="mb-0 fw-bold">Listado de Productos</h5>
            <div>
              <button 
                className="btn btn-outline-primary btn-sm me-2" 
                onClick={() => navigate("/administrar/historial-ajustes")}
              >
                📜 Ver Historial
              </button>
              <span className="badge bg-secondary">{productosFiltrados.length} resultados</span>
            </div>
          </div>
          
          {/* BARRA DE FILTROS*/}
          <div className="card-body border-bottom bg-light">
            <div className="row g-2">
               <div className="col-md-4">
                 <input 
                    type="text" 
                    className="form-control form-control-sm" 
                    placeholder="🔍 Buscar por Nombre..."
                    value={filtroNombre}
                    onChange={(e) => setFiltroNombre(e.target.value)}
                 />
               </div>
               <div className="col-md-3">
                 <input 
                    type="text" 
                    className="form-control form-control-sm" 
                    placeholder="🔢 Buscar por Código..."
                    value={filtroCod}
                    onChange={(e) => setFiltroCod(e.target.value)}
                 />
               </div>
            </div>
          </div>

          <div className="card-body p-0">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Cargando...</span>
                </div>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover table-striped mb-0 align-middle">
                  <thead className="table-dark">
                    <tr>
                      <th className="ps-3">Código</th>
                      <th>Nombre</th>
                      <th>Precio</th>
                      <th className="text-center">Stock</th>
                      <th className="text-center">Crítico</th>
                      <th className="text-center">Estado</th>
                      <th className="text-end pe-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-4 text-muted">
                          No se encontraron productos
                        </td>
                      </tr>
                    ) : (
                      productosFiltrados.map((p) => {
                        const isCritico = p.stock_actual <= (p.stock_critico || 10);
                        const isActivo = p.estado === 1 || p.estado === undefined;
                        return (
                          <tr key={p.cod_producto} className={!isActivo ? 'table-secondary opacity-75' : ''}>
                            <td className="ps-3 fw-bold font-monospace text-primary">
                              {p.cod_producto}
                            </td>
                            <td>{p.nom_producto}</td>
                            <td className="fw-bold text-success">
                              ${p.precio_producto.toLocaleString("es-CL")}
                            </td>
                            <td className="text-center">
                              <span className="fw-bold">{p.stock_actual}</span>
                            </td>
                            <td className="text-center text-muted">
                              {p.stock_critico ?? 10}
                            </td>
                            <td className="text-center">
                              {isActivo ? (
                                isCritico ? (
                                    <span className="badge bg-danger bg-opacity-10 text-danger border border-danger">
                                      Stock Bajo
                                    </span>
                                ) : (
                                    <span className="badge bg-success bg-opacity-10 text-success border border-success">
                                      Normal
                                    </span>
                                )
                              ) : (
                                <span className="badge bg-dark bg-opacity-10 text-dark border border-dark">
                                  Inactivo
                                </span>
                              )}
                            </td>
                            <td className="text-end pe-3">
                              <div className="btn-group">
                                <button
                                  className="btn btn-sm btn-outline-warning"
                                  onClick={() => abrirModalEditar(p)}
                                  title="Editar"
                                >
                                  ✏️
                                </button>
                                {isActivo ? (
                                    <button
                                      className="btn btn-sm btn-outline-danger"
                                      onClick={() => deleteProducto(p.cod_producto)}
                                      title="Eliminar / Inactivar"
                                    >
                                      🗑️
                                    </button>
                                ) : (
                                    <button
                                      className="btn btn-sm btn-outline-success"
                                      onClick={() => alert('Función: Reactivar producto')}
                                      title="Reactivar (Funcionalidad pendiente)"
                                      disabled // Deshabilitado porque la reactivación no fue solicitada.
                                    >
                                      ⬆️
                                    </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/*MODAL EDITAR*/}
      {productoEditar && (
        <>
          <div className="modal-backdrop show fade"></div>
          <div className="modal show d-block fade" tabIndex={-1} role="dialog">
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content shadow-lg">
                <div className="modal-header bg-warning text-dark">
                  <h5 className="modal-title fw-bold">
                    ✏️ Editar: {productoEditar.nom_producto}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setProductoEditar(null)}
                  ></button>
                </div>
                <div className="modal-body p-4">
                  <form>
                    <div className="mb-3">
                      <label className="form-label fw-bold small">Nombre</label>
                      <input
                        className="form-control"
                        value={editNombre}
                        onChange={(e) => setEditNombre(e.target.value)}
                      />
                    </div>
                    {/* Nuevo campo de Descripción en el modal */}
                    <div className="mb-3">
                      <label className="form-label fw-bold small">Descripción (Afecta a la Tienda)</label>
                      <textarea
                        className="form-control"
                        value={editDescripcion}
                        rows={3}
                        onChange={(e) => setEditDescripcion(e.target.value)}
                      />
                      <div className="form-text small text-muted">
                        * No se soporta la edición de la imagen, ya que la imagen es inferida del nombre del producto.
                      </div>
                    </div>
                    {/* Fin Nuevo campo de Descripción */}
                    
                    <div className="row">
                      <div className="col-4 mb-3">
                        <label className="form-label fw-bold small">Precio</label>
                        <div className="input-group input-group-sm">
                          <span className="input-group-text">$</span>
                          <input
                            type="number"
                            className="form-control"
                            value={editPrecio}
                            onChange={(e) => setEditPrecio(Number(e.target.value))}
                          />
                        </div>
                      </div>
                      <div className="col-4 mb-3">
                        <label className="form-label fw-bold small">Stock</label>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          value={editStock}
                          onChange={(e) => setEditStock(Number(e.target.value))}
                        />
                      </div>
                      <div className="col-4 mb-3">
                        <label className="form-label fw-bold small text-danger">Crítico</label>
                        <input
                          type="number"
                          className="form-control form-control-sm border-danger"
                          value={editStockCritico}
                          onChange={(e) => setEditStockCritico(Number(e.target.value))}
                        />
                      </div>
                    </div>
                    <div className="alert alert-info py-2 small mb-0">
                      <i className="bi bi-info-circle me-1"></i>
                      Editando ID: <strong>{productoEditar.cod_producto}</strong> (Clave primaria no editable)
                    </div>
                  </form>
                </div>
                <div className="modal-footer bg-light">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setProductoEditar(null)}
                  >
                    Cancelar
                  </button>
                  <button className="btn btn-warning fw-bold" onClick={guardarEdicion}>
                    Guardar Cambios
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}