// TODO: Students must implement CRUD for Book here, similar to Item.
// Example: GET (list all books), POST (create book)

// import necessary modules and setup as in Item
import corsHeaders from "@/lib/cors";
import { getClientPromise } from "@/lib/mongodb";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export async function OPTIONS(req) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function GET(req) {
  const authResult = await requireAuth(req);
  if (authResult.error) {
    return NextResponse.json({
      message: authResult.error
    }, {
      status: authResult.status,
      headers: corsHeaders
    });
  }

  const { user } = authResult;
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title");
  const author = searchParams.get("author");

  try {
    const client = await getClientPromise();
    const db = client.db("library_management");
    const collection = db.collection("books");

    let query = {};
    if (user.role !== "ADMIN") {
      // Non-admin users can't see deleted books
      query.status = { $ne: "deleted" };
    }

    if (title) {
      query.title = { $regex: title, $options: "i" };
    }
    if (author) {
      query.author = { $regex: author, $options: "i" };
    }

    const books = await collection.find(query).toArray();

    return NextResponse.json(books, {
      headers: corsHeaders
    });
  } catch (error) {
    return NextResponse.json({
      message: "Internal server error"
    }, {
      status: 500,
      headers: corsHeaders
    });
  }
}

export async function POST(req) {
  const authResult = await requireAdmin(req);
  if (authResult.error) {
    return NextResponse.json({
      message: authResult.error
    }, {
      status: authResult.status,
      headers: corsHeaders
    });
  }

  try {
    const data = await req.json();
    const { title, author, quantity, location } = data;

    if (!title || !author || !quantity || !location) {
      return NextResponse.json({
        message: "Missing required fields: title, author, quantity, location"
      }, {
        status: 400,
        headers: corsHeaders
      });
    }

    const client = await getClientPromise();
    const db = client.db("library_management");
    const collection = db.collection("books");

    const newBook = {
      title,
      author,
      quantity: parseInt(quantity),
      location,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await collection.insertOne(newBook);

    return NextResponse.json({
      message: "Book created successfully",
      book: { ...newBook, _id: result.insertedId }
    }, {
      status: 201,
      headers: corsHeaders
    });
  } catch (error) {
    return NextResponse.json({
      message: "Internal server error"
    }, {
      status: 500,
      headers: corsHeaders
    });
  }
}
