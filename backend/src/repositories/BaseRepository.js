/**
 * BaseRepository - đơn giản hoá truy xuất DB, tách controller khỏi driver cụ thể.
 *
 * Các phương thức trả về Promise. Các phương thức đọc (find/findOne/findById) mặc định trả về plain JS object (lean()).
 *
 * @template T
 */
export default class BaseRepository {
  /**
   * @param {import('mongoose').Model<T>} model
   */
  constructor(model) {
    this.model = model;
  }

  /**
   * Tìm nhiều document
   * @param {Object} filter
   * @param {Object|string|null} projection
   * @param {Object} options - ví dụ { sort, limit, skip }
   * @param {string} populate
   * @param {boolean} lean - có trả về plain object hay không
   * @returns {Promise<Array<T>>}
   */
  find(filter = {}, projection = null, options = {}, populate = "", lean = true) {
    let q = this.model.find(filter, projection, options);
    // flexible populate: string | array | object
    if (populate) {
      if (typeof populate === "string") q = q.populate(populate);
      else if (Array.isArray(populate)) populate.forEach(p => q = q.populate(p));
      else q = q.populate(populate);
    }
    return lean ? q.lean() : q;
  }

  /**
   * Tìm một document
   * @param {Object} filter
   * @param {Object|string|null} projection
   * @param {string} populate
   * @param {boolean} lean - có trả về plain object hay không
   * @returns {Promise<T|null>}
   */
  findOne(filter = {}, projection = null, populate = "", lean = true) {
    let q = this.model.findOne(filter);
    if (projection) q = q.select(projection);
    if (populate) {
      if (typeof populate === "string") q = q.populate(populate);
      else if (Array.isArray(populate)) populate.forEach(p => q = q.populate(p));
      else q = q.populate(populate);
    }
    return lean ? q.lean() : q;
  }

  /**
   * Tìm theo id
   * @param {string|import('mongoose').Types.ObjectId} id
   * @param {Object|string|null} projection
   * @param {string} populate
   * @param {boolean} lean - có trả về plain object hay không
   * @returns {Promise<T|null>}
   */
  findById(id, projection = null, populate = "", lean = true) {
    let q = this.model.findById(id);
    if (projection) q = q.select(projection);
    if (populate) {
      if (typeof populate === "string") q = q.populate(populate);
      else if (Array.isArray(populate)) populate.forEach(p => q = q.populate(p));
      else q = q.populate(populate);
    }
    return lean ? q.lean() : q;
  }

  /**
   * Tạo document mới
   * @param {Object} doc
   * @returns {Promise<T>}
   */
  create(doc) {
    return this.model.create(doc);
  }

  /**
   * Count documents
   * @param {Object} filter
   * @returns {Promise<number>}
   */
  countDocuments(filter = {}) {
    return this.model.countDocuments(filter);
  }

  /**
   * Chạy aggregate pipeline
   * @param {Array} pipeline
   * @returns {Promise<Array>}
   */
  aggregate(pipeline = []) {
    return this.model.aggregate(pipeline);
  }

  /**
   * Find one and update
   * @param {Object} filter
   * @param {Object} update
   * @param {Object} options
   * @returns {Promise<any>}
   */
  findOneAndUpdate(filter = {}, update = {}, options = { new: true }) {
    return this.model.findOneAndUpdate(filter, update, { new: true, ...options });
  }

  /**
   * Find by id and update
   * @param {string} id
   * @param {Object} update
   * @param {Object} options
   * @returns {Promise<any>}
   */
  findByIdAndUpdate(id, update = {}, options = { new: true }) {
    return this.model.findByIdAndUpdate(id, update, { new: true, ...options });
  }

  /**
   * Find by id and delete
   * @param {string} id
   * @returns {Promise<any>}
   */
  findByIdAndDelete(id) {
    return this.model.findByIdAndDelete(id);
  }

  /**
   * Delete many
   * @param {Object} filter
   * @returns {Promise<any>}
   */
  deleteMany(filter = {}) {
    return this.model.deleteMany(filter);
  }

  /**
   * Expose raw model for special cases (select +password, transactions, etc.)
   * @returns {import('mongoose').Model<T>}
   */
  rawModel() {
    return this.model;
  }
}
