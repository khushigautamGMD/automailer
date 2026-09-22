import Papa from 'papaparse';
import { CsvValidationResult, ParsedCsvRow } from '@/types';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function cleanEmail(str: string): string {
  if (!str) return '';
  const match = str.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (match) {
    return match[0].trim().toLowerCase();
  }
  return str
    .trim()
    .replace(/^<|>$/g, '')
    .replace(/^["']|["']$/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '');
}

export function parseAndValidateCsv(csvContent: string): CsvValidationResult {
  const content = csvContent.replace(/^\uFEFF/, '').trim();
  if (!content) {
    return {
      valid: [],
      duplicates: [],
      invalid: [],
      headers: [],
      totalParsed: 0,
    };
  }

  // Check if content looks like a plain list of emails without headers
  const firstLine = content.split(/\r?\n/)[0]?.trim() || '';
  const firstLineCols = firstLine.split(/[,;\t]/).map((c) => cleanEmail(c));
  
  // If the very first line contains a valid email format, it's a headerless email list!
  const isHeaderless = firstLineCols.some((col) => EMAIL_REGEX.test(col));

  let rawRows: Record<string, string>[] = [];
  let detectedHeaders: string[] = [];

  if (isHeaderless) {
    const parsedNoHeader = Papa.parse<string[]>(content, {
      header: false,
      skipEmptyLines: true,
    });
    
    rawRows = parsedNoHeader.data.map((rowArr) => {
      const obj: Record<string, string> = {};
      rowArr.forEach((val, idx) => {
        obj[`col_${idx}`] = val;
      });
      return obj;
    });
    detectedHeaders = parsedNoHeader.data[0] ? parsedNoHeader.data[0].map((_, i) => `col_${i}`) : [];
  } else {
    const parseResult = Papa.parse<Record<string, string>>(content, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    });
    rawRows = parseResult.data;
    detectedHeaders = parseResult.meta.fields || [];
  }

  if (rawRows.length === 0) {
    return {
      valid: [],
      duplicates: [],
      invalid: [],
      headers: detectedHeaders,
      totalParsed: 0,
    };
  }

  const sampleRows = rawRows.slice(0, 10);
  const sampleKeys = Object.keys(rawRows[0] || {});

  const normKey = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');

  const EMAIL_HEADER_PATTERNS = [
    'email', 'customeremail', 'emailaddress', 'emailid', 'mail',
    'contactemail', 'useremail', 'primaryemail', 'recipientemail',
    'to', 'mailaddress', 'emails', 'clientemail', 'memberemail', 'emailacc'
  ];

  let emailKey = sampleKeys.find((k) => EMAIL_HEADER_PATTERNS.includes(normKey(k)));

  // Fallback 1: Column name containing 'email' or 'mail'
  if (!emailKey) {
    emailKey = sampleKeys.find((k) => {
      const nk = normKey(k);
      return nk.includes('email') || nk.includes('mail');
    });
  }

  // Fallback 2: Check row values in sample rows for valid emails
  if (!emailKey) {
    for (const key of sampleKeys) {
      const matchCount = sampleRows.filter((r) => EMAIL_REGEX.test(cleanEmail(r[key] || ''))).length;
      if (matchCount > 0 && matchCount >= sampleRows.length / 2) {
        emailKey = key;
        break;
      }
    }
  }

  const FIRSTNAME_PATTERNS = ['firstname', 'first_name', 'first', 'givenname', 'customername', 'contactname', 'name', 'fullname', 'full_name'];
  const LASTNAME_PATTERNS = ['lastname', 'last_name', 'last', 'surname', 'familyname'];
  const COMPANY_PATTERNS = ['company', 'companyname', 'organization', 'org', 'business', 'firm'];
  const PHONE_PATTERNS = ['phone', 'phonenumber', 'mobile', 'cell', 'telephone', 'contactnumber'];

  let firstNameKey = sampleKeys.find((k) => FIRSTNAME_PATTERNS.includes(normKey(k)));
  let lastNameKey = sampleKeys.find((k) => LASTNAME_PATTERNS.includes(normKey(k)));
  let companyKey = sampleKeys.find((k) => COMPANY_PATTERNS.includes(normKey(k)));
  let phoneKey = sampleKeys.find((k) => PHONE_PATTERNS.includes(normKey(k)));

  if (!firstNameKey) {
    firstNameKey = sampleKeys.find((k) => {
      const nk = normKey(k);
      return (nk.includes('first') || nk.includes('name')) && !nk.includes('company') && !nk.includes('last') && k !== emailKey;
    });
  }
  if (!lastNameKey) {
    lastNameKey = sampleKeys.find((k) => {
      const nk = normKey(k);
      return nk.includes('last') || nk.includes('surname');
    });
  }
  if (!companyKey) {
    companyKey = sampleKeys.find((k) => {
      const nk = normKey(k);
      return nk.includes('company') || nk.includes('org') || nk.includes('business');
    });
  }
  if (!phoneKey) {
    phoneKey = sampleKeys.find((k) => {
      const nk = normKey(k);
      return nk.includes('phone') || nk.includes('mobile') || nk.includes('cell');
    });
  }

  const valid: ParsedCsvRow[] = [];
  const duplicates: ParsedCsvRow[] = [];
  const invalid: { row: ParsedCsvRow; reason: string }[] = [];
  const seenEmails = new Set<string>();

  rawRows.forEach((rawRow) => {
    let rawEmail = emailKey ? (rawRow[emailKey] || '') : '';

    if (!rawEmail) {
      for (const val of Object.values(rawRow)) {
        const cleanedVal = cleanEmail(val || '');
        if (EMAIL_REGEX.test(cleanedVal)) {
          rawEmail = cleanedVal;
          break;
        }
      }
    }

    const email = cleanEmail(rawEmail);
    let firstname = firstNameKey ? (rawRow[firstNameKey] || '').trim() : '';
    let lastname = lastNameKey ? (rawRow[lastNameKey] || '').trim() : '';
    const company = companyKey ? (rawRow[companyKey] || '').trim() : '';
    const phone = phoneKey ? (rawRow[phoneKey] || '').trim() : '';

    if (firstname && !lastname && firstname.includes(' ')) {
      const parts = firstname.split(/\s+/);
      firstname = parts[0];
      lastname = parts.slice(1).join(' ');
    }

    const row: ParsedCsvRow = {
      email,
      firstname,
      lastname,
      company,
      phone,
    };

    Object.keys(rawRow).forEach((key) => {
      if (![emailKey, firstNameKey, lastNameKey, companyKey, phoneKey].filter(Boolean).includes(key)) {
        row[key] = rawRow[key];
      }
    });

    if (!row.email) {
      invalid.push({ row, reason: 'Missing email address' });
      return;
    }

    if (!EMAIL_REGEX.test(row.email)) {
      invalid.push({ row, reason: `Invalid email format: ${row.email}` });
      return;
    }

    const lowerEmail = row.email.toLowerCase();
    if (seenEmails.has(lowerEmail)) {
      duplicates.push(row);
      return;
    }

    seenEmails.add(lowerEmail);
    valid.push(row);
  });

  return {
    valid,
    duplicates,
    invalid,
    headers: detectedHeaders,
    totalParsed: rawRows.length,
  };
}

