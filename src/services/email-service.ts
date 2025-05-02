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
   * The user's email address.
   */
  email: string;
  /**
   * The user's phone number.
   */
  phone: string;
  /**
   * The assessment results from the wellbeing compass
   */
  assessmentResults: string;
  /**
   * The action plan defined by the user
   */
  actionPlan: string;
}

/**
 * Asynchronously sends user data to a specified email address.
 *
 * @param userData An object containing the user's data, including personal information,
 *                 assessment results, and the action plan.
 * @returns A promise that resolves when the email is successfully sent.
 */
export async function sendUserDataEmail(userData: UserData): Promise<void> {
  // TODO: Implement this function to send user data via email.
  console.log("Sending user data via email...");
  console.log(userData);
}
