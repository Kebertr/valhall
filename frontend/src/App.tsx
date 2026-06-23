import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import AddShot from "./pages/Add";
import Redeem from "./pages/Redeem";
import Profile from "./pages/Profile";
import Leaderboard from "./pages/Leaderboard";
import Notifications from "./pages/Notifications";
import Gudar from "./pages/Gudar";
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/add" element={<AddShot />} />
        <Route path="/redeem" element={<Redeem />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/gudar" element={<Gudar />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
