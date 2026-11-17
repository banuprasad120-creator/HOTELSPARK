const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'apps', 'dashboard', 'src', 'lib', 'supabaseAdapter.ts');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Replace DEFAULT_ROOMS
const roomsDefinition = `export const DEFAULT_ROOMS: StoredRoom[] = [
  // 2nd Floor (10 Rooms: 2001-2010)
  { id: '5aca9c61-49d7-42db-885c-58d30dfceac7', propertyId: PROPERTY_ID, number: '2001', floor: '2', roomTypeId: 'b0000002-0000-4000-a000-000000000002', roomTypeName: 'Deluxe Room', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'balcony'] },
  { id: 'c88c9bd4-63ba-4ecf-8780-46e9c3378d1b', propertyId: PROPERTY_ID, number: '2002', floor: '2', roomTypeId: 'b0000003-0000-4000-a000-000000000003', roomTypeName: 'Executive Room', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'minibar'] },
  { id: '570526d0-8fac-4893-a914-586b57e7531b', propertyId: PROPERTY_ID, number: '2003', floor: '2', roomTypeId: 'b0000002-0000-4000-a000-000000000002', roomTypeName: 'Deluxe Room', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'balcony'] },
  { id: '3f015f1e-6b7c-49b9-aaf3-6cfe51acfbd5', propertyId: PROPERTY_ID, number: '2004', floor: '2', roomTypeId: 'b0000002-0000-4000-a000-000000000002', roomTypeName: 'Deluxe Room', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'balcony'] },
  { id: '7db20997-3628-42dc-9870-69894e0e584f', propertyId: PROPERTY_ID, number: '2005', floor: '2', roomTypeId: 'b0000003-0000-4000-a000-000000000003', roomTypeName: 'Executive Room', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'minibar'] },
  { id: 'd5aa0e23-fc68-441e-a20c-3fac98edd91a', propertyId: PROPERTY_ID, number: '2006', floor: '2', roomTypeId: 'b0000001-0000-4000-a000-000000000001', roomTypeName: 'Budget', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'room_service'] },
  { id: 'c224f246-7cb5-40d1-976a-27d0e27e846a', propertyId: PROPERTY_ID, number: '2007', floor: '2', roomTypeId: 'b0000002-0000-4000-a000-000000000002', roomTypeName: 'Deluxe Room', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'balcony'] },
  { id: '9b1713d2-17cf-46be-8c3d-03beef797722', propertyId: PROPERTY_ID, number: '2008', floor: '2', roomTypeId: 'b0000003-0000-4000-a000-000000000003', roomTypeName: 'Executive Room', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'minibar'] },
  { id: 'd39a0075-b818-4584-8923-8f7842ad25a5', propertyId: PROPERTY_ID, number: '2009', floor: '2', roomTypeId: 'b0000003-0000-4000-a000-000000000003', roomTypeName: 'Executive Room', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'minibar'] },
  { id: 'cee8da28-abab-466c-b357-1c1d018c97e7', propertyId: PROPERTY_ID, number: '2010', floor: '2', roomTypeId: 'b0000004-0000-4000-a000-000000000004', roomTypeName: 'Suite', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'minibar', 'living_area', 'bathtub'] },

  // 3rd Floor (10 Rooms: 3001-3010)
  { id: '12f46802-e6ef-4442-9719-07696d1d823f', propertyId: PROPERTY_ID, number: '3001', floor: '3', roomTypeId: 'b0000002-0000-4000-a000-000000000002', roomTypeName: 'Deluxe Room', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'balcony'] },
  { id: 'b04ded34-41be-4834-a0cf-e4a5ad5b47d9', propertyId: PROPERTY_ID, number: '3002', floor: '3', roomTypeId: 'b0000003-0000-4000-a000-000000000003', roomTypeName: 'Executive Room', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'minibar'] },
  { id: '23881fbd-edc5-4abe-a975-c85733a86672', propertyId: PROPERTY_ID, number: '3003', floor: '3', roomTypeId: 'b0000002-0000-4000-a000-000000000002', roomTypeName: 'Deluxe Room', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'balcony'] },
  { id: '7634b89b-b1e2-4281-8b23-e1934c15eb69', propertyId: PROPERTY_ID, number: '3004', floor: '3', roomTypeId: 'b0000002-0000-4000-a000-000000000002', roomTypeName: 'Deluxe Room', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'balcony'] },
  { id: 'fdeb0677-bf47-4fbd-a65a-60ac6134bb82', propertyId: PROPERTY_ID, number: '3005', floor: '3', roomTypeId: 'b0000003-0000-4000-a000-000000000003', roomTypeName: 'Executive Room', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'minibar'] },
  { id: '3b5bbe33-31aa-4a69-ba9d-ef30444ed4a4', propertyId: PROPERTY_ID, number: '3006', floor: '3', roomTypeId: 'b0000001-0000-4000-a000-000000000001', roomTypeName: 'Budget', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'room_service'] },
  { id: 'c00a1f3f-2260-43c4-aa59-e36a4fc8141d', propertyId: PROPERTY_ID, number: '3007', floor: '3', roomTypeId: 'b0000002-0000-4000-a000-000000000002', roomTypeName: 'Deluxe Room', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'balcony'] },
  { id: '64e8a350-9131-4df5-8642-1dfea6d52c45', propertyId: PROPERTY_ID, number: '3008', floor: '3', roomTypeId: 'b0000003-0000-4000-a000-000000000003', roomTypeName: 'Executive Room', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'minibar'] },
  { id: '6f158f95-ea10-44a4-ac0d-697d422f7586', propertyId: PROPERTY_ID, number: '3009', floor: '3', roomTypeId: 'b0000003-0000-4000-a000-000000000003', roomTypeName: 'Executive Room', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'minibar'] },
  { id: '5a61c51b-d33f-4b0a-84a2-d5fc56705a42', propertyId: PROPERTY_ID, number: '3010', floor: '3', roomTypeId: 'b0000004-0000-4000-a000-000000000004', roomTypeName: 'Suite', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'minibar', 'living_area', 'bathtub'] },

  // 4th Floor (8 Rooms: 4001-4008)
  { id: '1a4c3c83-cd99-4f4c-b55b-e4b072769db2', propertyId: PROPERTY_ID, number: '4001', floor: '4', roomTypeId: 'b0000002-0000-4000-a000-000000000002', roomTypeName: 'Deluxe Room', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'balcony'] },
  { id: 'ae825695-3665-4c2e-b720-041ceaf589ce', propertyId: PROPERTY_ID, number: '4002', floor: '4', roomTypeId: 'b0000003-0000-4000-a000-000000000003', roomTypeName: 'Executive Room', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'minibar'] },
  { id: '9858efbf-2df3-4ab3-8c79-3f9e4bdcd77a', propertyId: PROPERTY_ID, number: '4003', floor: '4', roomTypeId: 'b0000002-0000-4000-a000-000000000002', roomTypeName: 'Deluxe Room', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'balcony'] },
  { id: '4672e9d7-ecb3-4e62-9a83-81631a9036e6', propertyId: PROPERTY_ID, number: '4004', floor: '4', roomTypeId: 'b0000002-0000-4000-a000-000000000002', roomTypeName: 'Deluxe Room', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'balcony'] },
  { id: '2f4e5dcc-292b-4c54-ba8b-5be33b3e1879', propertyId: PROPERTY_ID, number: '4005', floor: '4', roomTypeId: 'b0000003-0000-4000-a000-000000000003', roomTypeName: 'Executive Room', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'minibar'] },
  { id: '738f4cdf-e4f8-4473-8202-067f59e38ee6', propertyId: PROPERTY_ID, number: '4006', floor: '4', roomTypeId: 'b0000001-0000-4000-a000-000000000001', roomTypeName: 'Budget', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'room_service'] },
  { id: 'eb7b1cc9-9de6-4e5b-9c72-03fb2edd58a5', propertyId: PROPERTY_ID, number: '4007', floor: '4', roomTypeId: 'b0000002-0000-4000-a000-000000000002', roomTypeName: 'Deluxe Room', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'balcony'] },
  { id: '8f34f3f5-17ba-4fdb-926c-27b0754b504d', propertyId: PROPERTY_ID, number: '4008', floor: '4', roomTypeId: 'b0000003-0000-4000-a000-000000000003', roomTypeName: 'Executive Room', status: 'vacant_clean', hkOccupancy: 'vacant', isActive: true, amenities: ['wifi', 'tv', 'ac', 'safe', 'minibar'] },
];`;

