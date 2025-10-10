// Frontend/src/Features/Products/productsSlice.js

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async () => {
    const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000';
    const response = await fetch(`${API_BASE}/api/v1/products`);
    const data = await response.json();
    
    // Handle the new response format: { success: true, data: products, pagination: {...} }
    if (data.success) {
      return data.data; // New backend returns products in data field
    } else {
      throw new Error(data.message || 'Failed to fetch products');
    }
  }
);

const productsSlice = createSlice({
  name: 'products',
  initialState: {
    products: [], // Initialize products as an empty array
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload; // Save fetched products to the state
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export const selectProducts = (state) => state.products.products; // Correct selector
export const selectLoading = (state) => state.products.loading;
export const selectError = (state) => state.products.error;

export default productsSlice.reducer;