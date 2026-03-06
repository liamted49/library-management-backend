
// REFERENCE: This file is provided as an example for creating indexes.
// Students must add a similar index for the Book collection as required in the exam.
import { getClientPromise } from "@/lib/mongodb";
import bcrypt from "bcrypt";

export async function ensureIndexes() {
  const client = await getClientPromise();
  const db = client.db("library_management");
  const userCollection = db.collection("users");
  await userCollection.createIndex({ username: 1 }, { unique: true });
  await userCollection.createIndex({ email: 1 }, { unique: true });

  // Book collection indexes
  const bookCollection = db.collection("books");
  await bookCollection.createIndex({ title: 1 });
  await bookCollection.createIndex({ author: 1 });
  await bookCollection.createIndex({ status: 1 });

  // Borrow collection indexes
  const borrowCollection = db.collection("borrows");
  await borrowCollection.createIndex({ userId: 1 });
  await borrowCollection.createIndex({ status: 1 });
  await borrowCollection.createIndex({ createdAt: 1 });

  // Create initial test users
  const hashedAdminPassword = await bcrypt.hash("admin123", 10);
  const hashedUserPassword = await bcrypt.hash("user123", 10);

  await userCollection.updateOne(
    { email: "admin@test.com" },
    {
      $set: {
        email: "admin@test.com",
        username: "admin",
        password: hashedAdminPassword,
        role: "ADMIN"
      }
    },
    { upsert: true }
  );

  await userCollection.updateOne(
    { email: "user@test.com" },
    {
      $set: {
        email: "user@test.com",
        username: "user",
        password: hashedUserPassword,
        role: "USER"
      }
    },
    { upsert: true }
  );

  // Create sample books
  const sampleBooks = [
    {
      title: "The Great Gatsby",
      author: "F. Scott Fitzgerald",
      quantity: 3,
      location: "Fiction A1",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      title: "To Kill a Mockingbird",
      author: "Harper Lee",
      quantity: 2,
      location: "Fiction A2",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      title: "1984",
      author: "George Orwell",
      quantity: 4,
      location: "Fiction A3",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      title: "Pride and Prejudice",
      author: "Jane Austen",
      quantity: 1,
      location: "Fiction A4",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  for (const book of sampleBooks) {
    await bookCollection.updateOne(
      { title: book.title },
      { $set: book },
      { upsert: true }
    );
  }

  return { message: "Indexes created and initial users and books set up" };
}