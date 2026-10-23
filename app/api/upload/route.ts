import { NextResponse } from 'next/server';
import { parseAndValidateCsv } from '@/lib/csv-parser';
import { localStore } from '@/lib/storage';
import { canImportContacts } from '@/lib/plan-limits';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { saveListToDb, saveContactsToDb } from '@/lib/supabase/db';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const listName = (formData.get('listName') as string) || 'Imported List';
    const rawCsvText = formData.get('csvText') as string | null;
    const userEmail = ((formData.get('userEmail') as string) || (formData.get('email') as string) || '').trim().toLowerCase();

    let csvContent = '';
    if (file) {
      csvContent = await file.text();
    } else if (rawCsvText) {
      csvContent = rawCsvText;
    } else {
      return NextResponse.json({ error: 'No CSV file or text provided' }, { status: 400 });
    }

    const validationResult = parseAndValidateCsv(csvContent);

    // Check contact import limit for user's plan
    const profile = localStore.getProfile(userEmail);
    const existingContactsCount = localStore.getContacts(userEmail).length;
    const importCheck = canImportContacts(profile, existingContactsCount, validationResult.valid.length);
    const allowedContacts = validationResult.valid.slice(0, importCheck.allowedCount);

    if (allowedContacts.length === 0 && validationResult.valid.length > 0) {
      return NextResponse.json({
        error: importCheck.reason || 'Contact limit reached for your plan. Upgrade to import more contacts.',
        summary: validationResult,
      }, { status: 403 });
    }

    // Create list and store allowed contacts
    let newList = null;
    if (allowedContacts.length > 0) {
      newList = localStore.addList(
        {
          name: listName,
          description: `Imported ${allowedContacts.length} valid contacts on ${new Date().toLocaleDateString()}`,
          tags: ['CSV Import'],
        },
        userEmail
      );

      if (userEmail && isSupabaseConfigured()) {
        try {
          await saveListToDb(userEmail, newList);
        } catch (e) {
          console.error('Failed to save list to DB in upload:', e);
        }
      }

      const created = localStore.addContacts(
        newList.id,
        allowedContacts.map((item) => ({
          email: item.email,
          first_name: item.firstname,
          last_name: item.lastname,
          company: item.company,
          phone: item.phone,
          custom_fields: Object.fromEntries(
            Object.entries(item)
              .filter(([_, v]) => v !== undefined)
              .map(([k, v]) => [k, String(v)])
          ),
          status: 'active',
        })),
        userEmail
      );

      if (userEmail && isSupabaseConfigured()) {
        try {
          await saveContactsToDb(userEmail, newList.id, created);
        } catch (e) {
          console.error('Failed to save contacts to DB in upload:', e);
        }
      }
    }

    return NextResponse.json({
      summary: validationResult,
      createdList: newList,
      importedCount: allowedContacts.length,
      warning: importCheck.allowed ? undefined : importCheck.reason,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to process CSV' }, { status: 500 });
  }
}
