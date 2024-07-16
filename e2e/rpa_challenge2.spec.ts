import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-stringify/sync';
import { log } from 'console';
import Anthropic from '@anthropic-ai/sdk';

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
    const rows = await page.$$('table#tableSandbox tbody tr');

    for (const row of rows) {
      console.log('Row:', row);
      const id = await row.$eval('td:nth-child(2)', el => el.textContent);
      const dueDate = await row.$eval('td:nth-child(3)', el => el.textContent);
      const invoiceLink = await row.$('td:nth-child(4) a');
      if (isPastDueOrToday(dueDate) && id && dueDate && invoiceLink) {
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

    const nextButton = await page.$('#tableSandbox_next:not(.disabled)');
    if (nextButton) {
      await nextButton.click();
      await page.waitForTimeout(1000); // Wait for the table to update
    } else {
      hasNextPage = false;
    }
  }

  const csvContent = csv.stringify(invoiceData, { header: true });
  fs.writeFileSync('invoice_data.csv', csvContent);

  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    await fileInput.setInputFiles('invoice_data.csv');
  }

  await page.click('.btn-start');

  const successMessage = await page.waitForSelector('.success-title', { timeout: 10000 });
  expect(await successMessage.isVisible()).toBeTruthy();
});

function isPastDueOrToday(dueDate: string | null): boolean {
  if (!dueDate) return false;
  const today = new Date();
  const [day, month, year] = dueDate.split('-').map(Number);
  const dueDateObj = new Date(year, month - 1, day);
  return dueDateObj <= today;
}

async function getBase64Image() {
  try {
    const response = await axios.get(image1_url, { responseType: 'arraybuffer' });
    const image1_data = Buffer.from(response.data, 'binary').toString('base64');
    return image1_data;
  } catch (error) {
    console.error('Error fetching image:', error);
    throw error;
  }
}

async function downloadAndProcessInvoice(page: any, invoiceUrl: string, id: string, dueDate: string): Promise<InvoiceData> {
  
  const api_key = "ENTER_YOUR_ANTHROPIC_SECRET_KEY";
  
  const anthropic = new Anthropic({ apiKey: api_key });

  const image1_media_type = "image/jpeg";
  
  }).catch(error => {
    console.error('Failed to get base64 image:', error);
  });

  try {
    
    // Perform OCR on the image
    const response_ai = await client.messages.create({
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

    const [invoiceNumber, invoiceDate, companyName, totalDue] = (response_ai.text as string).split(",").map(item => item.trim());
    
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