// REFERENCE: This file is provided as a user registration example.
// Students must implement authentication and role-based logic as required in the exam.
import corsHeaders from "@/lib/cors";
import { getClientPromise } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function OPTIONS(req) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function GET (req) {
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
    const profile = await db.collection("users").findOne(
      { _id: user._id },
      { projection: { password: 0 } }
    );

    if (!profile) {
      return NextResponse.json({
        message: "User not found"
      }, {
        status: 404,
        headers: corsHeaders
      });
    }

    return NextResponse.json(profile, {
      headers: corsHeaders
    });
  }
  catch(error) {
    return NextResponse.json({
      message: "Internal server error"
    }, {
      status: 500,
      headers: corsHeaders
    });
  }
}