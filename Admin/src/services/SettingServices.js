import requests from "./httpService";

const SettingServices = {
  // global setting all function
  addGlobalSetting: async (body) => {
    return requests.post("/setting/global/add", body);
  },

  getGlobalSetting: async () => {
    // Return mock data for now
    return {
      default_currency: '৳',
      app_name: 'Swift Shop',
      app_version: '1.0.0'
    };
    
    // Comment out real API call for now
    // return requests.get("/setting/global/all");
  },

  updateGlobalSetting: async (body) => {
    return requests.put(`/setting/global/update`, body);
  },
};

export default SettingServices;
