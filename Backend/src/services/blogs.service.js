// src/services/blogs.service.js
const db = require('../lib/db');

/**
 * Blogs Service - Pure SQL & data logic for blog posts
 */
class BlogsService {

  /**
   * Get all blog posts
   */
  static async getAllBlogs() {
    const [blogs] = await db.query(
      `SELECT * FROM blogs ORDER BY created_at DESC`
    );
    return blogs;
  }

  /**
   * Get blog by ID
   */
  static async getBlogById(id) {
    const [rows] = await db.query(`SELECT * FROM blogs WHERE id = ?`, [id]);
    return rows.length ? rows[0] : null;
  }

  /**
   * Create a new blog post
   */
  static async createBlog({ heading, date, content, thumbnail }) {
    const [result] = await db.query(
      `INSERT INTO blogs (heading, date, content, thumbnail, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [heading, date, content, thumbnail]
    );
    return { blogId: result.insertId };
  }

  /**
   * Update a blog post
   */
  static async updateBlog(id, { heading, date, content, thumbnail }) {
    const fields = ['heading = ?', 'date = ?', 'content = ?'];
    const values = [heading, date, content];

    if (thumbnail) {
      fields.push('thumbnail = ?');
      values.push(thumbnail);
    }

    fields.push('updated_at = NOW()');
    values.push(id);

    const [result] = await db.query(
      `UPDATE blogs SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return result.affectedRows > 0;
  }

  /**
   * Delete a blog post
   */
  static async deleteBlog(id) {
    const [result] = await db.query(`DELETE FROM blogs WHERE id = ?`, [id]);
    return result.affectedRows > 0;
  }

}

module.exports = BlogsService;