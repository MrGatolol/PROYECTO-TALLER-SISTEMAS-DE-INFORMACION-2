import { useState, useEffect } from "react";
import NavBar from "../components/NavBar";
import { useNavigate } from "react-router-dom";

type Cliente = {
  rut_cliente: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno?: string;
  direccion: string;
  fono: string;
  email: string;
  razon_social?: string;
  giro?: string;
  tipo_cliente: number; // 0: Persona, 1: Empresa
};

const validarRut = (rut: string): boolean => {
  if (!rut.includes("-")) return false;
  const [cuerpo, dv] = rut.split("-");
  let suma = 0, multiplo = 2;
  const rutLimpio = cuerpo.replace(/\./g, "");
  for (let i = rutLimpio.length - 1; i >= 0; i--) {
    suma += parseInt(rutLimpio.charAt(i)) * multiplo;
    if (multiplo < 7) multiplo += 1; else multiplo = 2;
  }
  const dvEsperado = 11 - (suma % 11);
  let dvCalculado = dvEsperado === 11 ? "0" : dvEsperado === 10 ? "K" : dvEsperado.toString();
  return dvCalculado.toUpperCase() === dv.toUpperCase();
};

export default function Clientes() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  
  // ESTADOS DE FILTRO (REQUISITO: BÚSQUEDA)
  const [busqueda, setBusqueda] = useState("");
  const [clientesFiltrados, setClientesFiltrados] = useState<Cliente[]>([]);

  const [esEmpresa, setEsEmpresa] = useState(false);
  // INICIALIZAR CON +569 POR DEFECTO
  const [form, setForm] = useState({ 
    rut: "", nombres: "", appPaterno: "", appMaterno: "", 
    direccion: "", fono: "+569", email: "", razonSocial: "", giro: "" 
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const isAdmin = localStorage.getItem("tipo_usuario") === "1";
  useEffect(() => { if (!isAdmin) navigate("/home"); }, [isAdmin, navigate]);
  
  const load = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/clientes");
      const data = await res.json();
      if (Array.isArray(data)) {
          setClientes(data);
          setClientesFiltrados(data); // Inicializamos filtrados
      }
      setLoading(false);
    } catch (e) { console.error(e); setLoading(false); }
  };
  
  useEffect(() => { load(); }, []);

  // EFECTO PARA FILTRAR EN TIEMPO REAL
  useEffect(() => {
    if (!busqueda.trim()) {
        setClientesFiltrados(clientes);
    } else {
        const term = busqueda.toLowerCase();
        const filt = clientes.filter(c => 
            c.rut_cliente.toLowerCase().includes(term) ||
            c.nombres.toLowerCase().includes(term) ||
            c.apellido_paterno.toLowerCase().includes(term) ||
            (c.razon_social && c.razon_social.toLowerCase().includes(term))
        );
        setClientesFiltrados(filt);
    }
  }, [busqueda, clientes]);

  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^0-9kK]/g, ""); 
    if (val.length > 9) return; 
    if (val.length > 1) val = val.slice(0, -1) + "-" + val.slice(-1);
    setForm({ ...form, rut: val });
  };

  // --- MANEJO DE TELEFONO ---
  const handleFonoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    
    // Si intenta borrar el prefijo +56, lo forzamos
    if (!val.startsWith("+56")) {
        val = "+56"; 
    }

    // Solo permitir números después del +
    if (!/^\+?[0-9]*$/.test(val)) return;

    // Límite de largo: +56 9 12345678 (12 caracteres)
    if (val.length > 12) return;

    setForm({ ...form, fono: val });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");

    if (!validarRut(form.rut)) return setError("⚠️ El RUT ingresado no es válido.");
    
    // Validar requeridos según tipo
    if (esEmpresa) {
        if (!form.razonSocial || !form.giro || !form.rut) return setError("⚠️ Datos de empresa incompletos.");
    } else {
        if (!form.nombres || !form.appPaterno || !form.rut) return setError("⚠️ Datos personales incompletos.");
    }
    
    // Validar Email (OBLIGATORIO), Dirección (OBLIGATORIO) y Teléfono
    if (!form.email) return setError("⚠️ El email es obligatorio.");
    if (!form.direccion.trim()) return setError("⚠️ La dirección es obligatoria.");

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setError("⚠️ Email inválido.");

    // VALIDACIÓN ESTRICTA DE LARGO (12 caracteres: +56 9 XXXXXXXX)
    if (form.fono.length !== 12) return setError("⚠️ Teléfono inválido. Debe tener 9 dígitos (+569...)");

    const endpoint = isEditing ? `http://localhost:3000/api/clientes/${form.rut}` : "http://localhost:3000/api/clientes";
    const method = isEditing ? "PUT" : "POST";

    const payload = {
        rut_cliente: form.rut,
        direccion: form.direccion,
        fono: form.fono,
        email: form.email,
        tipo_cliente: esEmpresa ? 1 : 0,
        nombres: esEmpresa ? "Empresa" : form.nombres,
        apellido_paterno: esEmpresa ? "." : form.appPaterno,
        apellido_materno: esEmpresa ? "" : form.appMaterno,
        razon_social: esEmpresa ? form.razonSocial : null,
        giro: esEmpresa ? form.giro : null
    };

    try {
        const res = await fetch(endpoint, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const err = await res.json();
            setError(err.message || "Error al procesar.");
        } else {
            setSuccess(isEditing ? "✅ Cliente actualizado." : "✅ Cliente registrado.");
            resetForm();
            load();
            setTimeout(() => setSuccess(""), 3000);
        }
    } catch { setError("Error de conexión."); }
  };

  const handleEdit = (c: Cliente) => {
    setError(""); setSuccess("");
    const esEmpresaEdit = c.tipo_cliente === 1 || !!c.razon_social;
    setEsEmpresa(esEmpresaEdit);

    let telefonoEdit = c.fono || "+569";
    // Si viene sin formato, intentamos formatearlo
    if (!telefonoEdit.startsWith("+56")) {
         telefonoEdit = "+56" + telefonoEdit.replace(/[^0-9]/g, '');
    }
    // Aseguramos que si le falta el 9 se lo agregue si parece ser móvil (y es corto)
    if(telefonoEdit.length < 5) telefonoEdit = "+569";

    setForm({
        rut: c.rut_cliente,
        nombres: (c.nombres === "Empresa" && c.razon_social) ? "" : c.nombres,
        appPaterno: c.apellido_paterno === "." ? "" : c.apellido_paterno,
        appMaterno: c.apellido_materno || "",
        direccion: c.direccion || "",
        fono: telefonoEdit,
        email: c.email || "",
        razonSocial: c.razon_social || "",
        giro: c.giro || ""
    });
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (rut: string) => {
    if (!confirm("¿Estás seguro de eliminar este cliente?")) return;
    try {
        const res = await fetch(`http://localhost:3000/api/clientes/${rut}`, { method: "DELETE" });
        if (res.ok) {
            setSuccess("🗑️ Cliente eliminado.");
            load();
            setTimeout(() => setSuccess(""), 3000);
        } else {
            const err = await res.json();
            setError("❌ " + (err.message || "Error al eliminar."));
        }
    } catch { setError("Error al intentar eliminar."); }
  };

  const resetForm = () => {
    setForm({ rut: "", nombres: "", appPaterno: "", appMaterno: "", direccion: "", fono: "+569", email: "", razonSocial: "", giro: "" });
    setEsEmpresa(false);
    setIsEditing(false);
  };

  if (!isAdmin) return null;

  return (
    <>
      <NavBar />
      <div className="container mt-4">
        <h2 className="fw-bold mb-4 text-dark">Gestión de Clientes</h2>

        {error && <div className="alert alert-danger shadow-sm">{error}</div>}
        {success && <div className="alert alert-success shadow-sm">{success}</div>}

        <div className={`card shadow-sm border-0 mb-4 ${isEditing ? 'border-warning' : 'bg-light'}`}>
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className={`card-title fw-bold ${isEditing ? 'text-warning' : 'text-primary'}`}>
                    {isEditing ? "✏️ Editando Cliente" : "👤 Registrar Nuevo Cliente"}
                </h5>
                {isEditing && <button className="btn btn-sm btn-secondary" onClick={resetForm}>Cancelar</button>}
            </div>
            
            <form onSubmit={handleSubmit} className="row g-3">
              <div className="col-12 mb-2">
                <div className="form-check form-switch">
                    <input className="form-check-input" type="checkbox" id="tipoClienteSwitch" checked={esEmpresa} onChange={(e) => setEsEmpresa(e.target.checked)}/>
                    <label className="form-check-label fw-bold" htmlFor="tipoClienteSwitch">
                        {esEmpresa ? "🏢 Cliente Empresa" : "👤 Cliente Persona"}
                    </label>
                </div>
              </div>

              <div className="col-md-3">
                <label className="form-label small fw-bold">RUT *</label>
                <input className="form-control" placeholder="12345678-K" value={form.rut} disabled={isEditing} onChange={handleRutChange} />
              </div>

              {esEmpresa ? (
                  <>
                    <div className="col-md-6">
                        <label className="form-label small fw-bold">Razón Social *</label>
                        <input className="form-control" placeholder="Ej: Constructora Ltda." value={form.razonSocial} onChange={e => setForm({...form, razonSocial: e.target.value})} />
                    </div>
                    <div className="col-md-3">
                        <label className="form-label small fw-bold">Giro *</label>
                        <input className="form-control" placeholder="Ej: Venta Materiales" value={form.giro} onChange={e => setForm({...form, giro: e.target.value})} />
                    </div>
                  </>
              ) : (
                  <>
                    <div className="col-md-3">
                        <label className="form-label small fw-bold">Nombres *</label>
                        <input className="form-control" value={form.nombres} onChange={e => setForm({...form, nombres: e.target.value})} />
                    </div>
                    <div className="col-md-3">
                        <label className="form-label small fw-bold">Ap. Paterno *</label>
                        <input className="form-control" value={form.appPaterno} onChange={e => setForm({...form, appPaterno: e.target.value})} />
                    </div>
                    <div className="col-md-3">
                        <label className="form-label small fw-bold">Ap. Materno</label>
                        <input className="form-control" value={form.appMaterno} onChange={e => setForm({...form, appMaterno: e.target.value})} />
                    </div>
                  </>
              )}

              <div className="col-md-6">
                <label className="form-label small fw-bold">Dirección *</label>
                <input className="form-control" value={form.direccion} onChange={e => setForm({...form, direccion: e.target.value})} />
              </div>
              
              {/* INPUT DE TELÉFONO ACTUALIZADO */}
              <div className="col-md-3">
                <label className="form-label small fw-bold">Teléfono *</label>
                <input 
                    className="form-control" 
                    placeholder="+56912345678" 
                    value={form.fono} 
                    onChange={handleFonoChange} 
                />
                <div className="form-text" style={{fontSize: "0.75rem"}}>Formato: +569... (9 dígitos)</div>
              </div>

              <div className="col-md-3">
                <label className="form-label small fw-bold">Email *</label>
                <input className="form-control" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              </div>

              <div className="col-12 text-end">
                <button className={`btn fw-bold px-4 ${isEditing ? "btn-warning" : "btn-success"}`}>
                    {isEditing ? "💾 Actualizar" : "＋ Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* --- BARRA DE BÚSQUEDA --- */}
        <div className="card shadow-sm border-0 mb-3">
            <div className="card-body p-3 bg-light">
                <div className="input-group">
                    <span className="input-group-text bg-white border-end-0">🔍</span>
                    <input 
                        type="text" 
                        className="form-control border-start-0" 
                        placeholder="Buscar por RUT, Nombre o Razón Social..." 
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>
            </div>
        </div>

        <div className="card shadow-sm border-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-dark">
                <tr>
                  <th>RUT</th>
                  <th>Tipo</th>
                  <th>Nombre / Razón Social</th>
                  <th>Contacto</th>
                  <th className="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientesFiltrados.map((c) => {
                    const isEmp = c.tipo_cliente === 1 || !!c.razon_social;
                    return (
                      <tr key={c.rut_cliente}>
                        <td className="fw-bold text-secondary">{c.rut_cliente}</td>
                        <td>{isEmp ? <span className="badge bg-info text-dark">Empresa</span> : <span className="badge bg-secondary">Persona</span>}</td>
                        <td>
                            {isEmp ? (
                                <div><div className="fw-bold">{c.razon_social}</div><small className="text-muted">Giro: {c.giro || "-"}</small></div>
                            ) : (
                                <div>{c.nombres} {c.apellido_paterno} {c.apellido_materno}</div>
                            )}
                            <div className="small text-muted mt-1">📍 {c.direccion || "Sin dirección"}</div>
                        </td>
                        <td>
                          <div className="d-flex flex-column small">
                            <span>{c.fono || "S/N"}</span><span className="text-muted">{c.email || "S/Email"}</span>
                          </div>
                        </td>
                        <td className="text-center">
                          <button className="btn btn-sm btn-outline-warning me-2" onClick={() => handleEdit(c)}>✏️</button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(c.rut_cliente)}>🗑️</button>
                        </td>
                      </tr>
                    );
                })}
                {!loading && clientesFiltrados.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-4 text-muted">No se encontraron resultados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}