// src/controllers/shop/blogs.controller.js
const BlogsService = require('../../services/blogs.service');
const { success, notFound } = require('../../lib/http');
const asyncHandler = require('../../middlewares/asyncHandler');

/**
 * Shop Blogs Controller - Public blog endpoints
 */
class ShopBlogsController {

  /**
   * GET /api/v1/blogs
   * List all blog posts
   */
  static listBlogs = asyncHandler(async (req, res) => {
    const blogs = await BlogsService.getAllBlogs();
    return success(res, blogs, null, 'Blogs retrieved successfully');
  });

  /**
   * GET /api/v1/blogs/:id
   * Get blog post by ID
   */
  static getBlog = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const blog = await BlogsService.getBlogById(id);

    if (!blog) {
      return notFound(res, 'Blog post');
    }

    return success(res, blog, null, 'Blog post retrieved successfully');
  });

}

module.exports = ShopBlogsController;