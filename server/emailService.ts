import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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

export async function sendAssignmentEmail(data: AssignmentEmailData) {
  try {
    const { assigneeName, assigneeEmail, taskTitle, taskDescription, taskId, dueDate, priority, assignerName, department } = data;

    const priorityColors: Record<string, string> = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#ef4444'
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
                    <p style="margin: 10px 0 0; color: #e0e7ff; font-size: 16px;">Taleemabad Data Request</p>
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
                      Taleemabad Data Analytics Team
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

    const result = await resend.emails.send({
      from: 'Taleemabad Data Requests <onboarding@resend.dev>',
      to: assigneeEmail,
      subject: `New Task Assignment: ${taskTitle}`,
      html: htmlContent,
    });

    console.log(`[email] Assignment email sent successfully to ${assigneeEmail}:`, result);
    return result;
  } catch (error) {
    console.error('[email] Failed to send assignment email:', error);
    throw error;
  }
}
