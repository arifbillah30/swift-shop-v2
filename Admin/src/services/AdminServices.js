import requests from "./httpService";

const AdminServices = {
  registerAdmin: async (body) => {
    return requests.post("/api/v1/admin/auth/register", body);
  },

  loginAdmin: async (body) => {
    return requests.post("/api/v1/admin/auth/login", body);
  },

  forgetPassword: async (body) => {
    return requests.put("/api/v1/admin/auth/forget-password", body);
  },

  resetPassword: async (body) => {
    return requests.put("/api/v1/admin/auth/reset-password", body);
  },

  signUpWithProvider: async (body) => {
    return requests.post("/api/v1/admin/auth/register", body);
  },

  addStaff: async (body) => {
    return requests.post("/api/v1/admin/auth/staff", body);
  },
  getAllStaff: async (body) => {
    return requests.get("/api/v1/admin/auth/staff", body);
  },
  getStaffById: async (id, body) => {
    return requests.get(`/api/v1/admin/auth/staff/${id}`, body);
  },

  updateStaff: async (id, body) => {
    return requests.put(`/api/v1/admin/auth/staff/${id}`, body);
  },

  updateStaffStatus: async (id, body) => {
    return requests.put(`/api/v1/admin/auth/staff/${id}/status`, body);
  },

  deleteStaff: async (id) => {
    return requests.delete(`/api/v1/admin/auth/staff/${id}`);
  },
};

export default AdminServices;