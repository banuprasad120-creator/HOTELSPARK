import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test/helpers';
import Rooms from './Rooms';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({ api: { get: vi.fn(), patch: vi.fn(), post: vi.fn(), delete: vi.fn() } }));
vi.mock('../context/PropertyContext', () => ({ useProperty: () => ({ propertyId: 'audit-property' }) }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ hasRole: () => true }) }));

const room = { id: 'audit-room', number: '901', floor: '9', roomTypeId: 'audit-type', roomTypeName: 'Audit Category', status: 'vacant_clean', amenities: [] };
const category = { id: 'audit-type', name: 'Audit Category', code: 'AUD', basePrice: 1500 };
const media = { id: 'audit-media', url: 'data:image/png;base64,AA==', isPrimary: true, ownerId: room.id };
let response: unknown;
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.get).mockImplementation(async (url) => {
    if (url === '/v1/rooms') return { data: [room] };
    if (url === '/v1/rooms/types') return { data: [category] };
    if (url === '/v1/media') return { data: response };
    if (url === '/v1/rooms/discrepancies') return { data: { discrepancies: [] } };
    return { data: [] };
  });
  vi.mocked(api.patch).mockResolvedValue({ data: { ...room, number: '902' } });
});

async function openEditor() {
  renderWithProviders(<Rooms />);
  fireEvent.click(await screen.findByText('Room 901'));
  fireEvent.click(await screen.findByRole('button', { name: 'Edit Room' }));
  expect(await screen.findByText('Edit Room 901')).toBeInTheDocument();
  expect(await screen.findByRole('option', { name: 'Audit Category (AUD)' })).toBeInTheDocument();
}

describe('Room edit media response regression', () => {
  it.each([{ value: { data: [media] } }, { value: [media] }, { value: { unexpected: true } }, { value: null }])('opens room editor with media response %j', async ({ value }) => {
    response = value;
    await openEditor();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(api.patch).not.toHaveBeenCalled();
  });
  it('sends the edited room number and category to the scoped API', async () => {
    response = { data: [media] };
    await openEditor();
    fireEvent.change(screen.getByDisplayValue('901'), { target: { value: '902' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/v1/rooms/audit-room', { number: '902', floor: '9', roomTypeId: 'audit-type' }, { params: { propertyId: 'audit-property' } }));
    await waitFor(() => expect(screen.queryByText('Edit Room 901')).not.toBeInTheDocument());
  });
  it('keeps the editor open if the update fails', async () => {
    response = { data: [] };
    vi.mocked(api.patch).mockRejectedValueOnce({ response: { data: { message: 'Audit update rejected' } } });
    await openEditor();
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(await screen.findByText('Audit update rejected')).toBeInTheDocument();
    expect(screen.getByText('Edit Room 901')).toBeInTheDocument();
  });

  it('saves amenities changes to the scoped room patch API', async () => {
    response = { data: [] };
    renderWithProviders(<Rooms />);
    fireEvent.click(await screen.findByText('Room 901'));
    
    // Add amenity
    const input = await screen.findByPlaceholderText(/add a feature/i);
    fireEvent.change(input, { target: { value: 'king_bed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    
    // Click Save
    const saveBtn = screen.getByRole('button', { name: /^save$/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/v1/rooms/audit-room',
        { amenities: ['king_bed'] },
        { params: { propertyId: 'audit-property' } }
      );
    });
  });
});