code = code.replace(/export const DEFAULT_ROOMS: StoredRoom\[\] = \[[\s\S]*?\n\];/, roomsDefinition);

// 2. Empty DEFAULT_STAYS
code = code.replace(/export const DEFAULT_STAYS: StoredStay\[\] = \[[\s\S]*?\n\];/, 'export const DEFAULT_STAYS: StoredStay[] = [];');

// 3. Empty DEFAULT_NOTIFICATIONS
code = code.replace(/export const DEFAULT_NOTIFICATIONS: StoredNotification\[\] = \[[\s\S]*?\n\];/, 'export const DEFAULT_NOTIFICATIONS: StoredNotification[] = [];');

// 4. Empty DEFAULT_GUESTS
code = code.replace(/const DEFAULT_GUESTS = \[[\s\S]*?\n\];/, 'const DEFAULT_GUESTS: any[] = [];');

// 5. Empty DEFAULT_RESERVATIONS
code = code.replace(/const DEFAULT_RESERVATIONS = \[[\s\S]*?\n\];/, 'const DEFAULT_RESERVATIONS: any[] = [];');

// 6. Empty DEFAULT_DIRECT_BOOKINGS
code = code.replace(/export const DEFAULT_DIRECT_BOOKINGS: any\[\] = \[[\s\S]*?\n\];/, 'export const DEFAULT_DIRECT_BOOKINGS: any[] = [];');

