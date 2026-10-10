import axios from "axios";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://192.168.100.253:5000/api";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// Tambahkan token JWT secara otomatis pada setiap request.
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Users ───────────────────────────────────────────────────────────────────

export const getUsers = (params?: Record<string, string>) =>
  api.get("/users", { params }).then((r) => r.data);

export const getPicUsers = () => api.get("/users/pic").then((r) => r.data);

export const createUser = (data: any) =>
  api.post("/users", data).then((r) => r.data);

export const updateUser = (id: string, data: any) =>
  api.put(`/users/${id}`, data).then((r) => r.data);

export const deleteUser = (id: string) =>
  api.delete(`/users/${id}`).then((r) => r.data);

// ─── Equipment (Investment) ──────────────────────────────────────────────────

export const getEquipment = (params?: Record<string, string>) =>
  api.get("/equipment", { params }).then((r) => r.data);

export const getEquipmentById = (id: string) =>
  api.get(`/equipment/${id}`).then((r) => r.data);

export const createEquipment = (data: any) =>
  api.post("/equipment", data).then((r) => r.data);

export const updateEquipment = (id: string, data: any) =>
  api.put(`/equipment/${id}`, data).then((r) => r.data);

export const deleteEquipment = (id: string) =>
  api.delete(`/equipment/${id}`).then((r) => r.data);

export const requestBorrowEquipment = (
  id: string,
  data: { expectedReturnDate: string; notes?: string },
) => api.post(`/equipment/${id}/request-borrow`, data).then((r) => r.data);

export const returnEquipment = (id: string) =>
  api.post(`/equipment/${id}/return`).then((r) => r.data);

export const sendReminder = (recordId: string) =>
  api.post(`/equipment/borrow-record/${recordId}/remind`).then((r) => r.data);

// ─── Borrow Requests (PIC Approval) ──────────────────────────────────────────

export const getBorrowRequests = (params?: Record<string, string>) =>
  api.get("/equipment/borrow-requests", { params }).then((r) => r.data);

export const approveBorrowRequest = (requestId: string, picId: string) =>
  api
    .post(`/equipment/borrow-request/${requestId}/approve`, { picId })
    .then((r) => r.data);

export const rejectBorrowRequest = (
  requestId: string,
  picId: string,
  reason?: string,
) =>
  api
    .post(`/equipment/borrow-request/${requestId}/reject`, { picId, reason })
    .then((r) => r.data);

export const exportEquipmentExcel = () =>
  api.get("/equipment/export", { responseType: "blob" }).then((r) => r.data);

export const exportConsumableExcel = () =>
  api.get("/consumables/export", { responseType: "blob" }).then((r) => r.data);

export const downloadEquipmentTemplate = () =>
  api.get("/equipment/template", { responseType: "blob" }).then((r) => r.data);

export const bulkUploadEquipment = (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return api
    .post("/equipment/bulk-upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

// ─── Consumables (Expense) ──────────────────────────────────────────────────

export const getConsumables = (params?: Record<string, string>) =>
  api.get("/consumables", { params }).then((r) => r.data);

export const getConsumable = (id: string) =>
  api.get(`/consumables/${id}`).then((r) => r.data);

export const createConsumable = (data: any) =>
  api.post("/consumables", data).then((r) => r.data);

export const updateConsumable = (id: string, data: any) =>
  api.put(`/consumables/${id}`, data).then((r) => r.data);

export const deleteConsumable = (id: string) =>
  api.delete(`/consumables/${id}`).then((r) => r.data);

export const restockConsumable = (
  id: string,
  data: { quantity: number; notes?: string; performedBy?: string },
) => api.post(`/consumables/${id}/restock`, data).then((r) => r.data);

export const getConsumableStockMovements = (id: string, limit = 50) =>
  api
    .get(`/consumables/${id}/stock-movements?limit=${limit}`)
    .then((r) => r.data);

// ─── Planned Items ────────────────────────────────────────────────────────────

export const getPlannedItems = (params?: Record<string, string>) =>
  api.get("/planned-items", { params }).then((r) => r.data);

export const togglePlannedPurchased = (id: string) =>
  api.put(`/planned-items/${id}/toggle-purchased`).then((r) => r.data);

export const addCustomPlannedItem = (data: {
  name: string;
  brand?: string;
  quantity: number;
  price?: string;
}) =>
  api
    .post("/requests/cart/add", {
      customName: data.name,
      customBrand: data.brand,
      quantity: data.quantity,
      customPrice: data.price,
    })
    .then((r) => r.data);

// ─── Requests ────────────────────────────────────────────────────────────────

export const getRequests = (params?: Record<string, string>) =>
  api.get("/requests", { params }).then((r) => r.data);

export const getRequest = (id: string) =>
  api.get(`/requests/${id}`).then((r) => r.data);

export const getUserDraft = () =>
  api.get("/requests/user/me/draft").then((r) => r.data);

export const addToCart = (data: { consumableId: string; quantity: number }) =>
  api.post("/requests/cart/add", data).then((r) => r.data);

export const removeFromCart = (itemId: string) =>
  api.post("/requests/cart/remove", { itemId }).then((r) => r.data);

export const updateCartItem = (itemId: string, quantity: number) =>
  api.post("/requests/cart/update", { itemId, quantity }).then((r) => r.data);

export const submitRequest = (
  id: string,
  requestType?: string,
  notes?: string,
) =>
  api
    .post(`/requests/${id}/submit`, { requestType, notes })
    .then((r) => r.data);

export const approveAdmin = (id: string, adminId: string) =>
  api.post(`/requests/${id}/approve-admin`, { adminId }).then((r) => r.data);

export const approveAdmin2 = (id: string, adminId: string) =>
  api.post(`/requests/${id}/approve-admin2`, { adminId }).then((r) => r.data);

export const rejectRequest = (id: string, adminId: string, reason?: string) =>
  api.post(`/requests/${id}/reject`, { adminId, reason }).then((r) => r.data);

// ─── Dashboard ───────────────────────────────────────────────────────────────

export const getInvestmentDashboard = () =>
  api.get("/dashboard/investment").then((r) => r.data);

export const getExpenseDashboard = () =>
  api.get("/dashboard/expense").then((r) => r.data);

// ─── Borrow Records (listing) ────────────────────────────────────────────────

export const getBorrowRecords = (params?: Record<string, string>) =>
  api.get("/equipment/borrow-records", { params }).then((r) => r.data);

export const getOverdueRecords = () =>
  api.get("/borrow-records/overdue").then((r) => r.data);

export const getPendingReminders = () =>
  api.get("/borrow-records/reminders-pending").then((r) => r.data);

export default api;
