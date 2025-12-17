import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import User from "../../src/models/user.js";
import UserRepository from "../../src/repositories/UserRepository.js";

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  await User.deleteMany({});
});

test("UserRepository.create / find / countDocuments works", async () => {
  const payload = { email: "test@example.com", username: "tester", name: "Test User", password: "x" };
  const created = await UserRepository.create(payload);
  expect(created._id).toBeDefined();

  const count = await UserRepository.countDocuments({ email: "test@example.com" });
  expect(count).toBe(1);

  const found = await UserRepository.findOne({ email: "test@example.com" });
  expect(found.email).toBe("test@example.com");

  await UserRepository.deleteMany({ email: "test@example.com" });
  const count2 = await UserRepository.countDocuments({ email: "test@example.com" });
  expect(count2).toBe(0);
});