// 7. Update getStoredRooms() to force refresh if old 101 exists or 2001 missing
const oldGetStoredRooms = `export function getStoredRooms(): StoredRoom[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(ROOMS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 28) {
          return parsed;
        }
      }
    }
  } catch (e) {
    void e;
  }
  return [...DEFAULT_ROOMS];
}`;

const newGetStoredRooms = `export function getStoredRooms(): StoredRoom[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(ROOMS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 28 && parsed.some((r: any) => r.number === '2001') && !parsed.some((r: any) => r.number === '101')) {
          return parsed;
        }
      }
    }
  } catch (e) {
    void e;
  }
  return [...DEFAULT_ROOMS];
}`;

code = code.replace(oldGetStoredRooms, newGetStoredRooms);

// 8. Update getStoredStays to purge mock data
const oldGetStoredStays = `export function getStoredStays(): StoredStay[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(STAYS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: StoredStay) => {
            const def = DEFAULT_STAYS.find((d) => d.id === item.id);
            if (def) {
              return {
                ...def,
                ...item,
                idProofFrontUrl: item.idProofFrontUrl || def.idProofFrontUrl,
                idProofBackUrl: item.idProofBackUrl || def.idProofBackUrl,
              };
            }
            return item;
          });
        }
      }
    }
  } catch (e) {
    void e;
  }
  return [...DEFAULT_STAYS];
}`;

const newGetStoredStays = `export function getStoredStays(): StoredStay[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(STAYS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((item: StoredStay) => 
            !item.id.startsWith('stay-00') && 
            !item.id.startsWith('stay-hist-') && 
            item.guestName !== 'Rahul Verma' && 
            item.guestName !== 'Priya Sharma' && 
            item.guestName !== 'Vikram Malhotra' && 
            item.guestName !== 'Sneha Reddy'
          );
        }
      }
    }
  } catch (e) {
    void e;
  }
  return [...DEFAULT_STAYS];
}`;

code = code.replace(oldGetStoredStays, newGetStoredStays);

// 9. Update getStoredReservations to filter mock
const oldGetStoredResvs = `export function getStoredReservations(): any[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(RESERVATIONS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
  } catch (e) {
    void e;
  }
  return [...DEFAULT_RESERVATIONS];
}`;

const newGetStoredResvs = `export function getStoredReservations(): any[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(RESERVATIONS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((r: any) => 
            !r.id.startsWith('resv-00') && 
            !r.confirmationNumber?.includes('880') && 
            r.guestName !== 'Suresh Goud' && 
            r.guestName !== 'Mohammed Rafi'
          );
        }
      }
    }
  } catch (e) {
    void e;
  }
  return [...DEFAULT_RESERVATIONS];
}`;

code = code.replace(oldGetStoredResvs, newGetStoredResvs);

// 10. Update getStoredGuests to filter mock
const oldGetStoredGuests = `export function getStoredGuests(): any[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(GUESTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
  } catch (e) {
    void e;
  }
  return [...DEFAULT_GUESTS];
}`;

const newGetStoredGuests = `export function getStoredGuests(): any[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(GUESTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((g: any) => !g.id.startsWith('g000000'));
        }
      }
    }
  } catch (e) {
    void e;
  }
  return [...DEFAULT_GUESTS];
}`;

