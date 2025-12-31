
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Helper para inicializar o app do Firebase Admin de forma segura
function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const serviceAccount: admin.ServiceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // A chave privada precisa de um tratamento especial para substituir os caracteres de nova linha
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  };

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export async function POST(request: Request) {
  try {
    // Garante que o Firebase Admin está inicializado
    initializeFirebaseAdmin();

    const data = await request.json();

    // TODO: Add proper validation (e.g., using Zod)

    // Usando um ID gerado pois não há contexto de autenticação do cliente
    const docId = admin.firestore().collection("assessments").doc().id;
    const timestamp = admin.firestore.FieldValue.serverTimestamp();

    const dataToSave = {
      ...data,
      createdAt: timestamp,
      userId: null, // Nenhum ID de usuário disponível nesta configuração
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
