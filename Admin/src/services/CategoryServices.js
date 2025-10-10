import requests from "./httpService";

const CategoryServices = {
  getAllCategory: async () => {
    // Return mock categories for now
    return [
      {
        _id: "1",
        id: 1,
        name: { en: "Electronics" },
        slug: "electronics",
        status: "show",
        icon: "🔌",
        children: []
      },
      {
        _id: "2", 
        id: 2,
        name: { en: "Clothing" },
        slug: "clothing",
        status: "show",
        icon: "👕",
        children: []
      },
      {
        _id: "3",
        id: 3,
        name: { en: "Home & Garden" },
        slug: "home-garden", 
        status: "show",
        icon: "🏠",
        children: []
      },
      {
        _id: "4",
        id: 4,
        name: { en: "Sports" },
        slug: "sports",
        status: "show", 
        icon: "⚽",
        children: []
      }
    ];
    
    // Real API call - uncomment when backend is ready
    // return requests.get("/category");
  },

  getAllCategories: async () => {
    return requests.get("/category/all");
  },

  getCategoryById: async (id) => {
    return requests.get(`/category/${id}`);
  },

  addCategory: async (body) => {
    return requests.post("/category/add", body);
  },

  addAllCategory: async (body) => {
    return requests.post("/category/add/all", body);
  },

  updateCategory: async (id, body) => {
    return requests.put(`/category/${id}`, body);
  },

  updateStatus: async (id, body) => {
    return requests.put(`/category/status/${id}`, body);
  },

  deleteCategory: async (id, body) => {
    return requests.delete(`/category/${id}`, body);
  },

  updateManyCategory: async (body) => {
    return requests.patch("/category/update/many", body);
  },

  deleteManyCategory: async (body) => {
    return requests.patch("/category/delete/many", body);
  },
};

export default CategoryServices;
