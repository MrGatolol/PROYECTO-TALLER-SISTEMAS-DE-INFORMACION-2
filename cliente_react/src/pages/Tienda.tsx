import { useEffect, useState } from "react";
import NavBar from "../components/NavBar";
import { useNavigate } from "react-router-dom";
type Producto = {
  cod_producto: string;
  nom_producto: string;
  precio_producto: number;
  stock_actual: number;
  descripcion?: string; 
  estado?: number; 
};
type ItemCarrito = {
  cod_producto: string;
  nombre: string;
  precio: number;
  cantidad: number;
  subtotal: number;
};
// --- LÓGICA DE IMÁGENES ---
const imagenesProductos: Record<string, string> = {
  "plancha": "plancha_inox.jpg",
  "tubo": "tubo_inox.jpg",
  "perfil cuadrado": "perfilcuadrado_inox.jpg",
  "perfil angular": "perfilAngular_inox.jpg",
  "codo": "codo90_inox.jpg",
  "tapa": "tapa_inox.jpg",
  "lamina": "lamina_inox.jpg",
  "lámina": "lamina_inox.jpg",
  "barra": "barraRedonda_inox.jpg",
  "malla": "malla_inox.jpg",
  "valvula": "valvula_inox.jpg",
  "válvula": "valvula_inox.jpg"
};
const IMG_DEFAULT = "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22300%22%20height%3D%22300%22%20viewBox%3D%220%200%20300%20300%22%3E%3Crect%20width%3D%22300%22%20height%3D%22300%22%20fill%3D%22%23e9ecef%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20font-size%3D%2280%22%3E%F0%9F%93%A6%3C%2Ftext%3E%3C%2Fsvg%3E";

const getImagen = (nombre: string) => {
  if (!nombre) return IMG_DEFAULT;
  const nombreLower = nombre.toLowerCase();
  const key = Object.keys(imagenesProductos).find(k => nombreLower.includes(k));

  if (key) {
    return `/productos/${imagenesProductos[key]}`;
  }
  return IMG_DEFAULT;
};

