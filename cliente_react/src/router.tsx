import { createBrowserRouter } from "react-router-dom";
import Principal from "./layouts/Principal"; 
import RequireAuth from "./components/RequireAuth";
import Home from "./pages/Home";
import Tienda from "./pages/Tienda";
import Login from "./pages/Login";
import Mantenedor from "./pages/Mantenedor";
import Ajustes from "./pages/Ajustes";
import Clientes from "./pages/Clientes";
import Pedidos from "./pages/Pedidos";
import Pagos from "./pages/Pagos";
import Registro from "./pages/Registro";
import MisPedidos from "./pages/MisPedidos";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Principal />, 
    children: [
      { index: true, element: <Tienda /> }, 
      { path: "login", element: <Login /> }, 
      { path: "registro", element: <Registro /> },
      // Generales
      { path: "home", element: <Home /> },
      { path: "tienda", element: <Tienda /> }, 
      { path: "pago", element: <Pagos/> },
      { path: "mis-pedidos", element:<MisPedidos />},
      // Admin Protegidas
      { 
        path: "administrar", 
        element: <RequireAuth><Mantenedor /></RequireAuth> 
      },
      { 
        path: "administrar/historial-ajustes", 
        element: <RequireAuth><Ajustes /></RequireAuth> 
      },
      { 
        path: "clientes", 
        element: <RequireAuth><Clientes /></RequireAuth> 
      },
      { 
        path: "pedidos", 
        element: <RequireAuth><Pedidos /></RequireAuth> 
      },
    ],
  },
]);