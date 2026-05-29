export type ImportedContactDraft = {
  company: string;
  contactPerson: string;
  role: string;
  phone: string;
  email: string;
  notes: string;
};

type NativeContactResult = {
  name?: string[];
  tel?: string[];
  email?: string[];
};

type NativeContactsManager = {
  getProperties?: () => Promise<string[]>;
  select?: (properties: string[], options?: { multiple?: boolean }) => Promise<NativeContactResult[]>;
};

export type ContactImportNavigator = Navigator & {
  contacts?: NativeContactsManager;
};

function cleanValue(value?: string | null) {
  return value?.trim() ?? '';
}

function stripVcardEscapes(value: string) {
  return value
    .replace(/\\n/gi, ' ')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .trim();
}

function getVcardValue(line: string) {
  const separatorIndex = line.indexOf(':');
  return separatorIndex >= 0 ? stripVcardEscapes(line.slice(separatorIndex + 1)) : '';
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let currentValue = '';
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && nextCharacter === '"') {
      currentValue += '"';
      index += 1;
    } else if (character === '"') {
      insideQuotes = !insideQuotes;
    } else if (character === ',' && !insideQuotes) {
      values.push(currentValue.trim());
      currentValue = '';
    } else {
      currentValue += character;
    }
  }

  values.push(currentValue.trim());
  return values;
}

function normalizeHeader(header: string) {
  return header.trim().toLowerCase().replace(/\s+/g, '');
}

function buildImportedContact(draft: Partial<ImportedContactDraft>): ImportedContactDraft | null {
  const contactPerson = cleanValue(draft.contactPerson);
  const company = cleanValue(draft.company);
  const phone = cleanValue(draft.phone);
  const email = cleanValue(draft.email);

  if (!contactPerson && !company && !phone && !email) {
    return null;
  }

  return {
    company: company || contactPerson || 'Contacto importado',
    contactPerson: contactPerson || company || phone || email || 'Contacto importado',
    role: cleanValue(draft.role) || 'Contacto comercial',
    phone,
    email,
    notes: cleanValue(draft.notes),
  };
}

export function parseVcardContacts(fileContent: string): ImportedContactDraft[] {
  return fileContent
    .split(/END:VCARD/i)
    .map((rawCard) => {
      const lines = rawCard.split(/\r?\n/);
      const draft: Partial<ImportedContactDraft> = {};

      lines.forEach((line) => {
        const normalizedLine = line.toUpperCase();
        if (normalizedLine.startsWith('FN')) {
          draft.contactPerson = getVcardValue(line);
        } else if (normalizedLine.startsWith('ORG')) {
          draft.company = getVcardValue(line).split(';')[0];
        } else if (normalizedLine.startsWith('TITLE')) {
          draft.role = getVcardValue(line);
        } else if (normalizedLine.startsWith('TEL')) {
          draft.phone = draft.phone || getVcardValue(line);
        } else if (normalizedLine.startsWith('EMAIL')) {
          draft.email = draft.email || getVcardValue(line);
        } else if (normalizedLine.startsWith('NOTE')) {
          draft.notes = getVcardValue(line);
        }
      });

      return buildImportedContact(draft);
    })
    .filter(Boolean) as ImportedContactDraft[];
}

export function parseCsvContacts(fileContent: string): ImportedContactDraft[] {
  const [rawHeader, ...rawRows] = fileContent.split(/\r?\n/).filter((line) => line.trim());
  if (!rawHeader) {
    return [];
  }

  const headers = parseCsvLine(rawHeader).map(normalizeHeader);
  const findValue = (row: string[], aliases: string[]) => {
    const index = headers.findIndex((header) => aliases.includes(header));
    return index >= 0 ? row[index] : '';
  };

  return rawRows
    .map((rowLine) => {
      const row = parseCsvLine(rowLine);
      return buildImportedContact({
        contactPerson: findValue(row, ['name', 'nombre', 'contact', 'contacto', 'contactperson', 'personadecontacto']),
        company: findValue(row, ['company', 'empresa', 'organization', 'organizacion', 'compania']),
        role: findValue(row, ['role', 'cargo', 'title', 'puesto']),
        phone: findValue(row, ['phone', 'telefono', 'tel', 'mobile', 'celular']),
        email: findValue(row, ['email', 'correo', 'mail']),
        notes: findValue(row, ['notes', 'notas', 'note']),
      });
    })
    .filter(Boolean) as ImportedContactDraft[];
}

export function parseContactFile(fileName: string, fileContent: string) {
  return fileName.toLowerCase().endsWith('.vcf')
    ? parseVcardContacts(fileContent)
    : parseCsvContacts(fileContent);
}

export async function pickNativeContacts(navigatorRef: ContactImportNavigator): Promise<ImportedContactDraft[]> {
  if (!navigatorRef.contacts?.select) {
    return [];
  }

  const supportedProperties = navigatorRef.contacts.getProperties
    ? await navigatorRef.contacts.getProperties()
    : ['name', 'tel', 'email'];
  const requestedProperties = ['name', 'tel', 'email'].filter((property) => supportedProperties.includes(property));
  const selectedContacts = await navigatorRef.contacts.select(requestedProperties, { multiple: true });

  return selectedContacts
    .map((contact) => buildImportedContact({
      contactPerson: contact.name?.[0] ?? '',
      phone: contact.tel?.[0] ?? '',
      email: contact.email?.[0] ?? '',
      notes: 'Importado desde el dispositivo.',
    }))
    .filter(Boolean) as ImportedContactDraft[];
}
