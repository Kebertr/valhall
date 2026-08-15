import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import AddShot from "./pages/Add";
import Redeem from "./pages/Redeem";
import Profile from "./pages/Profile";
import Leaderboard from "./pages/Leaderboard";
import Notifications from "./pages/Notifications";
import Gudar from "./pages/Gudar";
import LinkMember from "./pages/LinkMember";
import MemberLinks from "./pages/MemberLinks";
import Bongmeister from "./pages/Bongmeister";
import { ProtectedRoute } from "./auth/protectedRoute";
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
        <Route path="/link-member" element={<LinkMember />} />
        <Route path="/member-links" element={<MemberLinks />} />
        <Route
          path="/bongmeister"
          element={
            <ProtectedRoute requiredRoles={["ADMIN", "BONGMEISTER"]}>
              <Bongmeister />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
