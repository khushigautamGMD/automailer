import { NextResponse } from 'next/server';
import { localStore } from '@/lib/storage';
import { canImportContacts } from '@/lib/plan-limits';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import {
  getListsByUser,
  getContactsByUser,
  saveContactsToDb,
  saveListToDb,
  deleteContactFromDb,
  deleteListFromDb,
} from '@/lib/supabase/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const listId = searchParams.get('listId') || undefined;
    const userEmail = (searchParams.get('userEmail') || searchParams.get('email') || '').trim().toLowerCase();

    let lists = localStore.getLists(userEmail);
    let contacts = localStore.getContacts(userEmail, listId);

    // Sync from Supabase cloud database if configured and user email provided
    if (userEmail && isSupabaseConfigured()) {
      try {
        const dbLists = await getListsByUser(userEmail);
        const dbContacts = await getContactsByUser(userEmail, listId);
        if (dbLists.length > 0 || dbContacts.length > 0) {
          lists = dbLists;
          contacts = dbContacts;
          localStore.syncUserContacts(userEmail, dbLists, dbContacts);
        }
      } catch (e) {
        console.error('Failed to sync contacts from DB:', e);
      }
    }

    return NextResponse.json({ lists, contacts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch contacts' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      action,
      listName,
      listId,
      email,
      firstName,
      lastName,
      company,
      phone,
      contacts: contactsPayload,
      lists: listsPayload,
      userEmail: rawUserEmail,
    } = body;

    const { searchParams } = new URL(req.url);
    const userEmail = (rawUserEmail || body.emailAddress || searchParams.get('userEmail') || searchParams.get('email') || '').trim().toLowerCase();

    // Sync cached contacts from browser if server was cold
    if (action === 'sync_cache') {
      if (Array.isArray(listsPayload) && listsPayload.length > 0) {
        for (const l of listsPayload) {
          localStore.addList(l, userEmail);
          if (userEmail && isSupabaseConfigured()) {
            await saveListToDb(userEmail, l);
          }
        }
      }
      if (Array.isArray(contactsPayload) && contactsPayload.length > 0) {
        const targetListId = listId || (listsPayload?.[0]?.id) || 'default-list';
        const created = localStore.addContacts(targetListId, contactsPayload, userEmail);
        if (userEmail && isSupabaseConfigured()) {
          await saveContactsToDb(userEmail, targetListId, created);
        }
      }
      return NextResponse.json({
        success: true,
        lists: localStore.getLists(userEmail),
        contacts: localStore.getContacts(userEmail),
      });
    }

    if (action === 'create_list') {
      if (!listName) {
        return NextResponse.json({ error: 'List name is required' }, { status: 400 });
      }
      const newList = localStore.addList({ name: listName }, userEmail);
      if (userEmail && isSupabaseConfigured()) {
        try {
          await saveListToDb(userEmail, newList);
        } catch (e) {
          console.error('Failed to save list to DB:', e);
        }
      }
      return NextResponse.json({ list: newList });
    }

    if (action === 'add_contact') {
      if (!email || !email.includes('@')) {
        return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 });
      }

      // Check contact limit for plan
      const profile = localStore.getProfile(userEmail);
      const existingCount = localStore.getContacts(userEmail).length;
      const importCheck = canImportContacts(profile, existingCount, 1);
      if (!importCheck.allowed) {
        return NextResponse.json({ error: importCheck.reason || 'Contact limit reached for your plan.' }, { status: 403 });
      }

      let targetListId = listId;
      if (!targetListId || targetListId === 'all') {
        let lists = localStore.getLists(userEmail);
        if (lists.length === 0) {
          const defaultList = localStore.addList({ name: 'Default Contact List' }, userEmail);
          if (userEmail && isSupabaseConfigured()) {
            await saveListToDb(userEmail, defaultList);
          }
          targetListId = defaultList.id;
        } else {
          targetListId = lists[0].id;
        }
      }

      const created = localStore.addContacts(
        targetListId,
        [
          {
            email: email.trim(),
            first_name: firstName?.trim(),
            last_name: lastName?.trim(),
            company: company?.trim(),
            phone: phone?.trim(),
            status: 'active',
          },
        ],
        userEmail
      );

      if (userEmail && isSupabaseConfigured()) {
        try {
          await saveContactsToDb(userEmail, targetListId, created);
        } catch (e) {
          console.error('Failed to save contact to DB:', e);
        }
      }

      return NextResponse.json({ contact: created[0], lists: localStore.getLists(userEmail) });
    }

    if (action === 'add_bulk') {
      if (!Array.isArray(contactsPayload) || contactsPayload.length === 0) {
        return NextResponse.json({ error: 'Contacts array is required' }, { status: 400 });
      }

      const profile = localStore.getProfile(userEmail);
      const existingContactsCount = localStore.getContacts(userEmail).length;
      const validItems = contactsPayload.filter((c: any) => c.email && c.email.includes('@'));

      const importCheck = canImportContacts(profile, existingContactsCount, validItems.length);
      const itemsToImport = validItems.slice(0, importCheck.allowedCount);

      if (itemsToImport.length === 0) {
        return NextResponse.json({ error: importCheck.reason || 'Contact limit reached for your plan.' }, { status: 403 });
      }

      let targetListId = listId;
      if (!targetListId || targetListId === 'all') {
        let lists = localStore.getLists(userEmail);
        if (lists.length === 0) {
          const defaultList = localStore.addList({ name: listName || 'Imported Contact List' }, userEmail);
          if (userEmail && isSupabaseConfigured()) {
            await saveListToDb(userEmail, defaultList);
          }
          targetListId = defaultList.id;
        } else {
          targetListId = lists[0].id;
        }
      }

      const created = localStore.addContacts(
        targetListId,
        itemsToImport.map((c: any) => ({
          email: c.email.trim(),
          first_name: c.first_name || c.firstname,
          last_name: c.last_name || c.lastname,
          company: c.company,
          phone: c.phone,
          status: 'active',
        })),
        userEmail
      );

      if (userEmail && isSupabaseConfigured()) {
        try {
          await saveContactsToDb(userEmail, targetListId, created);
        } catch (e) {
          console.error('Failed to save bulk contacts to DB:', e);
        }
      }

      return NextResponse.json({
        createdCount: created.length,
        lists: localStore.getLists(userEmail),
        warning: importCheck.allowed ? undefined : importCheck.reason,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to process request' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const contactId = searchParams.get('contactId');
    const listId = searchParams.get('listId');
    const userEmail = (searchParams.get('userEmail') || searchParams.get('email') || '').trim().toLowerCase();

    if (contactId) {
      localStore.deleteContact(contactId, userEmail);
      if (userEmail && isSupabaseConfigured()) {
        try {
          await deleteContactFromDb(userEmail, contactId);
        } catch (e) {
          console.error('Failed to delete contact from DB:', e);
        }
      }
      return NextResponse.json({ success: true, message: 'Contact deleted' });
    }

    if (listId) {
      localStore.deleteList(listId, userEmail);
      if (userEmail && isSupabaseConfigured()) {
        try {
          await deleteListFromDb(userEmail, listId);
        } catch (e) {
          console.error('Failed to delete list from DB:', e);
        }
      }
      return NextResponse.json({ success: true, message: 'List deleted' });
    }

    return NextResponse.json({ error: 'Specify contactId or listId' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete' }, { status: 500 });
  }
}
