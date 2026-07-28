"use client";

export function LogoutButton() {
  return (
    <button
      type="button"
      className="btn btn-ghost !px-3 !py-1.5 text-sm"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/";
      }}
    >
      로그아웃
    </button>
  );
}
