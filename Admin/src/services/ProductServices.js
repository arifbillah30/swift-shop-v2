// swift-shop-v2/Admin/src/services/ProductServices.js

import requests from "./httpService";

const ProductServices = {

  //Admin list: GET /api/v1/admin/products

  getAllProducts: async ({ page, limit, category, title, price }) => {
    const searchCategory = category ?? "";
    const searchTitle = title ?? "";
    const searchPrice = price ?? "";

    const params = new URLSearchParams({
      page: page || '1',
      limit: limit || '10',
      category: searchCategory,
      title: searchTitle,
      price: searchPrice
    });

    try {
      const data = await requests.get(`/api/v1/admin/products?${params}`);

      // normalize payload
      const productsRaw =
        (data?.success && Array.isArray(data?.data)) ? data.data
        : Array.isArray(data?.products) ? data.products
        : [];

      const transformedProducts = productsRaw.map((p) => ({
        _id: p.id,
        id: p.id, // Include both _id and id for compatibility
        name: p.name, // Add name field that component expects
        title: { en: p.name },
        primary_image: p.primary_image, // Add primary_image field
        image: [p.primary_image],
        category_name: p.category_name, // Add category_name field
        category: { name: { en: p.category_name } },
        price: Number(p.price ?? p.min_price ?? 0), // Add price field
        prices: {
          // prefer sale/min price if backend computed it; fallback to price
          price: Number(
            p.price ?? p.min_price ?? p.price ?? 0
          ),
          originalPrice: Number(
            p.price ?? p.min_price ?? p.price ?? 0
          ),
        },
        stock: p.total_stock ?? 0,
        total_stock: p.total_stock ?? 0, // Add total_stock field
        status: p.status || "active",
      }));

      return {
        products: transformedProducts,
        totalDoc: data?.pagination?.total ?? transformedProducts.length,
        totalPages: data?.pagination?.pages ?? 1,
        error: false,
        message: null,
      };
    } catch (error) {
      console.error("Error fetching products:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);
      return {
        products: [],
        totalDoc: 0,
        totalPages: 0,
        error: true,
        message: error.response?.data?.message || error.message || "Database connection failed: cannot reach API",
      };
    }
  },

  /**
   * Admin detail: GET /api/v1/admin/products/:id
   * Returns a transformed single product suitable for the admin editor
   */
  getProductById: async (id) => {
    try {
      const p = await requests.get(`/api/v1/admin/products/${id}`);

      // Handle new API response format
      const productData = p.success ? p.data : p;

      // Parse tags from DB JSON if needed
      let tags = [];
      if (Array.isArray(productData.tags)) {
        tags = productData.tags;
      } else if (typeof productData.tags === "string") {
        try {
          const parsed = JSON.parse(productData.tags);
          tags = Array.isArray(parsed) ? parsed : [];
        } catch {
          tags = [];
        }
      }

      const transformedProduct = {
        _id: productData.id,
        title: { en: productData.name || "Untitled Product" },
        description: { en: productData.description || "" },
        slug: productData.slug || "",
        sku: productData.sku || "",
        barcode: productData.barcode || "",
        stock: productData.total_stock || 0,
        productId: productData.id,
        prices: {
          price: productData.price || 0,
          originalPrice: productData.price || 0,
        },
        show: productData.status === "active",
        image: Array.isArray(productData.images) ? productData.images.map((img) => img.url) : [],
        tag: tags,
        categories: productData.category_name
          ? [
              {
                _id: productData.category_id,
                name: { en: productData.category_name },
              },
            ]
          : [],
        category: productData.category_name
          ? {
              _id: productData.category_id,
              name: { en: productData.category_name },
            }
          : null,
        variants: productData.variants || [],
        isCombination: false,
        featured: !!productData.featured,
      };

      return transformedProduct;
    } catch (error) {
      console.error("Error fetching product by ID:", error);
      throw error;
    }
  },

  /**
   * Admin update: PUT /api/v1/admin/products/:id
   * Send FormData aligned with backend schema
   */
  // Admin/src/services/ProductServices.js

updateProduct: async (id, body) => {
  try {
    const formData = new FormData();

    // Basic product info
    const title = body.title?.en || body.title || "Untitled Product";
    formData.append("name", title);
    formData.append("description", body.description?.en || body.description || "");
    formData.append("price", body.prices?.price ?? body.price ?? 0);
    formData.append("discount_price", body.discount_price ?? 0);

    // Category handling
    let categoryId = null;
    if (body.category?._id) categoryId = body.category._id;
    else if (body.category) categoryId = body.category;
    else if (Array.isArray(body.categories) && body.categories.length > 0) {
      categoryId = body.categories[0]._id ?? body.categories[0];
    }
    if (categoryId != null) formData.append("category_id", categoryId);

    // Status / featured / sku
    formData.append("status", body.show ? "active" : "draft");
    formData.append("featured", body.featured ? "true" : "false");
    formData.append("sku", body.sku || "");

    // Tags (JSON string)
    if (body.tag != null) {
      const tags = Array.isArray(body.tag) ? body.tag : [body.tag];
      formData.append("tags", JSON.stringify(tags));
    }

    // 🔧 IMPORTANT: send quantity when updating
    // Accept quantity from body.quantity OR body.stock OR body.total_stock
    const qtyRaw = body.quantity ?? body.stock ?? body.total_stock;
    if (qtyRaw !== undefined && qtyRaw !== null && String(qtyRaw).trim() !== "") {
      formData.append("quantity", Number(qtyRaw));
      // Also append as 'stock' for backward compatibility
      formData.append("stock", Number(qtyRaw));
      formData.append("total_stock", Number(qtyRaw));
    }

    // (Optional) if you allow editing variants here, send them too
    if (Array.isArray(body.variants) && body.variants.length > 0) {
      formData.append("variants", JSON.stringify(body.variants));
    }

    const result = await requests.put(`/api/v1/admin/products/${id}`, formData);

    return result?.success ? result.data : result;
  } catch (error) {
    console.error("Error updating product:", error);
    throw error;
  }
},


  /**
   * Admin create: POST /api/v1/admin/products
   * Send FormData aligned with backend schema
   */
  addProduct: async (body) => {
    try {
      const formData = new FormData();

      // Basic product info (match backend)
      const title = body.title?.en || body.title || "Untitled Product";
      formData.append("name", title);
      formData.append("description", body.description?.en || body.description || "");
      formData.append("price", body.prices?.price ?? body.price ?? 0);
      formData.append("discount_price", body.discount_price ?? 0);

      // Category
      if (body.category != null) {
        formData.append("category_id", body.category);
      } else if (Array.isArray(body.categories) && body.categories.length > 0) {
        formData.append("category_id", body.categories[0]);
      }

      // Other fields matching backend
      formData.append("status", body.show ? "active" : "active"); // default active
      formData.append("featured", body.featured ? "true" : "false");
      formData.append("sku", body.sku || "");
      
      // Add stock field for inventory
      if (body.stock != null) {
        formData.append("stock", body.stock);
      }

      // Tags -> JSON string
      if (body.tag != null) {
        const tags = Array.isArray(body.tag) ? body.tag : [body.tag];
        formData.append("tags", JSON.stringify(tags));
      }

      // Variants (optional) -> send as JSON string if present
      if (body.variants && Array.isArray(body.variants)) {
        formData.append("variants", JSON.stringify(body.variants));
      }

      // Images: prefer actual files if you staged them in window.pendingProductImages
      if (typeof window !== "undefined" && Array.isArray(window.pendingProductImages) && window.pendingProductImages.length > 0) {
        window.pendingProductImages.forEach((file) => {
          if (file) formData.append("images", file);
        });
        window.pendingProductImages = [];
      } else if (Array.isArray(body.image) && body.image.length > 0) {
        // Send remote URLs if you already host them
        body.image.forEach((url) => {
          if (url && !String(url).startsWith("blob:")) {
            formData.append("imageUrls", url);
          }
        });
      }

      const data = await requests.post('/api/v1/admin/products', formData);

      // Handle new API response format
      const responseData = data.success ? data.data : data;

      // Transform response back to admin panel format (minimal)
      return {
        _id: responseData.productId || responseData.id,
        productId: responseData.productId || responseData.id,
        title: { en: title },
        description: { en: body.description?.en || body.description || "" },
        slug: responseData.slug,
        prices: {
          price: body.prices?.price ?? body.price ?? 0,
          originalPrice: body.prices?.price ?? body.price ?? 0,
        },
        image: body.image || [],
        stock: body.stock || 0,
        tag: body.tag || [],
        variants: body.variants || [],
        category: body.category || null,
        categories: body.categories || [],
        barcode: body.barcode || "",
        sku: body.sku || "",
        show: true,
        status: "active",
        message: data.message,
      };
    } catch (error) {
      console.error("Error in addProduct:", error);
      throw error;
    }
  },

  // Bulk ops (left as-is if used elsewhere)
  addAllProducts: async (body) => {
    return requests.post("/products/all", body);
  },
  updateManyProducts: async (body) => {
    return requests.patch("products/update/many", body);
  },

  /**
   * Admin status: PUT /api/v1/admin/products/:id/status
   */
  updateStatus: async (id, body) => {
    try {
      const result = await requests.put(`/api/v1/admin/products/${id}/status`, body);
      
      // Handle new API response format
      return result.success ? result.data : result;
    } catch (error) {
      console.error("Error updating product status:", error);
      throw error;
    }
  },

  /**
   * Admin delete: DELETE /api/v1/admin/products/:id
   */
  deleteProduct: async (id) => {
    try {
      const result = await requests.delete(`/api/v1/admin/products/${id}`);
      
      // Return the full response object to preserve the message
      return result;
    } catch (error) {
      console.error("Error in deleteProduct:", error);
      throw error;
    }
  },

  deleteManyProducts: async (body) => {
    try {
      const result = await requests.patch("/api/v1/admin/products/delete-many", body);
      
      // Return the full response object to preserve the message
      return result;
    } catch (error) {
      console.error("Error in deleteManyProducts:", error);
      throw error;
    }
  },
};

export default ProductServices;
