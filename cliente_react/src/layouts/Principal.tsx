import { Outlet } from "react-router-dom";

export default function Principal() {
  return (
    <>
      <main className="container-fluid">
        <Outlet />
      </main>
    </>
  );
}