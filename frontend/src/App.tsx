import { Outlet, Route, Routes } from "react-router-dom";
import MainLayout from "@/components/layouts/MainLayout";
import RequireAuth from "@/features/auth/RequireAuth";
import CardPage from "@/pages/CardPage";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";
import Panel from "@/pages/Panel";
import Radar from "@/pages/Radar";

// Proste strony templatki (logowanie, panel) w kontenerze strony
const PlainPage = () => (
  <div className="wrap page">
    <Outlet />
  </div>
);

const App = () => {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/radar" element={<Radar />} />
        <Route path="/karty/:id" element={<CardPage />} />

        {/* Moduł auth z templatki: poza nawigacją, Radar jest publiczny i tylko do odczytu */}
        <Route element={<PlainPage />}>
          <Route path="/login" element={<Login />} />
          <Route element={<RequireAuth />}>
            <Route path="/panel" element={<Panel />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

export default App;
