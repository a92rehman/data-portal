import { toast, ToastOptions, TypeOptions } from 'react-toastify';

// Default toast configuration
const defaultOptions: ToastOptions = {
  position: "top-right",
  autoClose: 4000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
};

// Notification service with typed methods
export const notify = {
  success: (message: string, options?: ToastOptions) => {
    toast.success(message, { ...defaultOptions, ...options });
  },

  error: (message: string, options?: ToastOptions) => {
    toast.error(message, { ...defaultOptions, ...options });
  },

  info: (message: string, options?: ToastOptions) => {
    toast.info(message, { ...defaultOptions, ...options });
  },

  warning: (message: string, options?: ToastOptions) => {
    toast.warning(message, { ...defaultOptions, ...options });
  },

  promise: <T,>(
    promise: Promise<T>,
    messages: {
      pending: string;
      success: string;
      error: string;
    },
    options?: ToastOptions
  ) => {
    return toast.promise(
      promise,
      {
        pending: messages.pending,
        success: messages.success,
        error: messages.error,
      },
      { ...defaultOptions, ...options }
    );
  },

  custom: (message: string, type: TypeOptions, options?: ToastOptions) => {
    toast(message, { ...defaultOptions, type, ...options });
  },

  dismiss: (toastId?: string | number) => {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  },

  dismissAll: () => {
    toast.dismiss();
  },
};

// Helper function to show notification with title and description
export const showNotification = (
  type: 'success' | 'error' | 'info' | 'warning',
  title: string,
  description?: string
) => {
  const message = description ? `${title}\n${description}` : title;
  notify[type](message);
};

export default notify;
