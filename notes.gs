/*
This script checks a specific column in a Google Sheet for a value ("facebook" or "google") and posts to the respective API. It’s designed for businesses that advertise without a dedicated CRM, enabling them to automate data postbacks to advertising platforms for optimization purposes.

How It Works:
1. Advertise to a landing page or use an in-platform lead form.
2. Use Zapier to enter form submission data into Sheet1.
3. Transfer data for those who schedule/book an appointment to Sheet2.
4. The script reads a specified column in Sheet2 and posts the lead info to the relevant API based on the lead source.
5. Utilize the posted data to optimize advertising on the platform.

Code Explanation:
- onEdit(e): A trigger that activates upon any edit in the sheet, calling handleDirectAPIEvent(e) with the event object e.
- columnToNumber(columnLetter): Converts a column letter into a column number.
- convertToTimestamp(dateStr): Converts a structured time string or Date object into a UNIX timestamp.
- hashValue(value): Converts a string into its SHA 256 hashed equivalent.
- formatDateTimeWithSheetTimezone(): Pulls the timezone from the sheet user needed for the Google Ads Conversion API.
- handleDirectAPIEvent(e): Handles the edit event, executing logic if the edited cell is in column "I" and its value is "Facebook" or "Google". It extracts necessary data from the row and triggers the appropriate API call function.
- sendFacebookEvent(lead_id, date, hashedFirstName, hashedLastName, hashedEmail, hashedPhoneNumber, hashedZipCode): Sends an event to Facebook, with error handling and retry logic.
- sendGoogleEvent(lead_id, date): Sends an event to Google with error handling and retry logic.
- getCredentials(): Reads the "Credentials" sheet for your API creds, securing them outside of this script.
- logEvent(): Updates a sheet with all the messages from this script.

Prerequisites:
- Basic understanding of Google Apps Script and JavaScript is recommended.
- Ensure you have developer accounts/API access to platforms (e.g., Facebook for Developers, Google Cloud) to obtain necessary API credentials.
- Ensure Zapier is set up correctly to populate Google Sheets with the desired data.

Parameter Customization:
- Each API has specific payload parameters; reference the respective API documentation for accurate parameter names and expected values.
  E.g., For Facebook API: [https://developers.facebook.com/docs/marketing-apis/overview]
       For Google Analytics Measurement Protocol: [https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters]

API Response Handling:
- Responses from API calls can provide vital information about the success or failure of the request. Consider logging API responses for debugging or data validation purposes. 
  Example: var response = UrlFetchApp.fetch(fbApiUrl, params); Logger.log('API Response: ' + response);

Troubleshooting:
- If data is not posting to APIs as expected, ensure the correct cells are being edited and check API payload formatting. 
- For unauthorized errors, verify your API credentials and endpoint URLs.
- If encountering rate limits, inspect your script’s execution frequency and implement delays if necessary.

Additional Example:
- Example Payload for Facebook API:
  
  var payload = {
    // Your payload data here...
    // Example for Facebook API:
    // data: [{
    //   event_name: 'Lead',
    //   event_time: Math.floor(Date.now() / 1000), // Unix timestamp
    //   user_data: {
    //     em: '7e0cc58dfa07f4b9ac6c2f19d48fc767', // Hashed email address
    //   },
    // }],
    // access_token: 'YOUR_ACCESS_TOKEN',
  };

Note: Always validate and format payload data according to API expectations.

Security Consideration: 
- Always ensure sensitive data like API keys, tokens, or any credentials are securely stored. Consider using Google Cloud’s Key Management for storing and accessing such sensitive data in your script.
- Double-check the API for its requirements. Most need you to send hashed data. Example of the hashing function:

function hashValue_exampleUsage() {
  var email = "user@example.com";
  var phoneNumber = "123-456-7890";
  var name = "John Doe";
  
  var hashedEmail = hashValue(email);
  var hashedPhone = hashValue(phoneNumber);
  var hashedName = hashValue(name);
}


Customization:
- To add more platforms/API endpoints, you need to define a new function similar to sendFacebookEvent() or sendGoogleEvent() and adjust your payload as per the API documentation of the platform.
- If your API requires headers for authentication or other purposes, adjust the 'params' object accordingly.

Debugging:
- Logged errors will provide information about the failure point or issue in your API calls. Ensure to check API documentation for error message specifics to troubleshoot effectively.
- If you encounter issues with API rate limits, consider introducing a delay between requests using Utilities.sleep(time_in_milliseconds).

Working with APIs:
- Be mindful of any API usage limits of the platforms you're interacting with and ensure your script complies with these. Introduce error handling for rate limit errors to manage them gracefully.

Considerations:
- API Credentials: Ensure you replace placeholders like 'YOUR_API_VERSION' and 'YOUR_PIXEL_ID' with actual values.
- Cell Value Mapping: Ensure the order of values matches your sheet layout: [a, firstName, lastName, email, phoneNumber, f, zipCode, projectValue, i, lead_id, k, date].
- Logging: Be mindful of logging sensitive data, especially in a production environment, due to data privacy concerns.
- Testing: Always thoroughly test with various scenarios to ensure expected behavior, considering edge cases like invalid date formats or unexpected input.
- Error Handling: Good practice with retry logic on API calls! Ensure you understand how errors propagate and are logged in your Google Sheets script environment.
- Update TRIGGER_SHEET name sheet you want the script to read.
- Update 'Credentials' in getSheetByName in the getCredentials function if you have your API creds on another sheet.

Usage:
- Ensure the script is bound to the Google Sheet you're working with. Navigate to Extensions > Apps Script and paste this code into the Code.gs file, then save.

Error Handling Note:
- In case of an API call failure, check the Logs for details on the issue. Navigate to Executions to see event triggers. View > Logs in the Apps Script editor.

*/
