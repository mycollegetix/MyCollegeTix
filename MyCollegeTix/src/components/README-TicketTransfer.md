# Ticket Transfer Portal Integration

This feature allows users to access their college's official ticket transfer portal directly from the MyCollegeTix app.

## Components

### TicketTransferButton
A reusable button component that opens the college's transfer portal.

#### Props
- `collegeId` (string): The ID of the college whose transfer portal to open
- `ticketInfo` (optional): Object with ticket details to show in confirmation dialog
- `variant` (optional): Button style - 'primary', 'secondary', or 'outline'
- `size` (optional): Button size - 'small', 'medium', or 'large'
- `showIcon` (optional): Whether to show the icon

#### Usage
```jsx
import { TicketTransferButton } from '@/src/components/TicketTransferButton';

<TicketTransferButton
  collegeId={ticket.home_college_id}
  ticketInfo={{
    title: ticket.title,
    eventDate: ticket.event_date,
    section: ticket.section,
    row: ticket.row_number,
    seat: ticket.seat_number,
  }}
  variant="primary"
  size="medium"
/>
```

### TicketTransferService
Service class for handling transfer portal operations.

#### Methods
- `getTransferPortalInfo(collegeId)`: Get transfer portal info for a college
- `openTransferPortal(collegeId, ticketInfo?)`: Open the transfer portal with confirmation
- `getCollegesWithTransferPortals()`: Get all colleges that have transfer portals

## Database Setup

1. Run the SQL migration to add transfer portal URLs to colleges:
```sql
-- Add transfer portal URL column
ALTER TABLE public.colleges 
ADD COLUMN transfer_portal_url text;

-- Update existing colleges with their transfer portal URLs
UPDATE public.colleges 
SET transfer_portal_url = 'https://msuspartans.evenue.net/signin'
WHERE email_domain LIKE '%msu.edu%' OR short_name = 'MSU';

UPDATE public.colleges 
SET transfer_portal_url = 'https://mgoblue.evenue.net/signin'
WHERE email_domain LIKE '%umich.edu%' OR short_name = 'UM';
```

2. The transfer portal URL should be the sign-in page for the college's eVenue system.

## Integration Points

### Ticket Details Screen
- Shows transfer portal button for own tickets or sold tickets
- Displays in a dedicated "Ticket Transfer Portal" section

### Orders Screen  
- Shows transfer portal button for sold tickets in the selling tab
- Appears as a small section at the bottom of sold ticket cards

## User Flow

1. User taps "Open Transfer Portal" button
2. Confirmation dialog shows ticket details and transfer portal information
3. User confirms and is taken to the college's official transfer portal
4. User completes the transfer process on the college's website

## Security & Trust

- Only opens official college transfer portals (eVenue links)
- Shows confirmation dialog with ticket details before opening
- URLs are stored in the database and managed by admins
- Gracefully handles colleges without transfer portals configured

## Error Handling

- Shows appropriate messages if transfer portal isn't configured
- Handles cases where URL can't be opened
- Provides fallback text and actions for colleges without portals
- Logs errors for debugging while maintaining user experience