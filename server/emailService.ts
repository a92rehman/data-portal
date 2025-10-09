import * as brevo from '@getbrevo/brevo';

const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY || '');

// Use environment variable for sender email, fallback to default
// IMPORTANT: This email must be verified in your Brevo account
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'noreply@taleemabad.com';
const SENDER_NAME = process.env.BREVO_SENDER_NAME || 'DataHub Data Requests';

interface AssignmentEmailData {
  assigneeName: string;
  assigneeEmail: string;
  taskTitle: string;
  taskDescription: string;
  taskId: string;
  dueDate: string;
  priority: string;
  assignerName: string;
  department: string;
}

interface RequestAcceptedEmailData {
  requesterName: string;
  requesterEmail: string;
  taskTitle: string;
  analystName: string;
  dueDate: string;
  priority: string;
  department: string;
}

interface RequestRejectedEmailData {
  requesterName: string;
  requesterEmail: string;
  taskTitle: string;
  rejectionReason: string;
  rejectedBy: string;
  department: string;
}

export async function sendAssignmentEmail(data: AssignmentEmailData) {
  try {
    const { assigneeName, assigneeEmail, taskTitle, taskDescription, taskId, dueDate, priority, assignerName, department } = data;

    const priorityColors: Record<string, string> = {
      p3_low: '#10b981',
      p2_medium: '#f59e0b',
      p1_high: '#ef4444',
      p0_critical: '#dc2626'
    };

    const priorityColor = priorityColors[priority] || '#6366f1';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">New Task Assignment</h1>
                    <p style="margin: 10px 0 0; color: #e0e7ff; font-size: 16px;">DataHub Data Request</p>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="margin: 0 0 20px; color: #1f2937; font-size: 16px; line-height: 1.5;">
                      Hi <strong>${assigneeName}</strong>,
                    </p>
                    
                    <p style="margin: 0 0 30px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      You have been assigned a new data request by <strong>${assignerName}</strong>.
                    </p>

                    <!-- Task Details Card -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; border: 2px solid #e5e7eb; margin-bottom: 30px;">
                      <tr>
                        <td style="padding: 24px;">
                          <h2 style="margin: 0 0 16px; color: #111827; font-size: 20px; font-weight: 600;">${taskTitle}</h2>
                          
                          <div style="margin-bottom: 20px;">
                            <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                              ${taskDescription}
                            </p>
                          </div>

                          <!-- Details Grid -->
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding: 8px 0;">
                                <span style="color: #6b7280; font-size: 14px;">Task ID:</span>
                                <span style="color: #111827; font-size: 14px; font-weight: 500; margin-left: 8px;">${taskId.slice(0, 12)}...</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0;">
                                <span style="color: #6b7280; font-size: 14px;">Department:</span>
                                <span style="color: #111827; font-size: 14px; font-weight: 500; margin-left: 8px; text-transform: capitalize;">${department}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0;">
                                <span style="color: #6b7280; font-size: 14px;">Priority:</span>
                                <span style="display: inline-block; background-color: ${priorityColor}; color: #ffffff; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-left: 8px;">${priority}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0;">
                                <span style="color: #6b7280; font-size: 14px;">Due Date:</span>
                                <span style="color: #111827; font-size: 14px; font-weight: 500; margin-left: 8px;">${dueDate}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Please log in to the system to review the full details and start working on this request.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;">
                      DataHub Data Analytics Team
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                      This is an automated notification. Please do not reply to this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: assigneeEmail, name: assigneeName }];
    sendSmtpEmail.sender = { email: SENDER_EMAIL, name: SENDER_NAME };
    sendSmtpEmail.subject = `New Task Assignment: ${taskTitle}`;
    sendSmtpEmail.htmlContent = htmlContent;

    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`[email] Assignment email sent successfully to ${assigneeEmail}:`, result);
    return result;
  } catch (error) {
    console.error('[email] Failed to send assignment email:', error);
    throw error;
  }
}

