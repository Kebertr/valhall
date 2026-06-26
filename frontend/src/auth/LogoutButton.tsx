import { getKeycloak } from "./keycloak";

type LogoutButtonProps = {
  className?: string;
};

export default function LogoutButton({ className }: LogoutButtonProps) {
  function handleLogout() {
    getKeycloak().logout({
      redirectUri: window.location.origin,
    });
  }

  return (
    <button type="button" onClick={handleLogout} className={className}>
      Logout
    </button>
  );
}
