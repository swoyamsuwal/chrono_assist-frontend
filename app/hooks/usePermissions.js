"use client";

// ===============================================================
//  hooks/usePermissions.js
//  Custom React hook that fetches the current user's RBAC
//  permissions from the backend and exposes a hasPermission()
//  helper used to gate UI elements throughout the app.
//
//  USAGE:
//    const { hasPermission, loading } = usePermissions();
//    const canCreate = hasPermission("tasks", "create");
//
//  RETURNS:
//    hasPermission(feature, action) → boolean
//    isMain                         → boolean (true = superuser, bypasses all checks)
//    loading                        → boolean (true while fetch is in flight)
//
//  BACKEND ENDPOINT:
//    GET /authapp/my-permissions/
//    Response shape: { is_main: bool, permissions: [{ feature, action }, ...] }
// ===============================================================

import { useState, useEffect } from "react";

export function usePermissions() {
  // null = fetch not yet complete (used to distinguish "loading" from "empty")
  // []   = fetch complete, user has no permissions (or fetch failed)
  // [...] = fetch complete, populated with permission objects
  const [permissions, setPermissions] = useState(null);

  // true when the backend marks this user as the main/superuser account.
  // Main users bypass all permission checks — hasPermission() always returns true for them.
  const [isMain, setIsMain] = useState(false);

  useEffect(() => {
    // Read the JWT access token stored at login
    const token = localStorage.getItem("accessToken");

    fetch("http://127.0.0.1:8000/authapp/my-permissions/", {
      credentials: "include", // send cookies alongside the JWT header
      headers: token
        ? { Authorization: `Bearer ${token}` } // authenticated request
        : {},                                   // unauthenticated — server will return 401
    })
      .then((res) => {
        // Throw so the .catch() block handles 401, 403, and network errors uniformly
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => {
        setIsMain(data.is_main);
        // Fallback to empty array if the key is missing in the response
        setPermissions(data.permissions || []);
      })
      .catch(() => {
        // On any error (network failure, 401, etc.) deny all permissions.
        // Setting [] instead of null exits the loading state.
        setPermissions([]);
      });
  }, []); // runs once on mount — permissions are re-fetched on full page load

  // ── hasPermission ───────────────────────────────────────────────────────────
  // Checks whether the current user is allowed to perform `action` on `feature`.
  //
  // Three cases:
  //   1. permissions === null  → still loading, return true optimistically
  //      (avoids flashing hidden UI while the fetch completes)
  //   2. isMain === true       → superuser, always allow
  //   3. otherwise             → scan the permissions array for an exact match
  //
  // feature: string — matches `p.feature` from the API (e.g. "tasks", "files")
  // action:  string — matches `p.action`  from the API (e.g. "create", "delete")
  const hasPermission = (feature, action) => {
    if (permissions === null) return true; // still loading → optimistic allow
    if (isMain) return true;               // superuser → always allow
    return permissions.some(
      (p) => p.feature === feature && p.action === action
    );
  };

  return {
    hasPermission,
    isMain,
    loading: permissions === null, // true only while the initial fetch is in flight
  };
}