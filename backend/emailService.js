const { MailerSend, EmailParams, Sender, Recipient, Attachment } = require("mailersend");
require('dotenv').config();

const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY,
});

const fromEmail = process.env.MAILERSEND_FROM_EMAIL || 'noreply@yourdomain.com';

/**
 * Send email when a new report is created
 * @param {string} userEmail - User's email address
 * @param {object} reportDetails - Report details (ticketNumber, title, description, category, etc.)
 */
async function sendReportCreatedEmail(userEmail, reportDetails) {
  if (!userEmail || !userEmail.includes('@')) {
    console.log('⚠️ No valid email provided for report created notification');
    return;
  }

  try {
    const sentFrom = new Sender(fromEmail, "SanitiWatch");
    const recipients = [new Recipient(userEmail, reportDetails.username || 'User')];

    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setSubject('Issue Reported - ' + reportDetails.ticketNumber)
      .setHtml(`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0;">Issue Reported Successfully</h1>
          </div>
          <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p style="font-size: 16px; color: #333;">Dear ${reportDetails.username || 'User'},</p>
            <p style="font-size: 14px; color: #666; line-height: 1.6;">
              Your sanitation issue has been successfully reported. Our team will review it shortly.
            </p>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 6px; margin: 20px 0;">
              <h3 style="color: #4CAF50; margin-top: 0;">Report Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Ticket Number:</td>
                  <td style="padding: 8px 0; color: #333;">${reportDetails.ticketNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Title:</td>
                  <td style="padding: 8px 0; color: #333;">${reportDetails.title}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Category:</td>
                  <td style="padding: 8px 0; color: #333;">${reportDetails.category}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Description:</td>
                  <td style="padding: 8px 0; color: #333;">${reportDetails.description}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Location:</td>
                  <td style="padding: 8px 0; color: #333;">${reportDetails.address}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Status:</td>
                  <td style="padding: 8px 0; color: #4CAF50; font-weight: bold;">Reported</td>
                </tr>
              </table>
            </div>
            
            <p style="font-size: 14px; color: #666; line-height: 1.6;">
              You can track the status of your report using the ticket number: <strong>${reportDetails.ticketNumber}</strong>
            </p>
            
            <p style="font-size: 14px; color: #666; line-height: 1.6;">
              Thank you for helping keep our community clean!
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #999; text-align: center;">
              This is an automated message from SanitiWatch. Please do not reply to this email.
            </p>
          </div>
        </div>
      `)
      .setText(`
        Issue Reported Successfully
        
        Dear ${reportDetails.username || 'User'},
        
        Your sanitation issue has been successfully reported. Our team will review it shortly.
        
        Report Details:
        - Ticket Number: ${reportDetails.ticketNumber}
        - Title: ${reportDetails.title}
        - Category: ${reportDetails.category}
        - Description: ${reportDetails.description}
        - Location: ${reportDetails.address}
        - Status: Reported
        
        You can track the status of your report using the ticket number: ${reportDetails.ticketNumber}
        
        Thank you for helping keep our community clean!
      `);

    await mailerSend.email.send(emailParams);
    console.log(`✅ Report created email sent to ${userEmail} for ticket ${reportDetails.ticketNumber}`);
  } catch (error) {
    console.error('❌ Error sending report created email:', error.message);
  }
}

/**
 * Send email when a worker is assigned to a report
 * @param {string} userEmail - User's email address
 * @param {object} reportDetails - Report details
 * @param {object} workerDetails - Worker details (fullName, phone, etc.)
 */
