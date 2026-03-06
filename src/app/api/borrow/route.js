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

  try {
    const client = await getClientPromise();
    const db = client.db("library_management");
    const borrowCollection = db.collection("borrows");
    const bookCollection = db.collection("books");

    let query = {};
    if (user.role !== "ADMIN") {
      query.userId = user._id;
    }

    const borrows = await borrowCollection.find(query).toArray();

    // Populate book details
    const borrowsWithBooks = await Promise.all(
      borrows.map(async (borrow) => {
        const book = await bookCollection.findOne({ _id: new ObjectId(borrow.bookId) });
        return {
          ...borrow,
          book: book ? {
            _id: book._id,
            title: book.title,
            author: book.author,
            location: book.location
          } : null
        };
      })
    );

    return NextResponse.json(borrowsWithBooks, {
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

  try {
    const data = await req.json();
    const { bookId, targetDate } = data;

    if (!bookId || !targetDate) {
      return NextResponse.json({
        message: "Missing required fields: bookId, targetDate"
      }, {
        status: 400,
        headers: corsHeaders
      });
    }

    const client = await getClientPromise();
    const db = client.db("library_management");
    const bookCollection = db.collection("books");
    const borrowCollection = db.collection("borrows");

    // Check if book exists and is available
    const book = await bookCollection.findOne({ _id: new ObjectId(bookId) });
    if (!book) {
      return NextResponse.json({
        message: "Book not found"
      }, {
        status: 404,
        headers: corsHeaders
      });
    }

    if (book.status === "deleted") {
      return NextResponse.json({
        message: "Book not available"
      }, {
        status: 400,
        headers: corsHeaders
      });
    }

    // Check if user already has a pending request for this book
    const existingRequest = await borrowCollection.findOne({
      userId: user._id,
      bookId: new ObjectId(bookId),
      status: { $in: ["INIT", "ACCEPTED"] }
    });

    if (existingRequest) {
      return NextResponse.json({
        message: "You already have a pending request for this book"
      }, {
        status: 400,
        headers: corsHeaders
      });
    }

    // Check available quantity (simplified - in real app, you'd track borrowed books)
    const activeBorrows = await borrowCollection.countDocuments({
      bookId: new ObjectId(bookId),
      status: "ACCEPTED"
    });

    if (activeBorrows >= book.quantity) {
      const newBorrow = {
        userId: user._id,
        bookId: new ObjectId(bookId),
        createdAt: new Date(),
        targetDate: new Date(targetDate),
        status: "CLOSE-NO-AVAILABLE-BOOK"
      };

      await borrowCollection.insertOne(newBorrow);

      return NextResponse.json({
        message: "Book not available",
        borrow: newBorrow
      }, {
        status: 200,
        headers: corsHeaders
      });
    }

    const newBorrow = {
      userId: user._id,
      bookId: new ObjectId(bookId),
      createdAt: new Date(),
      targetDate: new Date(targetDate),
      status: "INIT"
    };

    const result = await borrowCollection.insertOne(newBorrow);

    return NextResponse.json({
      message: "Borrowing request created successfully",
      borrow: { ...newBorrow, _id: result.insertedId }
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

// PATCH endpoint for admin to update borrow status
export async function PATCH(req) {
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
    const { borrowId, status } = data;

    if (!borrowId || !status) {
      return NextResponse.json({
        message: "Missing required fields: borrowId, status"
      }, {
        status: 400,
        headers: corsHeaders
      });
    }

    const validStatuses = ["INIT", "CLOSE-NO-AVAILABLE-BOOK", "ACCEPTED", "CANCEL-ADMIN", "CANCEL-USER"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({
        message: "Invalid status"
      }, {
        status: 400,
        headers: corsHeaders
      });
    }

    const client = await getClientPromise();
    const db = client.db("library_management");
    const borrowCollection = db.collection("borrows");

    const result = await borrowCollection.updateOne(
      { _id: new ObjectId(borrowId) },
      {
        $set: {
          status,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({
        message: "Borrow request not found"
      }, {
        status: 404,
        headers: corsHeaders
      });
    }

    return NextResponse.json({
      message: "Borrow request updated successfully"
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