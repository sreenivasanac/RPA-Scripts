import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as csv from 'csv-stringify/sync';
import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';

// Instructions
// The goal of this challenge is to create a workflow that will read every table row and download the respective invoices.

// From the invoices, you will have to extract the Invoice Number, Invoice Date, Company Name and Total Due.

// You will have to build and upload a CSV file with the data extracted from each invoice, the ID and Due Date from the 
// table, only for the invoices for which the Due Date has passed or is today.

// The actual countdown of the challenge will begin once you click the Start button and will end once the 
// CSV file is uploaded; until then, you may play around with the table on the right without receiving penalties.

// Below you will find an example CSV file in order to see the required format for the end result and two sample invoices. 
// The formats of the invoices will be exactly as in the samples and they will not change. The challenge expects the 
// uploaded CSV to be in the exact same format as the example CSV, including the formatting of the cells, and the rows 
// should be in the same order as they appear in the table. Any difference will result in a failed challenge.

// Good luck!

//  Download example CSV
//  Download sample invoice 1
//  Download sample invoice 2


test('RPA Challenge 2', async ({ page }) => {
  const baseUrl = 'https://rpachallengeocr.azurewebsites.net';
  await page.goto(baseUrl);

  await page.getByRole('button', { name: 'Start' }).click();

  const invoiceData: InvoiceData[] = [];
  let hasNextPage = true;

  while (hasNextPage) {
    const rows = page.locator('table#tableSandbox tbody tr');
    const rowCount = await rows.count();

    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      const id = await row.locator('td:nth-child(2)').textContent();
      const dueDate = await row.locator('td:nth-child(3)').textContent();
      const invoiceLink = row.locator('td:nth-child(4) a');

      if (isPastDueOrToday(dueDate) && id && dueDate && await invoiceLink.count() > 0) {
        const invoiceUrlPath = await invoiceLink.getAttribute('href');
        const invoiceUrl = baseUrl + invoiceUrlPath;
        console.log('Invoice link:', invoiceUrlPath);
        if (invoiceUrl) {
          const invoiceDetails = await downloadAndProcessInvoice(page, invoiceUrl, id, dueDate);
          console.log('Invoice details:', invoiceDetails);
          invoiceData.push(invoiceDetails);
        }
      }
    }

    const nextButton = page.locator('#tableSandbox_next:not(.disabled)');
    if (await nextButton.count() > 0) {
      await nextButton.click();
      await page.waitForTimeout(1000); // Wait for the table to update
    } else {
      hasNextPage = false;
    }
  }

  const csvContent = csv.stringify(invoiceData, { header: true });
  fs.writeFileSync('invoice_data.csv', csvContent);

  await page.setInputFiles('input[type="file"]', 'invoice_data.csv');

  await page.click('.btn-start');

  await expect(page.locator('.success-title')).toBeVisible({ timeout: 10000 });
});

function isPastDueOrToday(dueDate: string | null): boolean {
  if (!dueDate) return false;
  const today = new Date();
  const [day, month, year] = dueDate.split('-').map(Number);
  const dueDateObj = new Date(year, month - 1, day);
  return dueDateObj <= today;
}

async function downloadAndProcessInvoice(page: Page, invoiceUrl: string, id: string, dueDate: string): Promise<InvoiceData> {
  const api_key = "ENTER_YOUR_ANTHROPIC_KEY_HERE"
  const anthropic = new Anthropic({ apiKey: api_key });

  const image1_media_type = "image/jpeg";
  
  try {
    // Navigate to the invoice page and wait for it to load
    await page.goto(invoiceUrl);
    await page.waitForLoadState('networkidle');

    // Capture a screenshot of the invoice
    const screenshot = await page.screenshot({ type: 'jpeg', quality: 80 });
    const image1_data = screenshot.toString('base64');
    
    // Perform OCR on the image
    const response_ai = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: image1_media_type,
                data: image1_data,
              },
            },
            {
              type: "text",
              text: "The following image is an Invoice in Image format. Extract the Invoice Number, Invoice Date, Company Name and Total Due in Comma separated format.",
            }
          ],
        }
      ],
    });
  
    console.log(response_ai);

    const [invoiceNumber, invoiceDate, companyName, totalDue] = response_ai.content[0].text.split(",").map(item => item.trim());
    
    console.log('Invoice number:', invoiceNumber);
    console.log('Invoice date:', invoiceDate);
    console.log('Company name:', companyName);
    console.log('Total due:', totalDue);

    return {
      ID: id,
      'Due Date': dueDate,
      'Invoice Number': invoiceNumber,
      'Invoice Date': invoiceDate,
      'Company Name': companyName,
      'Total Due': totalDue
    };
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
}

interface InvoiceData {
  ID: string;
  'Due Date': string;
  'Invoice Number': string;
  'Invoice Date': string;
  'Company Name': string;
  'Total Due': string;
}