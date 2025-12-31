import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Check if the admin app is already initialized
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    // TODO: Add proper validation (e.g., using Zod)

    // Using a generated ID for now as there's no auth context from the client
    const docId = admin.firestore().collection("assessments").doc().id;
    const timestamp = admin.firestore.FieldValue.serverTimestamp();

    const dataToSave = {
      ...data,
      createdAt: timestamp,
      userId: null, // No user ID available in this setup
    };

    await admin.firestore().collection("assessments").doc(docId).set(dataToSave);
    console.log(`Assessment data saved for docId: ${docId}`);

    return NextResponse.json({ success: true, docId: docId }, { status: 200 });

  } catch (error) {
    console.error("Error saving assessment data:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, error: "Failed to save assessment data.", details: errorMessage }, { status: 500 });
  }
}
