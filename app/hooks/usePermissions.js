"use client";
import { useState, useEffect } from "react";

export function usePermissions() {
  const [permissions, setPermissions] = useState(null);
  const [isMain, setIsMain] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("accessToken"); // updated: read JWT token

    fetch("http://127.0.0.1:8000/authapp/my-permissions/", {
      credentials: "include",
      headers: token
        ? { Authorization: `Bearer ${token}` } // updated: send JWT
        : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized"); // updated: catch 401 explicitly
        return res.json();
      })
      .then((data) => {
        setIsMain(data.is_main);
        setPermissions(data.permissions || []);
      })
      .catch(() => {
        setPermissions([]); // on error, deny all
      });
  }, []);

  const hasPermission = (feature, action) => {
    if (permissions === null) return true; // still loading → show optimistically
    if (isMain) return true;              // main user always has access
    return permissions.some(
      (p) => p.feature === feature && p.action === action
    );
  };

  return { hasPermission, isMain, loading: permissions === null };
}