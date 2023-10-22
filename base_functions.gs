//All the base functions needed to make this script function properly.

function onEdit(e) {
    let editedCell = e.range;
    let sourceSheet = editedCell.getSheet();
    let editedRow = editedCell.getRow();
    let headerRow = sourceSheet.getRange(1, 1, 1, sourceSheet.getLastColumn()).getValues()[0];

    // Logs events in specified sheet.
    function logEvent(logMessage) {
        Logger.log(logMessage);
        let spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        let logSheet = spreadsheet.getSheetByName(SHEET_NAMES.LOG);
        if (!logSheet) {
            logSheet = spreadsheet.insertSheet('App Script Messages');
            logSheet.appendRow(["Timestamp", "Message"]);
        }
      
        // Adding the log message to the "Script Errors" sheet
        logSheet.appendRow([new Date(), logMessage]);
        }

    // Searches the column names for the information needed.
    function getColumnIndex(headerRow, columnName) {
        return headerRow.indexOf(columnName);
    }

    function handleDirectAPIEvent(e) {
        logEvent("Script run started: handleDirectAPIEvent");
        try {
            let editedCell = e.range;
            let sourceSheet = editedCell.getSheet();
            
            if (sourceSheet.getName() !== SHEET_NAMES.TRIGGER_SHEET) {
                return;
            }
            
            let headerRow = sourceSheet.getRange(1, 1, 1, sourceSheet.getLastColumn()).getValues()[0];

            // Get column indices for headers.
            let firstNameIdx = getColumnIndex(headerRow, HEADERS.FIRST_NAME);
            let lastNameIdx = getColumnIndex(headerRow, HEADERS.LAST_NAME);
            let phoneNumberIdx = getColumnIndex(headerRow, HEADERS.PHONE_NUMBER);
            let zipCodeIdx = getColumnIndex(headerRow, HEADERS.ZIPCODE);
            let emailIdx = getColumnIndex(headerRow, HEADERS.EMAIL);
            let leadSourceIdx = getColumnIndex(headerRow, HEADERS.LEAD_SOURCE);
            let lead_idIdx = getColumnIndex(headerRow, HEADERS.LEAD_ID);
            let dateIdx = getColumnIndex(headerRow, HEADERS.DATE_OF_CLOSE);
            let projectValueIdx = getColumnIndex(headerRow, HEADERS.PROJECT_VALUE);
            
            // Check if any index is -1, which means the column name wasn't found
            if ([firstNameIdx, lastNameIdx, phoneNumberIdx, zipCodeIdx, emailIdx, leadSourceIdx, lead_idIdx, dateIdx, projectValueIdx].includes(-1)) {
            let variables = ["First Name", "Last Name", "Phone Number", "Zipcode", "Email", "Lead Source", "Lead ID", "Date", "Project Value"];
            let missingVars = [];

            [firstNameIdx, lastNameIdx, phoneNumberIdx, zipCodeIdx, emailIdx, leadSourceIdx, lead_idIdx, dateIdx, projectValueIdx].forEach((index, i) => {
              if(index === -1) {
                missingVars.push(variables[i]);
              }
            });

            logEvent(`Error: Missing required columns: ${missingVars.join(', ')}.`);
            return;
            }
              
            // Check if edited cell is in the "Lead Source" column and has a valid trigger value
            if (editedCell.getColumn() === leadSourceIdx + 1 && 
                [API_INFO.FACEBOOK.TRIGGER_VALUE, API_INFO.GOOGLE.TRIGGER_VALUE].includes(editedCell.getValue().toString().toLowerCase().trim())) {

                // Converts a value into a SHA 256 hashed value.
                function hashValue(value) {
                    var rawValue = value.toString(); 
                    var hashedValue = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, rawValue, Utilities.Charset.UTF_8);
                    return hashedValue.map(function(byte) {
                        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
                    }).join('');
                }

                let cellValue = editedCell.getValue().toString().toLowerCase().trim();
                let dataRangeValues = sourceSheet.getRange(editedCell.getRow(), 1, 1, sourceSheet.getLastColumn()).getValues()[0];
              
                let firstName = dataRangeValues[firstNameIdx];
                let lastName = dataRangeValues[lastNameIdx];
                let phoneNumber = dataRangeValues[phoneNumberIdx];
                let zipCode = dataRangeValues[zipCodeIdx];
                let email = dataRangeValues[emailIdx];
                let lead_id = dataRangeValues[lead_idIdx];
                let date = dataRangeValues[dateIdx];
                let projectValue = dataRangeValues[projectValueIdx];
                let [hashedFirstName, hashedLastName, hashedEmail, hashedPhoneNumber, hashedZipCode] = [firstName, lastName, email, phoneNumber, zipCode].map(val => hashValue(val));
                
                let eventHandlers = {
                  [API_INFO.FACEBOOK.TRIGGER_VALUE]: () => {
                  logEvent("Facebook event triggered.");
                  sendFacebookEvent(lead_id, date, hashedFirstName, hashedLastName, hashedEmail, hashedPhoneNumber, hashedZipCode);
                  },
                  [API_INFO.GOOGLE.TRIGGER_VALUE]: () => {
                  logEvent("Google event triggered.");
                  sendGoogleEvent(lead_id, date, projectValue);
                  }
                };
                
                eventHandlers[cellValue]();
                
                logEvent("Script run successfully completed: handleDirectAPIEvent");
            }
        } catch (error) {
            logEvent("Error in handleDirectAPIEvent: " + error.toString());
        }
    }

    // Get column indices for headers.
    let leadSourceIdx = getColumnIndex(headerRow, HEADERS.LEAD_SOURCE);
    let triggerValueIdx = getColumnIndex(headerRow, HEADERS.TRIGGER_COLUMN);

    // Check if edited cell is in the trigger value column
    if (editedCell.getColumn() === triggerValueIdx + 1) {
        let triggerValue = editedCell.getValue().toString().toLowerCase().trim();
        let leadSource = sourceSheet.getRange(editedRow, leadSourceIdx + 1).getValue().toString().toLowerCase().trim();
        
        // Pulls credentials from specified sheet.
        function getCredentials() {
            var values = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.CREDENTIALS).getDataRange().getValues();
            var credentials = {};
          
            values.forEach(function(row) {
            credentials[row[0]] = row[1];
            });
          
            return credentials;
        }

        if (leadSource === LEAD_SOURCES.FACEBOOK.toLowerCase() && triggerValue === LEAD_SOURCES.TRIGGER_VALUE.toLowerCase()) {
            handleFacebookEvent(e);
        } 
        else if (leadSource === LEAD_SOURCES.GOOGLE.toLowerCase() && triggerValue === LEAD_SOURCES.TRIGGER_VALUE.toLowerCase()) {
            handleGoogleEvent(e);
        }
    }
}
