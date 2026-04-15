import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";

export function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/campaigns" className="font-semibold text-lg text-gray-900">
            Campaign Manager
          </Link>
          {user && (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-500">{user.email}</span>
              <button onClick={handleLogout} className="text-gray-500 hover:text-gray-700">
                Logout
              </button>
            </div>
          )}
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
