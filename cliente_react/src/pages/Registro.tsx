import { useState } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";

export default function Registro() {
  // Switch para tipo de registro
  const [esEmpresa, setEsEmpresa] = useState(false);

  const [rut, setRut] = useState("");
  
  // Datos Persona
  const [nombres, setNombres] = useState("");
  const [appPaterno, setAppPaterno] = useState("");
  const [appMaterno, setAppMaterno] = useState("");
  
  // Datos Empresa
  const [razonSocial, setRazonSocial] = useState("");
  const [giro, setGiro] = useState("");

  // Datos Comunes
  const [correo, setCorreo] = useState("");
  const [fono, setFono] = useState("+56"); // Inicializamos con prefijo
  const [direccion, setDireccion] = useState(""); 
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false); // Nuevo estado de carga
  
  const navigate = useNavigate();

  // --- FUNCIÓN DE VALIDACIÓN DE RUT (Módulo 11) ---
  const validarRutChileno = (rutCompleto: string) => {
    if (!/^[0-9]+-[0-9kK]{1}$/.test(rutCompleto)) return false;
    const split = rutCompleto.split("-");
    let M = 0, S = 1;
    let T = Number(split[0]);
    const V = split[1].toUpperCase();
    for (; T; T = Math.floor(T / 10)) {
        S = (S + T % 10 * (9 - M++ % 6)) % 11;
    }
    const dvEsperado = S ? S - 1 + "" : "K";
    return dvEsperado === V;
  };

  // --- CONTROLADOR DE TELÉFONO (Formato Chile) ---
  const handleFonoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value;
    // Eliminar todo lo que no sea número, excepto el signo '+' inicial
    let cleanVal = inputVal.replace(/[^0-9+]/g, '');

    // Si el valor no empieza con +, forzamos el prefijo +56
    if (!cleanVal.startsWith('+')) {
      cleanVal = '+56' + cleanVal.replace('56', '');
    } else if (cleanVal === '+') {
      cleanVal = '+56';
    }

    // Aseguramos que solo haya un '+' y que esté al inicio
    if (cleanVal.indexOf('+', 1) !== -1) {
        cleanVal = cleanVal.replace(/\+/g, '').replace('56', '');
        cleanVal = '+56' + cleanVal;
    }
    
    // Límite de 12 caracteres (+56 9 XXXXXXXX)
    if (cleanVal.length > 12) {
      cleanVal = cleanVal.slice(0, 12);
    }
    
    setFono(cleanVal);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); 

    // VALIDACIONES
    const rutLimpio = rut.replace(/\./g, "");
    if (rutLimpio.length < 8) return setError("El RUT es demasiado corto.");
    if (!validarRutChileno(rutLimpio)) return setError("El RUT no es válido.");
    
    if (contrasena.length < 4) return setError("La contraseña es muy corta.");
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correo)) {
        return setError("Email inválido (debe contener '@' y un dominio válido, ej: .com, .cl).");
    }

    // Validación de Teléfono (Largo mínimo, asumiendo +56 al inicio)
    if (fono.replace(/[^0-9]/g, '').length < 10) { 
        return setError("El teléfono debe tener 9 dígitos (incluyendo el prefijo +56).");
    }

    if (esEmpresa) {
        if (!razonSocial || !giro) return setError("Razón Social y Giro son obligatorios.");
    } else {
        if (!nombres || !appPaterno) return setError("Nombres y Apellido Paterno son obligatorios.");
    }
    if (!direccion.trim()) return setError("La Dirección de Despacho es obligatoria.");

    setIsProcessing(true);
    const payload = {
        rut_usuario: rut,
        nombres: esEmpresa ? "Empresa" : nombres,
        apellido_paterno: esEmpresa ? "." : appPaterno,
        apellido_materno: esEmpresa ? "" : appMaterno,
        contrasena: contrasena, 
        tipo_usuario: 0, 
        email_usuario: correo, 
        fono_usuario: fono,
        direccion: direccion,
        es_empresa: esEmpresa, 
        razon_social: esEmpresa ? razonSocial : null,
        giro: esEmpresa ? giro : null
    };

    try {

      const res = await fetch("http://localhost:3000/api/usuarios/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.message || "No se pudo registrar el usuario.");
        setIsProcessing(false);
        return;
      }
      
 
      const resLogin = await fetch("http://localhost:3000/api/usuarios/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo_usuario: correo, contrasena: contrasena }),
      });
      
      if (resLogin.ok) {
          const data = await resLogin.json();
          // Guardar todos los datos de sesión necesarios
          localStorage.setItem("token", data.token);
          localStorage.setItem("rut_usuario_sesion", data.usuario.rut_usuario);
          localStorage.setItem("nombre_usuario", data.usuario.nom_usuario); 
          localStorage.setItem("tipo_usuario", data.usuario.tipo_usuario.toString()); 
          
          // Notificar al NavBar
          window.dispatchEvent(new Event("auth-change"));

          alert("✅ Cuenta creada con éxito! Iniciando sesión automáticamente...");
          navigate("/tienda"); // Redirigir a la tienda
      } else {
          // Si el registro fue OK pero el login falla (raro, pero posible)
          alert("⚠️ Cuenta creada, pero el inicio de sesión automático falló. Intenta iniciar sesión manualmente.");
          navigate("/login");
      }

    } catch (err) {
      console.error(err);
      setError("Error de conexión con el servidor.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <NavBar />
      <div className="container mt-5 mb-5">
        <div className="row justify-content-center">
          <div className="col-md-7 col-lg-6">
            <div className="card shadow-sm border-0">
              <div className="card-body p-4">
                <h2 className="text-center text-primary fw-bold mb-3">Crear Cuenta</h2>
                
                {error && (
                    <div className="alert alert-danger p-2 small text-center">{error}</div>
                )}
                
                <form onSubmit={handleSubmit}>
                  {/* SWITCH TIPO CUENTA */}
                  <div className="mb-4 text-center bg-light p-2 rounded">
                    <div className="form-check form-check-inline form-switch">
                        <input 
                            className="form-check-input" 
                            type="checkbox" 
                            id="tipoRegistro" 
                            checked={esEmpresa} 
                            onChange={e => setEsEmpresa(e.target.checked)} 
                            disabled={isProcessing}
                        />
                        <label className="form-check-label fw-bold" htmlFor="tipoRegistro">
                            {esEmpresa ? "🏢 Soy una Empresa" : "👤 Soy Persona Natural"}
                        </label>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold small">RUT {esEmpresa ? "Empresa" : ""}</label>
                    <input
                      type="text"
                      className="form-control"
                      value={rut}
                      onChange={(e) => {
                        let val = e.target.value.replace(/[^0-9kK]/g, "");
                        if (val.length > 1) val = val.slice(0, -1) + "-" + val.slice(-1);
                        setRut(val);
                      }}
                      placeholder="12345678-9"
                      maxLength={10}
                      required
                      disabled={isProcessing}
                    />
                  </div>
                  
                  {esEmpresa ? (
                    // CAMPOS EMPRESA
                    <div className="row">
                         <div className="col-md-8 mb-3">
                            <label className="form-label fw-bold small">Razón Social *</label>
                            <input className="form-control" value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} required disabled={isProcessing} />
                         </div>
                         <div className="col-md-4 mb-3">
                            <label className="form-label fw-bold small">Giro *</label>
                            <input className="form-control" value={giro} onChange={(e) => setGiro(e.target.value)} required disabled={isProcessing} />
                         </div>
                    </div>
                  ) : (
                    // CAMPOS PERSONA
                    <div className="row">
                        <div className="col-md-12 mb-3">
                            <label className="form-label fw-bold small">Nombres *</label>
                            <input className="form-control" value={nombres} onChange={(e) => setNombres(e.target.value)} required disabled={isProcessing} />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label fw-bold small">Ap. Paterno *</label>
                            <input className="form-control" value={appPaterno} onChange={(e) => setAppPaterno(e.target.value)} required disabled={isProcessing} />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label fw-bold small">Ap. Materno</label>
                            <input className="form-control" value={appMaterno} onChange={(e) => setAppMaterno(e.target.value)} disabled={isProcessing} />
                        </div>
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label fw-bold small">Dirección de Despacho *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={direccion}
                      placeholder="Calle, Número, Comuna"
                      onChange={(e) => setDireccion(e.target.value)}
                      required
                      disabled={isProcessing}
                    />
                  </div>

                  <div className="row">
                      <div className="col-md-7 mb-3">
                        <label className="form-label fw-bold small">Correo Electrónico *</label>
                        <input type="email" className="form-control" value={correo} onChange={(e) => setCorreo(e.target.value)} required disabled={isProcessing} />
                      </div>
                      <div className="col-md-5 mb-3">
                        <label className="form-label fw-bold small">Teléfono *</label>
                        <input 
                            type="text" 
                            className="form-control" 
                            value={fono} 
                            placeholder="+56..." 
                            onChange={handleFonoChange} 
                            required 
                            disabled={isProcessing}
                        />
                         <div className="form-text small">Fijo o Móvil (+56 9 + 8 dígitos)</div>
                      </div>
                  </div>
                  
                  <div className="mb-4">
                    <label className="form-label fw-bold small">Contraseña *</label>
                    <input
                      type="password"
                      className="form-control"
                      value={contrasena}
                      onChange={(e) => setContrasena(e.target.value)}
                      required
                      disabled={isProcessing}
                    />
                  </div>

                  <div className="d-grid gap-2">
                    <button className="btn btn-primary fw-bold" type="submit" disabled={isProcessing}>
                      {isProcessing ? "Registrando..." : "Registrarse"}
                    </button>
                    <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => navigate("/login")} disabled={isProcessing}>Volver al Login</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}