code = code.replace(oldGetStoredGuests, newGetStoredGuests);

// 11. Update getStoredDirectBookings to filter mock
const oldGetStoredDirectBookings = `export function getStoredDirectBookings(): any[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(DIRECT_BOOKINGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
  } catch (e) {
    void e;
  }
  return [...DEFAULT_DIRECT_BOOKINGS];
}`;

const newGetStoredDirectBookings = `export function getStoredDirectBookings(): any[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(DIRECT_BOOKINGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((b: any) => 
            b.id !== '2a52aaa6-dd15-4c31-9716-a81c2080288a' &&
            b.id !== 'b744d03d-24fb-4bca-85f0-619f79883db1' &&
            b.id !== 'c287d743-808d-41f1-8034-e9baf96faabc' &&
            b.id !== '30b3fd49-613c-4c29-9b7b-877e645eb66f' &&
            b.id !== '415de485-046d-4591-830b-6183994c823a' &&
            b.id !== 'fb3e09c9-b088-4604-82e2-30c010c06715'
          );
        }
      }
    }
  } catch (e) {
    void e;
  }
  return [...DEFAULT_DIRECT_BOOKINGS];
}`;

code = code.replace(oldGetStoredDirectBookings, newGetStoredDirectBookings);

// 12. Fix /direct-bookings approval to use real selected room
code = code.replace(
  `    const roomId = body.roomId || '5aca9c61-49d7-42db-885c-58d30dfceac7';
    const confCode = \`CONF-\${Date.now().toString(36).toUpperCase()}\`;

    // 1. Update localStorage direct bookings
    const directBookings = getStoredDirectBookings();
    let approvedBooking: any = null;
    const updatedDirectBookings = directBookings.map((b: any) => {
      if (b.id === requestId || b.reference === requestId) {
        approvedBooking = {
          ...b,
          status: 'accepted',
          assignedRoomNumber: '101',
          confirmedReservationNumber: confCode,
          decidedAt: new Date().toISOString(),
        };
        return approvedBooking;
      }
      return b;
    });
    saveStoredDirectBookings(updatedDirectBookings);

    // 2. Update room status in localStorage
    const currentRooms = getStoredRooms();
    const updatedRooms = currentRooms.map((r) =>
      r.id === roomId || r.number === '101' ? { ...r, status: 'occupied' } : r
    );`,
  `    const currentRooms = getStoredRooms();
    const targetRoom = currentRooms.find((r) => r.id === body.roomId || r.number === body.roomId) || currentRooms.find((r) => r.status === 'vacant_clean') || currentRooms[0];
    const roomId = targetRoom.id;
    const roomNumber = targetRoom.number;
    const confCode = \`CONF-\${Date.now().toString(36).toUpperCase()}\`;

    // 1. Update localStorage direct bookings
    const directBookings = getStoredDirectBookings();
    let approvedBooking: any = null;
    const updatedDirectBookings = directBookings.map((b: any) => {
      if (b.id === requestId || b.reference === requestId) {
        approvedBooking = {
          ...b,
          status: 'accepted',
          assignedRoomNumber: roomNumber,
          confirmedReservationNumber: confCode,
          decidedAt: new Date().toISOString(),
        };
        return approvedBooking;
      }
      return b;
    });
    saveStoredDirectBookings(updatedDirectBookings);

    // 2. Update room status in localStorage
    const updatedRooms = currentRooms.map((r) =>
      r.id === roomId || r.number === roomNumber ? { ...r, status: 'occupied', guestName: \`\${approvedBooking?.guestFirstName || 'Guest'} \${approvedBooking?.guestLastName || ''}\`.trim() } : r
    );`
);

// Also replace roomNumber: '101' in stay creation with roomNumber
code = code.replace(
  `roomId: roomId || 'r0000101-0000-4000-a000-000000000001',\n      roomNumber: '101',`,
  `roomId: roomId,\n      roomNumber: roomNumber,`
);
code = code.replace(
  `roomId,\n      roomNumber: '101',`,
  `roomId,\n      roomNumber: roomNumber,`
);
code = code.replace(
  `roomNumber: '101',\n      confirmationNumber: confCode,`,
  `roomNumber: roomNumber,\n      confirmationNumber: confCode,`
);

fs.writeFileSync(filePath, code, 'utf8');
console.log('Successfully updated apps/dashboard/src/lib/supabaseAdapter.ts');
