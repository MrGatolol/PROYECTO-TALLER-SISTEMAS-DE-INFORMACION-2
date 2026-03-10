import { NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

interface NavBarProps {
  ocultarCerrarSesion?: boolean; 
}

export default function NavBar({ ocultarCerrarSesion = false }: NavBarProps) {
  const navigate = useNavigate();
  const [tipoUsuario, setTipoUsuario] = useState("");
  const [nombreUsuario, setNombreUsuario] = useState("");
  const isAdmin = tipoUsuario === "1";


  useEffect(() => {
    const actualizarDatos = () => {
        setTipoUsuario(localStorage.getItem("tipo_usuario") || "");

        setNombreUsuario(localStorage.getItem("nom_usuario") || localStorage.getItem("nombre_usuario") || "");
    };

    // 1. Cargar al inicio
    actualizarDatos();

    // 2. Escuchar evento personalizado (cuando haces login/logout en el mismo tab)
    window.addEventListener("auth-change", actualizarDatos);
    
    // 3. Escuchar cambios en localStorage (cuando cambias de tab)
    window.addEventListener("storage", actualizarDatos);

    return () => {
        window.removeEventListener("auth-change", actualizarDatos);
        window.removeEventListener("storage", actualizarDatos);
    };
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    window.dispatchEvent(new Event("auth-change"));
    window.dispatchEvent(new Event("cart-change"));
    navigate("/");
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark mb-4 shadow-sm">
      <div className="container-fluid">
        <NavLink className="navbar-brand fw-bold fs-3" to="/home">
          PRODINOX
        </NavLink>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarSupportedContent"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarSupportedContent">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <NavLink 
                to="/tienda" 
                className={({ isActive }) => `nav-link fs-5 ${isActive ? "active fw-bold" : ""}`}>
                Tienda
              </NavLink>
            </li>
            
            {tipoUsuario && !isAdmin && (
               <li className="nav-item">
                <NavLink 
                  to="/mis-pedidos" 
                  className={({ isActive }) => `nav-link fs-5 ${isActive ? "active fw-bold" : ""}`}>
                  Mis Pedidos
                </NavLink>
              </li>
            )}

            {isAdmin && (
              <>
                <li className="nav-item">
                  <NavLink 
                    to="/administrar" 
                    className={({ isActive }) => `nav-link fs-5 ${isActive ? "active fw-bold" : ""}`}>
                    Mantenedor
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink 
                    to="/clientes" 
                    className={({ isActive }) => `nav-link fs-5 ${isActive ? "active fw-bold" : ""}`}>
                    Clientes
                  </NavLink>
                </li>
                <li className="nav-item">
                  <NavLink 
                    to="/pedidos" 
                    className={({ isActive }) => `nav-link fs-5 ${isActive ? "active fw-bold" : ""}`}>
                    Ventas Admin
                  </NavLink>
                </li>
              </>
            )}
          </ul>
          
          <ul className="navbar-nav ms-auto align-items-center">


            {nombreUsuario && (
              <li className="nav-item me-3">
                <span className="badge bg-secondary fs-6">
                  {isAdmin ? "Admin:" : "Cliente:"} {nombreUsuario}
                </span>
              </li>
            )}
            
            {tipoUsuario ? (
              !ocultarCerrarSesion && (
                <li className="nav-item">
                    <button className="btn btn-outline-danger btn-sm" onClick={handleLogout}>
                    Salir
                    </button>
                </li>
              )
            ) : (
              <li className="nav-item">
                <NavLink to="/login" className="btn btn-primary btn-sm">
                  Login
                </NavLink>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}