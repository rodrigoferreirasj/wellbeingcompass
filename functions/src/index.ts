
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

/**
 * Saves assessment data submitted by a user to Firestore.
 *
 * This function is callable directly from the client application.
 * It expects the full AssessmentData object as payload.
 */
export const saveAssessmentData = functions.https.onCall(async (data, context) => {
  // TODO: Add authentication check once user login is implemented
  // if (!context.auth) {
  //   throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  // }

  // TODO: Add data validation (e.g., using Zod)

  try {
    // Use user UID if authenticated, otherwise generate a new ID
    const docId = context.auth?.uid ?? admin.firestore().collection("assessments").doc().id;
    const timestamp = admin.firestore.FieldValue.serverTimestamp();

    // Add server timestamp to the data
    const dataToSave = {
      ...data,
      createdAt: timestamp,
      // Optionally store UID if authenticated
      userId: context.auth?.uid ?? null,
    };

    await admin.firestore().collection("assessments").doc(docId).set(dataToSave);
    functions.logger.info(`Assessment data saved for docId: ${docId}`);
    return { success: true, docId: docId };
  } catch (error) {
    functions.logger.error("Error saving assessment data:", error);
    // Throwing an HttpsError allows the client to handle it gracefully
    throw new functions.https.HttpsError("internal", "Failed to save assessment data.", error);
  }
});
