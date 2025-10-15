
// Frontend/src/Features/Cart/cartSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import CartService from "../../services/CartService";

const initialState = {
  items: [],
  totalAmount: 0,
  loading: false,
  error: null,
  isAuthenticated: false,
  serverSynced: false
};

const MAX_QUANTITY = 20;

// Async thunks for server operations
export const fetchCart = createAsyncThunk(
  'cart/fetchCart',
  async (_, { rejectWithValue }) => {
    try {
      const cart = await CartService.getCart();
      return cart;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const addToCartServer = createAsyncThunk(
  'cart/addToServer',
  async ({ variantId, quantity }, { rejectWithValue }) => {
    try {
      const result = await CartService.addToCart(variantId, quantity);
      // Fetch updated cart after adding
      const cart = await CartService.getCart();
      return cart;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateCartItemServer = createAsyncThunk(
  'cart/updateServer',
  async ({ itemId, quantity }, { rejectWithValue }) => {
    try {
      await CartService.updateCartItem(itemId, quantity);
      // Fetch updated cart after updating
      const cart = await CartService.getCart();
      return cart;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const removeFromCartServer = createAsyncThunk(
  'cart/removeFromServer',
  async (itemId, { rejectWithValue }) => {
    try {
      await CartService.removeFromCart(itemId);
      // Fetch updated cart after removing
      const cart = await CartService.getCart();
      return cart;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const syncCartWithServer = createAsyncThunk(
  'cart/syncWithServer',
  async (localItems, { rejectWithValue }) => {
    try {
      const cart = await CartService.syncCart(localItems);
      return cart;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    // Local cart operations (for offline use)
    addToCart(state, action) {
      const product = action.payload;
      const existingItem = state.items.find(
        (item) => item.productID === product.productID
      );
      if (existingItem) {
        if (existingItem.quantity < MAX_QUANTITY) {
          existingItem.quantity += 1;
          state.totalAmount += product.productPrice;
        }
      } else {
        state.items.push({ ...product, quantity: 1 });
        state.totalAmount += product.productPrice;
      }
      state.serverSynced = false;
    },
    
    updateQuantity(state, action) {
      const { productID, quantity } = action.payload;
      const itemToUpdate = state.items.find(
        (item) => item.productID === productID
      );
      if (itemToUpdate) {
        const difference = quantity - itemToUpdate.quantity;
        if (quantity <= MAX_QUANTITY) {
          itemToUpdate.quantity = quantity;
          state.totalAmount += difference * itemToUpdate.productPrice;
        } else {
          itemToUpdate.quantity = MAX_QUANTITY;
          state.totalAmount +=
            (MAX_QUANTITY - itemToUpdate.quantity) * itemToUpdate.productPrice;
        }
      }
      state.serverSynced = false;
    },
    
    removeFromCart(state, action) {
      const productId = action.payload;
      const itemToRemove = state.items.find(
        (item) => item.productID === productId
      );
      if (itemToRemove) {
        state.totalAmount -= itemToRemove.productPrice * itemToRemove.quantity;
        state.items = state.items.filter(
          (item) => item.productID !== productId
        );
      }
      state.serverSynced = false;
    },

    // Set authentication status
    setAuthenticated(state, action) {
      state.isAuthenticated = action.payload;
    },

    // Clear cart
    clearCart(state) {
      state.items = [];
      state.totalAmount = 0;
      state.serverSynced = false;
    },

    // Set cart from server data
    setCartFromServer(state, action) {
      const serverCart = action.payload;
      state.items = CartService.transformServerCartToLocal(serverCart);
      state.totalAmount = serverCart.subtotal || 0;
      state.serverSynced = true;
    },

    // Clear error
    clearError(state) {
      state.error = null;
    }
  },
  
  extraReducers: (builder) => {
    builder
      // Fetch cart
      .addCase(fetchCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.loading = false;
        state.items = CartService.transformServerCartToLocal(action.payload);
        state.totalAmount = action.payload.subtotal || 0;
        state.serverSynced = true;
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Add to cart server
      .addCase(addToCartServer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addToCartServer.fulfilled, (state, action) => {
        state.loading = false;
        state.items = CartService.transformServerCartToLocal(action.payload);
        state.totalAmount = action.payload.subtotal || 0;
        state.serverSynced = true;
      })
      .addCase(addToCartServer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update cart item server
      .addCase(updateCartItemServer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCartItemServer.fulfilled, (state, action) => {
        state.loading = false;
        state.items = CartService.transformServerCartToLocal(action.payload);
        state.totalAmount = action.payload.subtotal || 0;
        state.serverSynced = true;
      })
      .addCase(updateCartItemServer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Remove from cart server
      .addCase(removeFromCartServer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeFromCartServer.fulfilled, (state, action) => {
        state.loading = false;
        state.items = CartService.transformServerCartToLocal(action.payload);
        state.totalAmount = action.payload.subtotal || 0;
        state.serverSynced = true;
      })
      .addCase(removeFromCartServer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Sync cart with server
      .addCase(syncCartWithServer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(syncCartWithServer.fulfilled, (state, action) => {
        state.loading = false;
        state.items = CartService.transformServerCartToLocal(action.payload);
        state.totalAmount = action.payload.subtotal || 0;
        state.serverSynced = true;
      })
      .addCase(syncCartWithServer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { 
  addToCart, 
  removeFromCart, 
  updateQuantity, 
  setAuthenticated, 
  clearCart, 
  setCartFromServer,
  clearError 
} = cartSlice.actions;

export const selectCartItems = (state) => state.cart.items;
export const selectCartTotalAmount = (state) => state.cart.totalAmount;
export const selectCartLoading = (state) => state.cart.loading;
export const selectCartError = (state) => state.cart.error;
export const selectCartAuthenticated = (state) => state.cart.isAuthenticated;
export const selectCartServerSynced = (state) => state.cart.serverSynced;

export default cartSlice.reducer;
