import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import AddShot from "./pages/Add";
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/add" element={<AddShot />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;