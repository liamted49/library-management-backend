// TODO: Students must implement CRUD for Book here, similar to Item.
// Example: GET (get book by id), PATCH (update), DELETE (remove)

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

export async function GET(req, { params }) {
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
  const { id } = params;

  try {
    const client = await getClientPromise();
    const db = client.db("library_management");
    const collection = db.collection("books");

    const book = await collection.findOne({ _id: new ObjectId(id) });

    if (!book) {
      return NextResponse.json({
        message: "Book not found"
      }, {
        status: 404,
        headers: corsHeaders
      });
    }

    // Check if user can see this book
    if (user.role !== "ADMIN" && book.status === "deleted") {
      return NextResponse.json({
        message: "Book not found"
      }, {
        status: 404,
        headers: corsHeaders
      });
    }

    return NextResponse.json(book, {
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

export async function PATCH(req, { params }) {
  const authResult = await requireAdmin(req);
  if (authResult.error) {
    return NextResponse.json({
      message: authResult.error
    }, {
      status: authResult.status,
      headers: corsHeaders
    });
  }

  const { id } = params;

  try {
    const data = await req.json();
    const { title, author, quantity, location } = data;

    const updateData = {
      updatedAt: new Date()
    };

    if (title !== undefined) updateData.title = title;
    if (author !== undefined) updateData.author = author;
    if (quantity !== undefined) updateData.quantity = parseInt(quantity);
    if (location !== undefined) updateData.location = location;

    const client = await getClientPromise();
    const db = client.db("library_management");
    const collection = db.collection("books");

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({
        message: "Book not found"
      }, {
        status: 404,
        headers: corsHeaders
      });
    }

    return NextResponse.json({
      message: "Book updated successfully"
    }, {
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

export async function DELETE(req, { params }) {
  const authResult = await requireAdmin(req);
  if (authResult.error) {
    return NextResponse.json({
      message: authResult.error
    }, {
      status: authResult.status,
      headers: corsHeaders
    });
  }

  const { id } = params;

  try {
    const client = await getClientPromise();
    const db = client.db("library_management");
    const collection = db.collection("books");

    // Soft delete
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: "deleted",
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({
        message: "Book not found"
      }, {
        status: 404,
        headers: corsHeaders
      });
    }

    return NextResponse.json({
      message: "Book deleted successfully"
    }, {
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
