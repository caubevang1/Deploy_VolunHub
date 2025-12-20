/**
 * BaseRepository
 * Base class for all repositories providing database independence layer.
 * Transforms MongoDB-specific _id to generic id field for clean API responses.
 * Implements common CRUD operations with automatic document transformation.
 */

import mongoose from "mongoose";

export default class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  /**
   * Transform database documents to clean entity objects.
   * Handles recursive transformation for nested objects and populated fields.
   * Converts _id to id for database independence.
   */
  transform(doc) {
    if (!doc || typeof doc !== 'object') {
      return doc;
    }
    if (doc instanceof Date) {
      return doc;
    }
    if (doc instanceof mongoose.Types.ObjectId) {
      return doc.toString();
    }

    if (Array.isArray(doc)) {
      return doc.map(d => this.transform(d));
    }

    const obj = (doc.toObject ? doc.toObject() : { ...doc });

    if (obj._id) {
      obj.id = obj._id.toString();
      delete obj._id;
    }

    Object.keys(obj).forEach(key => {
      if (key !== 'id') {
        obj[key] = this.transform(obj[key]);
      }
    });

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