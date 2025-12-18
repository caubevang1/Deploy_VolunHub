import mongoose from "mongoose";

/**
 * BaseRepository - Đảm bảo tính độc lập dữ liệu (Data Independence)
 */
export default class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  /**
   * Chuyển đổi dữ liệu từ Driver sang Entity sạch
   * Tự động xử lý đệ quy cho các object lồng nhau (populated fields)
   */
  transform(doc) {
    // 1. Handle non-objects and special types first
    if (!doc || typeof doc !== 'object') {
      return doc; // Return primitives (string, number, boolean) and null as-is
    }
    if (doc instanceof Date) {
      return doc;
    }
    if (doc instanceof mongoose.Types.ObjectId) {
      return doc.toString();
    }

    // 2. Handle arrays by recursively transforming each item
    if (Array.isArray(doc)) {
      return doc.map(d => this.transform(d));
    }

    // 3. Handle plain objects (documents)
    const obj = (doc.toObject ? doc.toObject() : { ...doc });

    // 4. Convert _id to id
    if (obj._id) {
      obj.id = obj._id.toString();
      delete obj._id;
    }
    
    // 5. Recursively transform all values in the object
    Object.keys(obj).forEach(key => {
      // Avoid re-transforming the 'id' field we just created
      if (key !== 'id') {
          obj[key] = this.transform(obj[key]);
      }
    });
    
    // 6. Clean up version key
    delete obj.__v;

    return obj;
  }

  async find(filter = {}, projection = null, options = {}, populate = "") {
    let q = this.model.find(filter, projection, options);
    if (populate) q = q.populate(populate);
    const docs = await q.lean(); 
    return this.transform(docs);
  }

  async findOne(filter = {}, projection = null, populate = "") {
    let q = this.model.findOne(filter);
    if (projection) q = q.select(projection);
    if (populate) q = q.populate(populate);
    const doc = await q.lean();
    return this.transform(doc);
  }

  async findById(id, projection = null, populate = "") {
    try {
      let q = this.model.findById(id);
      if (projection) q = q.select(projection);
      if (populate) q = q.populate(populate);
      const doc = await q.lean();
      return this.transform(doc);
    } catch (error) {
      return null;
    }
  }

  async create(doc) {
    const newDoc = await this.model.create(doc);
    // Transform trực tiếp object sau khi tạo
    return this.transform(newDoc.toObject());
  }

  async countDocuments(filter = {}) {
    return await this.model.countDocuments(filter);
  }

  async aggregate(pipeline = []) {
    const results = await this.model.aggregate(pipeline);
    return this.transform(results);
  }

  async findOneAndUpdate(filter = {}, update = {}, options = { new: true }) {
    const doc = await this.model.findOneAndUpdate(filter, update, { new: true, ...options }).lean();
    return this.transform(doc);
  }

  async findByIdAndUpdate(id, update = {}, options = { new: true }) {
    try {
      const doc = await this.model.findByIdAndUpdate(id, update, { new: true, ...options }).lean();
      return this.transform(doc);
    } catch (error) {
      return null;
    }
  }

  async findByIdAndDelete(id) {
    try {
      const doc = await this.model.findByIdAndDelete(id).lean();
      return this.transform(doc);
    } catch (error) {
      return null;
    }
  }

  deleteMany(filter = {}) {
    return this.model.deleteMany(filter);
  }
}