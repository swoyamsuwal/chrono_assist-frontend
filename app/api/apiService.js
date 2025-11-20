const BASE_URL = "http://localhost:8000/authapp/";

export default class ApiService {
  // ----------- SUBMIT FORMS -----------
  static SubmitForm = class {
    static async getAll() {
      const res = await fetch(`${BASE_URL}forms/`);
      if (!res.ok) throw new Error("Failed to fetch forms");
      return res.json();
    }

    static async getOne(id) {
      const res = await fetch(`${BASE_URL}forms/${id}/`);
      if (!res.ok) throw new Error("Failed to fetch form");
      return res.json();
    }

    static async create(data) {
      const res = await fetch(`${BASE_URL}forms/create/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create form");
      return res.json();
    }

    static async update(id, data) {
      const res = await fetch(`${BASE_URL}forms/update/${id}/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update form");
      return res.json();
    }

    static async delete(id) {
      const res = await fetch(`${BASE_URL}forms/delete/${id}/`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete form");
      return res.json();
    }
  };
}
