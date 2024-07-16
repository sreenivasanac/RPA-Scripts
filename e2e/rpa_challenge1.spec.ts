import { test, expect } from '@playwright/test';

/*
  Challenge URL: https://rpachallenge.com/

  Instructions
  1. The goal of this challenge is to create a workflow that will input data from a spreadsheet
     into the form fields on the screen.
  2. Beware! The fields will change position on the screen after every submission throughout 10 rounds
     thus the workflow must correctly identify where each spreadsheet record must be typed every time.
  3. The actual countdown of the challenge will begin once you click the Start button until then you may submit 
     the form as many times as you wish without receiving penalties.
  Good luck!
*/

test('RPA Challenge', async ({ page }) => {
  
  await page.goto('https://rpachallenge.com/');

  await page.getByRole('button', { name: 'Start' }).click();

  const excelData = await loadExcelData('/Users/sreenivasanac_1/Downloads/challenge.xlsx');

  for (const row of excelData) {
    // iterate each row value, and convert to String if it is not already a string
    for (const key in row) {
      if (row.hasOwnProperty(key)) {
        row[key] = row[key].toString();
      }
    }
    await page.locator('input[ng-reflect-name="labelFirstName"]').fill(row['First Name']);
    await page.locator('input[ng-reflect-name="labelLastName"]').fill(row['Last Name ']);
    await page.locator('input[ng-reflect-name="labelCompanyName"]').fill(row['Company Name']);
    await page.locator('input[ng-reflect-name="labelRole"]').fill(row['Role in Company']);
    await page.locator('input[ng-reflect-name="labelAddress"]').fill(row['Address']);
    await page.locator('input[ng-reflect-name="labelEmail"]').fill(row['Email']);
    await page.locator('input[ng-reflect-name="labelPhone"]').fill(row['Phone Number']);

    await page.click('input[type="submit"]');
  }
  
  // Check the results
  const resultText = await page.textContent('.message1');
  console.log('Challenge result:', resultText);

  // Assert that the challenge was completed successfully
  expect(resultText).toContain('Congratulations!');
});

async function loadExcelData(filename: string): Promise<any[]> {
  // Import the xlsx library
  const XLSX = require('xlsx');

  // Read the Excel file
  const workbook = XLSX.readFile(filename);

  // Get the first sheet
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Convert the sheet to JSON
  const jsonData = XLSX.utils.sheet_to_json(sheet);

  return jsonData;
}