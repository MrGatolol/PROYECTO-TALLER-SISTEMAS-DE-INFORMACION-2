import { useEffect, type ReactNode } from "react";
import { Navigate, useNavigate } from "react-router-dom";

type Props = { children: ReactNode };

export default function RequireAuth({ children }: Props) {
  const token = localStorage.getItem("token");
  const tipoUsuario = localStorage.getItem("tipo_usuario");
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  if (tipoUsuario !== "1") {
    return <AccesoDenegado />;
  }
  return <>{children}</>;
}
function AccesoDenegado() {
  const navigate = useNavigate();
  useEffect(() => {
    setTimeout(() => {
      alert("Acceso denegado, Se requieren permisos de administrador");
      navigate("/home");
    }, 100);
  }, [navigate]);
  return null; 
}
