// app/profile/page.jsx
"use client";

import { useEffect, useState } from "react";
import SideBarLayout from "../components/Side_bar";

const API_BASE = "http://127.0.0.1:8000";

function getAccessToken() {
  return typeof window !== "undefined"
    ? localStorage.getItem("accessToken")
    : null;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({
    username: "",
    first_name: "",
    last_name: "",
  });

  const [uploadingImage, setUploadingImage] = useState(false);

  // Load profile on mount
  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }

async function fetchProfile() {
  setLoading(true);
  try {
    const res = await fetch(`${API_BASE}/authapp/profile/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log("profile status", res.status);

    if (!res.ok) {
      console.error("Failed to load profile", res.status);
      return;
    }

    const data = await res.json();
    console.log("profile data", data);
    console.log("picture URL:", data.profile_picture_url);

    setProfile(data);
    setForm({
      username: data.username || "",
      first_name: data.first_name || "",
      last_name: data.last_name || "",
      profile_picture_url: data.profile_picture_url || "",
    });
  } catch (e) {
    console.error("Profile error:", e);
  } finally {
    setLoading(false);
  }
}


    fetchProfile();
  }, []);

  // Upload / change image on main page
  async function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const token = getAccessToken();
    if (!token) {
      console.error("No token");
      return;
    }

    const formData = new FormData();
    formData.append("profile_picture", file);

    try {
      setUploadingImage(true);
      const res = await fetch(`${API_BASE}/authapp/profile/`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      if (!res.ok) {
        console.error("Image upload failed");
        return;
      }
      const data = await res.json();
      setProfile(data);
    } catch (e) {
      console.error("Image upload error:", e);
    } finally {
      setUploadingImage(false);
    }
  }

  // Save username / first_name / last_name
  async function handleSaveProfile(e) {
    e.preventDefault();
    const token = getAccessToken();
    if (!token) {
      console.error("No token");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/authapp/profile/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        console.error("Profile update failed");
        return;
      }
      const data = await res.json();
      setProfile(data);
      setEditOpen(false);
    } catch (e) {
      console.error("Profile update error:", e);
    }
  }

  if (loading) {
    return (
      <SideBarLayout>
        <div className="p-6 text-gray-300">Loading profile...</div>
      </SideBarLayout>
    );
  }

  if (!profile) {
    return (
      <SideBarLayout>
        <div className="p-6 text-gray-300">
          No profile loaded. Please log in again.
        </div>
      </SideBarLayout>
    );
  }

  return (
    <SideBarLayout>
      <div className="max-w-3xl mx-auto p-6 bg-gray-800 border border-gray-700 rounded-lg">
        <h1 className="text-2xl font-bold text-white mb-4">Profile</h1>

        <div className="flex gap-6 items-start">
          {/* Picture + upload */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-32 h-32 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center">
              {profile.profile_picture_url ? (
                <img
                  src={profile.profile_picture_url}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-gray-400 text-sm">No image</span>
              )}
            </div>

            <label className="inline-block text-sm px-3 py-1 rounded bg-blue-500 text-white cursor-pointer hover:bg-blue-600">
              {uploadingImage ? "Uploading..." : "Upload / Change photo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
                disabled={uploadingImage}
              />
            </label>
          </div>

          {/* Text info + edit button */}
          <div className="flex-1 space-y-2">
            <div className="text-gray-300">
              <span className="font-semibold">Username:</span>{" "}
              {profile.username || "-"}
            </div>
            <div className="text-gray-300">
              <span className="font-semibold">First name:</span>{" "}
              {profile.first_name || "-"}
            </div>
            <div className="text-gray-300">
              <span className="font-semibold">Last name:</span>{" "}
              {profile.last_name || "-"}
            </div>

            <button
              onClick={() => setEditOpen(true)}
              className="mt-4 px-4 py-2 rounded bg-gray-200 text-gray-900 text-sm font-semibold hover:bg-white"
            >
              Edit profile
            </button>
          </div>
        </div>

        {/* Edit popup */}
        {editOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-md">
              <h2 className="text-lg font-semibold text-white mb-4">
                Edit profile
              </h2>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        username: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 rounded bg-gray-800 text-gray-100 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">
                    First name
                  </label>
                  <input
                    type="text"
                    value={form.first_name}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        first_name: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 rounded bg-gray-800 text-gray-100 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">
                    Last name
                  </label>
                  <input
                    type="text"
                    value={form.last_name}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        last_name: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 rounded bg-gray-800 text-gray-100 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setEditOpen(false)}
                    className="px-4 py-2 rounded bg-gray-700 text-gray-100 text-sm hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </SideBarLayout>
  );
}
