/** Where a notification (or any `{ type, id }` reference from the API) should take the user. */
export function linkFor(data: { type?: string; id?: string; [k: string]: unknown } | null | undefined): string | null {
  if (!data?.type) return null;
  const id = data.id ? String(data.id) : '';
  switch (data.type) {
    case 'task':
      return id ? `/tasks/${id}` : '/tasks';
    case 'calendar_event':
      return '/calendar';
    case 'check_in_event':
      return id ? `/check-ins/events/${id}` : '/check-ins';
    case 'help_request':
      return id ? `/help/requests/${id}` : '/help';
    case 'consumer_case':
      return id ? `/consumer/cases/${id}` : '/consumer';
    case 'purchase':
      return '/consumer?tab=purchases';
    case 'contact':
    case 'contact_invitation':
      return '/contacts';
    case 'grants':
      return '/sharing';
    case 'group':
      return id ? `/community/groups/${id}` : '/community';
    case 'group_invitation':
      return '/community?tab=invitations';
    case 'post':
      return id ? `/community/posts/${id}` : '/community';
    case 'household':
      return id ? `/households/${id}` : '/households';
    case 'household_invitation':
      return '/households';
    case 'shopping_list':
      return id ? `/lists/${id}` : '/lists';
    case 'inventory_item':
      return id ? `/inventory/${id}` : '/inventory';
    case 'service_request':
      return id ? `/service-requests/${id}` : '/service-requests';
    case 'provider':
      return '/provider-portal';
    case 'moderation_action':
    case 'moderation_appeal':
      return '/community?tab=decisions';
    case 'privacy_request':
      return '/privacy';
    case 'session':
      return '/settings#security';
    default:
      return null;
  }
}
