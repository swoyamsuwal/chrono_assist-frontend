// ===============================================================
//  services/apiService.js
//  Centralized API client for all backend communication
//
//  STRUCTURE:
//  ApiService is a static class that groups sub-classes by feature module.
//  Each sub-class maps to one Django app's endpoints.
//
//  Currently registered modules:
//   ApiService.SubmitForm → CRUD for authapp form submissions
//
//  WHY STATIC CLASSES?
//  No instantiation needed — all methods are called directly:
//   ApiService.SubmitForm.getAll()
//   ApiService.SubmitForm.create(data)
//  This keeps call sites clean and avoids passing service instances around.
//
//  CREDENTIALS:
//  credentials: "include" → sends the session cookie with every mutating request
//  (POST / PUT / DELETE) so Django's IsAuthenticated check passes.
//  GET requests that are public don't need credentials.
// ===============================================================


// ---------------- Step 0: Base URL ----------------
// Single source of truth for the backend origin
// Change this one line to point at staging or production
const BASE_URL = "http://localhost:8000/authapp/";


// ================================================================
//  Class: ApiService
//  Top-level namespace — all feature modules are nested inside as
//  static inner classes so imports stay simple:
//   import ApiService from "@/services/apiService"
//   ApiService.SubmitForm.getAll()
// ================================================================
export default class ApiService {

  // ==============================================================
  //  Module: SubmitForm
  //  Handles all CRUD operations for the form submission endpoints
  //  Maps to Django's authapp form views:
  //
  //   getAll()        → GET  /authapp/forms/
  //   getOne(id)      → GET  /authapp/forms/<id>/
  //   create(data)    → POST /authapp/forms/create/
  //   update(id,data) → PUT  /authapp/forms/update/<id>/
  //   delete(id)      → DELETE /authapp/forms/delete/<id>/
  // ==============================================================
  static SubmitForm = class {

    // ============================================================
    //  Method: getAll
    //  Fetches the full list of submitted forms
    //  No credentials needed → public read endpoint
    //  Returns: Array of form objects
    // ============================================================
    static async getAll() {
      // ---------------- Step 1: Fetch All Forms ----------------
      const res = await fetch(`${BASE_URL}forms/`);

      // Non-2xx response → throw so the caller can handle it (show toast, etc.)
      if (!res.ok) throw new Error("Failed to fetch forms");

      return res.json();
    }


    // ============================================================
    //  Method: getOne
    //  Fetches a single form by its ID
    //  No credentials needed → public read endpoint
    //  Returns: A single form object
    // ============================================================
    static async getOne(id) {
      // ---------------- Step 1: Fetch Single Form ----------------
      const res = await fetch(`${BASE_URL}forms/${id}/`);

      if (!res.ok) throw new Error("Failed to fetch form");

      return res.json();
    }


    // ============================================================
    //  Method: create
    //  Creates a new form submission
    //  credentials: "include" → sends session cookie so Django
    //  knows which authenticated user is submitting the form
    //  Returns: The newly created form object
    // ============================================================
    static async create(data) {
      // ---------------- Step 1: POST New Form Data ----------------
      const res = await fetch(`${BASE_URL}forms/create/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }, // Tell Django to parse body as JSON
        body: JSON.stringify(data),                       // Serialize the form payload
        credentials: "include",                           // Include session cookie for auth
      });

      if (!res.ok) throw new Error("Failed to create form");

      return res.json(); // Returns the created object with its new ID
    }


    // ============================================================
    //  Method: update
    //  Fully replaces an existing form by ID (PUT = full replacement)
    //  Use this when all fields are re-submitted from the edit form
    //  For partial updates, a PATCH version would be more appropriate
    //  Returns: The updated form object
    // ============================================================
    static async update(id, data) {
      // ---------------- Step 1: PUT Updated Form Data ----------------
      const res = await fetch(`${BASE_URL}forms/update/${id}/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include", // Auth required — only the owner should update
      });

      if (!res.ok) throw new Error("Failed to update form");

      return res.json(); // Returns the updated object
    }


    // ============================================================
    //  Method: delete
    //  Permanently removes a form by ID
    //  credentials: "include" → Django verifies the user owns the form
    //  Returns: Confirmation response from Django (usually { "status": "deleted" })
    // ============================================================
    static async delete(id) {
      // ---------------- Step 1: DELETE Form by ID ----------------
      const res = await fetch(`${BASE_URL}forms/delete/${id}/`, {
        method: "DELETE",
        credentials: "include", // Auth required — only the owner/admin can delete
      });

      if (!res.ok) throw new Error("Failed to delete form");

      return res.json();
    }
  };
}