export default function Tienda() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [productosActivos, setProductosActivos] = useState<Producto[]>([]); // Nueva lista para filtrar
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [mostrarCarrito, setMostrarCarrito] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const navigate = useNavigate();
  const isAdmin = localStorage.getItem("tipo_usuario") === "1";
  

  useEffect(() => {


    fetch("http://localhost:3000/api/productos")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
            // Filtro de seguridad en el frontend (solo por si el backend se pasa)
            const activos = data.filter((p: Producto) => p.estado === 1 || p.estado === undefined);
            setProductos(data); 
            setProductosActivos(activos);
        }
      })
      .catch((e) => console.error("Error productos:", e));
      
    const guardado = JSON.parse(localStorage.getItem("carrito_cliente") || "[]");
    setCarrito(guardado);
  }, []);
  
  useEffect(() => {
    localStorage.setItem("carrito_cliente", JSON.stringify(carrito));
  }, [carrito]);
  
  const modificarCantidad = (cod: string, delta: number) => {
    setCarrito((prev) => {
      return prev.map((item) => {
        if (item.cod_producto === cod) {
          const prodOriginal = productosActivos.find(p => p.cod_producto === cod); 
          const maxStock = prodOriginal ? prodOriginal.stock_actual : 0; 
          
          const nuevaCant = item.cantidad + delta;
          if (nuevaCant < 1) return item; 
          
          if (maxStock === 0) {
              alert(`Este producto está agotado o inactivo.`);
              return item;
          }
          if (nuevaCant > maxStock) {
            alert(`Stock insuficiente. Solo quedan ${maxStock} unidades.`);
            return item;
          }
          return { ...item, cantidad: nuevaCant, subtotal: nuevaCant * item.precio };
        }
        return item;
      });
    });
  };
  
  const agregarAlCarrito = (p: Producto) => {
    if (p.estado === 0) {
        alert("Este producto ha sido retirado del catálogo y no se puede comprar.");
        return;
    }
    
    setCarrito((prev) => {
      const existe = prev.find((item) => item.cod_producto === p.cod_producto);
      
      if (existe) {
        if (existe.cantidad + 1 > p.stock_actual) {
          alert("¡No queda más stock disponible!");
          return prev;
        }
        return prev.map((item) =>
          item.cod_producto === p.cod_producto
            ? { ...item, cantidad: item.cantidad + 1, subtotal: (item.cantidad + 1) * item.precio }
            : item
        );
      } else {
        return [
          ...prev,
          {
            cod_producto: p.cod_producto,
            nombre: p.nom_producto,
            precio: p.precio_producto,
            cantidad: 1,
            subtotal: p.precio_producto,
          },
        ];
      }
    });

    window.dispatchEvent(new Event("cart-change"));
    setMostrarCarrito(true);
  };
  
  const quitarDelCarrito = (cod: string) => {
    setCarrito((prev) => prev.filter((item) => item.cod_producto !== cod));

    window.dispatchEvent(new Event("cart-change"));
  };
  
  const totalCarrito = carrito.reduce((acc, item) => acc + item.subtotal, 0);
  
  return (
    <>
      <NavBar />
      <div className="container mt-4 position-relative mb-5">
        <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-2">
          <div>
            <h2 className="fw-bold text-dark m-0">Catálogo de Productos</h2>
            <small className="text-muted">Calidad en Acero Inoxidable</small>
          </div>
          {!isAdmin && (
            <button 
              className="btn btn-outline-primary position-relative shadow-sm"
              onClick={() => setMostrarCarrito(true)}
            >
              🛒 Ver Carrito
              {carrito.length > 0 && (
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-light">
                  {carrito.reduce((acc, i) => acc + i.cantidad, 0)}
                </span>
              )}
            </button>
          )}
        </div>

        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 row-cols-xl-4 g-4">
         
          {productosActivos.map((p) => {

             const estaInactivo = p.estado === 0;
             const sinStock = p.stock_actual === 0;
             const deshabilitado = estaInactivo || sinStock;
             
             return (
                <div className="col" key={p.cod_producto}>
                  <div 
                    className={`card h-100 shadow-sm border-0 ${deshabilitado ? "opacity-75" : "hover:shadow-lg"}`}
                    style={{ cursor: "pointer", transition: "transform 0.2s" }}
                    onClick={() => setProductoSeleccionado(p)}
                  >
                    {/* IMAGEN DEL PRODUCTO EN LA TARJETA */}
                    <div className="card-img-top bg-white d-flex align-items-center justify-content-center p-3" style={{ height: "200px" }}>
                      <img 
                        src={getImagen(p.nom_producto)} 
                        alt={p.nom_producto}
                        className="img-fluid"
                        style={{ maxHeight: "100%", objectFit: "contain" }}
                        onError={(e) => {
                            if (e.currentTarget.src !== IMG_DEFAULT) {
                                e.currentTarget.src = IMG_DEFAULT;
                            }
                        }}
                      />
                    </div>

                    <div className="card-body d-flex flex-column">
                      <h6 className="card-title fw-bold text-dark text-truncate" title={p.nom_producto}>
                        {p.nom_producto}
                      </h6>
                      <p className="text-muted small mb-2">SKU: {p.cod_producto}</p>
                      
                      <div className="mt-auto">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="h5 mb-0 text-primary fw-bold">${p.precio_producto.toLocaleString()}</span>
                            {sinStock ? (
                                <span className="badge bg-danger bg-opacity-10 text-danger border border-danger">Agotado</span>
                            ) : (
                                <span className="badge bg-success bg-opacity-10 text-success border border-success">Stock: {p.stock_actual}</span>
                            )}
                        </div>
                        
                        <button
                            className={`btn w-100 fw-bold ${deshabilitado ? "btn-secondary" : "btn-primary"}`}
                            disabled={deshabilitado || isAdmin} 
                            onClick={(e) => {
                            e.stopPropagation();
                            agregarAlCarrito(p);
                            }}
                        >
                            {isAdmin ? "Ver Detalle" : (deshabilitado ? "No Disponible" : "Agregar al Carrito 🛒")}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
             );
          })}
        </div>
        
        {productosActivos.length === 0 && !isAdmin && (
            <div className="alert alert-warning text-center mt-5">
                <h4 className="fw-bold">No hay productos disponibles en este momento.</h4>
                <p className="mb-0">Vuelve más tarde para ver nuestro catálogo actualizado.</p>
            </div>
        )}
      </div>
      <div className={`offcanvas offcanvas-end ${mostrarCarrito ? "show" : ""}`} tabIndex={-1} style={{ visibility: mostrarCarrito ? "visible" : "hidden" }}>
        <div className="offcanvas-header bg-primary text-white">
          <h5 className="offcanvas-title">Tu Carrito 🛒</h5>
          <button type="button" className="btn-close btn-close-white" onClick={() => setMostrarCarrito(false)}></button>
        </div>
        <div className="offcanvas-body d-flex flex-column bg-light">
          {carrito.length === 0 ? (
            <div className="text-center my-auto text-muted">
              <div style={{fontSize: '3rem'}}>🛒</div>
              <h5 className="mt-2">Tu carrito está vacío</h5>
              <p>¡Explora nuestro catálogo!</p>
            </div>
          ) : (
            <div className="flex-grow-1 overflow-auto pe-1">
              <ul className="list-group list-group-flush rounded shadow-sm">
                {carrito.map((item) => (
                  <li className="list-group-item d-flex gap-2 align-items-center p-2" key={item.cod_producto}>
                    <img 
                        src={getImagen(item.nombre)} 
                        alt="min"
                        className="rounded border" 
                        style={{width: "50px", height: "50px", objectFit: "cover"}}
                        onError={(e) => {
                            if (e.currentTarget.src !== IMG_DEFAULT) {
                                e.currentTarget.src = IMG_DEFAULT;
                            }
                        }}
                    />
                    
                    <div className="flex-grow-1" style={{minWidth: 0}}>
                        <div className="d-flex justify-content-between align-items-start">
                            <h6 className="my-0 text-truncate" title={item.nombre} style={{fontSize: "0.9rem"}}>{item.nombre}</h6>
                            <button className="btn btn-sm text-danger p-0 ms-1" onClick={() => quitarDelCarrito(item.cod_producto)}>✕</button>
                        </div>
                        <small className="text-muted d-block">${item.precio.toLocaleString()} c/u</small>
                        
                        <div className="d-flex justify-content-between align-items-center mt-2">
                            <div className="btn-group btn-group-sm border rounded bg-white">
                                <button className="btn btn-light px-2" onClick={() => modificarCantidad(item.cod_producto, -1)}>-</button>
                                <span className="btn btn-white disabled fw-bold text-dark px-2" style={{minWidth: '30px', textAlign: 'center'}}>{item.cantidad}</span>
                                <button className="btn btn-light px-2" onClick={() => modificarCantidad(item.cod_producto, 1)}>+</button>
                            </div>
                            <span className="fw-bold text-dark">${item.subtotal.toLocaleString()}</span>
                        </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="border-top pt-3 mt-3 bg-white p-3 rounded shadow-sm">
             <div className="d-flex justify-content-between mb-3 align-items-center">
                <span className="h6 text-muted mb-0">Total Estimado:</span>
                <span className="h4 fw-bold text-primary mb-0">${totalCarrito.toLocaleString()}</span>
             </div>
             <button 
                className="btn btn-success w-100 py-2 fw-bold shadow-sm"
                disabled={carrito.length === 0}
                onClick={() => navigate("/pago")} 
             >
                IR A PAGAR ➡️
             </button>
          </div>
        </div>
      </div>
      
      {mostrarCarrito && <div className="offcanvas-backdrop fade show" onClick={() => setMostrarCarrito(false)}></div>}
      {productoSeleccionado && (
        <>
        <div className="modal-backdrop show"></div>
        <div className="modal fade show d-block" tabIndex={-1}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content border-0 shadow">
                <div className="modal-header border-0">
                  <h5 className="modal-title fw-bold text-dark">{productoSeleccionado.nom_producto}</h5>
                  <button type="button" className="btn-close" onClick={() => setProductoSeleccionado(null)}></button>
                </div>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6 mb-3 mb-md-0">
                        {/* FOTO GRANDE EN MODAL */}
                        <div className="bg-light rounded d-flex align-items-center justify-content-center" style={{height: "300px"}}>
                            <img 
                                src={getImagen(productoSeleccionado.nom_producto)} 
                                alt={productoSeleccionado.nom_producto}
                                className="img-fluid rounded"
                                style={{maxHeight: "100%", maxWidth: "100%"}}
                                onError={(e) => {
                                    if (e.currentTarget.src !== IMG_DEFAULT) {
                                        e.currentTarget.src = IMG_DEFAULT;
                                    }
                                }}
                            />
                        </div>
                    </div>
                    <div className="col-md-6 d-flex flex-column justify-content-center">
                        <h2 className="text-primary fw-bold mb-2">${productoSeleccionado.precio_producto.toLocaleString()}</h2>
                        <div className="mb-3">
                            <span className="text-muted me-2">SKU: {productoSeleccionado.cod_producto}</span>
                            <span className={`badge ${productoSeleccionado.stock_actual > 0 ? "bg-success" : "bg-danger"}`}>
                                {productoSeleccionado.stock_actual > 0 ? `Stock Disponible: ${productoSeleccionado.stock_actual}` : "Agotado"}
                            </span>
                        </div>
                        <div className="bg-light p-3 rounded mb-4 border">
                            <h6 className="fw-bold text-dark">Descripción del Producto:</h6>
                            <p className="mb-0 text-secondary" style={{whiteSpace: 'pre-wrap'}}>
                                {productoSeleccionado.descripcion || "Fabricado en acero inoxidable de alta calidad, resistente a la corrosión y diseñado para uso industrial exigente."}
                            </p>
                        </div>
                        
                        {!isAdmin && (productoSeleccionado.estado === 1 || productoSeleccionado.estado === undefined) && productoSeleccionado.stock_actual > 0 && (
                            <button 
                                type="button" 
                                className="btn btn-primary btn-lg fw-bold w-100 shadow-sm" 
                                onClick={() => { agregarAlCarrito(productoSeleccionado); setProductoSeleccionado(null); }}
                            >
                                Agregar al Carrito 🛒
                            </button>
                        )}
                         {!isAdmin && (productoSeleccionado.estado === 0 || productoSeleccionado.stock_actual === 0) && (
                            <div className="alert alert-warning text-center small py-2 mb-0">
                                No disponible para la venta.
                            </div>
                        )}
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-0 bg-light">
                  <button type="button" className="btn btn-secondary" onClick={() => setProductoSeleccionado(null)}>Cerrar</button>
                </div>
              </div>
            </div>
        </div>
        </>
      )}
    </>
  );
}