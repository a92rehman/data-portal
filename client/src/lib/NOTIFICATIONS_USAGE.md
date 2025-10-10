# Notification System Usage Guide

This application uses **react-toastify** for displaying beautiful, customizable notifications.

## Import

```typescript
import notify, { showNotification } from '@/lib/notifications';
```

## Basic Usage

### Success Notification
```typescript
notify.success('Data saved successfully!');
```

### Error Notification
```typescript
notify.error('Failed to save data. Please try again.');
```

### Info Notification
```typescript
notify.info('Your request is being processed.');
```

### Warning Notification
```typescript
notify.warning('This action cannot be undone.');
```

## Advanced Usage

### With Custom Options
```typescript
notify.success('Request submitted!', {
  autoClose: 5000, // Close after 5 seconds
  position: 'bottom-right',
});
```

### Promise-based Notifications
Perfect for async operations:

```typescript
const submitRequest = async () => {
  const promise = apiRequest("POST", "/api/requests", data);
  
  notify.promise(promise, {
    pending: 'Submitting request...',
    success: 'Request submitted successfully!',
    error: 'Failed to submit request.',
  });
  
  return promise;
};
```

### With Title and Description
```typescript
showNotification(
  'success',
  'Request Approved',
  'Your data request has been approved by the team lead.'
);
```

### Dismiss Notifications
```typescript
// Dismiss a specific notification
const toastId = notify.success('Processing...');
notify.dismiss(toastId);

// Dismiss all notifications
notify.dismissAll();
```

## Available Positions
- `top-left`
- `top-center`
- `top-right` (default)
- `bottom-left`
- `bottom-center`
- `bottom-right`

## Configuration Options

All notification methods accept an optional `ToastOptions` parameter:

```typescript
{
  position: 'top-right',
  autoClose: 4000,      // Time in milliseconds (false to disable)
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  theme: 'light',       // 'light' | 'dark' | 'colored'
}
```

## Dark Mode Support

Notifications automatically adapt to dark mode based on the app's theme. The system detects the `.dark` class on the document element and adjusts toast colors accordingly.

## Examples in Context

### Form Submission
```typescript
const mutation = useMutation({
  mutationFn: async (data) => {
    return await apiRequest("POST", "/api/requests", data);
  },
  onSuccess: () => {
    notify.success('Request created successfully!');
  },
  onError: (error: Error) => {
    notify.error(error.message || 'Failed to create request');
  },
});
```

### User Feedback
```typescript
const handleDelete = async (id: string) => {
  const confirmed = window.confirm('Are you sure?');
  if (!confirmed) return;

  try {
    await deleteRequest(id);
    notify.success('Request deleted successfully');
  } catch (error) {
    notify.error('Failed to delete request');
  }
};
```

### Progress Tracking
```typescript
const uploadFile = async (file: File) => {
  const promise = uploadToStorage(file);
  
  const toastId = notify.promise(promise, {
    pending: `Uploading ${file.name}...`,
    success: `${file.name} uploaded successfully!`,
    error: `Failed to upload ${file.name}`,
  });
  
  return promise;
};
```

## Best Practices

1. **Be Specific**: Provide clear, actionable messages
   - ✅ "Email updated successfully"
   - ❌ "Success"

2. **Use Appropriate Types**: Match notification type to the message context
   - Success: Actions completed successfully
   - Error: Failures that need attention
   - Warning: Important information or confirmations needed
   - Info: General information or progress updates

3. **Don't Overuse**: Too many notifications can be annoying
   - Batch similar notifications when possible
   - Use dismissible toasts for non-critical info

4. **Provide Context**: Help users understand what happened
   - ✅ "Request #1234 submitted successfully"
   - ❌ "Done"

5. **Handle Errors Gracefully**: Always provide helpful error messages
   - ✅ "Failed to submit request. Please check your internet connection."
   - ❌ "Error"

## Styling

Notifications are fully styled with gradients and support dark mode automatically. Custom styles are defined in `index.css` and include:

- Gradient backgrounds for each notification type
- Smooth progress bars
- Responsive design
- Dark mode variants
- Blur effects for modern aesthetics