export async function sendRequestAcceptedEmail(data: RequestAcceptedEmailData) {
  try {
    const { requesterName, requesterEmail, taskTitle, analystName, dueDate, priority, department } = data;

    const priorityColors: Record<string, string> = {
      p3_low: '#10b981',
      p2_medium: '#f59e0b',
      p1_high: '#ef4444',
      p0_critical: '#dc2626'
    };

    const priorityColor = priorityColors[priority] || '#6366f1';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
                <tr>
                  <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Request Accepted</h1>
                    <p style="margin: 10px 0 0; color: #d1fae5; font-size: 16px;">DataHub Data Request</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="margin: 0 0 20px; color: #1f2937; font-size: 16px; line-height: 1.5;">
                      Hi <strong>${requesterName}</strong>,
                    </p>
                    
                    <p style="margin: 0 0 30px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Great news! Your data request has been <strong style="color: #10b981;">accepted</strong> and assigned to <strong>${analystName}</strong>.
                    </p>

                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; border: 2px solid #e5e7eb; margin-bottom: 30px;">
                      <tr>
                        <td style="padding: 24px;">
                          <h2 style="margin: 0 0 16px; color: #111827; font-size: 20px; font-weight: 600;">${taskTitle}</h2>
                          
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding: 8px 0;">
                                <span style="color: #6b7280; font-size: 14px;">Department:</span>
                                <span style="color: #111827; font-size: 14px; font-weight: 500; margin-left: 8px; text-transform: capitalize;">${department}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0;">
                                <span style="color: #6b7280; font-size: 14px;">Assigned to:</span>
                                <span style="color: #111827; font-size: 14px; font-weight: 500; margin-left: 8px;">${analystName}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0;">
                                <span style="color: #6b7280; font-size: 14px;">Priority:</span>
                                <span style="display: inline-block; background-color: ${priorityColor}; color: #ffffff; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-left: 8px;">${priority}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0;">
                                <span style="color: #6b7280; font-size: 14px;">Due Date:</span>
                                <span style="color: #111827; font-size: 14px; font-weight: 500; margin-left: 8px;">${dueDate}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      The analyst will begin working on your request shortly. You'll receive updates as progress is made.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;">
                      DataHub Data Analytics Team
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                      This is an automated notification. Please do not reply to this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: requesterEmail, name: requesterName }];
    sendSmtpEmail.sender = { email: SENDER_EMAIL, name: SENDER_NAME };
    sendSmtpEmail.subject = `Request Accepted: ${taskTitle}`;
    sendSmtpEmail.htmlContent = htmlContent;

    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`[email] Acceptance email sent successfully to ${requesterEmail}:`, result);
    return result;
  } catch (error) {
    console.error('[email] Failed to send acceptance email:', error);
    throw error;
  }
}

export async function sendRequestRejectedEmail(data: RequestRejectedEmailData) {
  try {
    const { requesterName, requesterEmail, taskTitle, rejectionReason, rejectedBy, department } = data;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
                <tr>
                  <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Request Update</h1>
                    <p style="margin: 10px 0 0; color: #fee2e2; font-size: 16px;">DataHub Data Request</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="margin: 0 0 20px; color: #1f2937; font-size: 16px; line-height: 1.5;">
                      Hi <strong>${requesterName}</strong>,
                    </p>
                    
                    <p style="margin: 0 0 30px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      We wanted to inform you that your data request has been reviewed and requires some modifications before we can proceed.
                    </p>

                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; border: 2px solid #e5e7eb; margin-bottom: 30px;">
                      <tr>
                        <td style="padding: 24px;">
                          <h2 style="margin: 0 0 16px; color: #111827; font-size: 20px; font-weight: 600;">${taskTitle}</h2>
                          
                          <div style="margin-bottom: 20px;">
                            <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px; font-weight: 600;">Department:</p>
                            <p style="margin: 0; color: #111827; font-size: 14px; text-transform: capitalize;">${department}</p>
                          </div>

                          <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 4px;">
                            <p style="margin: 0 0 8px; color: #991b1b; font-size: 14px; font-weight: 600;">Feedback from ${rejectedBy}:</p>
                            <p style="margin: 0; color: #7f1d1d; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${rejectionReason}</p>
                          </div>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Please review the feedback above and submit a revised request with the necessary information. Our team is here to help you get the data insights you need.
                    </p>

                    <p style="margin: 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      If you have any questions, feel free to reach out to us.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;">
                      DataHub Data Analytics Team
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                      This is an automated notification. Please do not reply to this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: requesterEmail, name: requesterName }];
    sendSmtpEmail.sender = { email: SENDER_EMAIL, name: SENDER_NAME };
    sendSmtpEmail.subject = `Request Update Required: ${taskTitle}`;
    sendSmtpEmail.htmlContent = htmlContent;

    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`[email] Rejection email sent successfully to ${requesterEmail}:`, result);
    return result;
  } catch (error) {
    console.error('[email] Failed to send rejection email:', error);
    throw error;
  }
}