async function sendWorkerAssignedEmail(userEmail, reportDetails, workerDetails) {
  if (!userEmail || !userEmail.includes('@')) {
    console.log('⚠️ No valid email provided for worker assigned notification');
    return;
  }

  try {
    const sentFrom = new Sender(fromEmail, "SanitiWatch");
    const recipients = [new Recipient(userEmail, reportDetails.username || 'User')];

    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setSubject('Worker Assigned - ' + reportDetails.ticketNumber)
      .setHtml(`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0;">Worker Has Been Assigned</h1>
          </div>
          <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p style="font-size: 16px; color: #333;">Dear ${reportDetails.username || 'User'},</p>
            <p style="font-size: 14px; color: #666; line-height: 1.6;">
              Good news! A worker has been assigned to your report and will address the issue soon.
            </p>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 6px; margin: 20px 0;">
              <h3 style="color: #2196F3; margin-top: 0;">Report Information</h3>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Ticket Number:</td>
                  <td style="padding: 8px 0; color: #333;">${reportDetails.ticketNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Title:</td>
                  <td style="padding: 8px 0; color: #333;">${reportDetails.title}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Status:</td>
                  <td style="padding: 8px 0; color: #2196F3; font-weight: bold;">Assigned</td>
                </tr>
              </table>
              
              <h3 style="color: #2196F3; margin-top: 20px; margin-bottom: 10px;">Assigned Worker Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Name:</td>
                  <td style="padding: 8px 0; color: #333;">${workerDetails.fullName || workerDetails.username || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Phone:</td>
                  <td style="padding: 8px 0; color: #333;">${workerDetails.phone || 'N/A'}</td>
                </tr>
                ${workerDetails.department ? `
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Department:</td>
                  <td style="padding: 8px 0; color: #333;">${workerDetails.department}</td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            <p style="font-size: 14px; color: #666; line-height: 1.6;">
              The assigned worker will contact you if needed and work on resolving the issue.
            </p>
            
            <p style="font-size: 14px; color: #666; line-height: 1.6;">
              Thank you for your patience!
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #999; text-align: center;">
              This is an automated message from SanitiWatch. Please do not reply to this email.
            </p>
          </div>
        </div>
      `)
      .setText(`
        Worker Has Been Assigned
        
        Dear ${reportDetails.username || 'User'},
        
        Good news! A worker has been assigned to your report and will address the issue soon.
        
        Report Information:
        - Ticket Number: ${reportDetails.ticketNumber}
        - Title: ${reportDetails.title}
        - Status: Assigned
        
        Assigned Worker Details:
        - Name: ${workerDetails.fullName || workerDetails.username || 'N/A'}
        - Phone: ${workerDetails.phone || 'N/A'}
        ${workerDetails.department ? `- Department: ${workerDetails.department}` : ''}
        
        The assigned worker will contact you if needed and work on resolving the issue.
        
        Thank you for your patience!
      `);

    await mailerSend.email.send(emailParams);
    console.log(`✅ Worker assigned email sent to ${userEmail} for ticket ${reportDetails.ticketNumber}`);
  } catch (error) {
    console.error('❌ Error sending worker assigned email:', error.message);
  }
}

/**
 * Send email when report status changes to "In Progress"
 * @param {string} userEmail - User's email address
 * @param {object} reportDetails - Report details
 */
async function sendReportInProgressEmail(userEmail, reportDetails) {
  if (!userEmail || !userEmail.includes('@')) {
    console.log('⚠️ No valid email provided for in progress notification');
    return;
  }

  try {
    const sentFrom = new Sender(fromEmail, "SanitiWatch");
    const recipients = [new Recipient(userEmail, reportDetails.username || 'User')];

    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setSubject('Report In Progress - ' + reportDetails.ticketNumber)
      .setHtml(`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: #FF9800; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0;">Your Report Is In Progress</h1>
          </div>
          <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p style="font-size: 16px; color: #333;">Dear ${reportDetails.username || 'User'},</p>
            <p style="font-size: 14px; color: #666; line-height: 1.6;">
              Great news! Work has started on your reported issue. Our team is actively working to resolve it.
            </p>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 6px; margin: 20px 0;">
              <h3 style="color: #FF9800; margin-top: 0;">Report Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Ticket Number:</td>
                  <td style="padding: 8px 0; color: #333;">${reportDetails.ticketNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Title:</td>
                  <td style="padding: 8px 0; color: #333;">${reportDetails.title}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Category:</td>
                  <td style="padding: 8px 0; color: #333;">${reportDetails.category}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Status:</td>
                  <td style="padding: 8px 0; color: #FF9800; font-weight: bold;">In Progress</td>
                </tr>
              </table>
            </div>
            
            <p style="font-size: 14px; color: #666; line-height: 1.6;">
              We'll notify you once the issue has been resolved.
            </p>
            
            <p style="font-size: 14px; color: #666; line-height: 1.6;">
              Thank you for your patience and for helping keep our community clean!
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #999; text-align: center;">
              This is an automated message from SanitiWatch. Please do not reply to this email.
            </p>
          </div>
        </div>
      `)
      .setText(`
        Your Report Is In Progress
        
        Dear ${reportDetails.username || 'User'},
        
        Great news! Work has started on your reported issue. Our team is actively working to resolve it.
        
        Report Details:
        - Ticket Number: ${reportDetails.ticketNumber}
        - Title: ${reportDetails.title}
        - Category: ${reportDetails.category}
        - Status: In Progress
        
        We'll notify you once the issue has been resolved.
        
        Thank you for your patience and for helping keep our community clean!
      `);

    await mailerSend.email.send(emailParams);
    console.log(`✅ In progress email sent to ${userEmail} for ticket ${reportDetails.ticketNumber}`);
  } catch (error) {
    console.error('❌ Error sending in progress email:', error.message);
  }
}

/**
 * Send email when report is completed
 * @param {string} userEmail - User's email address
 * @param {object} reportDetails - Report details
 * @param {string} completionImageUrl - URL of the completion image
 */
async function sendReportCompletedEmail(userEmail, reportDetails, completionImageUrl) {
  if (!userEmail || !userEmail.includes('@')) {
    console.log('⚠️ No valid email provided for completion notification');
    return;
  }

  try {
    const sentFrom = new Sender(fromEmail, "SanitiWatch");
    const recipients = [new Recipient(userEmail, reportDetails.username || 'User')];

    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setSubject('Report Completed - ' + reportDetails.ticketNumber)
      .setHtml(`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0;">✓ Report Completed</h1>
          </div>
          <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p style="font-size: 16px; color: #333;">Dear ${reportDetails.username || 'User'},</p>
            <p style="font-size: 14px; color: #666; line-height: 1.6;">
              Excellent news! Your reported issue has been successfully resolved.
            </p>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 6px; margin: 20px 0;">
              <h3 style="color: #4CAF50; margin-top: 0;">Report Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Ticket Number:</td>
                  <td style="padding: 8px 0; color: #333;">${reportDetails.ticketNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Title:</td>
                  <td style="padding: 8px 0; color: #333;">${reportDetails.title}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Category:</td>
                  <td style="padding: 8px 0; color: #333;">${reportDetails.category}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Status:</td>
                  <td style="padding: 8px 0; color: #4CAF50; font-weight: bold;">Completed</td>
                </tr>
                ${reportDetails.completedBy ? `
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Completed By:</td>
                  <td style="padding: 8px 0; color: #333;">${reportDetails.completedBy}</td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            ${completionImageUrl ? `
            <div style="margin: 20px 0;">
              <h3 style="color: #4CAF50; margin-bottom: 10px;">Completion Photo</h3>
              <img src="${completionImageUrl}" alt="Completion Photo" style="max-width: 100%; height: auto; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            </div>
            ` : ''}
            
            <p style="font-size: 14px; color: #666; line-height: 1.6;">
              Thank you for reporting this issue and helping us maintain a clean and healthy community!
            </p>
            
            <p style="font-size: 14px; color: #666; line-height: 1.6;">
              If you notice any other issues, please don't hesitate to report them.
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #999; text-align: center;">
              This is an automated message from SanitiWatch. Please do not reply to this email.
            </p>
          </div>
        </div>
      `)
      .setText(`
        Report Completed
        
        Dear ${reportDetails.username || 'User'},
        
        Excellent news! Your reported issue has been successfully resolved.
        
        Report Details:
        - Ticket Number: ${reportDetails.ticketNumber}
        - Title: ${reportDetails.title}
        - Category: ${reportDetails.category}
        - Status: Completed
        ${reportDetails.completedBy ? `- Completed By: ${reportDetails.completedBy}` : ''}
        
        ${completionImageUrl ? `Completion photo is attached to this email.` : ''}
        
        Thank you for reporting this issue and helping us maintain a clean and healthy community!
        
        If you notice any other issues, please don't hesitate to report them.
      `);

    await mailerSend.email.send(emailParams);
    console.log(`✅ Completion email sent to ${userEmail} for ticket ${reportDetails.ticketNumber}`);
  } catch (error) {
    console.error('❌ Error sending completion email:', error.message);
  }
}

module.exports = {
  sendReportCreatedEmail,
  sendWorkerAssignedEmail,
  sendReportInProgressEmail,
  sendReportCompletedEmail
};
