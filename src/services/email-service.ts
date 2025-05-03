
'use server'; // Mark this file for server-side execution only

/**
 * Interface defining the structure for user data to be sent via email.
 */
export interface UserData {
  /**
   * The user's full name.
   */
  fullName: string;
  /**
   * The user's job title.
   */
  jobTitle: string;
  /**
   * The company the user works for.
   */
  company: string;
  /**
   * The user's email address (for identification, not necessarily recipient).
   */
  email: string;
  /**
   * The user's phone number.
   */
  phone: string;
  /**
   * The assessment results from the wellbeing compass (formatted string).
   */
  assessmentResults: string;
  /**
   * The action plan defined by the user (formatted string).
   */
  actionPlan: string;
}

const COACH_EMAIL = "rodrigo@pontosfortes.com.br"; // Define the coach's email address

/**
 * Asynchronously sends user data to the coach's email address.
 * This function should only run on the server.
 *
 * @param userData An object containing the user's data, including personal information,
 *                 assessment results, and the action plan.
 * @returns A promise that resolves when the email is successfully sent (or simulated).
 * @throws An error if the email sending fails.
 */
export async function sendUserDataEmail(userData: UserData): Promise<void> {
  console.log(`--- SIMULATING EMAIL SEND TO: ${COACH_EMAIL} ---`);
  console.log(`From User: ${userData.fullName} (${userData.email})`);
  console.log(`Company: ${userData.company}`);
  console.log(`Job Title: ${userData.jobTitle}`);
  console.log(`Phone: ${userData.phone}`);
  console.log("\n--- ASSESSMENT RESULTS ---");
  console.log(userData.assessmentResults);
  console.log("\n--- ACTION PLAN ---");
  console.log(userData.actionPlan);
  console.log("---------------------------------------------");

  // ================================================================
  // TODO: Replace the console logs above with actual email sending logic.
  // Use a library like Nodemailer, Resend, SendGrid API, etc.
  // Example using a hypothetical email library:
  /*
  try {
    const emailClient = initializeEmailClient(); // Initialize your email client/service
    await emailClient.send({
      to: COACH_EMAIL,
      from: 'noreply@yourdomain.com', // Use a verified sender email
      replyTo: userData.email, // Set user's email as reply-to if desired
      subject: `Relatório Wellbeing Compass de ${userData.fullName}`,
      text: `
        Relatório de ${userData.fullName} (${userData.email})
        Empresa: ${userData.company}
        Cargo: ${userData.jobTitle}
        Telefone: ${userData.phone}

        Resultados da Avaliação:
        ${userData.assessmentResults}

        Plano de Ação:
        ${userData.actionPlan}
      `,
      // You might prefer sending an HTML email for better formatting
      // html: `<h1>Relatório Wellbeing Compass</h1><p>De: ${userData.fullName} (${userData.email})</p>...`
    });
    console.log("Email successfully sent (simulated).");
  } catch (error) {
    console.error("Failed to send email:", error);
    throw new Error("Failed to send assessment results via email."); // Propagate error
  }
  */
 // ================================================================

  // Simulate a short delay for network request
  await new Promise(resolve => setTimeout(resolve, 500));

  // Simulate potential failure (uncomment to test error handling)
  // if (Math.random() > 0.8) {
  //   throw new Error("Simulated email sending failure.");
  // }
}
