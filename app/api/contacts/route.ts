import { NextResponse } from 'next/server';
import { localStore } from '@/lib/storage';
import { canImportContacts } from '@/lib/plan-limits';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const listId = searchParams.get('listId') || undefined;

    const lists = localStore.getLists();
    const contacts = localStore.getContacts(listId);

    return NextResponse.json({ lists, contacts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch contacts' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, listName, listId, email, firstName, lastName, company, phone, contacts: contactsPayload } = body;

    if (action === 'create_list') {
      if (!listName) {
        return NextResponse.json({ error: 'List name is required' }, { status: 400 });
      }
      const newList = localStore.addList({ name: listName });
      return NextResponse.json({ list: newList });
    }

    if (action === 'add_contact') {
      if (!email || !email.includes('@')) {
        return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 });
      }

      // Check contact limit for plan
      const profile = localStore.getProfile();
      const existingCount = localStore.getContacts().length;
      const importCheck = canImportContacts(profile, existingCount, 1);
      if (!importCheck.allowed) {
        return NextResponse.json({ error: importCheck.reason || 'Contact limit reached for your plan.' }, { status: 403 });
      }

      let targetListId = listId;
      if (!targetListId || targetListId === 'all') {
        let lists = localStore.getLists();
        if (lists.length === 0) {
          const defaultList = localStore.addList({ name: 'Default Contact List' });
          targetListId = defaultList.id;
        } else {
          targetListId = lists[0].id;
        }
      }

      const created = localStore.addContacts(targetListId, [
        {
          email: email.trim(),
          first_name: firstName?.trim(),
          last_name: lastName?.trim(),
          company: company?.trim(),
          phone: phone?.trim(),
          status: 'active',
        },
      ]);

      return NextResponse.json({ contact: created[0], lists: localStore.getLists() });
    }

    if (action === 'add_bulk') {
      if (!Array.isArray(contactsPayload) || contactsPayload.length === 0) {
        return NextResponse.json({ error: 'Contacts array is required' }, { status: 400 });
      }

      const profile = localStore.getProfile();
      const existingContactsCount = localStore.getContacts().length;
      const validItems = contactsPayload.filter((c: any) => c.email && c.email.includes('@'));

      const importCheck = canImportContacts(profile, existingContactsCount, validItems.length);
      const itemsToImport = validItems.slice(0, importCheck.allowedCount);

      if (itemsToImport.length === 0) {
        return NextResponse.json({ error: importCheck.reason || 'Contact limit reached for your plan.' }, { status: 403 });
      }

      let targetListId = listId;
      if (!targetListId || targetListId === 'all') {
        let lists = localStore.getLists();
        if (lists.length === 0) {
          const defaultList = localStore.addList({ name: listName || 'Imported Contact List' });
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
        }))
      );

      return NextResponse.json({
        createdCount: created.length,
        lists: localStore.getLists(),
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

    if (contactId) {
      localStore.deleteContact(contactId);
      return NextResponse.json({ success: true, message: 'Contact deleted' });
    }

    if (listId) {
      localStore.deleteList(listId);
      return NextResponse.json({ success: true, message: 'List deleted' });
    }

    return NextResponse.json({ error: 'Specify contactId or listId' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete' }, { status: 500 });
  }
}
