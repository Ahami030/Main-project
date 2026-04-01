"use client";

import { useEffect, useState } from "react";

const themes = [
  "light",
  "dark",
  "cupcake",
  "corporate",
  "emerald",
  "synthwave",
  "retro",
  "halloween",
];

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    }
  }, []);

  function changeTheme(value: string) {
    setTheme(value);
    document.documentElement.setAttribute("data-theme", value);
    localStorage.setItem("theme", value);
  }

  return (
    <div className="dropdown dropdown-end">
      <label tabIndex={0} className="btn btn-ghost btn-sm">
        Theme
      </label>

      <ul
        tabIndex={0}
        className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-44 border border-base-300"
      >
        {themes.map((t) => (
          <li key={t}>
            <button
              className={t === theme ? "active font-semibold" : ""}
              onClick={() => changeTheme(t)}
            >
              {t}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
