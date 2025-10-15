import requests from "./httpService";

const OrderServices = {
  getAllOrders: async ({
    body,
    headers,
    customerName,
    status,
    page = 1,
    limit = 8,
    day,
    startDate,
    endDate,
  }) => {
    const searchName = customerName !== null ? customerName : "";
    const searchStatus = status !== null ? status : "";
    const searchDay = day !== null ? day : "";
    const startD = startDate !== null ? startDate : "";
    const endD = endDate !== null ? endDate : "";

    // Temporarily use test endpoint for debugging
    return requests.get(
      `/api/v1/admin/orders/test?customerName=${searchName}&status=${searchStatus}&day=${searchDay}&page=${page}&limit=${limit}&startDate=${startD}&endDate=${endD}`,
      body,
      headers
    );
  },

  getAllOrdersTwo: async ({ invoice, body, headers }) => {
    const searchInvoice = invoice !== null ? invoice : "";
    return requests.get(`/api/v1/admin/orders?search=${searchInvoice}`, body, headers);
  },

  getRecentOrders: async ({
    page = 1,
    limit = 8,
    startDate = "1:00",
    endDate = "23:59",
  }) => {
    return requests.get(
      `/api/v1/admin/orders?page=${page}&limit=${limit}&startDate=${startDate}&endDate=${endDate}`
    );
  },

  getOrderCustomer: async (id, body) => {
    return requests.get(`/api/v1/admin/orders/customer/${id}`, body);
  },

  getOrderById: async (id, body) => {
    return requests.get(`/api/v1/admin/orders/${id}`, body);
  },

  updateOrder: async (id, body, headers) => {
    return requests.put(`/api/v1/admin/orders/${id}`, body, headers);
  },

  updateOrderStatus: async (id, status, headers) => {
    return requests.put(`/api/v1/admin/orders/${id}/status`, { status }, headers);
  },

  deleteOrder: async (id) => {
    return requests.delete(`/api/v1/admin/orders/${id}`);
  },

  getDashboardOrdersData: async ({
    page = 1,
    limit = 8,
    endDate = "23:59",
  }) => {
    return requests.get(
      `/api/v1/admin/orders/dashboard/stats?page=${page}&limit=${limit}&endDate=${endDate}`
    );
  },

  getDashboardAmount: async () => {
    return requests.get("/api/v1/admin/orders/dashboard/stats");
  },

  getDashboardCount: async () => {
    return requests.get("/api/v1/admin/orders/dashboard/stats");
  },

  getDashboardRecentOrder: async ({ page = 1, limit = 8 }) => {
    return requests.get(
      `/api/v1/admin/orders/dashboard/stats?page=${page}&limit=${limit}`
    );
  },

  getBestSellerProductChart: async () => {
    return requests.get("/api/v1/admin/products/best-sellers");
  },
};

export default OrderServices;