interface TeamMemberInviteEmailData {
  inviteeName: string;
  inviteeEmail: string;
  role: string;
  department: string;
  inviterName: string;
}

export async function sendTeamMemberInviteEmail(data: TeamMemberInviteEmailData) {
  try {
    const { inviteeName, inviteeEmail, role, department, inviterName } = data;

    const roleNames: Record<string, string> = {
      requester: 'Data Requester',
      team_lead: 'Data Lead',
      analyst: 'Data Analyst'
    };

    const roleName = roleNames[role] || role;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
                <tr>
                  <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Welcome to the Team!</h1>
                    <p style="margin: 10px 0 0; color: #e0e7ff; font-size: 16px;">DataHub Data Request System</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="margin: 0 0 20px; color: #1f2937; font-size: 16px; line-height: 1.5;">
                      Hi <strong>${inviteeName}</strong>,
                    </p>
                    
                    <p style="margin: 0 0 30px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      ${inviterName} has invited you to join the DataHub Data Request Management System as a <strong>${roleName}</strong>.
                    </p>

                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; border: 2px solid #e5e7eb; margin-bottom: 30px;">
                      <tr>
                        <td style="padding: 24px;">
                          <h2 style="margin: 0 0 16px; color: #111827; font-size: 20px; font-weight: 600;">Your Account Details</h2>
                          
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding: 8px 0;">
                                <span style="color: #6b7280; font-size: 14px;">Email:</span>
                                <span style="color: #111827; font-size: 14px; font-weight: 500; margin-left: 8px;">${inviteeEmail}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0;">
                                <span style="color: #6b7280; font-size: 14px;">Role:</span>
                                <span style="color: #111827; font-size: 14px; font-weight: 500; margin-left: 8px;">${roleName}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0;">
                                <span style="color: #6b7280; font-size: 14px;">Department:</span>
                                <span style="color: #111827; font-size: 14px; font-weight: 500; margin-left: 8px; text-transform: capitalize;">${department}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      You can now sign in to the system using your email address. Simply visit the login page and authenticate with your company credentials.
                    </p>

                    <p style="margin: 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      If you have any questions about your new role or the system, please don't hesitate to reach out to ${inviterName} or the Data Team.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;">
                      DataHub Data Analytics Team
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                      This is an automated notification. Please do not reply to this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: inviteeEmail, name: inviteeName }];
    sendSmtpEmail.sender = { email: SENDER_EMAIL, name: SENDER_NAME };
    sendSmtpEmail.subject = `Welcome to DataHub Data Request System - ${roleName}`;
    sendSmtpEmail.htmlContent = htmlContent;

    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`[email] Invitation email sent successfully to ${inviteeEmail}:`, result);
    return result;
  } catch (error) {
    console.error('[email] Failed to send invitation email:', error);
    throw error;
  }
}
