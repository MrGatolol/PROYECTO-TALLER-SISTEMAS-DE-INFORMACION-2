import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("http://localhost:3000/api/usuarios/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo_usuario: correo, contrasena }),
      });

      if (!res.ok) {
        let errorMsg = "Credenciales inválidas";
        try {
          const errData = await res.json();
          if (errData.message) errorMsg = errData.message;
        } catch {}
        setError(errorMsg);
        return;
      }

      const data = await res.json();
      
      localStorage.setItem("token", data.token);
      localStorage.setItem("tipo_usuario", data.usuario.tipo_usuario);
      localStorage.setItem("nombre_usuario", data.usuario.nom_usuario);
      localStorage.setItem("rut_usuario_sesion", data.usuario.rut_usuario);
      localStorage.setItem("email_usuario", data.usuario.correo_usuario || "");
      localStorage.setItem("fono_usuario", data.usuario.fono_usuario || "");

      if (data.usuario.tipo_usuario === 1) {
        navigate("/home");
      } else {
        navigate("/tienda");
      }

    } catch (err) {
      console.error("Error en catch:", err);
      setError("Error en el servidor");
    }
  };

  return (
    <div className="d-flex vh-100 justify-content-center align-items-center bg-light">
      <div className="card p-4 shadow border-0" style={{ width: "350px" }}>
        <h2 className="text-center text-primary fw-bold mb-3">PRODINOX</h2>
        <h4 className="text-center mb-4 text-secondary">Iniciar Sesión</h4>
        
        {error && <div className="alert alert-danger p-2 small text-center">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label fw-bold">Correo electrónico</label>
            <input
              type="email"
              className="form-control"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
            />
          </div>
          <div className="mb-4">
            <label className="form-label fw-bold">Contraseña</label>
            <input
              type="password"
              className="form-control"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-primary w-100 fw-bold py-2 mb-3" type="submit">
            Ingresar
          </button>
          
          {/* BOTÓN PARA IR AL REGISTRO */}
          <div className="text-center border-top pt-3">
            <span className="small text-muted d-block mb-2">¿No tienes cuenta?</span>
            <button 
                type="button" 
                className="btn btn-outline-secondary btn-sm w-100"
                onClick={() => navigate("/registro")}
            >
                Crear Cuenta
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}