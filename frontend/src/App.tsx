import { Route, Routes } from "react-router-dom";
import MainLayout from "@/components/layouts/MainLayout";
import CardPage from "@/pages/CardPage";
import Home from "@/pages/Home";
import NotFound from "@/pages/NotFound";
import Radar from "@/pages/Radar";

const App = () => {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/radar" element={<Radar />} />
        <Route path="/karty/:id" element={<CardPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

export default App;
