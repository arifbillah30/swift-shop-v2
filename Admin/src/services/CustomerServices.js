import requests from "./httpService";

const CustomerServices = {
  getAllCustomers: async ({ searchText = "" } = {}) => {
    const response = await requests.get(`/customer?searchText=${searchText}`);
    // Extract customers array from response
    return response.customers || [];
  },

  addAllCustomers: async (body) => {
    return requests.post("/customer/add/all", body);
  },
  // user create
  createCustomer: async (body) => {
    return requests.post(`/customer/create`, body);
  },

  filterCustomer: async (email) => {
    return requests.post(`/customer/filter/${email}`);
  },

  getCustomerById: async (id) => {
    const response = await requests.get(`/customer/${id}`);
    // Extract customer from response
    return response.customer || response;
  },

  updateCustomer: async (id, body) => {
    return requests.put(`/customer/${id}`, body);
  },

  deleteCustomer: async (id) => {
    return requests.delete(`/customer/${id}`);
  },
};

export default CustomerServices;
